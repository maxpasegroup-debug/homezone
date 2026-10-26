import {auth} from "@/auth";
import {db} from "@/lib/db";
import {getOrCreateProfile} from "@/lib/auth/profile";
import {apiError,forbidden,ok,unauthorized} from "@/lib/api/response";
export const dynamic="force-dynamic";
export async function GET(request:Request){
  try{
    const session=await auth();if(!session?.user?.id)return unauthorized();
    const p=await getOrCreateProfile(session.user);if(p.verificationStatus==="SUSPENDED"||["ADMIN","SUPER_ADMIN"].includes(p.role))return forbidden();
    const parent=new URL(request.url).searchParams.get("project");
    const metrics:Record<string,number>={};
    if(parent){
      if(p.role!=="BUILDER"||!await db.builderProject.findFirst({where:{id:parent,builderId:p.id},select:{id:true}}))return forbidden();
      const groups=await db.builderUnit.groupBy({by:["status"],where:{projectId:parent},_count:{_all:true}});
      for(const g of groups)metrics[g.status]=g._count._all;
      metrics.CAMPAIGNS=await db.builderCampaign.count({where:{projectId:parent}});
      metrics.RESERVATIONS=await db.builderBooking.count({where:{projectId:parent,status:{in:["RESERVED","CONFIRMED"]}}});
    }else{
      metrics.UNREAD_NOTIFICATIONS=await db.notification.count({where:{recipientId:p.id,readAt:null}});
      if(["OWNER","BROKER"].includes(p.role))metrics.MY_LISTINGS=await db.property.count({where:{ownerId:p.id}});
      if(p.role==="BROKER"){
        metrics.ACTIVE_LEADS=await db.lead.count({where:{assignedTo:p.id,stage:{notIn:["WON","LOST","ARCHIVED"]}}});
        metrics.PENDING_TASKS=await db.leadTask.count({where:{lead:{assignedTo:p.id},completedAt:null}});
      }
      if(p.role==="BUILDER")metrics.MY_PROJECTS=await db.builderProject.count({where:{builderId:p.id}});
      if(p.role==="SERVICE_PROVIDER")metrics.ACTIVE_JOBS=await db.serviceBooking.count({where:{provider:{profileId:p.id},status:{in:["UPCOMING","IN_PROGRESS"]}}});
    }
    return ok({source:"database",metrics},{headers:{"Cache-Control":"no-store"}});
  }catch{return apiError("Summary unavailable",503);}
}
