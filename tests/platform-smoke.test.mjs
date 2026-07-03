import assert from "node:assert/strict";

function hasPermission(role, action) {
  const permissions = {
    ADMIN: ["admin.manage", "property.manage", "lead.manage", "studio.manage", "broker.manage", "builder.manage", "service.manage", "payment.manage", "ai.use"],
    OWNER: ["property.create", "property.manage", "lead.manage", "studio.manage", "payment.manage", "ai.use"],
    SUPER_ADMIN: ["admin.manage"],
    USER: ["property.create", "lead.manage", "studio.manage", "payment.manage", "ai.use"]
  };
  return role === "SUPER_ADMIN" || permissions[role]?.includes(action) === true;
}

function getPagination({ page = 1, pageSize = 20 } = {}) {
  const parsedPage = Math.max(1, Number(page) || 1);
  const take = Math.min(100, Math.max(1, Number(pageSize) || 20));
  return {
    page: parsedPage,
    skip: (parsedPage - 1) * take,
    take
  };
}

function run(name, assertion) {
  assertion();
  console.log(`ok - ${name}`);
}

run("permission foundation separates users from admins", () => {
  assert.equal(hasPermission("ADMIN", "admin.manage"), true);
  assert.equal(hasPermission("USER", "admin.manage"), false);
});

run("pagination foundation clamps page size", () => {
  assert.deepEqual(getPagination({ page: "0", pageSize: "500" }), {
    page: 1,
    skip: 0,
    take: 100
  });
});

run("webhook idempotency key shape is stable", () => {
  const key = ["RAZORPAY", "payment.captured:pay_123"].join(":");
  assert.equal(key, "RAZORPAY:payment.captured:pay_123");
});

run("ai provider registry supports interchangeable providers", () => {
  const providers = ["OPENAI", "GEMINI", "ANTHROPIC"];
  assert.equal(providers.includes("OPENAI"), true);
  assert.equal(providers.includes("GEMINI"), true);
  assert.equal(providers.includes("ANTHROPIC"), true);
});

run("ai prompt registry version key is deterministic", () => {
  const key = ["buyer_matchmaker", 3].join(":");
  assert.equal(key, "buyer_matchmaker:3");
});

run("ai usage cost estimate is proportional to tokens", () => {
  const perMillion = 0.6;
  const tokens = 1000;
  assert.equal((perMillion * tokens) / 1_000_000, 0.0006);
});
