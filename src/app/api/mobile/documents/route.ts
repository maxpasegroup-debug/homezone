import {reportPrivateFileFailure} from "@/lib/documents/private-files";
import {PrivateScanRejected} from "@/lib/documents/private-file-scanner";
﻿import {auth} from "@/auth";
import {db} from "@/lib/db";
import {getOrCreateProfile} from "@/lib/auth/profile";
import {apiError,ok,parseJson,unauthorized,forbidden,rateLimited} from "@/lib/api/response";
import {checkRateLimit,rateLimitKey} from "@/lib/api/rate-limit";
import {canAccessPrivateFile,privateWhere,requirePrivateFiles,storePrivatePdf,PRIVATE_FILE_MAX} from "@/lib/documents/private-files";
import {z} from "zod";
export const runtime="nodejs";
export const dynamic="force-dynamic";
const target=z.object({scope:z.enum(["property","lead","studio"]),parent:z.string().regex(/^[A-Za-z0-9_-]{8,128}$/)});
const body=target.extend({notes:z.string().max(500).optional(),fileName:z.string().min(1).max(180),base64:z.string().max(700000).regex(/^[A-Za-z0-9+/]*={0,2}$/),documentType:z.enum(["SALE_DEED","ENCUMBRANCE_CERTIFICATE","TAX_RECEIPT","APPROVAL_DOCUMENT","FLOOR_PLAN","OWNERSHIP_PROOF","OTHER"]).default("OTHER")}).strict();
export async function GET(request:Request){
  try{
    const session=await auth();if(!session?.user?.id)return unauthorized();
    const actor=await getOrCreateProfile(session.user);if(actor.verificationStatus==="SUSPENDED")return forbidden();
    const params=new URL(request.url).searchParams;
    if([...params.keys()].some(k=>params.getAll(k).length!==1))return apiError("Invalid document query",400);
    const parsed=target.strict().safeParse(Object.fromEntries(params));if(!parsed.success)return apiError("Invalid document query",400);
    const {scope,parent}=parsed.data;if(!await canAccessPrivateFile(actor,scope,parent))return forbidden();
    requirePrivateFiles();
    const files=await db.privateFile.findMany({where:privateWhere(scope,parent),take:50,orderBy:{createdAt:"desc"},select:{id:true,fileName:true,bytes:true,createdAt:true}});
    return ok({files,canUpload:files.length<50&&await canAccessPrivateFile(actor,scope,parent,true),maximumBytes:PRIVATE_FILE_MAX},{headers:{"Cache-Control":"private, no-store"}});
  }catch{reportPrivateFileFailure("list");return apiError("Private documents are unavailable. The owner must configure this service.",503);}
}
export async function POST(request:Request){
  try{
    const session=await auth();if(!session?.user?.id)return unauthorized();
    const actor=await getOrCreateProfile(session.user);if(actor.verificationStatus==="SUSPENDED")return forbidden();
    const limit=checkRateLimit({key:rateLimitKey(request,"private:upload",actor.id),limit:10,windowMs:60000});if(!limit.allowed)return rateLimited(limit.resetAt);
    requirePrivateFiles();
    const reader=request.body?.getReader();if(!reader)return apiError("Document required",400);const chunks:Uint8Array[]=[];let size=0;
    for(;;){const n=await reader.read();if(n.done)break;size+=n.value.byteLength;if(size>720000){await reader.cancel();return apiError("PDF exceeds 512 KiB",413);}chunks.push(n.value);}
    const bounded=new Request(request.url,{method:"POST",headers:{"Content-Type":"application/json"},body:Buffer.concat(chunks).toString("utf8")});
    const parsed=await parseJson(bounded,body);if("error" in parsed)return parsed.error;
    const {scope,parent,fileName,base64,documentType,notes}=parsed.data;
    if(!await canAccessPrivateFile(actor,scope,parent,true))return forbidden();
    const bytes=Buffer.from(base64,"base64");if(bytes.toString("base64")!==base64||!bytes.length||bytes.length>PRIVATE_FILE_MAX||bytes.subarray(0,5).toString()!=="%PDF-")return apiError("Choose a PDF up to 512 KiB",400);
    const file=await storePrivatePdf(actor,scope,parent,fileName,bytes,documentType,notes);
    return ok({file},{headers:{"Cache-Control":"private, no-store"}});
  }catch(error){if(error instanceof PrivateScanRejected)return apiError("The document was not accepted by the safety scanner. Choose another file.",422);reportPrivateFileFailure("upload");return apiError("Document storage could not be confirmed. Scanning and encrypted storage must be available. Refresh before retrying.",503);}
}
