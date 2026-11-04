// Next 15's custom HTTP handler registers its router upgrade callback lazily on
// the supplied httpServer. Capture that registration instead of installing a
// second EventEmitter listener that could also consume our already-upgraded socket.
// Unknown paths retain Next's normal callback; the public socket has one owner.
export function createNextUpgradeRouter(server, gateway) {
  let nextUpgrade;
  let fallback;
  const nextHttpServer = {
    on(event, handler) {
      if (event === "upgrade") nextUpgrade = handler;
      else server.on(event, handler);
      return nextHttpServer;
    }
  };
  return {
    nextHttpServer,
    setFallback(handler) { fallback = handler; },
    handleUpgrade(request, socket, head) {
      socket.on("error", () => socket.destroy());
      try {
        if (gateway?.handleUpgrade(request, socket, head)) return;
        const handler = nextUpgrade ?? fallback;
        if (!handler) { socket.destroy(); return; }
        void Promise.resolve(handler(request, socket, head)).catch(() => socket.destroy());
      } catch { socket.destroy(); }
    }
  };
}

export function listenHttpServer(server, port, hostname) {
  return new Promise((resolve, reject) => {
    const failed = () => {
      server.off("listening", ready);
      reject(new Error("HTTP listener unavailable"));
    };
    const ready = () => {
      server.off("error", failed);
      resolve();
    };
    server.once("error", failed);
    server.once("listening", ready);
    try { server.listen(port, hostname); }
    catch {
      server.off("error", failed);
      server.off("listening", ready);
      reject(new Error("HTTP listener unavailable"));
    }
  });
}
