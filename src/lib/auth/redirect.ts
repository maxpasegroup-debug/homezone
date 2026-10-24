const productionOrigin = "https://homezone-production.up.railway.app";

function stagingOrigin() {
  const configured = process.env.AUTH_STAGING_ORIGIN;
  if (configured === undefined) return undefined;
  const error = "AUTH_STAGING_ORIGIN must be a separate public HTTPS origin without credentials, paths, queries or fragments";
  let url: URL;
  try {
    url = new URL(configured);
  } catch {
    throw new Error(error);
  }
  const hostname = url.hostname;
  const publicHostname = hostname.length <= 253 && hostname.includes(".") &&
    hostname.split(".").every((label) => /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(label)) &&
    !/^\d+(?:\.\d+){3}$/.test(hostname) &&
    !["localhost", "local", "internal", "invalid", "test"].some((suffix) => hostname.endsWith(`.${suffix}`));
  if (url.protocol !== "https:" || url.origin === productionOrigin || !publicHostname || url.username || url.password ||
      url.pathname !== "/" || url.search || url.hash || configured.replace(/\/$/, "") !== url.origin) {
    throw new Error(error);
  }
  return url.origin;
}

// Never derive browser destinations from Host or forwarded headers.
export function authOrigin() {
  const approvedStagingOrigin = stagingOrigin();
  const configured = process.env.AUTH_URL ?? process.env.NEXTAUTH_URL;
  const error = "Explicit, consistent canonical authentication origins are required";
  if ((process.env.NODE_ENV === "production" || approvedStagingOrigin) && !configured) throw new Error(error);
  if ((process.env.NODE_ENV === "production" || approvedStagingOrigin) &&
      process.env.AUTH_URL !== undefined && process.env.NEXTAUTH_URL !== undefined &&
      process.env.AUTH_URL.replace(/\/$/, "") !== process.env.NEXTAUTH_URL.replace(/\/$/, "")) throw new Error(error);
  let url: URL;
  try { url = new URL(configured ?? "http://localhost:3000"); } catch { throw new Error(error); }
  if ((approvedStagingOrigin && url.origin !== approvedStagingOrigin) ||
      (url.pathname !== "/") || (configured !== undefined && configured.replace(/\/$/, "") !== url.origin)) throw new Error(error);
  const local = process.env.NODE_ENV !== "production" &&
    url.protocol === "http:" && ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
  if (url.username || url.password || url.search || url.hash ||
      (url.origin !== productionOrigin && url.origin !== approvedStagingOrigin && !local)) {
    throw new Error("AUTH_URL/NEXTAUTH_URL must use the trusted public HTTPS origin, explicitly approved staging origin or a development loopback HTTP origin");
  }
  return url.origin;
}

export function authRedirect(destination: string) {
  const origin = authOrigin();
  try {
    if (!destination || /[\\\s\u0000-\u001f\u007f]/.test(destination) || destination.startsWith("//") ||
        (!destination.startsWith("/") && !destination.startsWith(`${origin}/`) && destination !== origin)) return origin;
    const url = new URL(destination, origin);
    if (url.origin !== origin || url.username || url.password) return origin;
    return url.href;
  } catch {
    return origin;
  }
}
