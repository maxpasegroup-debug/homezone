import { createHash } from "node:crypto";

export class PrivateScanUnavailable extends Error {
  constructor() { super("Private document scanning unavailable"); }
}
export class PrivateScanRejected extends Error {
  constructor() { super("Private document not accepted"); }
}

// Adapter contract, not a claim of an installed scanning provider. Deployment
// must explicitly approve the endpoint and data processing before enabling it.
function configuration() {
  try {
    if (process.env.PRIVATE_FILE_SCANNER_APPROVED !== "true") throw Error();
    const endpoint = new URL(process.env.PRIVATE_FILE_SCANNER_URL ?? "");
    const key = process.env.PRIVATE_FILE_SCANNER_KEY ?? "";
    if (endpoint.protocol !== "https:" || endpoint.username || endpoint.password ||
        endpoint.search || endpoint.hash || key.length < 32 || /\s/.test(key)) throw Error();
    return { endpoint, key };
  } catch { throw new PrivateScanUnavailable(); }
}
export function requirePrivateScanner() { configuration(); }

export async function scanPrivatePdf(bytes: Buffer): Promise<void> {
  const { endpoint, key } = configuration();
  if (bytes.length < 5 || bytes.length > 524288 || bytes.subarray(0,5).toString()!=="%PDF-") throw new PrivateScanRejected();
  const sha256 = createHash("sha256").update(bytes).digest("hex");
  try {
    const response = await fetch(endpoint, {
      method: "POST", redirect: "error", cache: "no-store", signal: AbortSignal.timeout(8000),
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/pdf",
        "X-Homezone-Content-SHA256": sha256, "X-Homezone-Scan-Contract": "1" },
      body: new Uint8Array(bytes)
    });
    if (!response.ok || response.headers.get("content-type")?.split(';')[0].trim().toLowerCase()!=="application/json") {
      await response.body?.cancel(); throw new PrivateScanUnavailable();
    }
    const reader = response.body?.getReader(); if (!reader) throw new PrivateScanUnavailable();
    const chunks: Uint8Array[] = []; let size = 0;
    for (;;) {
      const part = await reader.read(); if (part.done) break;
      size += part.value.byteLength;
      if (size > 2048) { await reader.cancel(); throw new PrivateScanUnavailable(); }
      chunks.push(part.value);
    }
    const result = JSON.parse(Buffer.concat(chunks).toString("utf8"));
    if (!result || typeof result!=="object" || Array.isArray(result) || Object.keys(result).length!==3 ||
        Object.keys(result).some(key=>!["version","sha256","verdict"].includes(key)) || result.version !== 1 || result.sha256 !== sha256 ||
        !["clean", "infected"].includes(result.verdict)) throw new PrivateScanUnavailable();
    if (result.verdict === "infected") throw new PrivateScanRejected();
  } catch (error) {
    if (error instanceof PrivateScanRejected) throw error;
    // Never propagate response text, endpoint, bearer key, digest or file bytes.
    throw new PrivateScanUnavailable();
  }
}
