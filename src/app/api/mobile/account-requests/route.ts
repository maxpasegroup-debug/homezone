import {auth} from "@/auth";
import {db} from "@/lib/db";
import {getOrCreateProfile} from "@/lib/auth/profile";
import {apiError,ok,parseJson,unauthorized,forbidden,rateLimited} from "@/lib/api/response";
import {checkRateLimit,rateLimitKey} from "@/lib/api/rate-limit";
import {z} from "zod";
export async function POST(request:Request){
 try{const session=await auth();if(!session?.user?.id)return unauthorized();const p=await getOrCreateProfile(session.user);
  if(p.verificationStatus==="SUSPENDED")return forbidden();
  const limit=checkRateLimit({key:rateLimitKey(request,"account:review",p.id),limit:5,windowMs:60000});if(!limit.allowed)return rateLimited(limit.resetAt);
  const parsed=await parseJson(request,z.object({kind:z.enum(["DELETION_REVIEW","REFUND_REVIEW"]),paymentId:z.string().min(8).max(128).optional()}).strict());if("error" in parsed)return parsed.error;
  if(parsed.data.kind==="DELETION_REVIEW"&&parsed.data.paymentId)return apiError("Invalid account request",400);
  const target=parsed.data.kind==="DELETION_REVIEW"?"account":parsed.data.paymentId;
  if(!target)return apiError("Payment required",400);
  if(parsed.data.kind==="REFUND_REVIEW"&&!await db.payment.findFirst({where:{id:target,payerId:p.id,status:"PAID"},select:{id:true}}))return apiError("Payment unavailable for review",409);
  const record=await db.accountServiceRequest.upsert({where:{profileId_kind_target:{profileId:p.id,kind:parsed.data.kind,target}},update:{},create:{profileId:p.id,kind:parsed.data.kind,target},select:{id:true,kind:true,status:true,createdAt:true}});
  const active=["OPEN","REVIEWING"].includes(record.status);
  return ok({request:record,executionPerformed:false,notice:active?
    "Review request is on record. No account data was deleted and no refund was issued.":
    "An existing completed review is on record. No new review was opened, no account data was deleted and no refund was issued."},{headers:{"Cache-Control":"private, no-store"}});
 }catch{return apiError("Request could not be confirmed. Refresh before retrying.",503);}
}
