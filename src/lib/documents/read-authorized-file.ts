import {auth} from "@/auth";
import {db} from "@/lib/db";
import {getOrCreateProfile} from "@/lib/auth/profile";
import {apiError,forbidden,unauthorized} from "@/lib/api/response";
import {canAccessPrivateFile,decryptPrivateFile,privateParent} from "@/lib/documents/private-files";
import {scanPrivatePdf} from "@/lib/documents/private-file-scanner";
export async function readAuthorizedFile(id:string){
  const session=await auth();if(!session?.user?.id)return {error:unauthorized()} as const;
  const actor=await getOrCreateProfile(session.user);if(actor.verificationStatus==="SUSPENDED")return {error:forbidden()} as const;
  if(!/^[a-f0-9-]{36}$/.test(id))return {error:apiError("Document unavailable",404)} as const;
  const metadata=await db.privateFile.findUnique({where:{id},select:{scope:true,propertyId:true,leadId:true,studioRequestId:true}});if(!metadata)return {error:apiError("Document unavailable",404)} as const;
  const {scope,parent}=privateParent(metadata);if(!await canAccessPrivateFile(actor,scope,parent))return {error:forbidden()} as const;
  const file=await db.privateFile.findUnique({where:{id}});if(!file)return {error:apiError("Document unavailable",404)} as const;
  const reference=privateParent(file);if(reference.scope!==scope||reference.parent!==parent)return {error:forbidden()} as const;
  const bytes=decryptPrivateFile(file);
  // Legacy encrypted objects have no trusted scan attestation. Recheck exact
  // bytes before every export rather than treating encryption as malware safety.
  await scanPrivatePdf(bytes);
  const currentSession=await auth();
  if(!currentSession?.user?.id||currentSession.user.id!==session.user.id)return {error:unauthorized()} as const;
  const currentActor=await getOrCreateProfile(currentSession.user);
  if(currentActor.id!==actor.id||currentActor.verificationStatus==="SUSPENDED"||
    !await canAccessPrivateFile(currentActor,scope,parent))return {error:forbidden()} as const;
  return {file,bytes} as const;
}
