// Opt-in production custom server. `npm start` and Railway configuration stay unchanged.
// No values from DATABASE_URL, Origin/cookies, payloads or exceptions are logged.
import { createServer } from "node:http";
import { PublicPropertyListener } from "./realtime/database-listener.mjs";
import { createPropertyRealtimeGateway } from "./realtime/websocket-server.mjs";
import { integerSetting, realtimeLimits } from "./realtime/protocol.mjs";
import { createNextUpgradeRouter, listenHttpServer } from "./realtime/http-upgrade-router.mjs";
import { loadRealtimeEnvironment } from "./realtime/environment-loader.mjs";
import { authOrigin } from "./src/lib/auth/canonical-origin.mjs";

process.env.NODE_ENV ||= "production";
const diagnostic = stage => console.info(JSON.stringify({ event: "property_realtime", stage }));

async function main() {
  // Match Next's normal production envfile selection before reading feature flags
  // or credentials. Injected Railway variables still take precedence.
  loadRealtimeEnvironment(process.cwd(), diagnostic);
  const port = integerSetting(process.env, "PORT", 3000, 1, 65_535);
  const hostname = "0.0.0.0";
  const enabled = process.env.HOMEZONE_REALTIME_ENABLED === "true";
  let listener;
  let gateway;
  if (enabled) {
    const origin = authOrigin();
    const limits = realtimeLimits();
    const { Client } = await import("pg");
    listener = new PublicPropertyListener({
      connectionString: process.env.DATABASE_URL,
      createClient: options => new Client(options),
      logger: diagnostic
    });
    gateway = createPropertyRealtimeGateway({ origin, listener, limits });
  }
  const server = createServer();
  const upgrades = createNextUpgradeRouter(server, gateway);
  const { default: next } = await import("next");
  const app = next({ dev: false, hostname, port, httpServer: upgrades.nextHttpServer });
  try {
    await app.prepare();
    const handler = app.getRequestHandler();
    upgrades.setFallback(app.getUpgradeHandler());
    server.on("request", (request, response) => {
      void handler(request, response).catch(() => {
        diagnostic("http_handler_failure");
        if (!response.headersSent) response.writeHead(500);
        response.end();
      });
    });
    server.on("upgrade", upgrades.handleUpgrade);
    // Do not open a persistent PG listener when the HTTP port could not bind.
    await listenHttpServer(server, port, hostname);
  } catch {
    server.close();
    await Promise.allSettled([gateway?.close(), listener?.stop(), app.close()]);
    throw new Error("HTTP initialization unavailable");
  }

  let stopping = false;
  async function shutdown() {
    if (stopping) return;
    stopping = true;
    const deadline = setTimeout(() => process.exit(1), 10_000);
    deadline.unref();
    const httpClosed = new Promise(resolve => server.close(resolve));
    const results = await Promise.allSettled([gateway?.close(), listener?.stop(), app.close(), httpClosed]);
    if (results.some(result => result.status === "rejected")) {
      diagnostic("shutdown_failure");
      process.exitCode = 1;
      // Retain the deadline if a resource failed to close.
    } else clearTimeout(deadline);
  }
  const requestShutdown = () => {
    void shutdown().catch(() => { diagnostic("shutdown_failure"); process.exitCode = 1; });
  };
  server.on("error", () => {
    diagnostic("http_server_failure");
    process.exitCode = 1;
    requestShutdown();
  });
  process.once("SIGTERM", requestShutdown);
  process.once("SIGINT", requestShutdown);
  diagnostic(enabled ? "server_started" : "server_started_disabled");
  listener?.start();
}

main().catch(() => {
  diagnostic("startup_configuration_or_initialization_failure");
  process.exitCode = 1;
});
