import { z } from "zod";

const booleanString = z
  .enum(["true", "false"])
  .optional()
  .transform((value) => value === "true");

const envSchema = z.object({
  AUTH_SECRET: z.string().min(16).optional(),
  CLOUDINARY_API_KEY: z.string().optional(),
  CLOUDINARY_API_SECRET: z.string().optional(),
  CLOUDINARY_CLOUD_NAME: z.string().optional(),
  DATABASE_URL: z.string().url().optional(),
  DEMO_EMAIL: z.string().email().optional(),
  DEMO_LOGIN_ENABLED: booleanString,
  DEMO_PASSWORD: z.string().optional(),
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  HOMEZONE_ENFORCE_ENV: booleanString,
  LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),
  NEXT_PUBLIC_SITE_URL: z.string().url().optional(),
  NEXTAUTH_URL: z.string().url().optional(),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  OPENAI_API_KEY: z.string().optional(),
  OPENAI_MODEL: z.string().default("gpt-4.1-mini"),
  OTP_DEV_LOG_CODES: booleanString,
  OTP_PEPPER: z.string().min(16).optional(),
  SENTRY_DSN: z.string().url().optional(),
  UPLOAD_MAX_BYTES: z.coerce.number().int().positive().default(25_000_000),
  WHATSAPP_OTP_API_KEY: z.string().optional(),
  WHATSAPP_OTP_PROVIDER: z.string().optional()
});

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  throw new Error(`Invalid environment: ${parsedEnv.error.message}`);
}

export const env = parsedEnv.data;

const productionRequiredKeys = [
  "AUTH_SECRET",
  "DATABASE_URL",
  "NEXTAUTH_URL",
  "OTP_PEPPER"
] as const;

export function getProductionEnvIssues() {
  if (env.NODE_ENV !== "production" && !env.HOMEZONE_ENFORCE_ENV) {
    return [];
  }

  return productionRequiredKeys.filter((key) => !env[key]);
}

export function assertProductionEnv() {
  const missing = getProductionEnvIssues();

  if (missing.length) {
    throw new Error(`Missing required production environment variables: ${missing.join(", ")}`);
  }
}

export function isProduction() {
  return env.NODE_ENV === "production";
}

export function isDemoLoginEnabled() {
  return !isProduction() && env.DEMO_LOGIN_ENABLED !== false;
}
