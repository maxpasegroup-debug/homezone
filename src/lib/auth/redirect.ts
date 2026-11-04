import { authOrigin } from "./canonical-origin.mjs";

export { authOrigin };

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
