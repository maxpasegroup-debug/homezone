import { auth } from "@/auth";
import { db } from "@/lib/db";
import { getOrCreateProfile } from "@/lib/auth/profile";
import { forbidden, ok, unauthorized, apiError } from "@/lib/api/response";
import { z } from "zod";
import { mobilePropertySelect } from "@/lib/properties/mobile-catalog";
import {leadAccessWhere} from "@/lib/leads/access";

export const dynamic = "force-dynamic";
const recordId=z.string().regex(/^[A-Za-z0-9_-]{8,128}$/);
const query = z.object({ module: z.enum(["properties", "ownerEnquiries", "crm", "calendar", "team", "commissions", "projects", "units", "towers", "builderTeam", "campaigns", "bookings", "requests", "providerRequests", "providerProfile", "serviceBookings", "studio", "notifications", "visits", "history", "payments", "accountRequests", "leadNotes", "leadTasks", "leadVisits", "requestQuotes"]),
  parent: recordId.optional(), page: z.coerce.number().int().min(1).max(1000).default(1),
  mode:z.enum(["page","cursor"]).default("page"),after:z.string().min(1).max(512).optional() }).strict();
const token=z.tuple([z.literal(1),query.shape.module,z.string(),recordId,z.string().nullable()]);

// Deliberately scoped projections. Never accepts an actor/owner ID from mobile.
export async function GET(request: Request) {
  try {
    const session = await auth(); if (!session?.user?.id) return unauthorized();
    const profile = await getOrCreateProfile(session.user);
    if (profile.verificationStatus === "SUSPENDED") return forbidden();
    const params=new URL(request.url).searchParams;
    if([...params.keys()].some(key=>params.getAll(key).length!==1))return apiError("Invalid workspace query",400);
    const parsed = query.safeParse(Object.fromEntries(params));
    if (!parsed.success) return apiError("Invalid workspace query", 400);
    const { module, parent, page,mode,after } = parsed.data;
    const cursorMode=mode==="cursor";
    if((after&&!cursorMode)||(cursorMode&&params.has("page")))return apiError("Choose one pagination mode",400);
    let anchor:z.infer<typeof token>|undefined;
    if(after){try{if(!/^[A-Za-z0-9_-]+$/.test(after))throw Error();anchor=token.parse(JSON.parse(Buffer.from(after,"base64url").toString("utf8")));
      if(anchor[1]!==module||anchor[2]!== (parent??"") || (module==="history" ? !anchor[4]||!z.string().datetime().safeParse(anchor[4]).success : module==="calendar" ? anchor[4]!==null&&!z.string().datetime().safeParse(anchor[4]).success : anchor[4]!==null))throw Error();
    }catch{return apiError("Invalid workspace cursor. Refresh this list.",400);}}
    const position=anchor?{id:{lt:anchor[3]}}:{};
    const take = 21, skip = (page - 1) * 20;
    const bounds = { take, skip:cursorMode?0:skip,...(cursorMode?{orderBy:{id:"desc" as const}}:{}) };
    let items: unknown[] = [];
    const builderModules = ["projects", "units", "towers", "builderTeam", "campaigns", "bookings"];
    if (builderModules.includes(module) && profile.role !== "BUILDER") return forbidden();
    if (["crm", "calendar", "team", "commissions"].includes(module) && profile.role !== "BROKER") return forbidden();
    if (module === "properties" && !["USER", "OWNER", "BROKER"].includes(profile.role)) return forbidden();
    if (module === "ownerEnquiries" && !["OWNER", "BROKER"].includes(profile.role)) return forbidden();
    if (["ADMIN", "SUPER_ADMIN"].includes(profile.role)) return forbidden("Use the web administration interface");
    if (builderModules.includes(module) && module !== "projects") {
      if (!parent || !await db.builderProject.findFirst({ where: { id: parent, builderId: profile.id }, select: { id: true } })) return forbidden();
    }
    if(["leadNotes","leadTasks","leadVisits"].includes(module)){
      if(!parent||!await db.lead.findFirst({where:{id:parent,...leadAccessWhere(profile.id)},select:{id:true}}))return forbidden();
    }
    let quoteProviderId:string|undefined;
    if(module==="requestQuotes"){
      if(!parent)return apiError("Request reference required",400);
      const owned=await db.serviceRequest.findFirst({where:{id:parent,requesterId:profile.id},select:{id:true}});
      if(!owned){const provider=profile.role==="SERVICE_PROVIDER"?await db.serviceProvider.findFirst({where:{profileId:profile.id,verified:true,suspended:false},select:{id:true}}):null;
        if(!provider||!await db.serviceQuote.findFirst({where:{requestId:parent,providerId:provider.id},select:{id:true}}))return forbidden();quoteProviderId=provider.id;}
    }
    switch (module) {
      case "properties": items = await db.property.findMany({ where: { ownerId: profile.id, ...position }, orderBy: [{ updatedAt: "desc" }, { id: "asc" }], ...bounds,
        select: { id: true, title: true, description: true, city: true, locality: true, country:true, state:true, address:true, latitude:true, longitude:true, areaUnit:true, amenities:true, intent: true, category: true, propertyType: true, price: true, currency: true, status: true, verificationStatus: true, mediaUrls: true, areaValue: true, bedrooms: true, bathrooms: true } }); break;
      case "ownerEnquiries": case "crm": items = await db.lead.findMany({ where: { ...(module === "crm" ? { assignedTo: profile.id } : { property: { ownerId: profile.id } }), ...position }, orderBy: [{ createdAt: "desc" }, { id: "asc" }], ...bounds,
        select: { id: true, name: true, phone: true, message: true, stage: true, priority: true, nextAction: true, followUpAt: true, property: { select: { title: true } }, notes: cursorMode ? false : { take: 20, orderBy: { createdAt: "desc" }, select: { id: true, note: true } }, tasks: cursorMode ? false : { take: 20, orderBy: { createdAt: "desc" }, select: { id: true, title: true, completedAt: true, dueAt: true } }, siteVisits: cursorMode ? false : { take: 20, orderBy: { scheduledAt: "desc" }, select: { id: true, scheduledAt: true, status: true, notes: true } } } }); break;
      case "calendar": {
        const date=anchor?.[4]?new Date(anchor[4]):null;
        if(date&&!Number.isFinite(date.getTime()))return apiError("Invalid calendar cursor",400);
        const calendarPosition=anchor?(date?{OR:[{dueAt:{gt:date}},{dueAt:date,id:{gt:anchor[3]}},{dueAt:null}]}:{dueAt:null,id:{gt:anchor[3]}}):{};
        items = await db.leadTask.findMany({ where: { lead: { assignedTo: profile.id }, ...calendarPosition },
          take,skip:cursorMode?0:skip,orderBy: [{ dueAt: {sort:"asc",nulls:"last"} }, { id: "asc" }], select: { id: true, title: true, completedAt: true, dueAt: true, leadId: true } }); break;
      }
      case "team": items = await db.brokerTeamMember.findMany({ where: { brokerId: profile.id, ...position }, orderBy: { id: "asc" }, ...bounds, select: { id: true, name: true, email: true, phone: true, role: true, active: true, permissions: true, profileId:true } }).then(rows=>rows.map(({profileId,...member})=>({...member,linked:profileId!==null}))); break;
      case "commissions": items = await db.brokerCommission.findMany({ where: { brokerId: profile.id, ...position }, orderBy: { id: "asc" }, ...bounds, select: { id: true, dealValue: true, commissionAmount: true, status: true, notes: true } }); break;
      case "projects": items = await db.builderProject.findMany({ where: { builderId: profile.id, ...position }, orderBy: [{ updatedAt: "desc" }, { id: "asc" }], ...bounds, select: { id: true, name: true, city: true, description: true, status: true, constructionStatus: true, unitsCount: true, availableUnits: true } }); break;
      case "units": items = await db.builderUnit.findMany({ where: { projectId: parent, ...position }, orderBy: { id: "asc" }, ...bounds, select: { id: true, unitNumber: true, unitType: true, status: true, price: true, areaValue: true, floor: true, bedrooms: true, bathrooms: true } }); break;
      case "towers": items = await db.builderTower.findMany({ where: { projectId: parent, ...position }, orderBy: { id: "asc" }, ...bounds, select: { id: true, name: true, floors: true, status: true } }); break;
      case "builderTeam": items = await db.builderTeamMember.findMany({ where: { projectId: parent, builderId: profile.id, ...position }, orderBy: { id: "asc" }, ...bounds, select: { id: true, name: true, email: true, role: true, active: true, permissions: true } }); break;
      case "campaigns": items = await db.builderCampaign.findMany({ where: { projectId: parent, project: { builderId: profile.id }, ...position }, orderBy: { id: "asc" }, ...bounds, select: { id: true, name: true, channel: true, status: true, budget: true, leadsCount: true } }); break;
      case "bookings": items = await db.builderBooking.findMany({ where: { projectId: parent, project: { builderId: profile.id }, ...position }, orderBy: { id: "asc" }, ...bounds, select: { id: true, status: true, bookingAmount: true, saleValue: true, notes: true, unit: { select: { unitNumber: true } } } }); break;
      case "providerProfile": {
        const provider = await db.serviceProvider.findFirst({ where: { profileId: profile.id }, select: { id: true, businessName: true, category: true, city: true, description: true, verified: true, suspended: true, priceLabel: true, availability: true } }); items = provider ? [provider] : []; break;
      }
      case "requests": case "providerRequests": {
        const provider = module === "providerRequests" ? await db.serviceProvider.findFirst({ where: { profileId: profile.id, suspended: false, verified: true } }) : null;
        if (module === "providerRequests" && (!provider || profile.role !== "SERVICE_PROVIDER")) return forbidden();
        items = await db.serviceRequest.findMany({ where: { ...(provider ? { OR: [{ providerId: provider.id }, { providerId: null, category: provider.category, city: provider.city ?? "", status: { in: ["requested", "quoted"] } }, { quotes: { some: { providerId: provider.id } } }] } : { requesterId: profile.id }), ...position }, orderBy: [{ createdAt: "desc" }, { id: "asc" }], ...bounds,
          select: { id: true, category: true, city: true, budget: true, message: true, status: true, quotes: cursorMode ? false : { where: provider ? { providerId: provider.id } : {}, take: 20, orderBy: { createdAt: "desc" }, select: { id: true, amount: true, currency: true, message: true, status: true, validUntil: true, provider: { select: { businessName: true } } } } } }); break;
      }
      case "serviceBookings": items = await db.serviceBooking.findMany({ where: { OR: [{ customerId: profile.id }, { provider: { profileId: profile.id } }], ...position }, orderBy: [{ updatedAt: "desc" }, { id: "asc" }], ...bounds, select: { id: true, amount: true, status: true, scheduledAt: true, notes: true, provider: {select:{profileId:true}}, request: { select: { category: true, city: true } } } }).then(rows=>rows.map(({provider,...booking})=>({...booking,canManage:provider.profileId===profile.id}))); break;
      case "studio": items = await db.studioRequest.findMany({ where: { requesterId: profile.id, ...position }, orderBy: [{ updatedAt: "desc" }, { id: "asc" }], ...bounds, select: { id: true, serviceType: true, status: true, paymentStatus: true, notes: true, scheduledAt: true, orderValue: true } }); break;
      case "notifications": items = await db.notification.findMany({ where: { recipientId: profile.id, ...position }, orderBy: [{ createdAt: "desc" }, { id: "asc" }], ...bounds, select: { id: true, title: true, message: true, readAt: true, createdAt: true } }); break;
      case "visits": items = await db.leadSiteVisit.findMany({ where: { lead: { userId: profile.id }, ...position }, orderBy: [{ scheduledAt: "desc" }, { id: "asc" }], ...bounds, select: { id: true, scheduledAt: true, status: true, notes: true, property: { select: { title: true } } } }); break;
      case "payments": items = await db.payment.findMany({where:{payerId:profile.id,...position},orderBy:[{createdAt:"desc"},{id:"asc"}],...bounds,select:{id:true,product:true,status:true,amount:true,currency:true,paidAt:true,createdAt:true}}).then(rows=>rows.map(({amount,currency,...row})=>({...row,amountLabel:currency+" "+(amount/100).toFixed(2)})));break;
      case "accountRequests":items=await db.accountServiceRequest.findMany({where:{profileId:profile.id,...position},orderBy:[{createdAt:"desc"},{id:"asc"}],...bounds,select:{id:true,kind:true,status:true,createdAt:true}});break;
      case "history": {
        const date=anchor?.[4]?new Date(anchor[4]):null;
        if(date&&!Number.isFinite(date.getTime()))return apiError("Invalid history cursor",400);
        items = await db.propertyView.findMany({ where: { userId: profile.id, property: { status: "PUBLISHED" },
          ...(date&&anchor?{OR:[{viewedAt:{lt:date}},{viewedAt:date,propertyId:{lt:anchor[3]}}]}:{}) },
          take,skip:cursorMode?0:skip,orderBy:[{viewedAt:"desc"},{propertyId:"desc"}],
          select: { property: { select: mobilePropertySelect }, viewedAt: true } }); break;
      }
      case "leadNotes": items=await db.leadNote.findMany({where:{leadId:parent,lead:leadAccessWhere(profile.id),...position},orderBy:{id:"desc"},...bounds,select:{id:true,note:true,createdAt:true,authorId:true}}).then(rows=>rows.map(({authorId,...row})=>({...row,canEdit:authorId===null||authorId===profile.id})));break;
      case "leadTasks":items=await db.leadTask.findMany({where:{leadId:parent,lead:leadAccessWhere(profile.id),...position},orderBy:{id:"desc"},...bounds,select:{id:true,title:true,leadId:true,dueAt:true,completedAt:true}});break;
      case "leadVisits":items=await db.leadSiteVisit.findMany({where:{leadId:parent,lead:leadAccessWhere(profile.id),...position},orderBy:{id:"desc"},...bounds,select:{id:true,scheduledAt:true,status:true,notes:true}});break;
      case "requestQuotes":items=await db.serviceQuote.findMany({where:{requestId:parent,...(quoteProviderId?{providerId:quoteProviderId}:{request:{requesterId:profile.id}}),...position},orderBy:{id:"desc"},...bounds,
        select:{id:true,amount:true,currency:true,message:true,status:true,validUntil:true,provider:{select:{businessName:true}}}}).then(rows=>rows.map(row=>({...row,canDecide:!quoteProviderId})));break;
    }
    const output=items.slice(0,20),last=output.at(-1) as {id?:string;property?:{id:string};viewedAt?:Date;dueAt?:Date|null}|undefined;
    const nextCursor=cursorMode&&items.length>20&&last?Buffer.from(JSON.stringify([1,module,parent??"",module==="history"?last.property?.id:last.id,module==="history"?last.viewedAt?.toISOString():module==="calendar"?last.dueAt?.toISOString()??null:null])).toString("base64url"):null;
    return ok({ source: "database", module, page, items: output, hasMore: items.length > 20, role: profile.role,
      ...(cursorMode?{mode,nextCursor}:{}) }, { headers: { "Cache-Control": "no-store" } });
  } catch { return apiError("Workspace unavailable", 503); }
}
