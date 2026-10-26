import { auth } from "@/auth";
import {createHash} from "node:crypto";
import { auditLog } from "@/lib/audit";
import { checkRateLimit, rateLimitKey } from "@/lib/api/rate-limit";
import { apiError, forbidden, handleApiError, notFound, ok, parseJson, rateLimited, unauthorized } from "@/lib/api/response";
import { propertyMediaSchema } from "@/lib/api/validation";
import { getOrCreateProfile } from "@/lib/auth/profile";
import { isAdminRole } from "@/lib/auth/roles";
import { db } from "@/lib/db";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};
function mediaState(property:{coverImageUrl:string|null;mediaUrls:string[]}){
  return createHash("sha256").update(JSON.stringify([property.coverImageUrl,property.mediaUrls])).digest("hex");
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return unauthorized();
    }

    const limit = checkRateLimit({
      key: rateLimitKey(request, "properties:media", session.user.id),
      limit: 30,
      windowMs: 60_000
    });

    if (!limit.allowed) {
      return rateLimited(limit.resetAt);
    }

    const { id } = await context.params;
    if(!/^[A-Za-z0-9_-]{8,128}$/.test(id))return apiError("Invalid property reference",400);
    const parsed = await parseJson(request, propertyMediaSchema);

    if ("error" in parsed) {
      return parsed.error;
    }

    const profile = await getOrCreateProfile(session.user);
    if(profile.verificationStatus==='SUSPENDED')return forbidden();
    const result=await db.$transaction(async tx=>{
      await tx.$queryRaw`SELECT id FROM "Profile" WHERE id=${profile.id} FOR UPDATE`;
      const current=await tx.profile.findUnique({where:{id:profile.id},select:{role:true,verificationStatus:true}});
      if(!current||current.verificationStatus==='SUSPENDED'||current.role!==profile.role)return {error:forbidden()} as const;
      await tx.$queryRaw`SELECT id FROM "Property" WHERE id=${id} FOR UPDATE`;
    const property = await tx.property.findUnique({
      where: {
        id
      }
    });

    if (!property) {
      return {error:notFound("Property not found")} as const;
    }

    if (property.ownerId !== profile.id && !isAdminRole(profile.role)) {
      return {error:forbidden()} as const;
    }

    const action = parsed.data;
    if(action.expectedUpdatedAt && property.updatedAt.getTime()!==new Date(action.expectedUpdatedAt).getTime())return {error:apiError("Listing media changed. Refresh before continuing.",409)} as const;
    if(action.expectedMediaState&&action.expectedMediaState!==mediaState(property))return {error:apiError("Listing media changed. Refresh before continuing.",409)} as const;
    if(action.action==='add'&&action.mediaType!=='video'&&!property.mediaUrls.includes(action.mediaUrl)&&property.mediaUrls.length>=40)return {error:apiError("A listing supports at most 40 photographs.",409)} as const;
    const nextData =
      action.action === "add"
        ? action.mediaType === "video"
          ? {
              videoUrl: action.mediaUrl
            }
          : action.mediaType === "cover"
            ? {
                coverImageUrl: action.mediaUrl,
                mediaUrls: property.mediaUrls.includes(action.mediaUrl)
                  ? property.mediaUrls
                  : [action.mediaUrl, ...property.mediaUrls]
              }
            : {
                mediaUrls: property.mediaUrls.includes(action.mediaUrl)
                  ? property.mediaUrls
                  : [...property.mediaUrls, action.mediaUrl]
              }
        : action.action === "remove"
          ? {
              coverImageUrl:
                property.coverImageUrl === action.mediaUrl ? null : property.coverImageUrl,
              mediaUrls: property.mediaUrls.filter((url) => url !== action.mediaUrl)
            }
          : action.action === "reorder"
            ? {
                mediaUrls: action.mediaUrls.filter((url) => property.mediaUrls.includes(url))
              }
            : action.action === "replace-video"
              ? {
                  videoUrl: action.videoUrl ?? null
                }
              : {
                  virtualTourUrl: action.virtualTourUrl ?? null
                };

    const updated = await tx.property.update({
      where: {
        id
      },
      data: nextData
    });

      return {property:updated} as const;
    });
    if('error' in result)return result.error;
    const updated=result.property;
    await auditLog({
      action: "property_media_attached",
      actorId: profile.id,
      entityId: id,
      entityType: "property",
      metadata: {
        action: parsed.data.action
      }
    });

    return ok({ property: {...updated,mediaState:mediaState(updated)} });
  } catch (error) {
    return handleApiError(error, {
      route: "PATCH /api/properties/[id]/media"
    });
  }
}

export async function GET(_request:Request,context:RouteContext){
 try{const session=await auth();if(!session?.user?.id)return unauthorized();
 const profile=await getOrCreateProfile(session.user);if(profile.verificationStatus==='SUSPENDED')return forbidden();
 const {id}=await context.params;if(!/^[A-Za-z0-9_-]{8,128}$/.test(id))return apiError('Invalid property reference',400);
 const property=await db.property.findFirst({where:{id,...(!isAdminRole(profile.role)?{ownerId:profile.id}:{})},select:{id:true,title:true,coverImageUrl:true,mediaUrls:true,updatedAt:true}});
 if(!property)return notFound('Property unavailable');
 return ok({property:{...property,mediaState:mediaState(property)}},{headers:{'Cache-Control':'private, no-store'}});
 }catch{return apiError('Listing photographs unavailable',503);}
}
