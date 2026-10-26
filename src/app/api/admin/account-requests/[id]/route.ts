import {auth} from "@/auth";
import {db} from "@/lib/db";
import {getOrCreateProfile} from "@/lib/auth/profile";
import {isAdminRole} from "@/lib/auth/roles";
import {apiError,ok,parseJson,unauthorized,forbidden} from "@/lib/api/response";
import {z} from "zod";
export async function PATCH(request:Request,context:{params:Promise<{id:string}>}){
 try{const session=await auth();if(!session?.user?.id)return unauthorized();const p=await getOrCreateProfile(session.user);if(!isAdminRole(p.role)||p.verificationStatus==="SUSPENDED")return forbidden();
  const {id}=await context.params;if(!/^[A-Za-z0-9_-]{8,128}$/.test(id))return apiError("Invalid review reference",400);const parsed=await parseJson(request,z.object({status:z.enum(["REVIEWING","REVIEWED","CLOSED"]),reviewNote:z.string().trim().min(5).max(500)}).strict());if("error" in parsed)return parsed.error;
  const changed=await db.$transaction(async tx=>{const result=await tx.accountServiceRequest.updateMany({where:{id,status:{in:parsed.data.status==="REVIEWING"?["OPEN"]:["REVIEWING"]}},data:{...parsed.data,reviewedById:p.id}});
   if(result.count!==1)return false;await tx.auditLog.create({data:{actorId:p.id,entityId:id,entityType:"account_service_request",action:"ACCOUNT_REQUEST_REVIEWED",metadata:{status:parsed.data.status}}});return true;});
  return changed?ok({reviewed:true,executionPerformed:false,notice:"Review state updated only. No account deletion or provider refund executed."}):apiError("Request changed. Refresh before continuing.",409);
 }catch{return apiError("Review could not be confirmed",503);}
}
