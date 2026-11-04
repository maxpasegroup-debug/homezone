import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import ts from "typescript";

// Exercise browser lifecycle/protocol logic with synthetic sockets and a virtual
// clock. No browser, real timer, HTTP request or database connection is started.
const source = ts.transpileModule(readFileSync(new URL("../src/lib/properties/public-live-refresh.ts", import.meta.url), "utf8"), {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 }
}).outputText;
const { createPublicPropertyRefresh, parsePublicPropertyEvent, propertySocketUrl } = await import(`data:text/javascript,${encodeURIComponent(source)}`);
const ready = '{"v":1,"type":"ready"}';
const changed = '{"v":1,"type":"properties.changed"}';

function fixture(options = {}) {
  let time = 0, nextId = 0, refreshes = 0;
  const timers = new Map(), sockets = [], attempts = [];
  const schedule = (callback, delay) => {
    const id = ++nextId;
    timers.set(id, { at: time + delay, callback });
    return id;
  };
  function advance(delay) {
    const end = time + delay;
    for (;;) {
      const pending = [...timers].filter(([, timer]) => timer.at <= end).sort((a, b) => a[1].at - b[1].at || a[0] - b[0])[0];
      if (!pending) break;
      const [id, timer] = pending;
      timers.delete(id); time = timer.at; timer.callback();
    }
    time = end;
  }
  const controller = createPublicPropertyRefresh({
    origin: "https://homezone-staging.up.railway.app", schedule,
    cancel: id => timers.delete(id), now: () => time, random: () => 0,
    refresh: () => { refreshes++; },
    connect: url => {
      attempts.push(time);
      if (options.throwConnect) throw new Error("Synthetic transport failure");
      const socket = {
        url, closes: 0, onmessage: null, onclose: null, onerror: null,
        close() { this.closes++; },
        message(data) { this.onmessage?.({ data }); },
        lose() { this.onclose?.({}); }
      };
      sockets.push(socket); return socket;
    }, ...options
  });
  return { controller, sockets, attempts, timers, advance, refreshes: () => refreshes };
}

test("website property subscription accepts only anonymous versioned public hints", () => {
  assert.equal(parsePublicPropertyEvent(ready), "ready");
  assert.equal(parsePublicPropertyEvent(changed), "properties.changed");
  for (const value of [null, new Uint8Array([1]), "{", "null", "[]", '{"v":"1","type":"ready"}',
    '{"v":2,"type":"ready"}', '{"v":1,"type":"account.changed"}', '{"v":1,"type":"ready","id":"private"}',
    '{"v":1,"type":{}}', " ".repeat(129)]) assert.equal(parsePublicPropertyEvent(value), null);
});

test("website socket stays on the page origin and allows plaintext only for local development", () => {
  assert.equal(propertySocketUrl("https://homezone-staging.up.railway.app"), "wss://homezone-staging.up.railway.app/api/mobile/properties/live");
  assert.equal(propertySocketUrl("http://localhost:3000"), "ws://localhost:3000/api/mobile/properties/live");
  for (const value of ["http://example.invalid", "https://user:secret@example.invalid", "https://example.invalid/api", "https://example.invalid/?token=secret", "https://example.invalid/#secret", "invalid"]) {
    assert.equal(propertySocketUrl(value), null);
  }
});

test("ready refresh recovers disconnections and changed bursts are coalesced with a refresh cap", () => {
  const f = fixture();
  assert.equal(f.sockets.length, 0);
  f.controller.setVisible(true);
  assert.equal(f.sockets.length, 1);
  assert.equal(f.sockets[0].url, "wss://homezone-staging.up.railway.app/api/mobile/properties/live");
  f.sockets[0].message(ready); f.sockets[0].message(changed); f.sockets[0].message(changed);
  f.advance(199); assert.equal(f.refreshes(), 0);
  f.advance(1); assert.equal(f.refreshes(), 1);
  f.sockets[0].message(changed); f.advance(999); assert.equal(f.refreshes(), 1);
  f.advance(1); assert.equal(f.refreshes(), 2);
  f.controller.dispose();
});

test("changes before readiness, unexpected messages and handshake timeout lose the socket", () => {
  for (const invalid of [changed, '{"v":1,"type":"ready","private":"record"}', new Uint8Array([1])]) {
    const f = fixture(); f.controller.setVisible(true);
    f.sockets[0].message(invalid);
    assert.equal(f.sockets[0].closes, 1);
    f.advance(1_000); assert.equal(f.sockets.length, 2);
    f.controller.dispose();
  }
  const f = fixture(); f.controller.setVisible(true);
  f.advance(8_000); assert.equal(f.sockets[0].closes, 1);
  f.advance(1_000); assert.equal(f.sockets.length, 2);
  f.controller.dispose();
});

test("HTTP refresh safety remains 30 seconds when ready and 5 seconds when disconnected", () => {
  const f = fixture(); f.controller.setVisible(true); f.sockets[0].message(ready);
  f.advance(200); assert.equal(f.refreshes(), 1);
  f.advance(29_999); assert.equal(f.refreshes(), 1);
  f.advance(1); assert.equal(f.refreshes(), 2);
  f.sockets[0].lose();
  f.advance(5_199); assert.equal(f.refreshes(), 2);
  f.advance(1); assert.equal(f.refreshes(), 3);
  f.controller.dispose();
});

test("repeated connection failures do not starve HTTP fallback and retries stop at a bounded delay", () => {
  const f = fixture({ throwConnect: true }); f.controller.setVisible(true);
  f.advance(200); assert.equal(f.refreshes(), 1);
  f.advance(5_000); assert.equal(f.refreshes(), 2);
  f.advance(120_000);
  assert.ok(f.refreshes() >= 20);
  const gaps = f.attempts.slice(1).map((time, i) => time - f.attempts[i]);
  assert.ok(gaps.every(delay => delay >= 1_000 && delay <= 30_000));
  assert.ok(gaps.includes(30_000));
  f.controller.dispose();
});

test("hidden and disposed pages close sockets, cancel all work and ignore stale callbacks", () => {
  const f = fixture(); f.controller.setVisible(true); f.sockets[0].message(ready); f.advance(200);
  const staleMessage = f.sockets[0].onmessage, staleClose = f.sockets[0].onclose;
  f.sockets[0].message(changed); f.controller.setVisible(false);
  assert.equal(f.sockets[0].closes, 1); assert.equal(f.timers.size, 0);
  staleMessage({ data: changed }); staleClose({}); f.advance(60_000);
  assert.equal(f.refreshes(), 1); assert.equal(f.sockets.length, 1);
  f.controller.setVisible(true); assert.equal(f.sockets.length, 2);
  f.sockets[1].message(ready); f.advance(200); assert.equal(f.refreshes(), 2);
  f.controller.dispose(); assert.equal(f.sockets[1].closes, 1); assert.equal(f.timers.size, 0);
  f.controller.setVisible(true); f.advance(60_000); assert.equal(f.refreshes(), 2);
});

test("subscription mounts are limited to public properties and the server-confirmed Buyer dashboard", () => {
  for (const path of ["src/app/properties/page.tsx", "src/app/properties/[id]/page.tsx"]) {
    assert.match(readFileSync(new URL(`../${path}`, import.meta.url), "utf8"), /<PropertyLiveRefresh\s*\/>/);
  }
  assert.match(readFileSync(new URL("../src/app/dashboard/page.tsx", import.meta.url), "utf8"), /profile\.role === "USER" \? <PropertyLiveRefresh \/> : null/);
  const component = readFileSync(new URL("../src/components/properties/property-live-refresh.tsx", import.meta.url), "utf8");
  assert.match(component, /window\.location\.origin/);
  assert.match(component, /document\.visibilityState === "visible"/);
  assert.doesNotMatch(component, /document\.cookie|localStorage|sessionStorage|authorization|fetch\(/i);
});
