import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { runInNewContext } from "node:vm";
import { test } from "node:test";
import ts from "typescript";
const source = ts.transpileModule(readFileSync(new URL('../src/lib/auth/password-signin-limit.ts', import.meta.url), 'utf8'),
  { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
function load(env = {}) {
  const exports = {};
  runInNewContext(source, { exports, require: createRequire(import.meta.url), process: { env }, Date, Map, Number });
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
test('failure is closed and generic', () => {
  const broken = load({PASSWORD_SIGNIN_WINDOW_MS:'invalid'});
  assert.equal(broken.allowPasswordSignin('unknown'), false);
  assert.equal(broken.allowPasswordSignin('known'), false);
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
