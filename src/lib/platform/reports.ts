import type { Prisma, ReportEntityType, ReportStatus } from "@prisma/client";
import { auditLog } from "@/lib/audit";
import { db } from "@/lib/db";

export async function createReport({
  entityId,
  entityType,
  metadata = {},
  reason,
  reporterId
}: {
  entityId: string;
  entityType: ReportEntityType;
  metadata?: Prisma.InputJsonValue;
  reason: string;
  reporterId?: string | null;
}) {
  const report = await db.report.create({
    data: {
      entityId,
      entityType,
      metadata,
      reason,
      reporterId
    }
  });

  await auditLog({
    action: "REPORT_CREATED",
    actorId: reporterId,
    entityId: report.id,
    entityType: "report",
    metadata: {
      reportedEntityId: entityId,
      reportedEntityType: entityType
    }
  });

  return report;
}

export async function updateReportStatus({
  adminId,
  note,
  reportId,
  status
}: {
  adminId: string;
  note?: string;
  reportId: string;
  status: ReportStatus;
}) {
  const report = await db.report.update({
    data: {
      adminNotes: note,
      resolvedAt: ["RESOLVED", "DISMISSED"].includes(status) ? new Date() : undefined,
      status
    },
    where: {
      id: reportId
    }
  });

  await auditLog({
    action: `REPORT_${status}`,
    actorId: adminId,
    entityId: report.id,
    entityType: "report"
  });

  return report;
}
