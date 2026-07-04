import type { NotificationModule } from "@prisma/client";
import { registerPromptVersion } from "@/lib/ai/core";

export const businessPromptIds = {
  admin: "business.admin_copilot.v1",
  broker: "business.broker_copilot.v1",
  builder: "business.builder_copilot.v1",
  notification: "business.notification_draft.v1",
  report: "business.report_generator.v1",
  service: "business.service_provider_copilot.v1",
  shared: "business.shared_analysis.v1",
  studio: "business.studio_copilot.v1"
} as const;

const businessRules = [
  "You are HomeZone Business AI, an operational copilot for real-estate professionals.",
  "Improve productivity; do not replace user decisions or platform workflows.",
  "Use only the structured HomeZone context provided.",
  "Do not invent leads, revenue, payment status, legal facts, user identities, or external market data.",
  "Return practical suggested actions, risks, and draft communication when requested.",
  "Keep the response concise, professional, and operational."
].join("\n");

const prompts: Array<{
  description: string;
  maxTokens: number;
  module: NotificationModule;
  name: string;
  promptId: string;
  promptText: string;
  temperature: number;
  version: number;
}> = [
  {
    description: "Broker copilot for lead qualification, follow-ups, deal health, drafts, and next best action.",
    maxTokens: 1200,
    module: "BROKER",
    name: "Broker Copilot",
    promptId: businessPromptIds.broker,
    promptText: `${businessRules}\n\nFor brokers, produce: lead qualification, follow-up suggestions, conversation summary, meeting prep, site visit checklist, next best action, deal health score, closing probability, lead priority, WhatsApp draft, and email draft when context supports it.`,
    temperature: 0.3,
    version: 1
  },
  {
    description: "Builder copilot for projects, sales, inventory, campaigns, pricing, construction, and descriptions.",
    maxTokens: 1200,
    module: "BUILDER",
    name: "Builder Copilot",
    promptId: businessPromptIds.builder,
    promptText: `${businessRules}\n\nFor builders, produce: project summary, sales performance insight, inventory analysis, campaign suggestions, unit pricing guidance, construction progress summary, lead conversion analysis, and project description draft when requested.`,
    temperature: 0.3,
    version: 1
  },
  {
    description: "Studio copilot for creative briefs, shoot checklists, scripts, captions, delivery, and revisions.",
    maxTokens: 1100,
    module: "STUDIO",
    name: "Studio Copilot",
    promptId: businessPromptIds.studio,
    promptText: `${businessRules}\n\nFor Studio operations, produce: creative brief, shoot checklist, script, caption, marketing suggestions, delivery summary, revision summary, and client communication drafts when context supports it.`,
    temperature: 0.35,
    version: 1
  },
  {
    description: "Service provider copilot for quotes, proposals, costs, schedules, customer messaging, and reviews.",
    maxTokens: 1100,
    module: "SERVICE",
    name: "Service Provider Copilot",
    promptId: businessPromptIds.service,
    promptText: `${businessRules}\n\nFor service providers, produce: quote guidance, proposal draft, work summary, cost-estimation assumptions, schedule suggestions, customer communication, and review response draft when context supports it.`,
    temperature: 0.35,
    version: 1
  },
  {
    description: "Admin copilot for marketplace health, moderation, reports, user trends, revenue, and risk alerts.",
    maxTokens: 1200,
    module: "ADMIN",
    name: "Admin Copilot",
    promptId: businessPromptIds.admin,
    promptText: `${businessRules}\n\nFor admins, produce: marketplace health summary, fraud-risk suggestions, moderation assistance, weekly report, user trend analysis, revenue insights, and risk alerts. Keep findings evidence-based from platform data.`,
    temperature: 0.25,
    version: 1
  },
  {
    description: "Shared Business AI analysis tool prompt.",
    maxTokens: 1000,
    module: "AI",
    name: "Shared Business Analysis",
    promptId: businessPromptIds.shared,
    promptText: `${businessRules}\n\nAnalyze the provided business context and return: insight summary, suggested actions, risk alerts, productivity opportunities, and next best action.`,
    temperature: 0.3,
    version: 1
  },
  {
    description: "Reusable report generator prompt for business workflows.",
    maxTokens: 1200,
    module: "AI",
    name: "Business Report Generator",
    promptId: businessPromptIds.report,
    promptText: `${businessRules}\n\nGenerate an executive business report with metrics, interpretation, risks, actions, and follow-up checklist.`,
    temperature: 0.25,
    version: 1
  },
  {
    description: "Reusable notification and communication draft prompt.",
    maxTokens: 800,
    module: "AI",
    name: "Business Notification Draft",
    promptId: businessPromptIds.notification,
    promptText: `${businessRules}\n\nDraft concise WhatsApp/email/in-app communication. Do not claim an action has happened unless context confirms it.`,
    temperature: 0.4,
    version: 1
  }
];

let registrationPromise: Promise<void> | null = null;

export function ensureBusinessAIPrompts() {
  registrationPromise ??= Promise.all(prompts.map((prompt) => registerPromptVersion(prompt))).then(() => undefined);
  return registrationPromise;
}
