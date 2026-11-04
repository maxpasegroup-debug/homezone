// Only invalidate public views. Data still comes from the existing authorized APIs.
export const PUBLIC_PROPERTIES_CHANNEL = "homezone_public_properties_v1";
export const PROPERTY_CHANGED_MESSAGE = JSON.stringify({ v: 1, type: "properties.changed" });
export const READY_MESSAGE = JSON.stringify({ v: 1, type: "ready" });
export const PROPERTY_SOCKET_PATH = "/api/mobile/properties/live";

export function integerSetting(env, name, fallback, minimum, maximum) {
  const value = env[name];
  if (value === undefined) return fallback;
  if (!/^\d+$/.test(value)) throw new Error("Invalid realtime limit configuration");
  const number = Number(value);
  if (!Number.isSafeInteger(number) || number < minimum || number > maximum) {
    throw new Error("Invalid realtime limit configuration");
  }
  return number;
}

export function realtimeLimits(env = process.env) {
  return {
    maxConnections: integerSetting(env, "HOMEZONE_REALTIME_MAX_CONNECTIONS", 2_000, 1, 20_000),
    // Reverse proxies may group users under one socket peer. Do not trust arbitrary
    // forwarded headers; tune these independently after confirming proxy topology.
    maxConnectionsPerIp: integerSetting(env, "HOMEZONE_REALTIME_MAX_CONNECTIONS_PER_IP", 250, 1, 1_000),
    handshakesPerMinute: integerSetting(env, "HOMEZONE_REALTIME_HANDSHAKES_PER_MINUTE", 300, 1, 1_000),
    maxTrackedIps: 10_000,
    maxBufferedBytes: 64 * 1024,
    heartbeatMs: 30_000,
    pongTimeoutMs: 15_000,
    sweepMs: 30_000
  };
}

export function assertSessionDatabaseUrl(value) {
  if (!value) throw new Error("Missing realtime database configuration");
  let url;
  try { url = new URL(value); } catch { throw new Error("Invalid realtime database configuration"); }
  const mode = ["pool_mode", "poolmode", "pooling"].map(key => url.searchParams.get(key)?.toLowerCase());
  const pgbouncer = url.searchParams.get("pgbouncer")?.toLowerCase();
  if (!["postgres:", "postgresql:"].includes(url.protocol) || !url.hostname || !url.username || !url.password ||
      !url.pathname || url.pathname === "/" || url.hash ||
      ["true", "1"].includes(pgbouncer) || mode.some(entry => ["transaction", "statement"].includes(entry)) ||
      /(?:pool_mode|poolmode)\s*=\s*(?:transaction|statement)/i.test(url.searchParams.get("options") ?? "")) {
    throw new Error("Realtime requires a direct or session-pooled PostgreSQL connection");
  }
  return value;
}
