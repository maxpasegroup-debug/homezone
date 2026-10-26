import {auth} from "@/auth";
import {db} from "@/lib/db";
import {getOrCreateProfile} from "@/lib/auth/profile";
import {apiError,ok,unauthorized,forbidden} from "@/lib/api/response";
export async function PATCH(_request:Request,context:{params:Promise<{id:string}>}){
  try{
    const session=await auth();if(!session?.user?.id)return unauthorized();
    const profile=await getOrCreateProfile(session.user);const {id}=await context.params;
    if(profile.verificationStatus==="SUSPENDED")return forbidden();
    if(!/^[A-Za-z0-9_-]{8,128}$/.test(id))return apiError("Invalid visit reference",400);
    const changed=await db.leadSiteVisit.updateMany({where:{id,lead:{userId:profile.id},status:{in:["REQUESTED","SCHEDULED","RESCHEDULED"]}},data:{status:"CANCELLED"}});
    return changed.count===1?ok({cancelled:true}):apiError("Visit unavailable or changed. Refresh before continuing.",409);
  }catch{return apiError("Visit could not be updated",503);}
}
