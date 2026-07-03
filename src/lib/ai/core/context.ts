import type { NotificationModule } from "@prisma/client";
import type { AIContextBlock } from "@/lib/ai/core/types";

type ContextInput = {
  admin?: unknown;
  broker?: unknown;
  builder?: unknown;
  buyer?: unknown;
  lead?: unknown;
  property?: unknown;
  service?: unknown;
  studio?: unknown;
};

export function buildAIContext(input: ContextInput = {}) {
  const blocks: AIContextBlock[] = [];
  const push = (module: NotificationModule, key: string, value: unknown, priority = 50) => {
    if (value !== undefined && value !== null) blocks.push({ key, module, priority, value });
  };

  push("PROPERTY", "property", input.property, 90);
  push("LEAD", "lead", input.lead, 80);
  push("BUILDER", "builder", input.builder, 70);
  push("STUDIO", "studio", input.studio, 70);
  push("SERVICE", "service", input.service, 70);
  push("BROKER", "broker", input.broker, 70);
  push("ADMIN", "admin", input.admin, 60);
  push("SYSTEM", "buyer", input.buyer, 60);

  return blocks.sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));
}

export function serializeAIContext(blocks: AIContextBlock[] = []) {
  if (!blocks.length) return "";
  return blocks
    .map((block) => `[${block.module}:${block.key}]\n${JSON.stringify(block.value, null, 2)}`)
    .join("\n\n");
}
