import { z } from "zod";

const booleanString = z
  .enum(["true", "false"])
  .optional()
  .transform((value) => value === "true");

const optionalString = z.preprocess(
  (value) => {
    if (typeof value !== "string") return value;
    const trimmed = value.trim();
    return trimmed === "" ? undefined : trimmed;
  },
  z.string().optional()
);

const optionalEmail = z.preprocess(
  (value) => {
    if (typeof value !== "string") return value;
    const trimmed = value.trim();
    return trimmed === "" ? undefined : trimmed;
  },
  z.string().email().optional()
);

const optionalPort = z.preprocess(
  (value) => (value === "" ? undefined : value),
  z.coerce.number().int().positive().optional()
);

const envSchema = z.object({
  AUTH_SECRET: z.string().min(16).optional(),
  CLOUDINARY_API_KEY: z.string().optional(),
  CLOUDINARY_API_SECRET: z.string().optional(),
  CLOUDINARY_CLOUD_NAME: z.string().optional(),
  DATABASE_URL: z.string().url().optional(),
  DEMO_EMAIL: z.string().email().optional(),
  DEMO_LOGIN_ENABLED: booleanString,
  DEMO_PASSWORD: z.string().optional(),
  GOOGLE_CLIENT_ID: optionalString,
  GOOGLE_CLIENT_SECRET: optionalString,
  HOMEZONE_ENFORCE_ENV: booleanString,
  LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),
  NEXT_PUBLIC_SITE_URL: z.string().url().optional(),
  NEXTAUTH_URL: z.string().url().optional(),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  OPENAI_API_KEY: z.string().optional(),
  OPENAI_MODEL: z.string().default("gpt-4.1-mini"),
  OTP_DEV_LOG_CODES: booleanString,
  OTP_PEPPER: z.string().min(16).optional(),
  RAZORPAY_KEY_ID: z.string().optional(),
  RAZORPAY_KEY_SECRET: z.string().optional(),
  RAZORPAY_WEBHOOK_SECRET: z.string().optional(),
  SENTRY_DSN: z.string().url().optional(),
  SMTP_HOST: optionalString,
  SMTP_PASSWORD: optionalString,
  SMTP_PORT: optionalPort,
  SMTP_USER: optionalString,
  EMAIL_FROM: optionalEmail,
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
  "CLOUDINARY_API_KEY",
  "CLOUDINARY_API_SECRET",
  "CLOUDINARY_CLOUD_NAME",
  "DATABASE_URL",
  "GOOGLE_CLIENT_ID",
  "GOOGLE_CLIENT_SECRET",
  "NEXTAUTH_URL",
  "OPENAI_API_KEY",
  "OTP_PEPPER",
  "RAZORPAY_KEY_ID",
  "RAZORPAY_KEY_SECRET",
  "RAZORPAY_WEBHOOK_SECRET",
  "SENTRY_DSN",
  "WHATSAPP_OTP_API_KEY",
  "WHATSAPP_OTP_PROVIDER"
] as const;

const launchEnvGroups = [
  {
    keys: ["DATABASE_URL", "AUTH_SECRET", "NEXTAUTH_URL"] as const,
    name: "Core runtime"
  },
  {
    keys: ["GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET"] as const,
    name: "Google OAuth"
  },
  {
    keys: ["OPENAI_API_KEY"] as const,
    name: "OpenAI"
  },
  {
    keys: ["CLOUDINARY_CLOUD_NAME", "CLOUDINARY_API_KEY", "CLOUDINARY_API_SECRET"] as const,
    name: "Cloudinary"
  },
  {
    keys: ["RAZORPAY_KEY_ID", "RAZORPAY_KEY_SECRET", "RAZORPAY_WEBHOOK_SECRET"] as const,
    name: "Razorpay"
  },
  {
    keys: ["OTP_PEPPER", "WHATSAPP_OTP_PROVIDER", "WHATSAPP_OTP_API_KEY"] as const,
    name: "OTP"
  },
  {
    keys: ["SENTRY_DSN"] as const,
    name: "Monitoring"
  }
] as const;

export function getProductionEnvIssues() {
  if (env.NODE_ENV !== "production" && !env.HOMEZONE_ENFORCE_ENV) {
    return [];
  }

  return productionRequiredKeys.filter((key) => !env[key]);
}

export function getProductionEnvAudit() {
  const groups = launchEnvGroups.map((group) => {
    const keys = group.keys.map((key) => ({
      key,
      present: Boolean(env[key])
    }));

    return {
      missing: keys.filter((item) => !item.present).map((item) => item.key),
      name: group.name,
      present: keys.filter((item) => item.present).map((item) => item.key)
    };
  });
  const missing = groups.flatMap((group) => group.missing);

  return {
    enforceEnv: Boolean(env.HOMEZONE_ENFORCE_ENV),
    groups,
    missing,
    nodeEnv: env.NODE_ENV,
    ready: missing.length === 0
  };
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

export function isEmailLoginEnabled() {
  return Boolean(env.SMTP_HOST && env.SMTP_PORT && env.SMTP_USER && env.SMTP_PASSWORD && env.EMAIL_FROM);
}
