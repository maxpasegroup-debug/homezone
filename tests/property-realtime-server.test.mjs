import assert from "node:assert/strict";
import { EventEmitter, once } from "node:events";
import { createServer } from "node:http";
import { mkdtemp, rmdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { WebSocket } from "ws";
import { PublicPropertyListener } from "../realtime/database-listener.mjs";
import { createPropertyRealtimeGateway } from "../realtime/websocket-server.mjs";
import { createNextUpgradeRouter, listenHttpServer } from "../realtime/http-upgrade-router.mjs";
import { loadRealtimeEnvironment } from "../realtime/environment-loader.mjs";
import {
  assertSessionDatabaseUrl, PROPERTY_CHANGED_MESSAGE, PUBLIC_PROPERTIES_CHANNEL,
  PROPERTY_SOCKET_PATH, READY_MESSAGE, realtimeLimits
} from "../realtime/protocol.mjs";

// Only ephemeral loopback sockets and injected PG fixtures are used. No external
// service, application authentication, real database or property is contacted.
const origin = "https://homezone.fixture.invalid";
const pause = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds));
async function eventually(predicate, message = "fixture state did not settle") {
  for (let count = 0; count < 100; count += 1) {
    if (predicate()) return;
    await pause(5);
  }
  assert.fail(message);
}
function hub(ready = true) {
  const result = new EventEmitter();
  result.ready = ready;
  result.changeReady = value => { result.ready = value; result.emit("readiness", value); };
  return result;
}
async function fixture(t, overrides = {}) {
  const listener = hub();
  const gateway = createPropertyRealtimeGateway({ origin, listener, limits: { ...realtimeLimits({}), ...overrides } });
  const server = createServer((_request, response) => { response.writeHead(200); response.end("normal-http"); });
  server.on("upgrade", (request, socket, head) => {
    if (!gateway.handleUpgrade(request, socket, head)) socket.end("HTTP/1.1 404 Not Found\r\nConnection: close\r\nContent-Length: 0\r\n\r\n");
  });
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  t.after(async () => {
    await gateway.close();
    await new Promise(resolve => server.close(resolve));
  });
  const url = `ws://127.0.0.1:${server.address().port}${PROPERTY_SOCKET_PATH}`;
  return { listener, gateway, server, url };
}
async function connect(url, options = {}) {
  const ws = new WebSocket(url, options);
  const messages = [];
  ws.on("error", () => {});
  ws.on("message", value => messages.push(value.toString()));
  await once(ws, "open");
  await eventually(() => messages.length > 0);
  return { ws, messages };
}
async function rejected(url, options = {}) {
  const ws = new WebSocket(url, options);
  ws.on("error", () => {});
  return new Promise((resolve, reject) => {
    ws.once("open", () => { ws.terminate(); reject(new Error("Expected a rejected handshake")); });
    ws.once("unexpected-response", (_request, response) => {
      response.resume();
      ws.terminate();
      resolve(response.statusCode);
    });
    ws.once("error", reject);
  });
}
async function closeClient(ws) {
  if (ws.readyState === WebSocket.CLOSED) return;
  const closed = once(ws, "close");
  ws.close();
  await closed;
}

test("public WebSocket serves bounded invalidation hints through existing HTTP origin", async t => {
  await t.test("native readonly subscription gets ready and one coalesced fixed hint", async t => {
    const f = await fixture(t);
    const { ws, messages } = await connect(f.url);
    assert.deepEqual(messages, [READY_MESSAGE]);
    f.listener.emit("changed"); f.listener.emit("changed"); f.listener.emit("changed");
    await eventually(() => messages.length === 2);
    assert.deepEqual(messages, [READY_MESSAGE, PROPERTY_CHANGED_MESSAGE]);
    for (const message of messages) {
      assert.deepEqual(Object.keys(JSON.parse(message)).sort(), ["type", "v"]);
      assert.equal(message.includes("owner"), false);
    }
    assert.equal(ws.extensions, "");
    await closeClient(ws);
  });
  await t.test("canonical browser origin is accepted and automatic cookies are ignored", async t => {
    const f = await fixture(t);
    const { ws, messages } = await connect(f.url, {
      origin, headers: { "Sec-Fetch-Site": "same-origin", Cookie: "synthetic-fixture-cookie=unused" }
    });
    assert.deepEqual(messages, [READY_MESSAGE]);
    await closeClient(ws);
  });
  await t.test("foreign origins and cross-site browser requests are denied", async t => {
    const f = await fixture(t);
    assert.equal(await rejected(f.url, { origin: "https://foreign.fixture.invalid" }), 403);
    assert.equal(await rejected(f.url, { origin, headers: { "Sec-Fetch-Site": "cross-site" } }), 403);
    assert.equal(await rejected(f.url, { origin: "null" }), 403);
  });
  await t.test("browser fetch metadata cannot use native missing-Origin admission", async t => {
    const f = await fixture(t);
    assert.equal(await rejected(f.url, { headers: { "Sec-Fetch-Mode": "websocket" } }), 403);
  });
  await t.test("queries, authorization and negotiated credential protocols are rejected", async t => {
    const f = await fixture(t);
    assert.equal(await rejected(`${f.url}?token=synthetic`), 400);
    assert.equal(await rejected(f.url, { headers: { Authorization: "Bearer synthetic-fixture" } }), 400);
    assert.equal(await rejected(f.url, { headers: { "Sec-WebSocket-Protocol": "credential" } }), 400);
  });
  await t.test("unrelated upgrade paths are delegated and normal HTTP is unaffected", async t => {
    const f = await fixture(t);
    assert.equal(await rejected(f.url.replace(PROPERTY_SOCKET_PATH, "/unrelated")), 404);
    const response = await fetch(f.url.replace("ws:", "http:"));
    assert.equal(response.status, 200);
    assert.equal(await response.text(), "normal-http");
  });
  await t.test("outage closes subscribers and prevents new subscriptions until LISTEN recovers", async t => {
    const f = await fixture(t);
    const first = await connect(f.url);
    const closed = once(first.ws, "close");
    f.listener.changeReady(false);
    const [code] = await closed;
    assert.equal(code, 1013);
    assert.equal(await rejected(f.url), 503);
    f.listener.changeReady(true);
    const second = await connect(f.url);
    assert.deepEqual(second.messages, [READY_MESSAGE]);
    await closeClient(second.ws);
  });
  await t.test("concurrent and per-peer handshake limits reject excess connections", async t => {
    const f = await fixture(t, { maxConnections: 1, maxConnectionsPerIp: 1, handshakesPerMinute: 2 });
    const first = await connect(f.url);
    assert.equal(await rejected(f.url), 429);
    await closeClient(first.ws);
    await eventually(() => f.gateway.connectionCount() === 0);
    assert.equal(await rejected(f.url), 429);
  });
  await t.test("application messages cannot subscribe, authenticate or mutate anything", async t => {
    const f = await fixture(t);
    const { ws } = await connect(f.url);
    const closed = once(ws, "close");
    ws.send(JSON.stringify({ action: "publish", id: "synthetic" }));
    assert.equal((await closed)[0], 1008);
  });
  await t.test("oversized frames are rejected", async t => {
    const f = await fixture(t);
    const { ws } = await connect(f.url);
    const closed = once(ws, "close");
    ws.send("x".repeat(257));
    assert.equal((await closed)[0], 1009);
  });
  await t.test("unresponsive clients are terminated by heartbeat", async t => {
    const f = await fixture(t, { heartbeatMs: 20, pongTimeoutMs: 10 });
    const { ws } = await connect(f.url, { autoPong: false });
    await once(ws, "close");
    await eventually(() => f.gateway.connectionCount() === 0);
  });
});

class FakeClient extends EventEmitter {
  constructor(options, state) { super(); this.options = options; this.state = state; this.queries = []; this.ended = false; }
  async connect() { if (this.state.failConnect) throw new Error("Synthetic storage failure with no real data"); }
  async query(sql) { this.queries.push(sql); if (this.state.failListen) throw new Error("Synthetic LISTEN failure"); }
  async end() { this.ended = true; }
}
function pgFixture(options = {}) {
  const clients = [];
  const stages = [];
  const state = { ...options };
  const listener = new PublicPropertyListener({
    connectionString: "postgresql://fixture:unused@fixture.invalid/homezone_fixture",
    createClient: config => { const client = new FakeClient(config, state); clients.push(client); return client; },
    logger: stage => stages.push(stage), retryMs: 5, maxRetryMs: 10, jitter: () => 0
  });
  return { listener, clients, stages, state };
}
test("dedicated PG listener is reconnectable, payload-restricted and independently disposable", async t => {
  await t.test("readiness only follows successful LISTEN and notifications are exact-protocol only", async t => {
    const f = pgFixture();
    t.after(() => f.listener.stop());
    const changes = [];
    f.listener.on("changed", () => changes.push(true));
    assert.equal(f.listener.ready, false);
    f.listener.start();
    await eventually(() => f.listener.ready);
    assert.deepEqual(f.clients[0].queries, [`LISTEN ${PUBLIC_PROPERTIES_CHANNEL}`]);
    f.clients[0].emit("notification", { channel: "private_fixture", payload: PROPERTY_CHANGED_MESSAGE });
    f.clients[0].emit("notification", { channel: PUBLIC_PROPERTIES_CHANNEL, payload: '{"owner":"private"}' });
    assert.equal(changes.length, 0);
    f.clients[0].emit("notification", { channel: PUBLIC_PROPERTIES_CHANNEL, payload: PROPERTY_CHANGED_MESSAGE });
    assert.equal(changes.length, 1);
    assert.equal(f.clients[0].options.application_name, "homezone-property-realtime");
  });
  await t.test("storage failure withdraws readiness and reconnects on a new dedicated session", async t => {
    const f = pgFixture();
    t.after(() => f.listener.stop());
    f.listener.start();
    await eventually(() => f.listener.ready);
    const old = f.clients[0];
    old.emit("error", new Error("Synthetic hidden failure"));
    assert.equal(f.listener.ready, false);
    await eventually(() => f.clients.length === 2 && f.listener.ready);
    assert.equal(old.ended, true);
    assert.deepEqual(f.stages, ["listener_ready", "listener_unavailable", "listener_ready"]);
    const changes = [];
    f.listener.on("changed", () => changes.push(true));
    old.emit("notification", { channel: PUBLIC_PROPERTIES_CHANNEL, payload: PROPERTY_CHANGED_MESSAGE });
    assert.equal(changes.length, 0);
  });
  await t.test("connect and LISTEN failures remain unavailable without logging exception text", async t => {
    for (const failure of ["failConnect", "failListen"]) {
      const f = pgFixture({ [failure]: true });
      f.listener.start();
      await eventually(() => f.clients.length >= 2);
      assert.equal(f.listener.ready, false);
      assert.ok(f.stages.every(stage => stage === "listener_unavailable"));
      await f.listener.stop();
      const count = f.clients.length;
      await pause(20);
      assert.equal(f.clients.length, count);
    }
  });
  await t.test("stop cancels retry and ignores late notifications", async () => {
    const f = pgFixture();
    f.listener.start();
    await eventually(() => f.listener.ready);
    let changed = false;
    f.listener.on("changed", () => { changed = true; });
    await f.listener.stop();
    f.clients[0].emit("notification", { channel: PUBLIC_PROPERTIES_CHANNEL, payload: PROPERTY_CHANGED_MESSAGE });
    assert.equal(f.listener.ready, false);
    assert.equal(changed, false);
    assert.equal(f.clients[0].ended, true);
  });
  await t.test("known transaction pooler connections are rejected with sanitized errors", () => {
    for (const value of [undefined, "not a URL", "https://fixture.invalid/db", "postgresql:///db",
      "postgresql://fixture:unused@fixture.invalid", "postgresql://fixture.invalid/db",
      "postgresql://fixture:unused@fixture.invalid/db?pgbouncer=true",
      "postgresql://fixture:unused@fixture.invalid/db?pool_mode=transaction",
      "postgresql://fixture:unused@fixture.invalid/db?options=pool_mode%3Dstatement"]) {
      assert.throws(() => assertSessionDatabaseUrl(value), error => !error.message.includes(String(value)));
    }
    assert.equal(assertSessionDatabaseUrl("postgresql://fixture:unused@fixture.invalid/db?schema=public"),
      "postgresql://fixture:unused@fixture.invalid/db?schema=public");
  });
  await t.test("numeric limits fail closed for malformed and out-of-range configuration", () => {
    assert.throws(() => realtimeLimits({ HOMEZONE_REALTIME_MAX_CONNECTIONS: "0" }));
    assert.throws(() => realtimeLimits({ HOMEZONE_REALTIME_HANDSHAKES_PER_MINUTE: "unbounded" }));
    assert.equal(realtimeLimits({ HOMEZONE_REALTIME_MAX_CONNECTIONS: "500" }).maxConnections, 500);
  });
});

test("Next lazy upgrade registration cannot double-handle the public socket", async () => {
  const server = new EventEmitter();
  const called = [];
  const gateway = { handleUpgrade: request => request.url === PROPERTY_SOCKET_PATH };
  const upgrades = createNextUpgradeRouter(server, gateway);
  upgrades.setFallback(() => called.push("fallback"));
  const socket = () => Object.assign(new EventEmitter(), { destroy() { called.push("destroy"); } });
  upgrades.handleUpgrade({ url: "/unknown" }, socket(), Buffer.alloc(0));
  assert.deepEqual(called, ["fallback"]);
  upgrades.nextHttpServer.on("upgrade", () => called.push("next-router"));
  assert.equal(server.listenerCount("upgrade"), 0);
  upgrades.handleUpgrade({ url: PROPERTY_SOCKET_PATH }, socket(), Buffer.alloc(0));
  assert.deepEqual(called, ["fallback"]);
  upgrades.handleUpgrade({ url: "/other" }, socket(), Buffer.alloc(0));
  assert.deepEqual(called, ["fallback", "next-router"]);
  upgrades.nextHttpServer.on("error", () => called.push("server-error"));
  server.emit("error");
  assert.equal(called.at(-1), "server-error");
  const throwing = createNextUpgradeRouter(server, { handleUpgrade() { throw new Error("Synthetic malformed handshake"); } });
  throwing.handleUpgrade({ url: PROPERTY_SOCKET_PATH }, socket(), Buffer.alloc(0));
  assert.equal(called.at(-1), "destroy");
});

test("HTTP bind failures reject cleanly before any PG session can be started", async t => {
  const occupied = createServer();
  const competing = createServer();
  const initialErrorListeners = competing.listenerCount("error");
  const initialListeningListeners = competing.listenerCount("listening");
  await listenHttpServer(occupied, 0, "127.0.0.1");
  t.after(() => new Promise(resolve => occupied.close(resolve)));
  let started = false;
  await assert.rejects(async () => {
    await listenHttpServer(competing, occupied.address().port, "127.0.0.1");
    started = true;
  }, { message: "HTTP listener unavailable" });
  assert.equal(started, false);
  assert.equal(competing.listening, false);
  assert.equal(competing.listenerCount("error"), initialErrorListeners);
  assert.equal(competing.listenerCount("listening"), initialListeningListeners);
});

test("production env loader uses the installed CJS default without reading project envfiles", async t => {
  const directory = await mkdtemp(join(tmpdir(), "homezone-realtime-empty-env-"));
  t.after(() => rmdir(directory));
  const stages = [];
  const result = loadRealtimeEnvironment(directory, stage => stages.push(stage));
  assert.deepEqual(result.loadedEnvFiles, []);
  assert.deepEqual(stages, []);
  const { Client } = await import("pg");
  const { default: next } = await import("next");
  assert.equal(typeof Client, "function");
  assert.equal(typeof next, "function");
  // Importing constructors does not instantiate an app or connect a PG client.
});

test("env loader drops potentially sensitive upstream diagnostic text", () => {
  const stages = [];
  const result = loadRealtimeEnvironment("unused-empty-fixture", stage => stages.push(stage),
    (directory, development, logger) => {
      assert.equal(directory, "unused-empty-fixture");
      assert.equal(development, false);
      logger.info("synthetic private configuration contents");
      logger.error("synthetic private configuration contents", new Error("synthetic detail"));
      return "loaded";
    });
  assert.equal(result, "loaded");
  assert.deepEqual(stages, ["envfile_load_failure"]);
});
