import { EventEmitter } from "node:events";
import { randomInt } from "node:crypto";
import { assertSessionDatabaseUrl, PROPERTY_CHANGED_MESSAGE, PUBLIC_PROPERTIES_CHANNEL } from "./protocol.mjs";

// A dedicated session is essential: transaction pooling cannot preserve LISTEN.
// The factory is injectable so fixtures never need a real PostgreSQL connection.
export class PublicPropertyListener extends EventEmitter {
  constructor({ connectionString, createClient, logger = () => {}, retryMs = 1_000, maxRetryMs = 30_000,
    jitter = maximum => randomInt(0, maximum + 1) }) {
    super();
    this.connectionString = assertSessionDatabaseUrl(connectionString);
    this.createClient = createClient;
    this.logger = logger;
    this.retryMs = retryMs;
    this.maxRetryMs = maxRetryMs;
    this.jitter = jitter;
    this.ready = false;
    this.stopped = true;
    this.attempt = 0;
    this.client = null;
    this.retryTimer = null;
  }

  start() {
    if (!this.stopped) return;
    this.stopped = false;
    void this.connect();
  }

  setReady(value) {
    if (this.ready === value) return;
    this.ready = value;
    this.emit("readiness", value);
  }

  async connect() {
    if (this.stopped || this.client) return;
    let client;
    try {
      client = this.createClient({
        connectionString: this.connectionString,
        application_name: "homezone-property-realtime",
        connectionTimeoutMillis: 5_000,
        query_timeout: 5_000,
        keepAlive: true,
        keepAliveInitialDelayMillis: 10_000
      });
      this.client = client;
      let failed = false;
      const disconnect = () => {
        if (failed) return;
        failed = true;
        this.failed(client);
      };
      client.on("error", disconnect);
      client.on("end", disconnect);
      client.on("notification", message => {
        if (!this.stopped && this.ready && this.client === client &&
            message.channel === PUBLIC_PROPERTIES_CHANNEL && message.payload === PROPERTY_CHANGED_MESSAGE) {
          this.emit("changed");
        }
      });
      await client.connect();
      if (this.stopped || this.client !== client) { void client.end().catch(() => {}); return; }
      await client.query(`LISTEN ${PUBLIC_PROPERTIES_CHANNEL}`);
      if (this.stopped || this.client !== client) { void client.end().catch(() => {}); return; }
      this.attempt = 0;
      this.setReady(true);
      this.logger("listener_ready");
    } catch {
      if (client && this.client === client) this.failed(client);
      else if (!this.stopped && !this.client) this.scheduleRetry();
    }
  }

  failed(client) {
    if (this.client !== client) return;
    this.client = null;
    this.setReady(false);
    this.logger("listener_unavailable");
    // Keep the client's error handler until end settles, without retaining it in the hub.
    void client.end().catch(() => {});
    this.scheduleRetry();
  }

  scheduleRetry() {
    if (this.stopped || this.retryTimer) return;
    const base = Math.min(this.maxRetryMs, this.retryMs * (2 ** Math.min(this.attempt++, 10)));
    const delay = base + this.jitter(Math.max(1, Math.floor(base / 5)));
    this.retryTimer = setTimeout(() => { this.retryTimer = null; void this.connect(); }, delay);
    this.retryTimer.unref?.();
  }

  async stop() {
    this.stopped = true;
    clearTimeout(this.retryTimer);
    this.retryTimer = null;
    this.setReady(false);
    const client = this.client;
    this.client = null;
    if (client) { try { await client.end(); } catch { /* No credential-bearing diagnostics. */ } }
  }
}
