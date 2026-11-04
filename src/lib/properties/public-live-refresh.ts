type PublicPropertyEvent = "ready" | "properties.changed";
type Socket = Pick<WebSocket, "onmessage" | "onclose" | "onerror" | "close">;
type Timer = ReturnType<typeof setTimeout>;

export function parsePublicPropertyEvent(value: unknown): PublicPropertyEvent | null {
  if (typeof value !== "string" || value.length > 128) return null;
  try {
    const message: unknown = JSON.parse(value);
    if (!message || typeof message !== "object" || Array.isArray(message) ||
        Object.keys(message).length !== 2 || !("v" in message) || !("type" in message) ||
        message.v !== 1 || typeof message.type !== "string" ||
        !["ready", "properties.changed"].includes(message.type)) return null;
    return message.type as PublicPropertyEvent;
  } catch {
    return null;
  }
}

export function propertySocketUrl(origin: string): string | null {
  try {
    const url = new URL(origin);
    if (url.username || url.password || url.pathname !== "/" || url.search || url.hash ||
        (url.protocol !== "https:" && !(url.protocol === "http:" &&
          ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname)))) return null;
    url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
    url.pathname = "/api/mobile/properties/live";
    return url.toString();
  } catch {
    return null;
  }
}

/** Public hints trigger existing server reads; this controller never handles auth or record data. */
export function createPublicPropertyRefresh({
  origin, connect, refresh,
  schedule = setTimeout, cancel = clearTimeout, now = Date.now, random = Math.random
}: {
  origin: string;
  connect: (url: string) => Socket;
  refresh: () => void;
  schedule?: (callback: () => void, delay: number) => Timer;
  cancel?: (timer: Timer) => void;
  now?: () => number;
  random?: () => number;
}) {
  const url = propertySocketUrl(origin);
  let active = false, disposed = false, ready = false;
  let epoch = 0, failures = 0, lastRefresh = -Infinity;
  let socket: Socket | null = null;
  let retry: Timer | undefined, deadline: Timer | undefined;
  let safety: Timer | undefined, debounce: Timer | undefined;
  const current = (generation: number) => active && !disposed && epoch === generation;

  function queueRefresh() {
    if (!active || disposed || debounce !== undefined) return;
    // Coalesce bursts and cap server refreshes to one per second.
    debounce = schedule(() => {
      debounce = undefined;
      if (!active || disposed) return;
      lastRefresh = now();
      refresh();
    }, Math.max(200, lastRefresh + 1_000 - now()));
  }
  function scheduleSafety() {
    if (safety !== undefined) cancel(safety);
    safety = undefined;
    if (!active || disposed) return;
    safety = schedule(() => {
      safety = undefined;
      queueRefresh();
      scheduleSafety();
    }, ready ? 30_000 : 5_000);
  }
  function closeSocket() {
    if (deadline !== undefined) cancel(deadline);
    deadline = undefined;
    const previous = socket;
    socket = null;
    if (previous) {
      previous.onmessage = null;
      previous.onclose = null;
      previous.onerror = null;
      try { previous.close(); } catch { /* Closing an unavailable public socket is best effort. */ }
    }
  }
  function lost(generation: number) {
    if (!current(generation)) return;
    epoch++;
    closeSocket();
    const wasReady = ready;
    ready = false;
    if (wasReady) scheduleSafety();
    failures = Math.min(6, failures + 1);
    const delay = Math.min(30_000, (2 ** (failures - 1)) * 1_000 * (1 + Math.max(0, Math.min(1, random()))));
    retry = schedule(() => {
      retry = undefined;
      open();
    }, delay);
  }
  function open() {
    if (!active || disposed || socket || retry !== undefined || !url) return;
    const generation = ++epoch;
    try {
      socket = connect(url);
      socket.onclose = () => lost(generation);
      socket.onerror = () => lost(generation);
      socket.onmessage = event => {
        if (!current(generation)) return;
        const message = parsePublicPropertyEvent(event.data);
        if (!message || (!ready && message !== "ready")) { lost(generation); return; }
        if (message === "ready") {
          if (deadline !== undefined) cancel(deadline);
          deadline = undefined;
          failures = 0;
          ready = true;
          scheduleSafety();
        }
        // A ready handshake also recovers changes missed while disconnected.
        queueRefresh();
      };
      deadline = schedule(() => lost(generation), 8_000);
    } catch {
      lost(generation);
    }
  }
  function stop() {
    epoch++;
    closeSocket();
    for (const timer of [retry, safety, debounce]) if (timer !== undefined) cancel(timer);
    retry = safety = debounce = undefined;
    ready = false;
  }
  return {
    setVisible(visible: boolean) {
      if (disposed || visible === active) return;
      active = visible;
      if (!visible) { stop(); return; }
      failures = 0;
      queueRefresh();
      scheduleSafety();
      open();
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      active = false;
      stop();
    }
  };
}
