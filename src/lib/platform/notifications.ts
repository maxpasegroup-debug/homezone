import type { NotificationChannel, NotificationModule, NotificationPriority, Prisma } from "@prisma/client";
import { db } from "@/lib/db";

export type CreateNotificationInput = {
  actionUrl?: string | null;
  channels?: NotificationChannel[];
  message: string;
  metadata?: Prisma.InputJsonValue;
  module: NotificationModule;
  priority?: NotificationPriority;
  recipientId?: string | null;
  title: string;
  type: string;
};

export async function createNotification({
  actionUrl,
  channels = ["IN_APP"],
  message,
  metadata = {},
  module,
  priority = "NORMAL",
  recipientId,
  title,
  type
}: CreateNotificationInput) {
  if (!recipientId) return null;

  return db.notification.create({
    data: {
      actionUrl,
      channels,
      message,
      metadata,
      module,
      priority,
      recipientId,
      title,
      type
    }
  });
}

export async function markNotificationRead(id: string, recipientId: string) {
  return db.notification.updateMany({
    data: {
      readAt: new Date()
    },
    where: {
      id,
      recipientId
    }
  });
}
