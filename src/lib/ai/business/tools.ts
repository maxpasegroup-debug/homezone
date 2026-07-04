import type { NotificationModule, Prisma, UserRole } from "@prisma/client";
import { buildAIContext, runAIText } from "@/lib/ai/core";
import { db } from "@/lib/db";
import { getAdminLeadOversight, getAdminMarketplaceAnalytics, getAdminOperationsData } from "@/lib/admin/operations";
import { getBuilderEnterpriseData } from "@/lib/builder/queries";
import { getBrokerProDashboardData } from "@/lib/pro/queries";
import { getProviderDashboardData } from "@/lib/services/marketplace";
import { getAdminStudioOperationsData, getStudioDashboardData } from "@/lib/studio/workflow";
import { businessPromptIds, ensureBusinessAIPrompts } from "@/lib/ai/business/prompts";

export type BusinessAIAction =
  | "broker_copilot"
  | "builder_copilot"
  | "studio_copilot"
  | "service_copilot"
  | "admin_copilot"
  | "lead_analysis"
  | "crm_summary"
  | "sales_analytics"
  | "builder_analytics"
  | "studio_analytics"
  | "service_analytics"
  | "revenue_analysis"
  | "report_generator"
  | "notification_draft";

export type BusinessAIInput = {
  action: BusinessAIAction;
  context?: string;
  leadId?: string;
  profileId: string;
  role: UserRole | string;
};

function json(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value ?? {})) as Prisma.InputJsonValue;
}

function moduleForAction(action: BusinessAIAction): NotificationModule {
  if (action.startsWith("broker") || ["lead_analysis", "crm_summary", "sales_analytics"].includes(action)) return "BROKER";
  if (action.startsWith("builder")) return "BUILDER";
  if (action.startsWith("studio")) return "STUDIO";
  if (action.startsWith("service")) return "SERVICE";
  if (action.startsWith("admin") || action === "revenue_analysis") return "ADMIN";
  return "AI";
}

function promptForAction(action: BusinessAIAction) {
  if (action.startsWith("broker") || ["lead_analysis", "crm_summary", "sales_analytics"].includes(action)) return businessPromptIds.broker;
  if (action.startsWith("builder")) return businessPromptIds.builder;
  if (action.startsWith("studio")) return businessPromptIds.studio;
  if (action.startsWith("service")) return businessPromptIds.service;
  if (action.startsWith("admin") || action === "revenue_analysis") return businessPromptIds.admin;
  if (action === "notification_draft") return businessPromptIds.notification;
  if (action === "report_generator") return businessPromptIds.report;
  return businessPromptIds.shared;
}

function canUseAction(role: UserRole | string, action: BusinessAIAction) {
  if (role === "SUPER_ADMIN" || role === "ADMIN") return true;
  if (role === "BROKER") return ["broker_copilot", "lead_analysis", "crm_summary", "sales_analytics", "report_generator", "notification_draft"].includes(action);
  if (role === "BUILDER") return ["builder_copilot", "builder_analytics", "sales_analytics", "report_generator", "notification_draft"].includes(action);
  if (role === "SERVICE_PROVIDER") return ["service_copilot", "service_analytics", "report_generator", "notification_draft"].includes(action);
  if (role === "OWNER") return ["studio_copilot", "studio_analytics", "report_generator", "notification_draft"].includes(action);
  return false;
}

function compactLead(lead: Awaited<ReturnType<typeof db.lead.findFirst>>) {
  if (!lead) return null;
  return {
    contactAction: lead.contactAction,
    createdAt: lead.createdAt,
    dealValue: lead.dealValue ? Number(lead.dealValue) : null,
    followUpAt: lead.followUpAt,
    id: lead.id,
    message: lead.message,
    name: lead.name,
    nextAction: lead.nextAction,
    priority: lead.priority,
    source: lead.source,
    stage: lead.stage
  };
}

async function gatherBusinessContext(input: BusinessAIInput) {
  const includeLead = input.leadId
    ? await db.lead.findFirst({
        include: {
          assigned: true,
          notes: { orderBy: { createdAt: "desc" }, take: 8 },
          property: true,
          siteVisits: { orderBy: { scheduledAt: "desc" }, take: 8 },
          tasks: { orderBy: { dueAt: "asc" }, take: 8 },
          timeline: { orderBy: { createdAt: "desc" }, take: 8 },
          user: true
        },
        where: {
          id: input.leadId,
          OR: [
            { assignedTo: input.profileId },
            { userId: input.profileId },
            { property: { ownerId: input.profileId } }
          ]
        }
      })
    : null;

  const [broker, builder, studio, provider, adminOps, adminLeads, adminMarketplace] = await Promise.all([
    ["BROKER", "ADMIN", "SUPER_ADMIN"].includes(String(input.role)) ? getBrokerProDashboardData(input.profileId).catch(() => null) : null,
    ["BUILDER", "ADMIN", "SUPER_ADMIN"].includes(String(input.role)) ? getBuilderEnterpriseData(input.profileId).catch(() => null) : null,
    ["OWNER", "ADMIN", "SUPER_ADMIN"].includes(String(input.role)) ? getStudioDashboardData(input.profileId).catch(() => null) : null,
    ["SERVICE_PROVIDER", "ADMIN", "SUPER_ADMIN"].includes(String(input.role)) ? getProviderDashboardData(input.profileId).catch(() => null) : null,
    ["ADMIN", "SUPER_ADMIN"].includes(String(input.role)) ? getAdminOperationsData().catch(() => null) : null,
    ["ADMIN", "SUPER_ADMIN"].includes(String(input.role)) ? getAdminLeadOversight().catch(() => null) : null,
    ["ADMIN", "SUPER_ADMIN"].includes(String(input.role)) ? getAdminMarketplaceAnalytics().catch(() => null) : null
  ]);
  const studioAdmin = ["ADMIN", "SUPER_ADMIN"].includes(String(input.role))
    ? await getAdminStudioOperationsData().catch(() => null)
    : null;

  return {
    admin: adminOps
      ? {
          leadOversight: adminLeads,
          marketplace: adminMarketplace,
          operations: adminOps,
          studio: studioAdmin
        }
      : undefined,
    broker: broker
      ? {
          analytics: broker.analytics,
          calendar: broker.calendar,
          commissions: broker.commissionTotals,
          lead: compactLead(includeLead),
          plan: broker.plan,
          recentAssignments: broker.recentAssignments.slice(0, 8),
          stageGroups: broker.stageGroups,
          teamCount: broker.team.length
        }
      : includeLead
        ? { lead: compactLead(includeLead) }
        : undefined,
    builder: builder
      ? {
          analytics: builder.analytics,
          campaigns: builder.campaigns.slice(0, 8),
          plan: builder.plan,
          projects: builder.projects.slice(0, 8).map((project) => ({
            availableUnits: project.availableUnits,
            campaignStatus: project.campaignStatus,
            constructionStatus: project.constructionStatus,
            id: project.id,
            name: project.name,
            status: project.status,
            unitsCount: project.unitsCount
          }))
        }
      : undefined,
    service: provider
      ? {
          analytics: provider.analytics,
          provider: provider.provider
            ? {
                businessName: provider.provider.businessName,
                category: provider.provider.category,
                city: provider.provider.city,
                rating: provider.provider.rating,
                reviewCount: provider.provider.reviewCount
              }
            : null,
          quoteRequests: provider.quoteRequests.slice(0, 8)
        }
      : undefined,
    studio: studio
      ? {
          analytics: studio.analytics,
          orders: studio.orders.slice(0, 10).map((order) => ({
            city: order.city,
            id: order.id,
            paymentStatus: order.paymentStatus,
            serviceType: order.serviceType,
            status: order.status
          }))
        }
      : undefined
  };
}

async function saveBusinessReport(input: BusinessAIInput, output: Record<string, unknown>) {
  return db.aiReport.create({
    data: {
      input: json({
        action: input.action,
        context: input.context,
        leadId: input.leadId,
        role: input.role
      }),
      output: json(output),
      reportType: `BUSINESS_AI_${input.action.toUpperCase()}`,
      userId: input.profileId
    }
  }).catch(() => null);
}

export async function runBusinessAITool(input: BusinessAIInput) {
  if (!canUseAction(input.role, input.action)) {
    return {
      allowed: false,
      summary: "This Business AI action is not available for your current workspace role."
    };
  }

  await ensureBusinessAIPrompts();
  const businessContext = await gatherBusinessContext(input);
  const aiModule = moduleForAction(input.action);
  const promptId = promptForAction(input.action);
  const result = await runAIText({
    context: buildAIContext({
      admin: businessContext.admin,
      broker: businessContext.broker,
      builder: businessContext.builder,
      service: businessContext.service,
      studio: businessContext.studio
    }),
    metadata: {
      action: input.action,
      businessAI: true,
      role: input.role
    },
    module: aiModule,
    promptId,
    userId: input.profileId,
    userText: input.context || `Run ${input.action.replace(/_/g, " ")} for my HomeZone workspace.`
  });
  const summary = result.output ?? "Business AI could not generate this insight right now. Review your workspace data and try again.";
  const report = await saveBusinessReport(input, {
    source: result.source,
    summary,
    usageLogId: result.usageLogId
  });

  return {
    allowed: true,
    context: businessContext,
    reportId: report?.id,
    source: result.source,
    summary,
    usageLogId: result.usageLogId
  };
}

export async function getBusinessAIDashboard(profileId: string, role: UserRole | string) {
  const [reports, conversations, usage] = await Promise.all([
    db.aiReport.findMany({
      orderBy: {
        createdAt: "desc"
      },
      take: 12,
      where: {
        reportType: {
          startsWith: "BUSINESS_AI_"
        },
        userId: profileId
      }
    }),
    db.aIConversation.findMany({
      orderBy: {
        updatedAt: "desc"
      },
      take: 8,
      where: {
        userId: profileId,
        module: {
          in: ["BROKER", "BUILDER", "STUDIO", "SERVICE", "ADMIN", "AI"]
        }
      }
    }),
    db.aIUsageLog.aggregate({
      _count: {
        _all: true
      },
      _sum: {
        totalTokens: true
      },
      where: {
        createdAt: {
          gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
        },
        userId: profileId
      }
    })
  ]);

  const recommendedActions: BusinessAIAction[] =
    role === "BROKER"
      ? ["broker_copilot", "lead_analysis", "notification_draft"]
      : role === "BUILDER"
        ? ["builder_copilot", "builder_analytics", "report_generator"]
        : role === "SERVICE_PROVIDER"
          ? ["service_copilot", "service_analytics", "notification_draft"]
          : role === "OWNER"
            ? ["studio_copilot", "studio_analytics", "notification_draft"]
            : ["admin_copilot", "revenue_analysis", "report_generator"];

  return {
    conversations,
    productivity: {
      reports: reports.length,
      requests30d: usage._count._all,
      tokens30d: usage._sum.totalTokens ?? 0
    },
    recommendedActions,
    reports
  };
}
