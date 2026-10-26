import {logger} from "@/lib/logging/logger";
import {requirePrivateScanner,scanPrivatePdf} from "./private-file-scanner";
﻿import {createCipheriv,createDecipheriv,randomBytes,randomUUID} from "node:crypto";
import {db} from "@/lib/db";
import {isAdminRole} from "@/lib/auth/roles";
import {leadAccessWhere} from "@/lib/leads/access";
import type {PrivateFile,Prisma,PropertyDocumentType} from "@prisma/client";
export const PRIVATE_FILE_MAX=524288;
export type FileScope="property"|"lead"|"studio";
export type FileActor={id:string;role:string};
export class PrivateFileUnavailable extends Error {constructor(){super("Private document service unavailable");}}
function configuration(){
  try{
    if(process.env.PRIVATE_FILES_ENABLED!=="true")throw new Error();
    const active=process.env.PRIVATE_FILE_ACTIVE_KEY_ID??"";
    if(!/^[A-Za-z0-9_-]{1,40}$/.test(active))throw new Error();
    const raw:unknown=JSON.parse(process.env.PRIVATE_FILE_KEYS??"");
    if(!raw||typeof raw!=="object"||Array.isArray(raw))throw new Error();
    const entries=Object.entries(raw);if(!entries.length||entries.length>8)throw new Error();
    const keys=new Map<string,Buffer>();
    for(const [id,value]of entries){if(!/^[A-Za-z0-9_-]{1,40}$/.test(id)||typeof value!=="string"||!/^[A-Za-z0-9+/]{43}=$/.test(value))throw new Error();
      const key=Buffer.from(value,"base64");if(key.length!==32||key.toString("base64")!==value)throw new Error();keys.set(id,key);}
    if(!keys.has(active))throw new Error();return {active,keys};
  }catch{throw new PrivateFileUnavailable();}
}
export function requirePrivateFiles(){configuration();requirePrivateScanner();}
export const privateWhere=(scope:FileScope,parent:string):Prisma.PrivateFileWhereInput=>scope==="property"?{scope,propertyId:parent}:scope==="lead"?{scope,leadId:parent}:{scope,studioRequestId:parent};
export async function canAccessPrivateFile(actor:FileActor,scope:FileScope,parent:string,write=false){
  if(scope==="property")return Boolean(await db.property.findFirst({where:{id:parent,...(!isAdminRole(actor.role)?{ownerId:actor.id}:{})},select:{id:true}}));
  if(scope==="lead")return Boolean(await db.lead.findFirst({where:{id:parent,...(!isAdminRole(actor.role)?leadAccessWhere(actor.id):{})},select:{id:true}}));
  if(write&&!isAdminRole(actor.role))return false;
  return Boolean(await db.studioRequest.findFirst({where:{id:parent,...(!isAdminRole(actor.role)?{requesterId:actor.id}:{})},select:{id:true}}));
}
export function privateParent(file:Pick<PrivateFile,"scope"|"propertyId"|"leadId"|"studioRequestId">){
  if(file.scope==="property"&&file.propertyId)return {scope:"property" as const,parent:file.propertyId};
  if(file.scope==="lead"&&file.leadId)return {scope:"lead" as const,parent:file.leadId};
  if(file.scope==="studio"&&file.studioRequestId)return {scope:"studio" as const,parent:file.studioRequestId};
  throw new PrivateFileUnavailable();
}
export function managedFileId(value:string){const match=/^\/api\/private-files\/([a-f0-9-]{36})$/.exec(value);return match?.[1]??null;}
export async function matchesPrivateReference(url:string,scope:FileScope,parent:string){const id=managedFileId(url);return id?Boolean(await db.privateFile.findFirst({where:{id,...privateWhere(scope,parent)},select:{id:true}})):false;}
export async function storePrivatePdf(actor:FileActor,scope:FileScope,parent:string,name:string,bytes:Buffer,documentType:PropertyDocumentType,notes?:string){
  const config=configuration();if(bytes.length<5||bytes.length>PRIVATE_FILE_MAX||bytes.subarray(0,5).toString()!=="%PDF-")throw new Error("Use a PDF up to 512 KiB");
  // Own the exact admitted bytes across the asynchronous scan and encryption.
  bytes=Buffer.from(bytes);
  await scanPrivatePdf(bytes);
  const fileName=name.replace(/[^A-Za-z0-9 ._-]/g,"_").slice(0,140).replace(/^\.+/,"")||"document.pdf";
  const id=randomUUID(),iv=randomBytes(12);const cipher=createCipheriv("aes-256-gcm",config.keys.get(config.active)!,iv);
  cipher.setAAD(Buffer.from(`${id}:${scope}:${parent}`));const content=Buffer.concat([cipher.update(bytes),cipher.final()]);
  const ciphertext=Buffer.concat([iv,cipher.getAuthTag(),content]);
  return db.$transaction(async tx=>{
    // Scanning is asynchronous: re-establish account authority inside admission,
    // not solely from the profile that existed before the scanner request.
    await tx.$queryRaw`SELECT id FROM "Profile" WHERE id=${actor.id} FOR UPDATE`;
    const currentActor=await tx.profile.findUnique({where:{id:actor.id},select:{role:true,verificationStatus:true}});
    if(!currentActor||currentActor.verificationStatus==="SUSPENDED"||currentActor.role!==actor.role)throw new PrivateFileUnavailable();
    // Serialize quota admission on the existing parent, across instances.
    if(scope==="property")await tx.$queryRaw`SELECT id FROM "Property" WHERE id=${parent} FOR UPDATE`;
    else if(scope==="lead")await tx.$queryRaw`SELECT id FROM "Lead" WHERE id=${parent} FOR UPDATE`;
    else await tx.$queryRaw`SELECT id FROM "StudioRequest" WHERE id=${parent} FOR UPDATE`;
    // Recheck authority after acquiring the lock, using the transaction itself.
    const allowed=scope==="property"?await tx.property.findFirst({where:{id:parent,...(!isAdminRole(actor.role)?{ownerId:actor.id}:{})},select:{id:true}}):
      scope==="lead"?await tx.lead.findFirst({where:{id:parent,...(!isAdminRole(actor.role)?leadAccessWhere(actor.id):{})},select:{id:true}}):
      isAdminRole(actor.role)?await tx.studioRequest.findUnique({where:{id:parent},select:{id:true}}):null;
    if(!allowed)throw new PrivateFileUnavailable();
    if(await tx.privateFile.count({where:privateWhere(scope,parent)})>=50)throw new PrivateFileUnavailable();
    await tx.privateFile.create({data:{id,scope,propertyId:scope==="property"?parent:null,leadId:scope==="lead"?parent:null,
      studioRequestId:scope==="studio"?parent:null,uploadedById:actor.id,fileName,bytes:bytes.length,keyId:config.active,ciphertext}});
    const fileUrl=`/api/private-files/${id}`;
    if(scope==="property")await tx.propertyDocument.create({data:{propertyId:parent,uploadedById:actor.id,fileName,fileUrl,fileSize:bytes.length,mimeType:"application/pdf",documentType,notes}});
    if(scope==="lead")await tx.brokerClientDocument.create({data:{leadId:parent,brokerId:actor.id,title:fileName,fileUrl,documentType:"OTHER"}});
    if(scope==="studio")await tx.studioDeliveryFile.create({data:{studioRequestId:parent,fileName,fileUrl,fileType:"OTHER",notes}});
    await tx.auditLog.create({data:{actorId:actor.id,action:"PRIVATE_DOCUMENT_STORED",entityType:"private_file",entityId:id,metadata:{scope,bytes:bytes.length}}});
    return {id,fileName,bytes:bytes.length,url:fileUrl};
  });
}
export function decryptPrivateFile(file:PrivateFile){
  const config=configuration(),key=config.keys.get(file.keyId);if(!key||file.ciphertext.length!==file.bytes+28)throw new PrivateFileUnavailable();
  const {scope,parent}=privateParent(file);const data=Buffer.from(file.ciphertext);
  const decipher=createDecipheriv("aes-256-gcm",key,data.subarray(0,12));decipher.setAAD(Buffer.from(`${file.id}:${scope}:${parent}`));decipher.setAuthTag(data.subarray(12,28));
  return Buffer.concat([decipher.update(data.subarray(28)),decipher.final()]);
}

export function reportPrivateFileFailure(operation:"upload"|"download"|"list"){
  // No exception argument is accepted: provider/ORM errors can contain inputs.
  try{logger.error("Private document operation failed",{operation});}catch{/* Diagnostics cannot break the safe response. */}
}
