import type { Prisma, WebhookEventStatus, WebhookProvider } from "@prisma/client";
import { db } from "@/lib/db";

export async function registerWebhookEvent({
  eventId,
  eventType,
  payload,
  provider
}: {
  eventId: string;
  eventType?: string | null;
  payload: Prisma.InputJsonValue;
  provider: WebhookProvider;
}) {
  const existing = await db.webhookEvent.findUnique({
    where: {
      provider_eventId: {
        eventId,
        provider
      }
    }
  });

  if (existing) {
    return {
      duplicate: true,
      event: existing
    };
  }

  const event = await db.webhookEvent.create({
    data: {
      eventId,
      eventType,
      payload,
      provider,
      status: "RECEIVED"
    }
  });

  return {
    duplicate: false,
    event
  };
}

export async function updateWebhookEventStatus({
  eventId,
  lastError,
  provider,
  status
}: {
  eventId: string;
  lastError?: string;
  provider: WebhookProvider;
  status: WebhookEventStatus;
}) {
  return db.webhookEvent.update({
    data: {
      lastError,
      processedAt: status === "PROCESSED" || status === "IGNORED" ? new Date() : undefined,
      retries: status === "FAILED" ? { increment: 1 } : undefined,
      status
    },
    where: {
      provider_eventId: {
        eventId,
        provider
      }
    }
  });
}
