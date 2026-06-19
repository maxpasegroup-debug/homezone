type LogContext = Record<string, unknown>;

function writeLog(level: "debug" | "info" | "warn" | "error", message: string, context?: LogContext) {
  const payload = {
    context,
    level,
    message,
    timestamp: new Date().toISOString()
  };

  if (level === "error") {
    console.error(JSON.stringify(payload));
    return;
  }

  if (level === "warn") {
    console.warn(JSON.stringify(payload));
    return;
  }

  if (process.env.LOG_LEVEL === "debug" || level === "info") {
    console.log(JSON.stringify(payload));
  }
}

export const logger = {
  debug(message: string, context?: LogContext) {
    writeLog("debug", message, context);
  },
  error(message: string, context?: LogContext) {
    writeLog("error", message, context);
  },
  info(message: string, context?: LogContext) {
    writeLog("info", message, context);
  },
  warn(message: string, context?: LogContext) {
    writeLog("warn", message, context);
  }
};

export function captureException(error: unknown, context?: LogContext) {
<<<<<<< HEAD
  const eventId = crypto.randomUUID();
  logger.error(error instanceof Error ? error.message : "Unknown server error", {
    ...context,
    eventId,
    monitoring: process.env.SENTRY_DSN ? "sentry-ready" : "local-log",
    stack: error instanceof Error ? error.stack : undefined
  });

  return eventId;
=======
  logger.error(error instanceof Error ? error.message : "Unknown server error", {
    ...context,
    stack: error instanceof Error ? error.stack : undefined
  });
>>>>>>> e77e92e1bc1b4f2793fb53eb7c6506954b3cd814
}
