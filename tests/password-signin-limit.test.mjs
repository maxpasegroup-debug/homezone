import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { runInNewContext } from "node:vm";
import { test } from "node:test";
import ts from "typescript";
import { sharedSigninStore } from './fixtures/shared-signin-store.mjs';
const source = ts.transpileModule(readFileSync(new URL('../src/lib/auth/password-signin-limit.ts', import.meta.url), 'utf8'),
  { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
function load(env = {}, db = {}) {
  const exports = {};
  const nativeRequire = createRequire(import.meta.url);
  runInNewContext(source, { exports, require: id => id === '@/lib/db' ? {db} : nativeRequire(id), process: { env }, Date, Map, Number });
  return exports;
}
const { createPasswordSigninLimiter: create, passwordSigninPolicy } = load();
const policy = { windowMs: 100, accountAttempts: 2, totalAttempts: 10, maxAccounts: 3 };
test('boundary and normalized identifiers share account budget', () => {
  const limiter = create(policy, () => 0);
  assert.equal(limiter.allow(' User@Example.COM '), true);
  assert.equal(limiter.allow('user@example.com'), true);
  assert.equal(limiter.allow('USER@example.com'), false);
  assert.equal(limiter.allow('different@example.com'), true);
});
test('concurrent admission cannot exceed bound', async () => {
  const limiter = create(policy, () => 0);
  const results = await Promise.all(Array.from({length: 50}, async () => limiter.allow('same')));
  assert.equal(results.filter(Boolean).length, 2);
});
test('expiration cleans capacity without evicting live buckets', () => {
  let now = 0; const limiter = create({...policy, maxAccounts: 1}, () => now);
  assert.equal(limiter.allow('one'), true);
  assert.equal(limiter.allow('two'), false);
  now = 100;
  assert.equal(limiter.allow('two'), true);
  assert.equal(limiter.allow('one'), false);
});
test('global budget bounds rotating accounts', () => {
  const limiter = create({...policy, totalAttempts: 2}, () => 0);
  assert.equal(limiter.allow('one'), true);
  assert.equal(limiter.allow('two'), true);
  assert.equal(limiter.allow('three'), false);
});
test('config rejects zero malformed and excessive values', () => {
  for (const value of ['0', '-1', '1.5', ' 2', '9999999999999']) {
    assert.throws(() => passwordSigninPolicy({PASSWORD_SIGNIN_WINDOW_MS: value}));
  }
  assert.equal(passwordSigninPolicy({PASSWORD_SIGNIN_ACCOUNT_ATTEMPTS:'3'}).accountAttempts, 3);
});
test('failure is closed and generic', async () => {
  const broken = load({PASSWORD_SIGNIN_WINDOW_MS:'invalid'});
  assert.equal(await broken.allowPasswordSignin('unknown'), false);
  assert.equal(await broken.allowPasswordSignin('known'), false);
  assert.equal(create(policy, () => NaN).allow('anything'), false);
});
test('process instances and restarts have independent budgets', () => {
  const first = create(policy, () => 0), second = create(policy, () => 0);
  first.allow('same'); first.allow('same');
  assert.equal(first.allow('same'), false);
  assert.equal(second.allow('same'), true);
  assert.equal(create(policy, () => 0).allow('same'), true);
});
test('forwarded client identities cannot select admission buckets', () => {
  const limiter = create(policy, () => 0);
  for (const headers of [{}, {'x-forwarded-for':'malformed'}, {'x-real-ip':'victim'}, {'x-forwarded-for':'1.2.3.4, 5.6.7.8'}]) {
    // Request headers are not accepted by the admission API.
    assert.equal(limiter.allow('account', headers), Object.keys(headers).length === 0 || headers['x-forwarded-for'] === 'malformed');
  }
});

const sharedSecret = 'synthetic-shared-signin-hmac-key-32-characters';
const shared = load().createSharedPasswordSigninLimiter;
test('shared instances and recreated clients cannot exceed normalized account admission', async () => {
  const fixture=sharedSigninStore(),a=shared(fixture.db,policy,sharedSecret),b=shared(fixture.db,policy,sharedSecret);
  const results=await Promise.all(Array.from({length:50},(_,i)=>(i%2?a:b).allow(i%2?' User@Example.COM ':'user@example.com')));
  assert.equal(results.filter(Boolean).length,2);
  assert.equal(await shared(fixture.db,policy,sharedSecret).allow('user@example.com'),false);
  assert.equal(fixture.rows.get('password-signin:v1:global').count,10);
  const keys=[...fixture.rows.keys()];assert.equal(keys.length,2);assert.ok(!keys.join('').includes('user@example.com'));
});
test('shared aggregate admission bounds concurrently rotating accounts', async () => {
  const fixture=sharedSigninStore(),p={...policy,totalAttempts:3,maxAccounts:20};
  const a=shared(fixture.db,p,sharedSecret),b=shared(fixture.db,p,sharedSecret);
  const results=await Promise.all(Array.from({length:30},(_,i)=>(i%2?a:b).allow(`account-${i}`)));
  assert.equal(results.filter(Boolean).length,3);assert.equal(fixture.rows.size,4);
});
test('shared window expiry uses store time at exact boundary without live eviction', async () => {
  const fixture=sharedSigninStore(),p={...policy,maxAccounts:1},a=shared(fixture.db,p,sharedSecret),b=shared(fixture.db,p,sharedSecret);
  assert.equal(await a.allow('one'),true);assert.equal(await b.allow('two'),false);
  fixture.now=99;assert.equal(await b.allow('two'),false);
  fixture.now=100;assert.equal(await b.allow('two'),true);assert.equal(await a.allow('one'),false);
  assert.equal(fixture.rows.size,2);
});
test('shared failures and malformed state deny without memory fallback and recover safely', async () => {
  const fixture=sharedSigninStore(),limiter=shared(fixture.db,policy,sharedSecret);
  fixture.fail=true;assert.equal(await limiter.allow('known'),false);assert.equal(await limiter.allow('unknown'),false);assert.equal(fixture.rows.size,0);
  fixture.fail=false;fixture.badClock=true;assert.equal(await limiter.allow('known'),false);assert.equal(fixture.rows.size,0);
  fixture.badClock=false;fixture.corrupt=true;assert.equal(await limiter.allow('known'),false);assert.equal(fixture.rows.size,0);
  fixture.corrupt=false;assert.equal(await limiter.allow('known'),true);
  const before=structuredClone(fixture.rows);fixture.failCount=true;
  assert.equal(await limiter.allow('new-account'),false);assert.deepEqual(fixture.rows,before);fixture.failCount=false;
  fixture.fail=true;assert.equal(await limiter.allow('known'),false);fixture.fail=false;
  assert.equal(await limiter.allow('known'),true);assert.equal(await limiter.allow('known'),false);
});
test('shared capacity creation is serialized and does not touch registration quotas', async () => {
  const fixture=sharedSigninStore();fixture.rows.set('registration:delivery',{key:'registration:delivery',count:9,resetAt:new Date(1000)});
  const a=shared(fixture.db,{...policy,maxAccounts:1},sharedSecret),b=shared(fixture.db,{...policy,maxAccounts:1},sharedSecret);
  assert.equal((await Promise.all([a.allow('one'),b.allow('two')])).filter(Boolean).length,1);
  fixture.now=100;assert.equal(await b.allow('two'),true);assert.equal(fixture.rows.get('registration:delivery').count,9);
});
test('runtime shared admission requires explicit key and valid configuration', async () => {
  const fixture=sharedSigninStore();
  assert.equal(await load({},fixture.db).allowPasswordSignin('unknown'),false);assert.equal(fixture.transactions,0);
  assert.throws(()=>shared(fixture.db,policy,'short'));
  const runtime=load({PASSWORD_SIGNIN_HMAC_KEY:sharedSecret,PASSWORD_SIGNIN_WINDOW_MS:'100',PASSWORD_SIGNIN_ACCOUNT_ATTEMPTS:'1'},fixture.db);
  assert.equal(await runtime.allowPasswordSignin('same'),true);assert.equal(await runtime.allowPasswordSignin(' SAME '),false);
});
