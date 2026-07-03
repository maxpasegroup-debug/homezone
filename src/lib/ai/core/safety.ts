const piiPatterns = [
  /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi,
  /(\+?\d[\d\s().-]{7,}\d)/g
];

const sensitiveDocumentTerms = [
  "aadhaar",
  "pan number",
  "passport number",
  "bank account",
  "credit card"
];

export function redactPII(input: string) {
  return piiPatterns.reduce((text, pattern) => text.replace(pattern, "[REDACTED_PII]"), input);
}

export function validatePromptInput(input: string) {
  if (!input.trim()) {
    return { allowed: false, reason: "Empty prompt" } as const;
  }
  if (input.length > 8000) {
    return { allowed: false, reason: "Prompt is too long" } as const;
  }
  return { allowed: true } as const;
}

export function checkSensitiveDocuments(input: string) {
  const lower = input.toLowerCase();
  return sensitiveDocumentTerms.filter((term) => lower.includes(term));
}

export function legalDisclaimer() {
  return "HomeZone AI can explain property information, but it does not replace legal advice. Verify documents with a qualified professional.";
}

export function financialDisclaimer() {
  return "HomeZone AI can estimate financial fit, but it does not provide financial advice or guaranteed returns.";
}

export function safetySystemSuffix(input: string) {
  const flags = checkSensitiveDocuments(input);
  const disclaimers = [legalDisclaimer(), financialDisclaimer()];
  if (flags.length) {
    disclaimers.push("Sensitive identity or financial document details must be minimized and redacted unless strictly required.");
  }
  return disclaimers.join("\n");
}
