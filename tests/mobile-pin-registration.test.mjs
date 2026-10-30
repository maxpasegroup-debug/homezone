import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { registerHooks } from 'node:module';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import ts from 'typescript';

// Synthetic in-memory fixture only: no Prisma client, network or database loaded.
const state = { budgets: new Map(), users: [], fail: false, legacy: false, createError: null, now: new Date() };
const match = (row, where) => Object.entries(where).every(([key, value]) => {
  if (value && typeof value === 'object') {
    if ('startsWith' in value && !row[key].startsWith(value.startsWith)) return false;
    if ('in' in value && !value.in.includes(row[key])) return false;
    if ('lte' in value && !(row[key] <= value.lte)) return false;
    return true;
  }
  return row[key] === value;
});
const budget = {
  async upsert({ where, create, update }) {
    let row = state.budgets.get(where.key);
    if (!row) { row = structuredClone(create); state.budgets.set(row.key, row); }
    else for (const [key, value] of Object.entries(update)) row[key] = value && typeof value === 'object' && 'increment' in value ? row[key] + value.increment : value;
    return structuredClone(row);
  },
  async update({ where, data }) { return this.upsert({ where, create: {}, update: data }); },
  async findMany({ where, take }) { return [...state.budgets.values()].filter(row => match(row, where)).slice(0, take); },
  async deleteMany({ where }) { for (const [key, row] of state.budgets) if (match(row, where)) state.budgets.delete(key); },
};
let tail = Promise.resolve();
const tx = {
  mobilePinLoginBudget: budget,
  async $queryRaw(strings) {
    if (strings.join('').includes('clock_timestamp')) return [{ now: state.now }];
    return state.legacy ? [{ id: 'legacy-fixture' }] : [];
  },
  mobilePinCredential: { async findUnique({ where }) { return state.users.find(user => user.mobilePinCredential.create.normalizedMobile === where.normalizedMobile) ?? null; } },
  user: { async create({ data }) {
    if (state.createError) throw state.createError;
    state.users.push(structuredClone(data)); return { id: 'synthetic-user' };
  } },
};
globalThis.__pinRegistrationDb = { async $transaction(callback) {
  const previous = tail; let release; tail = new Promise(resolve => { release = resolve; }); await previous;
  const before = structuredClone({ budgets: state.budgets, users: state.users });
  try { if (state.fail) throw new Error('synthetic storage failure'); return await callback(tx); }
  catch (error) { state.budgets = before.budgets; state.users = before.users; throw error; }
  finally { release(); }
} };
const hooks = registerHooks({
  resolve(specifier, context, next) {
    const mocks = {
      '@/lib/db': 'export const db=globalThis.__pinRegistrationDb;',
      '@/lib/auth/redirect': 'export const authOrigin=()=>"https://fixture.invalid";',
      '@/lib/auth/mobile-pin-diagnostics': 'export const reportMobilePinFailure=()=>{}; export class MobilePinHashUnavailable extends Error {}',
    };
    if (mocks[specifier]) return { url: 'data:text/javascript,' + encodeURIComponent(mocks[specifier]), shortCircuit: true };
    if (specifier.startsWith('@/')) return { url: new URL('../src/' + specifier.slice(2) + '.ts', import.meta.url).href, shortCircuit: true };
    return next(specifier, context);
  },
  load(url, context, next) {
    if (url.endsWith('.ts') && !url.includes('node_modules')) return { format: 'module', shortCircuit: true,
      source: ts.transpileModule(readFileSync(fileURLToPath(url), 'utf8'), { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText };
    return next(url, context);
  },
});
const { mobilePinRegistration } = await import('../src/lib/auth/mobile-pin-registration.ts');
const { normalizeMobileNumber, isMobilePin } = await import('../src/lib/auth/mobile-number.ts');
const { verifyMobilePin } = await import('../src/lib/auth/mobile-pin-hash.ts');
hooks.deregister();
const fields = { mobileNumber: '9000000001', pin: '001234', confirmPin: '001234', role: 'USER' };
const request = (body, headers = {}) => new Request('https://fixture.invalid/api/mobile/auth/register', {
  method: 'POST', headers: { 'content-type': 'application/json', ...headers }, body: JSON.stringify(body),
});
function reset() { state.budgets.clear(); state.users = []; state.fail = state.legacy = false; state.createError = null; }

test('PIN registration contract and real hash with synthetic storage only', { timeout: 30000 }, async t => {
  const names = ['AUTH_MOBILE_PIN_ENABLED', 'MOBILE_PIN_PEPPER_V1', 'MOBILE_PIN_RATE_LIMIT_KEY', 'MOBILE_PIN_REGISTRATION_TRUSTED_IP_HEADER'];
  const old = Object.fromEntries(names.map(name => [name, process.env[name]]));
  process.env.AUTH_MOBILE_PIN_ENABLED = 'true';
  process.env.MOBILE_PIN_PEPPER_V1 = 'synthetic-only-pepper-not-a-runtime-secret';
  process.env.MOBILE_PIN_RATE_LIMIT_KEY = 'synthetic-only-admission-not-a-runtime-secret';
  delete process.env.MOBILE_PIN_REGISTRATION_TRUSTED_IP_HEADER;
  try {
    await t.test('canonical normalization and exact PIN strings preserve zero', () => {
      assert.equal(normalizeMobileNumber('(+91) 90000-00001'), '+919000000001');
      for (const bad of ['12345', '1234567', '123456\n', '１２３４５６', 123456]) assert.equal(isMobilePin(bad), false);
      assert.equal(isMobilePin('001234'), true);
      assert.equal(normalizeMobileNumber('+449000000001'), null);
    });
    await t.test('creates null-email unverified USER credential and verifies actual salted hash', async () => {
      reset(); const response = await mobilePinRegistration(request(fields));
      assert.equal(response.status, 200); assert.equal(response.headers.get('set-cookie'), null);
      assert.equal(state.users.length, 1); const user = state.users[0];
      assert.equal(user.emailVerified, null); assert.equal(user.profile.create.role, 'USER');
      assert.equal(user.profile.create.whatsappVerified, false); assert.equal(user.profile.create.phone, undefined);
      assert.equal(await verifyMobilePin(fields.pin, '+919000000001', user.mobilePinCredential.create.pinHash), true);
      assert.equal(await verifyMobilePin('999999', '+919000000001', user.mobilePinCredential.create.pinHash), false);
      assert.equal(JSON.stringify(await response.json()).includes('pinHash'), false);
    });
    await t.test('all public roles are assigned without privileged fields', async () => {
      for (const role of ['USER', 'OWNER', 'BROKER', 'BUILDER', 'SERVICE_PROVIDER']) {
        reset(); assert.equal((await mobilePinRegistration(request({...fields, role}))).status, 200);
        assert.equal(state.users[0].profile.create.role, role);
      }
      for (const role of ['ADMIN', 'SUPER_ADMIN', 'BUYER', '', null, undefined]) {
        reset(); assert.equal((await mobilePinRegistration(request({...fields, role}))).status, 400);
        assert.equal(state.users.length, 0);
      }
    });
    await t.test('concurrent duplicate acknowledges identically and never replaces credentials', async () => {
      reset(); const responses = await Promise.all([mobilePinRegistration(request(fields)), mobilePinRegistration(request({ ...fields, mobileNumber: '+919000000001', pin: '999999', confirmPin: '999999' }))]);
      assert.deepEqual(await responses[0].json(), await responses[1].json()); assert.equal(state.users.length, 1);
      const original = structuredClone(state.users);
      await mobilePinRegistration(request({...fields, role:'OWNER'}));
      assert.deepEqual(state.users, original);
    });
    await t.test('strict body, mismatch, origin and oversized body reject before creation', async () => {
      reset();
      for (const body of [{ ...fields, role: 'ADMIN' }, { ...fields, confirmPin: '999999' }, { ...fields, pin: '1', confirmPin: '1' }, { ...fields, extra: 'x'.repeat(5000) }]) assert.equal((await mobilePinRegistration(request(body))).status, 400);
      assert.equal((await mobilePinRegistration(request(fields, { origin: 'https://wrong.invalid' }))).status, 403);
      assert.equal(state.users.length, 0);
    });
    await t.test('number quota is independent of editable headers and accounts', async () => {
      reset(); for (let i = 0; i < 3; i++) assert.equal((await mobilePinRegistration(request(fields))).status, 200);
      const response = await mobilePinRegistration(request(fields, { 'x-forwarded-for': '192.0.2.1' }));
      assert.equal(response.status, 429); assert.ok(Number(response.headers.get('retry-after')) > 0);
    });
    await t.test('legacy contact collision cannot link or overwrite', async () => {
      reset(); state.legacy = true; assert.equal((await mobilePinRegistration(request(fields))).status, 200); assert.equal(state.users.length, 0);
    });
    await t.test('only expected unique conflict is acknowledged, other failures are unavailable', async () => {
      reset(); state.createError = { code: 'P2002', meta: { target: ['normalizedMobile'] } };
      assert.equal((await mobilePinRegistration(request(fields))).status, 200);
      reset(); state.createError = { code: 'P2002', meta: { target: ['userId'] } };
      assert.equal((await mobilePinRegistration(request(fields))).status, 503); assert.equal(state.users.length, 0);
      reset(); state.fail = true; assert.equal((await mobilePinRegistration(request(fields))).status, 503);
    });
  } finally { for (const name of names) if (old[name] === undefined) delete process.env[name]; else process.env[name] = old[name]; }
});
