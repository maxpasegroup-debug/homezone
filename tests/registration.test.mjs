import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { registerHooks } from 'node:module';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import ts from 'typescript';
const state = { pending: new Map(), budgets: new Map(), users: new Map(), messages: [], sent: true, fail: false };
globalThis.__registrationFixture = state;
function matches(row, where) {
  return Object.entries(where).every(([key, value]) => {
    if (key === 'NOT') return !matches(row, value);
    if(value instanceof Date) return row[key] instanceof Date && row[key].getTime()===value.getTime();
    if (value && typeof value === 'object' && !(value instanceof Date)) {
      if ('lt' in value && !(row[key] < value.lt)) return false;
      if ('lte' in value && !(row[key] <= value.lte)) return false;
      if ('gt' in value && !(row[key] > value.gt)) return false;
      if ('in' in value && !value.in.includes(row[key])) return false;
      if ('startsWith' in value && !row[key].startsWith(value.startsWith)) return false;
      return true;
    }
    return row[key] === value;
  });
}
function assign(row,data) {
  for(const [field,value] of Object.entries(data))row[field]=value && typeof value==='object' && 'increment' in value ? row[field]+value.increment : value;
}
function model(rows, key, defaults = {}) {
  return {
    async upsert({where, create, update}) {
      if (state.fail) throw new Error('SYNTHETIC_PRIVATE_DB_DETAIL');
      if(rows===state.budgets)state.txKeys?.add(where.key);
      let row = [...rows.values()].find(v => matches(v,where));
      if (row) { rows.delete(row[key]); assign(row, update); rows.set(row[key], row); }
      else { row = {...defaults,...create}; rows.set(row[key],row); }
      if(rows===state.budgets && state.quotaFault)return state.quotaFault(row);
      return structuredClone(row);
    },
    async findUnique({where}) {
      if(rows===state.pending)state.lookups++;
      const result=structuredClone([...rows.values()].find(v=>matches(v,where)) ?? null);
      if(rows===state.pending && state.pendingReadHook) {
        const hook=state.pendingReadHook; state.pendingReadHook=null; await hook();
      }
      return result;
    },
    async findMany({where,take}) { return structuredClone([...rows.values()].filter(v=>matches(v,where)).slice(0,take)); },
    async updateMany({where,data}) {
      let count=0;
      for (const row of [...rows.values()]) if(matches(row,where)) {
        rows.delete(row[key]);
        for (const [field,value] of Object.entries(data)) row[field]=value && typeof value==='object' && 'increment' in value ? row[field]+value.increment : value;
        rows.set(row[key],row); count++;
      }
      return {count};
    },
    async deleteMany({where}) { let count=0; for(const [id,row] of rows) if(matches(row,where)){rows.delete(id);count++;} return {count}; }
  };
}
let queue=Promise.resolve();
state.db={
  emailRegistration:model(state.pending,'id',{attempts:0,consumedAt:null}),
  registrationBudget:model(state.budgets,'key',{count:0}),
  user:{
    async findFirst({where}) { return [...state.users.values()].find(u => (u.email ?? '').toLowerCase() === where.email.equals.toLowerCase()) ?? null; },
    async findUnique({where}) { return state.users.get(where.email) ?? null; },
    async create({data}) { if(state.failCreate)throw new Error('SYNTHETIC_PRIVATE_WRITE'); assert.equal(state.users.has(data.email),false); state.users.set(data.email,structuredClone({...data,id:'verified-fixture-user'})); return data; }
  },
  async $transaction(callback) {
    const previous=queue; let release; queue=new Promise(r=>{release=r;}); await previous;
    const keys=new Set();state.txKeys=keys;
    const snapshot=structuredClone({pending:state.pending,budgets:state.budgets,users:state.users});
    let result;
    try { result=await callback(state.db); }
    catch(error) { for(const name of ['pending','budgets','users']) { state[name].clear(); for(const [k,v] of snapshot[name])state[name].set(k,v); } throw error; }
    finally { release(); }
    if(state.afterTransaction)await state.afterTransaction([...keys]);
    return result;
  }
};
state.env={OTP_PEPPER:'synthetic-registration-pepper-32-characters',RESEND_API_KEY:'synthetic',RESEND_FROM_EMAIL:'test@fixture.invalid'};
const mocks={
  '@/lib/auth/redirect':'export const authOrigin=()=>"https://fixture.invalid";',
  '@/lib/db':'export const db=globalThis.__registrationFixture.db;',
  '@/lib/env':'export const env=globalThis.__registrationFixture.env;',
  '@/lib/email/resend':'export const sendRegistrationEmail=async(email,code)=>{const s=globalThis.__registrationFixture;s.messages.push({email,code});return s.deliver ? s.deliver() : {sent:s.sent};};'
};
const hooks=registerHooks({
  resolve(s,c,n){if(mocks[s])return {url:`data:text/javascript,${encodeURIComponent(mocks[s])}`,shortCircuit:true}; if(s.startsWith('@/'))return {url:new URL(`../src/${s.slice(2)}.ts`,import.meta.url).href,shortCircuit:true}; return n(s,c);},
  load(u,c,n){if(u.endsWith('.ts')&&!u.includes('node_modules'))return {format:'module',shortCircuit:true,source:ts.transpileModule(readFileSync(fileURLToPath(u),'utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText};return n(u,c);}
});
const {registrationRequest}=await import('../src/lib/auth/email-registration.ts');
const {verifyPassword}=await import('../src/lib/auth/password.ts');
const {sendRegistrationEmail,sendPasswordResetEmail}=await import('../src/lib/email/resend.ts');
const feedback=await import('../src/lib/auth/registration-feedback.ts');
hooks.deregister();
const fields={name:'Fictional Buyer',email:' Buyer@fixture.invalid ',password:'SyntheticPass123'};
const req=(body,headers={})=>new Request('https://fixture.invalid/api/auth/password/signup',{method:'POST',headers:{'content-type':'application/json',...headers},body:JSON.stringify(body)});
const call=(body,action='start',headers)=>registrationRequest(req(body,headers),action);
const start=async()=>{const r=await call(fields);assert.equal(r.status,202);return (await r.json()).challengeId;};
const code=()=>state.messages.at(-1).code;
function reset(){state.pending.clear();state.budgets.clear();state.users.clear();state.messages=[];state.sent=true;state.fail=false;state.failCreate=false;state.deliver=null;state.pendingReadHook=null;state.quotaFault=null;state.lookups=0;state.afterTransaction=null;state.txKeys=null;}
test('email registration uses actual handlers with mocked DB/email only',{timeout:30_000},async t=>{
 t.mock.timers.enable({apis:['Date'],now:Date.UTC(2026,9,24)});
 await t.test('no user before verification; hashed password/verifier, normalized email and USER-only activation',async()=>{
  reset();const id=await start();const row=state.pending.get(id);
  assert.equal(state.users.size,0);assert.equal(row.email,'buyer@fixture.invalid');assert.notEqual(row.codeHash,code());assert.ok(await verifyPassword(fields.password,row.passwordHash));
  const r=await call({challengeId:id,code:code()},'verify');assert.equal(r.status,200);
  const user=state.users.get('buyer@fixture.invalid');assert.equal(user.profile.create.role,'USER');assert.ok(user.emailVerified instanceof Date);
  assert.ok(await verifyPassword(fields.password,user.passwordCredential.create.passwordHash));assert.equal(state.pending.get(id).passwordHash,'');
  assert.equal(r.headers.get('set-cookie'),null); // OTP response does not bypass Auth.js.
 });
 await t.test('replay and concurrent verification activate exactly once',async()=>{
  reset();const id=await start(), body={challengeId:id,code:code()};
  const results=await Promise.all([call(body,'verify'),call(body,'verify')]);assert.deepEqual(results.map(r=>r.status).sort(),[200,400]);assert.equal(state.users.size,1);assert.equal((await call(body,'verify')).status,400);
 });
 await t.test('exact expiry boundary rejects activation',async()=>{
  reset();const id=await start(), body={challengeId:id,code:code()};t.mock.timers.tick(600000);
  assert.equal((await call(body,'verify')).status,400);assert.equal(state.users.size,0);
 });
 await t.test('five concurrent wrong guesses exhaust allowance; correct sixth is rejected',async()=>{
  reset();const id=await start(), correct=code(), wrong=correct==='000000'?'000001':'000000';
  const results=await Promise.all(Array.from({length:8},()=>call({challengeId:id,code:wrong},'verify')));assert.ok(results.every(r=>r.status===400));
  assert.equal(state.pending.get(id).attempts,5);assert.equal((await call({challengeId:id,code:correct},'verify')).status,400);assert.equal(state.users.size,0);
 });
 await t.test('resend cooldown and new challenge retire the previous identity and attempts',async()=>{
  reset();const id=await start(), previous=code();
  assert.equal((await call({challengeId:id},'resend')).status,429);
  await call({challengeId:id,code:previous==='000000'?'000001':'000000'},'verify');
  t.mock.timers.tick(60001);const response=await call({challengeId:id},'resend');assert.equal(response.status,202);const newer=(await response.json()).challengeId;
  assert.notEqual(newer,id);assert.equal(state.pending.has(id),false);assert.equal(state.pending.get(newer).attempts,0);
  assert.equal((await call({challengeId:id,code:previous},'verify')).status,400);
  assert.equal((await call({challengeId:newer,code:code()},'verify')).status,200);
 });
 await t.test('duplicate account responses are generic and cannot replace credentials or privileges',async()=>{
  reset();state.users.set('buyer@fixture.invalid',{id:'existing',email:'Buyer@fixture.invalid',role:'ADMIN',passwordCredential:{passwordHash:'unchanged'}});
  const before=structuredClone(state.users.get('buyer@fixture.invalid')), id=await start();assert.equal((await call({challengeId:id,code:code()},'verify')).status,200);assert.deepEqual(state.users.get('buyer@fixture.invalid'),before);
 });
 await t.test('duplicate starts share cooldown; only one is admitted',async()=>{
  reset();const results=await Promise.all([call(fields),call(fields)]);assert.deepEqual(results.map(r=>r.status).sort(),[202,429]);assert.equal(state.pending.size,1);
 });
 await t.test('three-per-email hourly budget survives independent requests',async()=>{
  reset();let id=await start();for(let i=0;i<2;i++){t.mock.timers.tick(60001);const response=await call({challengeId:id},'resend');assert.equal(response.status,202);id=(await response.json()).challengeId;}t.mock.timers.tick(60001);assert.equal((await call({challengeId:id},'resend')).status,429);
 });
 await t.test('delivery, database and missing configuration fail closed with no secret details',async()=>{
  reset();state.sent=false;assert.equal((await call(fields)).status,503);assert.equal(state.pending.size,0);assert.equal(state.users.size,0);
  reset();state.fail=true;const r=await call(fields);assert.equal(r.status,503);assert.ok(!(await r.text()).includes('SYNTHETIC_PRIVATE_DB_DETAIL'));
  reset();const pepper=state.env.OTP_PEPPER;state.env.OTP_PEPPER='';assert.equal((await call(fields)).status,503);assert.equal(state.pending.size,0);state.env.OTP_PEPPER=pepper;
 });
 await t.test('malformed input, role injection, cross-origin and oversized bodies are rejected',async()=>{
  reset();for(const body of [{...fields,email:'invalid'},{...fields,password:'weak'},{...fields,role:'ADMIN'},{...fields,name:'a'.repeat(5000)}]) assert.equal((await call(body)).status,400);
  assert.equal((await call(fields,'start',{origin:'https://other.invalid'})).status,403);assert.equal(state.users.size,0);assert.equal(state.messages.length,0);
 });
 await t.test('browser origin uses configured canonical origin, never internal or forwarded hosts',async()=>{
  reset();const request=new Request('http://internal.invalid/api/auth/password/signup',{method:'POST',headers:{'content-type':'application/json',origin:'https://fixture.invalid','x-forwarded-host':'attacker.invalid'},body:JSON.stringify(fields)});
  assert.equal((await registrationRequest(request,'start')).status,202);
 });
 await t.test('activation write failure rolls back consumption, attempts and credential erasure',async()=>{
  reset();const id=await start(), body={challengeId:id,code:code()}, before=structuredClone(state.pending.get(id));
  state.failCreate=true;assert.equal((await call(body,'verify')).status,503);assert.deepEqual(state.pending.get(id),before);assert.equal(state.users.size,0);
  state.failCreate=false;assert.equal((await call(body,'verify')).status,200);
 });
 await t.test('aggregate delivery and verification exhaustion deny safely',async()=>{
  reset();state.budgets.set('registration:delivery',{key:'registration:delivery',count:100,resetAt:new Date(Date.now()+3600000)});
  assert.equal((await call(fields)).status,429);assert.equal(state.pending.size,0);assert.equal(state.messages.length,0);
  reset();const id=await start();state.budgets.set('registration:verification',{key:'registration:verification',count:1000,resetAt:new Date(Date.now()+3600000)});
  assert.equal((await call({challengeId:id,code:code()},'verify')).status,429);assert.equal(state.pending.get(id).attempts,0);assert.equal(state.users.size,0);
 });
 await t.test('real provider adapter uses fixed template, bounded request and safe failure',async()=>{
  const previous=globalThis.fetch;
  try {
    let calls=0;
    globalThis.fetch=async(url,options)=>{calls++;assert.equal(url,'https://api.resend.com/emails');assert.ok(options.signal);const body=JSON.parse(options.body);assert.ok(body.text.includes('10 minutes'));return new Response('',{status:202});};
    assert.deepEqual(await sendRegistrationEmail('synthetic@fixture.invalid','123456'),{sent:true});assert.equal(calls,1);
    assert.deepEqual(await sendRegistrationEmail('synthetic@fixture.invalid','<invalid>'),{sent:false});assert.equal(calls,1);
    globalThis.fetch=async()=>{throw new Error('SYNTHETIC_PRIVATE_PROVIDER');};
    assert.deepEqual(await sendRegistrationEmail('synthetic@fixture.invalid','123456'),{sent:false});
  } finally { globalThis.fetch=previous; }
 });
 await t.test('exhausted challenge stays rejected; admitted resend issues a usable new five-guess challenge',async()=>{
  reset();const id=await start(), correct=code(), wrong=correct==='000000'?'000001':'000000';
  for(let i=0;i<5;i++)assert.equal((await call({challengeId:id,code:wrong},'verify')).status,400);
  t.mock.timers.tick(60001);
  assert.equal((await call({challengeId:id,code:correct},'verify')).status,400);
  const response=await call({challengeId:id},'resend');assert.equal(response.status,202);const newer=(await response.json()).challengeId;
  assert.notEqual(newer,id);assert.equal(state.messages.length,2);assert.equal(state.pending.has(id),false);assert.equal(state.pending.get(newer).attempts,0);
  assert.equal((await call({challengeId:id,code:correct},'verify')).status,400);assert.equal(state.users.size,0);
  assert.equal((await call({challengeId:newer,code:code()},'verify')).status,200);assert.equal(state.users.size,1);
 });
 await t.test('hourly retry points to actual expiry; one millisecond before remains blocked',async()=>{
  reset();let id=await start();for(let i=0;i<2;i++){t.mock.timers.tick(60001);const response=await call({challengeId:id},'resend');assert.equal(response.status,202);id=(await response.json()).challengeId;}
  t.mock.timers.tick(60001);const denied=await call(fields);assert.equal(denied.status,429);
  const deadline=[...state.budgets.values()].find(v=>v.key.endsWith(':hour')).resetAt.getTime();
  assert.equal(Number(denied.headers.get('retry-after')),Math.ceil((deadline-Date.now())/1000));assert.equal((await denied.json()).retryAfterSeconds,Number(denied.headers.get('retry-after')));
  t.mock.timers.tick(deadline-Date.now()-1);const early=await call(fields);assert.equal(early.status,429);assert.equal(early.headers.get('retry-after'),'1');
  t.mock.timers.tick(1);assert.equal((await call(fields)).status,202);assert.equal(state.messages.length,4);
 });
 await t.test('late delivery failure cannot delete a newer replacement challenge',async()=>{
  reset();let release, entered;const gate=new Promise(r=>{release=r;}), started=new Promise(r=>{entered=r;});let deliveries=0;
  state.deliver=async()=>{if(++deliveries===1){entered();await gate;return {sent:false};}return {sent:true};};
  const older=call(fields);await started;t.mock.timers.tick(60001);
  try {
    const id=await start(), before=structuredClone(state.pending.get(id));
    release();assert.equal((await older).status,503);assert.deepEqual(state.pending.get(id),before);
    assert.equal((await call({challengeId:id,code:code()},'verify')).status,200);assert.equal(state.users.size,1);
  } finally {release();await older;}
 });
 await t.test('resend with a stale read cannot resurrect a concurrently consumed challenge',async()=>{
  reset();const id=await start(), original=code();t.mock.timers.tick(60001);
  let release, entered;const gate=new Promise(r=>{release=r;}), started=new Promise(r=>{entered=r;});
  state.pendingReadHook=async()=>{entered();await gate;};
  const pending=call({challengeId:id},'resend');await started;
  try {
    assert.equal((await call({challengeId:id,code:original},'verify')).status,200);
    const before=structuredClone(state.pending.get(id));release();assert.equal((await pending).status,400);
    assert.deepEqual(state.pending.get(id),before);assert.equal(state.messages.length,1);assert.equal(state.users.size,1);
  } finally {release();await pending;}
 });
 await t.test('expiry crossing during verification is rechecked before activation',async()=>{
  reset();const id=await start(), original=code();state.pendingReadHook=()=>t.mock.timers.tick(600000);
  assert.equal((await call({challengeId:id,code:original},'verify')).status,400);assert.equal(state.users.size,0);
 });
 await t.test('a length-valid but registration-short pepper and missing sender fail closed',async()=>{
  reset();const saved={...state.env};
  try {
    state.env.OTP_PEPPER='x'.repeat(16);assert.equal((await call(fields)).status,503);
    state.env.OTP_PEPPER=saved.OTP_PEPPER;state.env.RESEND_FROM_EMAIL=undefined;state.env.EMAIL_FROM=undefined;
    assert.equal((await call(fields)).status,503);assert.equal(state.pending.size,0);assert.equal(state.messages.length,0);
  } finally {Object.assign(state.env,saved);delete state.env.EMAIL_FROM;}
 });
 await t.test('cooldown retry rounds up and admits at the exact reset boundary',async()=>{
  reset();const id=await start();let r=await call({challengeId:id},'resend');assert.equal(r.status,429);assert.equal(r.headers.get('retry-after'),'60');
  t.mock.timers.tick(59999);r=await call({challengeId:id},'resend');assert.equal(r.status,429);assert.equal(r.headers.get('retry-after'),'1');
  t.mock.timers.tick(1);r=await call({challengeId:id},'resend');assert.equal(r.status,202);assert.equal(state.messages.length,2);
 });
 await t.test('overlapping limits report the latest blocker and roll back partial admissions',async()=>{
  reset();await start();const now=Date.now(),total=state.budgets.get('registration:delivery'),hour=[...state.budgets.values()].find(v=>v.key.endsWith(':hour')),cooldown=[...state.budgets.values()].find(v=>v.key.endsWith(':cooldown'));
  Object.assign(total,{count:100,resetAt:new Date(now+120000)});Object.assign(hour,{count:3,resetAt:new Date(now+900000)});Object.assign(cooldown,{count:1,resetAt:new Date(now+180000)});
  const before=[total,hour,cooldown].map(v=>structuredClone(v));const r=await call(fields);assert.equal(r.status,429);assert.equal(r.headers.get('retry-after'),'900');
  assert.deepEqual(before.map(v=>state.budgets.get(v.key)),before);assert.equal(state.messages.length,1);
 });
 await t.test('aggregate delivery and verification retry use their own expiry',async()=>{
  reset();const id=await start(),original=code();Object.assign(state.budgets.get('registration:delivery'),{count:100,resetAt:new Date(Date.now()+240000)});
  let r=await call(fields);assert.equal(r.status,429);assert.equal(r.headers.get('retry-after'),'240');
  state.budgets.set('registration:verification',{key:'registration:verification',count:1000,resetAt:new Date(Date.now()+420000)});
  r=await call({challengeId:id,code:original},'verify');assert.equal(r.status,429);assert.equal(r.headers.get('retry-after'),'420');assert.equal(state.pending.get(id).attempts,0);
 });
 await t.test('malformed and unknown IDs consume request admission before pending lookup',async()=>{
  reset();assert.equal((await call({challengeId:'malformed'},'resend')).status,400);assert.equal(state.lookups,0);
  assert.equal((await call({challengeId:'f'.repeat(64)},'resend')).status,400);assert.equal(state.lookups,1);
  assert.equal(state.budgets.get('registration:requests').count,2);assert.equal(state.budgets.has('registration:delivery'),false);assert.equal(state.messages.length,0);
  state.budgets.set('registration:requests',{key:'registration:requests',count:5000,resetAt:new Date(Date.now()+120000)});
  const before=state.lookups,r=await call({challengeId:'f'.repeat(64)},'resend');assert.equal(r.status,429);assert.equal(r.headers.get('retry-after'),'120');assert.equal(state.lookups,before);
 });
 await t.test('missing quotas initialize, expired quotas reset, malformed rows fail closed',async()=>{
  reset();assert.equal((await call({challengeId:'f'.repeat(64)},'resend')).status,400);assert.equal(state.budgets.get('registration:requests').count,1);
  state.budgets.set('registration:requests',{key:'registration:requests',count:5000,resetAt:new Date(Date.now())});
  assert.equal((await call({challengeId:'f'.repeat(64)},'resend')).status,400);assert.equal(state.budgets.get('registration:requests').count,1);
  for(const fault of [()=>null,row=>({...row,count:-1}),row=>({...row,count:0.5}),row=>({...row,resetAt:new Date(NaN)})]){
   reset();state.quotaFault=fault;const r=await call(fields);assert.equal(r.status,503);assert.equal(r.headers.get('retry-after'),null);assert.equal(state.lookups,0);assert.equal(state.messages.length,0);
  }
 });
 await t.test('concurrent resends publish exactly one usable replacement',async()=>{
  reset();const id=await start();t.mock.timers.tick(60000);const replies=await Promise.all([call({challengeId:id},'resend'),call({challengeId:id},'resend')]);
  assert.equal(replies.filter(v=>v.status===202).length,1);assert.ok(replies.filter(v=>v.status!==202).every(v=>[400,429].includes(v.status)));
  const winner=await replies.find(v=>v.status===202).json();assert.equal(state.pending.has(id),false);assert.equal(state.pending.size,1);assert.equal(state.messages.length,2);
  assert.equal((await call({challengeId:winner.challengeId,code:code()},'verify')).status,200);assert.equal(state.users.size,1);
 });
 await t.test('resend winning before old verification activation protects the new challenge',async()=>{
  reset();const id=await start(),original=code();t.mock.timers.tick(60000);let release,entered;const gate=new Promise(r=>{release=r;}),ready=new Promise(r=>{entered=r;});
  state.afterTransaction=async keys=>{if(keys.includes('registration:verification')){state.afterTransaction=null;entered();await gate;}};
  const obsolete=call({challengeId:id,code:original},'verify');await ready;
  try {const r=await call({challengeId:id},'resend');assert.equal(r.status,202);const newer=(await r.json()).challengeId,before=structuredClone(state.pending.get(newer));
   release();assert.equal((await obsolete).status,400);assert.deepEqual(state.pending.get(newer),before);assert.equal(state.users.size,0);assert.equal((await call({challengeId:newer,code:code()},'verify')).status,200);
  } finally {release();await obsolete;}
 });
 await t.test('obsolete delivery admission cannot publish over a newer registration',async()=>{
  reset();let release,entered;const gate=new Promise(r=>{release=r;}),ready=new Promise(r=>{entered=r;});
  state.afterTransaction=async keys=>{if(keys.includes('registration:delivery')){state.afterTransaction=null;entered();await gate;}};
  const obsolete=call(fields);await ready;t.mock.timers.tick(60000);
  try {const newer=await start(),before=structuredClone(state.pending.get(newer));release();assert.equal((await obsolete).status,400);assert.deepEqual(state.pending.get(newer),before);assert.equal(state.messages.length,1);assert.equal((await call({challengeId:newer,code:code()},'verify')).status,200);
  } finally {release();await obsolete;}
 });
 await t.test('replacement delivery failure never restores an obsolete challenge',async()=>{
  reset();const id=await start(),original=code();t.mock.timers.tick(60000);state.sent=false;const r=await call({challengeId:id},'resend');assert.equal(r.status,503);assert.equal((await r.json()).restartRequired,true);
  assert.equal(state.pending.has(id),false);assert.equal(state.pending.size,0);assert.equal((await call({challengeId:id,code:original},'verify')).status,400);assert.equal(state.users.size,0);
 });
 await t.test('success metadata accounts for delivery latency and hourly saturation',async()=>{
  reset();state.deliver=async()=>{const row=[...state.pending.values()][0];assert.equal(row.attempts,0);assert.equal(row.consumedAt,null);assert.ok(row.expiresAt>Date.now());t.mock.timers.tick(5000);return {sent:true};};
  let r=await call(fields),data=await r.json();assert.equal(r.status,202);assert.equal(data.expiresIn,595);assert.equal(data.resendAfter,55);assert.equal(Date.parse(data.expiresAt),state.pending.get(data.challengeId).expiresAt.getTime());
  for(let i=0;i<2;i++){t.mock.timers.tick(60000);r=await call({challengeId:data.challengeId},'resend');assert.equal(r.status,202);data=await r.json();}
  assert.ok(data.resendAfter>60);const hour=[...state.budgets.values()].find(v=>v.key.endsWith(':hour'));assert.equal(data.resendAfter,Math.ceil((hour.resetAt.getTime()-Date.now())/1000));assert.equal(Date.parse(data.resendAt),hour.resetAt.getTime());
 });
 await t.test('the last request slot extends a delivery rejection to the request-window expiry',async()=>{
  reset();const id=await start();state.budgets.set('registration:requests',{key:'registration:requests',count:4999,resetAt:new Date(Date.now()+900000)});
  const r=await call({challengeId:id},'resend');assert.equal(r.status,429);assert.equal(r.headers.get('retry-after'),'900');assert.equal(state.messages.length,1);
 });
 await t.test('each replacement has five guesses, never resets in place and still obeys three deliveries',async()=>{
  reset();let id=await start();
  for(let generation=0;generation<2;generation++){
    const original=code(),wrong=original==='000000'?'000001':'000000';for(let i=0;i<5;i++)assert.equal((await call({challengeId:id,code:wrong},'verify')).status,400);
    assert.equal((await call({challengeId:id,code:original},'verify')).status,400);t.mock.timers.tick(60000);
    const r=await call({challengeId:id},'resend');assert.equal(r.status,202);const previous=id;id=(await r.json()).challengeId;assert.notEqual(id,previous);assert.equal(state.pending.has(previous),false);
  }
  t.mock.timers.tick(60000);assert.equal((await call({challengeId:id},'resend')).status,429);assert.equal(state.messages.length,3);assert.equal((await call({challengeId:id,code:code()},'verify')).status,200);
 });
 await t.test('expired resends require restart without sending unusable media or reviving state',async()=>{
  reset();const id=await start();t.mock.timers.tick(600000);const r=await call({challengeId:id},'resend');assert.equal(r.status,400);assert.equal((await r.json()).restartRequired,true);assert.equal(state.messages.length,1);assert.equal(state.users.size,0);
 });
 await t.test('late provider success reports supersession rather than an unusable accepted challenge',async()=>{
  reset();let release,entered;const gate=new Promise(r=>{release=r;}),ready=new Promise(r=>{entered=r;});let calls=0;
  state.deliver=async()=>{if(++calls===1){entered();await gate;}return {sent:true};};const obsolete=call(fields);await ready;t.mock.timers.tick(60000);
  try {const newer=await start(),before=structuredClone(state.pending.get(newer));release();assert.equal((await obsolete).status,400);assert.deepEqual(state.pending.get(newer),before);assert.equal((await call({challengeId:newer,code:code()},'verify')).status,200);}
  finally {release();await obsolete;}
 });
 await t.test('browser timing parser rotates identity, bounds expiry and never shortens server delay',()=>{
  const now=Date.now(),id='a'.repeat(64),data={challengeId:id,expiresIn:595,resendAfter:3600,expiresAt:new Date(now+594000).toISOString(),resendAt:new Date(now+3605000).toISOString()};
  assert.deepEqual(feedback.registrationChallenge(data,now),{challengeId:id,expiresAt:now+594000,resendAt:now+3605000});
  for(const bad of [{...data,expiresAt:'invalid'},{...data,resendAfter:-1},{...data,expiresIn:601}])assert.equal(feedback.registrationChallenge(bad,now),null);
 });
 await t.test('browser retry parsing honors full hourly waits and fails closed on bad headers',()=>{
  const now=Date.now();assert.equal(feedback.registrationRetry('3600',now),now+3600000);
  for(const bad of [null,'','0','-1','1.5','Infinity','86401','unknown'])assert.equal(feedback.registrationRetry(bad,now),null);
 });
 await t.test('registration cleanup cannot erase password counters even when application time treats them as old',async()=>{
  reset();const old=new Date(Date.now()-7200000);
  const global={key:'password-signin:v1:global',count:1000,resetAt:old};
  const account={key:`password-signin:v1:account:${'a'.repeat(64)}`,count:10,resetAt:old};
  state.budgets.set(global.key,structuredClone(global));state.budgets.set(account.key,structuredClone(account));
  state.budgets.set('registration:old-fixture',{key:'registration:old-fixture',count:1,resetAt:old});
  await start();assert.deepEqual(state.budgets.get(global.key),global);assert.deepEqual(state.budgets.get(account.key),account);
  assert.equal(state.budgets.has('registration:old-fixture'),false);
 });
 await t.test('staging dispatch rejects missing malformed wildcard and unlisted recipients before fetch',async()=>{
  const previous=globalThis.fetch,oldOrigin=process.env.AUTH_STAGING_ORIGIN,oldPolicy=state.env.STAGING_EMAIL_RECIPIENTS;let sends=0;
  try {
   process.env.AUTH_STAGING_ORIGIN='https://staging.example.com';globalThis.fetch=async()=>{sends++;return new Response('{}',{status:200});};
   for(const policy of [undefined,'','*','@fixture.invalid','allowed@fixture.invalid,','bad',Array(21).fill('allowed@fixture.invalid').join(','),'x'.repeat(5101),'allowed@fixture.invalid']) {
    state.env.STAGING_EMAIL_RECIPIENTS=policy;
    assert.equal((await sendRegistrationEmail('unlisted@fixture.invalid','123456')).sent,false);
    assert.equal((await sendPasswordResetEmail({email:'unlisted@fixture.invalid',resetUrl:'https://staging.example.com/reset-password?token=synthetic'})).sent,false);
   }
   assert.equal(sends,0);
  } finally {globalThis.fetch=previous;state.env.STAGING_EMAIL_RECIPIENTS=oldPolicy;if(oldOrigin===undefined)delete process.env.AUTH_STAGING_ORIGIN;else process.env.AUTH_STAGING_ORIGIN=oldOrigin;}
 });
 await t.test('provider acceptance after challenge expiry cannot publish an accepted challenge or activate it',async()=>{
  reset();state.deliver=async()=>{t.mock.timers.tick(600000);return {sent:true};};
  const response=await call(fields);assert.equal(response.status,400);assert.equal((await response.json()).restartRequired,true);
  const pending=[...state.pending.values()][0];assert.equal((await call({challengeId:pending.id,code:code()},'verify')).status,400);assert.equal(state.users.size,0);
 });
 await t.test('staging dispatch permits only exact normalized approved mailboxes for registration and recovery',async()=>{
  const previous=globalThis.fetch,oldOrigin=process.env.AUTH_STAGING_ORIGIN,oldPolicy=state.env.STAGING_EMAIL_RECIPIENTS;const messages=[];
  try {
   process.env.AUTH_STAGING_ORIGIN='https://staging.example.com';state.env.STAGING_EMAIL_RECIPIENTS=' Allowed@fixture.invalid , second@fixture.invalid';
   globalThis.fetch=async(_url,options)=>{messages.push(JSON.parse(options.body));return new Response('{}',{status:200});};
   assert.equal((await sendRegistrationEmail('allowed@fixture.invalid','123456')).sent,true);
   assert.equal((await sendPasswordResetEmail({email:'second@fixture.invalid',resetUrl:'https://staging.example.com/reset-password?token=synthetic'})).sent,true);
   for(const email of ['allowed+other@fixture.invalid','allowed@fixture.invalid.evil.invalid','other@fixture.invalid'])assert.equal((await sendRegistrationEmail(email,'123456')).sent,false);
   assert.equal(messages.length,2);assert.deepEqual(messages.map(v=>v.to),['allowed@fixture.invalid','second@fixture.invalid']);
   delete process.env.AUTH_STAGING_ORIGIN;assert.equal((await sendRegistrationEmail('other@fixture.invalid','123456')).sent,false);assert.equal(messages.length,2);
  } finally {globalThis.fetch=previous;state.env.STAGING_EMAIL_RECIPIENTS=oldPolicy;if(oldOrigin===undefined)delete process.env.AUTH_STAGING_ORIGIN;else process.env.AUTH_STAGING_ORIGIN=oldOrigin;}
 });
});
