import {reportPrivateFileFailure} from "@/lib/documents/private-files";
﻿import {apiError} from "@/lib/api/response";
import {readAuthorizedFile} from "@/lib/documents/read-authorized-file";
export const runtime="nodejs";
export const dynamic="force-dynamic";
export async function GET(_request:Request,context:{params:Promise<{id:string}>}){
  try{const {id}=await context.params;const result=await readAuthorizedFile(id);if("error" in result)return result.error;
    return new Response(new Uint8Array(result.bytes),{headers:{"Content-Type":"application/pdf","Content-Disposition":`attachment; filename="${result.file.fileName}"`,"Content-Length":String(result.bytes.length),"Cache-Control":"private, no-store","X-Content-Type-Options":"nosniff","Content-Security-Policy":"sandbox; default-src 'none'"}});
  }catch{reportPrivateFileFailure("download");return apiError("Document download unavailable",503);}
}
