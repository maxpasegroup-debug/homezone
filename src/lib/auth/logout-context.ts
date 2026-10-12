import { AsyncLocalStorage } from "node:async_hooks";

const logoutState = new AsyncLocalStorage<{ failed: boolean }>();

export function markLogoutFailure() {
  const state = logoutState.getStore();
  if (state) state.failed = true;
}

// Auth.js catches event failures. Propagate revocation failure instead of a
// successful sign-out response that merely clears the client's cookies.
export async function withLogoutCheck<T>(operation: () => Promise<T>) {
  return logoutState.run({ failed: false }, async () => {
    try {
      return await operation();
    } finally {
      // Also override a server-action redirect if Auth.js swallowed the event error.
      if (logoutState.getStore()?.failed) throw new Error("Session revocation unavailable");
    }
  });
}
