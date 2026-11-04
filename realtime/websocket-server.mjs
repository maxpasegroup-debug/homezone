import { WebSocket, WebSocketServer } from "ws";
import { PROPERTY_CHANGED_MESSAGE, PROPERTY_SOCKET_PATH, READY_MESSAGE, realtimeLimits } from "./protocol.mjs";

function reject(socket, status) {
  const text = { 400: "Bad Request", 403: "Forbidden", 429: "Too Many Requests", 503: "Service Unavailable" }[status];
  socket.end(`HTTP/1.1 ${status} ${text}\r\nConnection: close\r\nCache-Control: no-store\r\nContent-Length: 0\r\n\r\n`);
}

export function createPropertyRealtimeGateway({ origin, listener, limits = realtimeLimits() }) {
  const wss = new WebSocketServer({ noServer: true, clientTracking: true, perMessageDeflate: false, maxPayload: 256 });
  const handshakes = new Map();
  const connections = new Map();
  const heartbeats = new Map();
  let closed = false;
  let broadcastTimer = null;

  function send(ws, message) {
    if (ws.readyState !== WebSocket.OPEN) return;
    if (ws.bufferedAmount > limits.maxBufferedBytes) { ws.close(1013, "Reconnect and refresh"); return; }
    ws.send(message, error => { if (error) ws.terminate(); });
  }
  const changed = () => {
    if (broadcastTimer || closed || !listener.ready) return;
    broadcastTimer = setTimeout(() => {
      broadcastTimer = null;
      if (listener.ready) for (const ws of wss.clients) send(ws, PROPERTY_CHANGED_MESSAGE);
    }, 100);
    broadcastTimer.unref?.();
  };
  const readiness = ready => {
    if (!ready) for (const ws of wss.clients) ws.close(1013, "Reconnect and refresh");
  };
  listener.on("changed", changed);
  listener.on("readiness", readiness);

  function sweep(now = Date.now()) {
    for (const [ip, window] of handshakes) if (now - window.started >= 60_000) handshakes.delete(ip);
  }
  const sweeper = setInterval(() => sweep(), limits.sweepMs);
  sweeper.unref?.();
  const heartbeat = setInterval(() => {
    const now = Date.now();
    for (const ws of wss.clients) {
      const state = heartbeats.get(ws);
      if (!state) continue;
      if (state.awaiting && now - state.sentAt >= limits.pongTimeoutMs) { ws.terminate(); continue; }
      if (!state.awaiting && now >= state.nextPingAt) {
        state.awaiting = true;
        state.sentAt = now;
        ws.ping(undefined, false, error => { if (error) ws.terminate(); });
      }
    }
  }, Math.min(limits.heartbeatMs, limits.pongTimeoutMs));
  heartbeat.unref?.();

  wss.on("connection", (ws, request) => {
    const ip = request.socket.remoteAddress ?? "unknown";
    connections.set(ip, (connections.get(ip) ?? 0) + 1);
    heartbeats.set(ws, { awaiting: false, sentAt: 0, nextPingAt: Date.now() + limits.heartbeatMs });
    ws.on("pong", () => {
      const state = heartbeats.get(ws);
      if (state) {
        state.awaiting = false;
        state.nextPingAt = Date.now() + limits.heartbeatMs;
      }
    });
    // Public invalidation is receive-only. No subscription, identity or action payload is accepted.
    ws.on("message", () => ws.close(1008, "Receive-only connection"));
    ws.on("error", () => ws.terminate());
    ws.once("close", () => {
      const remaining = (connections.get(ip) ?? 1) - 1;
      if (remaining > 0) connections.set(ip, remaining); else connections.delete(ip);
      heartbeats.delete(ws);
    });
    if (closed || !listener.ready) ws.close(1013, "Reconnect and refresh");
    else send(ws, READY_MESSAGE);
  });

  function handleUpgrade(request, socket, head) {
    let url;
    try { url = new URL(request.url ?? "", "http://localhost"); }
    catch { reject(socket, 400); return true; }
    if (url.pathname !== PROPERTY_SOCKET_PATH) return false;
    if (closed || !listener.ready) { reject(socket, 503); return true; }
    const originHeader = request.headers.origin;
    const fetchHeaders = Object.keys(request.headers).some(name => name.startsWith("sec-fetch-"));
    const site = request.headers["sec-fetch-site"];
    // Cookies automatically accompany browser upgrades; ignore them completely. The public
    // socket is never authenticated and never trusts a cookie/header to reveal extra data.
    if (request.method !== "GET" || request.url !== PROPERTY_SOCKET_PATH || url.search || url.hash ||
        request.headers.authorization || request.headers["sec-websocket-protocol"]) {
      reject(socket, 400); return true;
    }
    if ((originHeader !== undefined && originHeader !== origin) ||
        (originHeader === undefined && fetchHeaders) ||
        (site !== undefined && !["same-origin", "none"].includes(site))) {
      reject(socket, 403); return true;
    }
    const ip = socket.remoteAddress ?? "unknown";
    const now = Date.now();
    let window = handshakes.get(ip);
    if (window && now - window.started >= 60_000) { handshakes.delete(ip); window = undefined; }
    if (!window) {
      if (handshakes.size >= limits.maxTrackedIps) sweep(now);
      if (handshakes.size >= limits.maxTrackedIps) { reject(socket, 429); return true; }
      window = { started: now, count: 0 };
      handshakes.set(ip, window);
    }
    window.count += 1;
    if (window.count > limits.handshakesPerMinute || wss.clients.size >= limits.maxConnections ||
        (connections.get(ip) ?? 0) >= limits.maxConnectionsPerIp) { reject(socket, 429); return true; }
    // ws performs the RFC6455 version/key/upgrade validation; no auth/CSRF code is changed.
    wss.handleUpgrade(request, socket, head, ws => wss.emit("connection", ws, request));
    return true;
  }

  async function close() {
    closed = true;
    clearTimeout(broadcastTimer);
    clearInterval(sweeper);
    clearInterval(heartbeat);
    listener.off("changed", changed);
    listener.off("readiness", readiness);
    for (const ws of wss.clients) ws.terminate();
    handshakes.clear();
    connections.clear();
    heartbeats.clear();
    await new Promise(resolve => wss.close(() => resolve()));
  }
  return { handleUpgrade, close, connectionCount: () => wss.clients.size };
}
