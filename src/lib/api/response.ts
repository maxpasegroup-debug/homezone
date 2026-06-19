import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { captureException } from "@/lib/logging/logger";

export function ok<T>(data: T, init?: ResponseInit) {
  return NextResponse.json(data, init);
}

export function apiError(message: string, status = 500, details?: unknown) {
  return NextResponse.json(
    {
      details,
      error: message
    },
    { status }
  );
}

export function unauthorized(message = "Unauthorized") {
  return apiError(message, 401);
}

export function forbidden(message = "Forbidden") {
  return apiError(message, 403);
}

export function notFound(message = "Not found") {
  return apiError(message, 404);
}

export function validationError(error: ZodError | unknown, message = "Invalid request") {
  return apiError(
    message,
    400,
    error instanceof ZodError ? error.flatten() : undefined
  );
}

export function rateLimited(resetAt: Date) {
  return NextResponse.json(
    {
      error: "Too many requests. Please try again later."
    },
    {
      headers: {
        "Retry-After": String(Math.max(1, Math.ceil((resetAt.getTime() - Date.now()) / 1000)))
      },
      status: 429
    }
  );
}

export async function handleApiError(error: unknown, context?: Record<string, unknown>) {
  captureException(error, context);
  return apiError("Something went wrong. Please try again later.", 500);
}

export async function parseJson<T>(
  request: Request,
  schema: { safeParse: (data: unknown) => { success: true; data: T } | { success: false; error: ZodError } }
) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return {
      error: apiError("Invalid JSON body", 400)
    } as const;
  }

  const parsed = schema.safeParse(body);

  if (!parsed.success) {
    return {
      error: validationError(parsed.error)
    } as const;
  }

  return {
    data: parsed.data
  } as const;
}
