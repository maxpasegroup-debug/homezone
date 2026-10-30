import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { registerHooks } from 'node:module';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import ts from 'typescript';

// Execute the real authorizer, KDF and budget algorithm with synthetic storage.
// This deliberately does NOT claim PostgreSQL row-lock/concurrency verification.
const state = { rows: new Map(), now: new Date(), fail: false, credential: null };
const budget = {
  async upsert({where, create, update}) {
    const row = state.rows.get(where.key) ?? structuredClone(create);
    if (state.rows.has(where.key)) for (const [key, value] of Object.entries(update)) {
      row[key] = value && typeof value === 'object' && 'increment' in value ? row[key] + value.increment : value;
    }
    state.rows.set(where.key, row); return structuredClone(row);
  },
  async update({where, data}) {return this.upsert({where, create:{}, update:data});},
  async create({data}) {state.rows.set(data.key, structuredClone(data)); return data;},
  async findUnique({where}) {return structuredClone(state.rows.get(where.key) ?? null);},
  async count({where}) {return [...state.rows.keys()].filter(key => key.startsWith(where.key.startsWith)).length;},
  async deleteMany({where}) {for (const key of where.key.in) if (state.rows.get(key)?.resetAt <= where.resetAt.lte) state.rows.delete(key);},
};
const tx = {
  mobilePinLoginBudget: budget,
  mobilePinCredential: {async findUnique({where}) {return where.normalizedMobile === '+919000000001' ? structuredClone(state.credential) : null;}},
  async $queryRaw(strings, ...values) {
    const sql = strings.join('');
    if (sql.includes('clock_timestamp')) return [{now: state.now}];
    if (sql.includes('SKIP LOCKED')) return [...state.rows.values()]
      .filter(row => row.key.startsWith('mobile-pin:v2:failures:') && row.resetAt <= state.now).slice(0,100).map(({key}) => ({key}));
    return state.rows.has(values[0]) ? [{key: values[0]}] : [];
  },
};
globalThis.__pinLoginFixture = {async $transaction(action) {
  if (state.fail) throw Error('synthetic storage failure');
  const before = structuredClone(state.rows);
  try {return await action(tx);} catch (error) {state.rows = before; throw error;}
}};
const hooks = registerHooks({
  resolve(specifier, context, next) {
    if (specifier === '@/lib/db') return {url:'data:text/javascript,export const db=globalThis.__pinLoginFixture;',shortCircuit:true};
    if (specifier === '@/lib/auth/mobile-pin-diagnostics') return {url:'data:text/javascript,export const reportMobilePinFailure=()=>{}; export class MobilePinHashUnavailable extends Error{}',shortCircuit:true};
    if (specifier.startsWith('@/')) return {url:new URL('../src/'+specifier.slice(2)+'.ts',import.meta.url).href,shortCircuit:true};
    return next(specifier,context);
  },
  load(url,context,next) {
    if(url.endsWith('.ts')&&!url.includes('node_modules')) return {format:'module',shortCircuit:true,source:ts.transpileModule(readFileSync(fileURLToPath(url),'utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText};
    return next(url,context);
  },
});
const {authorizeMobilePin} = await import('../src/lib/auth/mobile-pin.ts');
const {hashMobilePin} = await import('../src/lib/auth/mobile-pin-hash.ts');
hooks.deregister();
const credentials = {phone:'+919000000001',pin:'001234'};
const failures = () => [...state.rows.values()].find(row=>row.key.startsWith('mobile-pin:v2:failures:'));
test('actual PIN authorizer and failure accounting with synthetic database only', async t => {
  const names = ['AUTH_MOBILE_PIN_ENABLED','MOBILE_PIN_PEPPER_V1','MOBILE_PIN_RATE_LIMIT_KEY','MOBILE_PIN_ACCOUNT_ATTEMPTS','MOBILE_PIN_ACCOUNT_WINDOW_MS','MOBILE_PIN_GLOBAL_ATTEMPTS','MOBILE_PIN_GLOBAL_WINDOW_MS','MOBILE_PIN_MAX_ACCOUNTS'];
  const old = Object.fromEntries(names.map(name=>[name,process.env[name]]));
  for(const name of names) delete process.env[name];
  process.env.AUTH_MOBILE_PIN_ENABLED='true';
  process.env.MOBILE_PIN_PEPPER_V1='synthetic-only-login-pepper-not-a-runtime-secret';
  process.env.MOBILE_PIN_RATE_LIMIT_KEY='synthetic-only-login-budget-not-a-runtime-secret';
  try {
    const pinHash=await hashMobilePin(credentials.pin,credentials.phone);
    const reset=()=>{state.rows.clear();state.fail=false;state.now=new Date();state.credential={id:'credential',userId:'synthetic-user',pinHash,user:{id:'synthetic-user',email:null,name:null,image:null,sessionVersion:0,profile:{verificationStatus:'PENDING'}}};};
    await t.test('success preserves leading zero and consumes no failures',async()=>{
      reset(); for(let i=0;i<6;i++) assert.equal((await authorizeMobilePin(credentials))?.id,'synthetic-user');
      assert.equal(failures().count,0); assert.equal(state.rows.get('mobile-pin:v1:global').count,6);
    });
    await t.test('fixed lockout cannot be extended by blocked requests and expires',async()=>{
      reset(); for(let i=0;i<5;i++) assert.equal(await authorizeMobilePin({...credentials,pin:'999999'}),null);
      const deadline=failures().resetAt.getTime(); assert.equal(failures().count,5);
      assert.equal(await authorizeMobilePin(credentials),null); assert.equal(failures().resetAt.getTime(),deadline);
      state.now=new Date(deadline+1); assert.equal((await authorizeMobilePin(credentials))?.id,'synthetic-user');
      assert.equal(failures().count,0);
    });
    await t.test('success cannot reset earlier unexpired failures',async()=>{
      reset(); await authorizeMobilePin({...credentials,pin:'999999'});
      assert.equal((await authorizeMobilePin(credentials))?.id,'synthetic-user'); assert.equal(failures().count,1);
    });
    await t.test('unknown, malformed and suspended credentials never authenticate',async()=>{
      reset(); state.credential=null; assert.equal(await authorizeMobilePin(credentials),null);
      reset(); assert.equal(await authorizeMobilePin({...credentials,pin:'12345'}),null); assert.equal(failures().count,1);
      reset(); state.credential.user.profile.verificationStatus='SUSPENDED'; assert.equal(await authorizeMobilePin(credentials),null);
    });
    await t.test('storage failure and disabled provider fail closed',async()=>{
      reset(); state.fail=true; assert.equal(await authorizeMobilePin(credentials),null);
      reset(); process.env.AUTH_MOBILE_PIN_ENABLED='false'; assert.equal(await authorizeMobilePin(credentials),null); assert.equal(state.rows.size,0);
    });
  } finally {for(const name of names) if(old[name]===undefined) delete process.env[name]; else process.env[name]=old[name];}
});
