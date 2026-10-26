"use client";
import {useState} from "react";
import {Button} from "@/components/ui/button";
export function AccountRequestReview({id,status}:{id:string;status:string}){
 const [note,setNote]=useState(""),[busy,setBusy]=useState(false),[message,setMessage]=useState("");
 async function save(next:string){if(busy)return;setBusy(true);try{const response=await fetch(`/api/admin/account-requests/${id}`,{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({status:next,reviewNote:note})});
  if(response.ok){window.location.reload();return;}setMessage("Review update could not be confirmed. Refresh before retrying.");}catch{setMessage("Review update could not be confirmed.");}finally{setBusy(false);}}
 return <div className="mt-3 space-y-3"><p className="text-sm">These controls record human review only. They do not delete accounts, transfer money, or issue refunds.</p>
 <textarea aria-label="Review note" className="w-full rounded-xl border p-3" maxLength={500} value={note} onChange={e=>setNote(e.target.value)}/>
 {status==="OPEN"?<Button disabled={busy||note.trim().length<5} onClick={()=>save("REVIEWING")}>Begin review</Button>:null}
 {status==="REVIEWING"?<div className="flex flex-wrap gap-2"><Button disabled={busy||note.trim().length<5} onClick={()=>save("REVIEWED")}>Record reviewed</Button><Button variant="outline" disabled={busy||note.trim().length<5} onClick={()=>save("CLOSED")}>Close review request</Button></div>:null}
 {message?<p role="status">{message}</p>:null}</div>;
}
