import {reportPrivateFileFailure} from "@/lib/documents/private-files";
﻿import {apiError,ok} from "@/lib/api/response";
import {readAuthorizedFile} from "@/lib/documents/read-authorized-file";
export const runtime="nodejs";
export const dynamic="force-dynamic";
export async function GET(_request:Request,context:{params:Promise<{id:string}>}){
  try{const {id}=await context.params;const result=await readAuthorizedFile(id);if("error" in result)return result.error;
    return ok({fileName:result.file.fileName,base64:result.bytes.toString("base64")},{headers:{"Cache-Control":"private, no-store"}});
  }catch{reportPrivateFileFailure("download");return apiError("Document download unavailable",503);}
}
