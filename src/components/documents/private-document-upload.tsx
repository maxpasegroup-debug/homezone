"use client";
import {useState} from "react";
import {Button} from "@/components/ui/button";
export function PrivateDocumentUpload({scope,parent,documentType="OTHER",notes,onUploaded}:{scope:"property"|"lead"|"studio";parent:string;documentType?:string;notes?:string;onUploaded?:()=>void}){
  const [file,setFile]=useState<File|null>(null),[busy,setBusy]=useState(false),[message,setMessage]=useState("");
  async function upload(){
    if(!file||busy)return;
    if(file.size>524288){setMessage("Choose a PDF no larger than 512 KiB.");return;}
    setBusy(true);setMessage("");
    try{
      const bytes=new Uint8Array(await file.arrayBuffer());let raw="";for(const b of bytes)raw+=String.fromCharCode(b);
      const response=await fetch("/api/mobile/documents",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({scope,parent,documentType,notes:notes||undefined,fileName:file.name,base64:btoa(raw)})});
      const data=await response.json().catch(()=>null);
      if(!response.ok||typeof data?.file?.id!=="string"){setMessage("Document storage could not be confirmed. The private service may be unavailable; refresh before retrying.");return;}
      setFile(null);setMessage("The server confirmed private storage. Downloads require account authorization.");onUploaded?.();
    }catch{setMessage("The request could not be confirmed. Refresh before retrying.");}finally{setBusy(false);}
  }
  return <div className="space-y-3"><p className="text-sm text-muted-foreground">Private PDF, maximum 512 KiB. Requires the configured encrypted-document service. Files are retained until the approved retention workflow is available.</p>
    <input aria-label="Private PDF" type="file" accept="application/pdf,.pdf" disabled={busy} onChange={e=>setFile(e.target.files?.[0]??null)}/>
    <Button disabled={busy||!file} onClick={upload}>{busy?"Uploading...":"Upload private PDF"}</Button>
    {message?<p role="status" className="text-sm">{message}</p>:null}</div>;
}
