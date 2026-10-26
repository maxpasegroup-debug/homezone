import Link from "next/link";
import {db} from "@/lib/db";
import {redirect} from "next/navigation";
import {requireAdminProfile} from "@/lib/auth/admin";
import {AccountRequestReview} from "@/components/documents/account-request-review";
import {z} from "zod";
export const dynamic="force-dynamic";
const statuses=["OPEN","REVIEWING","REVIEWED","CLOSED"] as const;
const token=z.tuple([z.literal(1),z.string(),z.string().datetime(),z.string().regex(/^[A-Za-z0-9_-]{8,128}$/)]);
export default async function AccountRequestsPage({searchParams}:{searchParams:Promise<{page?:string;after?:string;status?:string}>}){
 const reviewer=await requireAdminProfile();if(reviewer.verificationStatus==="SUSPENDED")redirect("/dashboard");
 const q=await searchParams;
 const status=q.status?z.enum(statuses).safeParse(q.status):null;
 if(status&&!status.success)return <main className="container py-10"><Link href={{pathname:"/admin/account-requests"}}>Reset filters</Link><p>Invalid review filter.</p></main>;
 const selected=status?.success?status.data:undefined;
 let anchor:z.infer<typeof token>|undefined;
 try{if(q.after){if(q.after.length>512||!/^[A-Za-z0-9_-]+$/.test(q.after))throw Error();anchor=token.parse(JSON.parse(Buffer.from(q.after,"base64url").toString("utf8")));if(anchor[1]!== (selected??"")||!Number.isFinite(new Date(anchor[2]).getTime()))throw Error();}}
 catch{return <main className="container py-10"><Link href={{pathname:"/admin/account-requests"}}>Restart review queue</Link><p>Invalid review cursor. No records were queried.</p></main>;}
 const page=anchor?1:Math.min(1000,Math.max(1,Number.parseInt(q.page??"1",10)||1));
 try{const date=anchor?new Date(anchor[2]):null;
 const rows=await db.accountServiceRequest.findMany({take:21,skip:anchor?0:(page-1)*20,
 where:{...(selected?{status:selected}:{}),...(anchor&&date?{OR:[{createdAt:{lt:date}},{createdAt:date,id:{lt:anchor[3]}}]}:{})},
 orderBy:[{createdAt:"desc"},{id:"desc"}],select:{id:true,profileId:true,kind:true,target:true,status:true,reviewNote:true,createdAt:true}});
 const visible=rows.slice(0,20),last=visible.at(-1);
 const next=rows.length>20&&last?Buffer.from(JSON.stringify([1,selected??"",last.createdAt.toISOString(),last.id])).toString("base64url"):null;
 return <main className="container space-y-5 py-10"><Link href="/admin">Back to administration</Link><h1 className="text-3xl font-bold">Account and refund review requests</h1>
 <p>Review queue only. Retention, deletion authority, refund eligibility and provider execution must be approved separately. Refresh for concurrent changes.</p>
 <nav aria-label="Review status" className="flex flex-wrap gap-4"><Link href={{pathname:"/admin/account-requests"}}>All</Link>{statuses.map(value=><Link key={value} href={{pathname:"/admin/account-requests",query:{status:value}}} aria-current={selected===value?"page":undefined}>{value}</Link>)}</nav>
 {visible.map(r=><section className="rounded-2xl border p-5" key={r.id}><h2 className="font-semibold">{r.kind.replaceAll("_"," ")} - {r.status}</h2><p>Account reference: {r.profileId}</p><p>Target: {r.target}</p>{r.reviewNote?<p>{r.reviewNote}</p>:null}<AccountRequestReview id={r.id} status={r.status}/></section>)}
 {!rows.length?<p>No review requests on this page.</p>:null}<div className="flex gap-4">{anchor||page>1?<Link href={{pathname:"/admin/account-requests",query:selected?{status:selected}:{}}}>First page</Link>:null}{next?<Link href={{pathname:"/admin/account-requests",query:{...(selected?{status:selected}:{}),after:next}}}>Next</Link>:null}</div></main>;
 }catch{return <main className="container py-10"><Link href={{pathname:"/admin/account-requests"}}>Restart queue</Link><p>Review requests are unavailable. No empty result or successful operation is assumed.</p></main>;}
}
