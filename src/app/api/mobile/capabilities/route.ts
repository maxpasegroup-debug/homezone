import {auth} from "@/auth";
import {authOrigin} from "@/lib/auth/redirect";
import {ok,unauthorized,forbidden,apiError} from "@/lib/api/response";
import {getOrCreateProfile} from "@/lib/auth/profile";
import {requirePrivateFiles} from "@/lib/documents/private-files";
export const dynamic="force-dynamic";
export async function GET(){
 try{
 const session=await auth();if(!session?.user?.id)return unauthorized();
 const profile=await getOrCreateProfile(session.user);if(profile.verificationStatus==="SUSPENDED")return forbidden();
 let privateDocumentsConfigured=false;try{requirePrivateFiles();privateDocumentsConfigured=true;}catch{/* Opt-in service is unavailable; no secret or exception is exposed. */}
 let websitePaymentHandoffEnabled=false,websiteOrigin:string|null=null;
 try{const origin=authOrigin();if(process.env.MOBILE_WEB_PAYMENTS_ENABLED==="true"&&origin.startsWith("https:")&&process.env.RAZORPAY_KEY_ID&&process.env.RAZORPAY_KEY_SECRET&&process.env.RAZORPAY_WEBHOOK_SECRET){websitePaymentHandoffEnabled=true;websiteOrigin=origin;}}catch{/* No origin fallback or guessed provider configuration. */}
 return ok({privateDocumentsConfigured,websitePaymentHandoffEnabled,websiteOrigin,notice:"Configuration flags do not prove provider health or authorize live testing."},{headers:{"Cache-Control":"private, no-store"}});
 }catch{return apiError("Service capabilities unavailable. Please retry.",503);}
}
