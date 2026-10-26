import { auth } from "@/auth";
import { apiError, forbidden, handleApiError, ok, unauthorized } from "@/lib/api/response";
import { getOrCreateProfile } from "@/lib/auth/profile";
import { checkRateLimit, rateLimitKey } from "@/lib/api/rate-limit";
import { rateLimited } from "@/lib/api/response";
import { db } from "@/lib/db";
import { POST as upload } from "@/../backend/api/media/upload/route";
export const runtime="nodejs";
const maximum=6*1024*1024;
export async function POST(request:Request){
  try{
    const session=await auth();if(!session?.user?.id)return unauthorized();
    const profile=await getOrCreateProfile(session.user);
    if(profile.verificationStatus==="SUSPENDED"||!["OWNER","BROKER"].includes(profile.role))return forbidden();
    const limit=checkRateLimit({key:rateLimitKey(request,"mobile:photo",profile.id),limit:10,windowMs:60000});
    if(!limit.allowed)return rateLimited(limit.resetAt);
    // Bound the streamed body rather than trusting a client Content-Length.
    const reader=request.body?.getReader();if(!reader)return apiError("Image required",400);
    const chunks:Uint8Array[]=[];let size=0;
    for(;;){const next=await reader.read();if(next.done)break;size+=next.value.byteLength;
      if(size>9*1024*1024){await reader.cancel();return apiError("Image too large",413);}chunks.push(next.value);}
    let body;try{body=JSON.parse(Buffer.concat(chunks).toString("utf8"));}catch{return apiError("Invalid image request",400);}
    if(typeof body.propertyId!=="string" || typeof body.base64!=="string" || !/^[A-Za-z0-9+/]*={0,2}$/.test(body.base64))return apiError("Invalid image request",400);
    const property=await db.property.findFirst({where:{id:body.propertyId,ownerId:profile.id},select:{id:true,mediaUrls:true}});if(!property)return forbidden();
    if(property.mediaUrls.length>=40)return apiError("A listing supports at most 40 photographs.",409);
    const bytes=Buffer.from(body.base64,"base64");if(!bytes.length||bytes.length>maximum||bytes.toString("base64")!==body.base64)return apiError("Image too large, empty or invalid",400);
    const mime=bytes[0]===0xff&&bytes[1]===0xd8&&bytes[2]===0xff?"image/jpeg":
      bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]))?"image/png":
      bytes.subarray(0,4).toString()==="RIFF"&&bytes.subarray(8,12).toString()==="WEBP"?"image/webp":null;
    if(!mime)return apiError("Use a JPEG, PNG or WebP photograph",400);
    const form=new FormData();form.append("folder","homezone/property-media");
    form.append("file",new File([bytes],`property.${mime==="image/jpeg"?"jpg":mime.split("/")[1]}`,{type:mime}));
    const headers=new Headers(request.headers);headers.delete("content-type");headers.delete("content-length");
    const response=await upload(new Request(request.url,{method:"POST",headers,body:form}));
    if(!response.ok)return response;
    const result=await response.json();if(typeof result.url!=="string"||new URL(result.url).protocol!=="https:")return apiError("Upload confirmation unavailable",502);
    const uploaded=new URL(result.url);if(uploaded.username||uploaded.password||uploaded.hash)return apiError("Upload confirmation unavailable",502);
    const attached=await db.$transaction(async tx=>{
      await tx.$queryRaw`SELECT id FROM "Profile" WHERE id=${profile.id} FOR UPDATE`;
      const actor=await tx.profile.findUnique({where:{id:profile.id},select:{verificationStatus:true}});
      if(!actor||actor.verificationStatus==="SUSPENDED")return false;
      await tx.$queryRaw`SELECT id FROM "Property" WHERE id=${property.id} FOR UPDATE`;
      const current=await tx.property.findFirst({where:{id:property.id,ownerId:profile.id},select:{mediaUrls:true}});
      if(!current||current.mediaUrls.length>=40)return false;
      await tx.property.update({where:{id:property.id},data:{mediaUrls:{push:result.url}}});return true;
    });
    if(!attached)return apiError("Provider upload completed but listing attachment could not be confirmed. Refresh before retrying; no provider file was deleted.",409);
    return ok({url:result.url},{headers:{"Cache-Control":"no-store"}});
  }catch(error){return handleApiError(error,{route:"POST /api/mobile/upload"});}
}
