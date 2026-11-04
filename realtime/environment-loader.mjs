import nextEnvironment from "@next/env";

// @next/env is CommonJS: its loader is on the default export in Node ESM.
// Never forward dotenv diagnostics, which may contain configuration contents.
export function loadRealtimeEnvironment(directory, diagnostic, loadEnvConfig = nextEnvironment.loadEnvConfig) {
  if (typeof loadEnvConfig !== "function") throw new Error("Environment loader unavailable");
  return loadEnvConfig(directory, false, {
    info: () => {},
    error: () => diagnostic("envfile_load_failure")
  });
}
