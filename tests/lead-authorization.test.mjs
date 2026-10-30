import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { registerHooks } from "node:module";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import ts from "typescript";

// Execute actual handlers, response helpers, validation and lead policy.
// Only external boundaries are mocked: authentication, DB, logging and delivery.
const state = { profile: null, writes: [], leads: [] };
globalThis.__homezoneLeadFixture = state;
const mocks = {
  "@/auth": "export const auth = async () => globalThis.__homezoneLeadFixture.profile ? {user:{id:globalThis.__homezoneLeadFixture.profile.id}} : null;",
  "@/lib/auth/profile": "export const getOrCreateProfile = async () => globalThis.__homezoneLeadFixture.profile;",
  "@/lib/db": "export const db = globalThis.__homezoneLeadFixture.db;",
  "@/lib/audit": "export const auditLog = async () => {};",
  "@/lib/platform/notifications": "export const createNotification = async () => {};",
  "@/lib/logging/logger": "export const captureException = () => {}; export const logger = {warn:()=>{},error:()=>{},info:()=>{}};",
  "@/lib/api/rate-limit": "export const checkRateLimit = () => ({allowed:true}); export const rateLimitKey = () => 'fixture';"
};

function matches(row, where = {}) {
  return Object.entries(where).every(([key, value]) => {
    if (key === "AND") return value.every((part) => matches(row, part));
    if (key === "OR") return value.some((part) => matches(row, part));
    if (key === "NOT") return !matches(row, value);
    if (value && typeof value === "object") {
      if ("not" in value) return row?.[key] !== value.not;
      if ("contains" in value) return String(row?.[key] ?? "").toLowerCase().includes(value.contains.toLowerCase());
      return matches(row?.[key], value);
    }
    return row?.[key] === value;
  });
}
function project(row, select) {
  if (!row) return null;
  if (!select) return structuredClone(row);
  return Object.fromEntries(Object.entries(select).map(([key, value]) => [key,
    value === true ? row[key] : project(row[key], value.select)]));
}
function fixture(overrides = {}) {
  return {
    id: "lead-own-0001", userId: "buyer", assignedTo: "broker", name: "Demo Buyer",
    phone: "+919876543210", email: "demo@example.invalid", message: "Interested in this home",
    stage: "NEW", contactAction: "INQUIRY", createdAt: new Date("2026-01-01"),
    propertyId: "property-0001", property: { id: "property-0001", title: "Demo home", ownerId: "owner", owner: { id: "owner" } },
    notes: [{ id: "note-0001", note: "PRIVATE NOTE" }], tasks: [{ title: "PRIVATE TASK" }],
    timeline: [{ message: "PRIVATE TIMELINE" }], brokerAssignments: [{ notes: "PRIVATE ASSIGNMENT" }],
    commissions: [{ amount: 999 }], clientDocuments: [{ fileUrl: "https://private.example.invalid/file" }],
    priority: "HIGH", nextAction: "PRIVATE NEXT ACTION", dealValue: 12345,
    siteVisits: [], notifications: [], firstRespondedAt: null, ...overrides
  };
}
function reset(id = "buyer", role = "USER") {
  state.profile = id ? { id, role } : null;
  state.writes = [];
  state.leads = [fixture(), fixture({ id: "lead-other-0002", userId: "other", assignedTo: "other-broker", property: { id: "property-0002", title: "Other home", ownerId: "other-owner" } })];
}
const leadDb = {
  findUnique: async ({ where, select }) => project(state.leads.find((row) => matches(row, where)), select),
  findFirst: async ({ where, select }) => project(state.leads.find((row) => matches(row, where)), select),
  findMany: async ({ where, select }) => state.leads.filter((row) => matches(row, where)).map((row) => project(row, select)),
  create: async ({ data }) => { state.writes.push(["lead.create", data]); return fixture({ ...data, id: "created-lead-0001" }); },
  update: async ({ where, data }) => { state.writes.push(["lead.update", data]); return { ...state.leads.find((row) => matches(row, where)), ...data }; }
};
state.db = new Proxy({
  lead: leadDb,
  profile: { findUnique: async ({where}) => state.profile?.id === where.id ? {...state.profile, verificationStatus: "VERIFIED"} : null },
  privateFile: { findFirst: async ({where}) => where.id === "00000000-0000-4000-8000-000000000001" && where.leadId === "lead-own-0001" ? {id: where.id} : null },
  $queryRaw: async () => [],
  property: { findUnique: async () => fixture().property, update: async ({ data }) => { state.writes.push(["property.update", data]); return {}; } },
  $transaction: async (callback) => callback(state.db)
}, {
  get(target, key) {
    if (key in target) return target[key];
    return {
      findMany: async ({ where }) => state.leads.filter((lead) => matches({ lead, dueAt: "fixture" }, where))
        .map((lead) => ({ id: "child-0001", lead, title: "PRIVATE TASK" })),
      findUnique: async () => ({ id: "child-0001", leadId: "lead-own-0001", authorId: state.profile.id }),
      create: async ({ data }) => { state.writes.push([`${String(key)}.create`, data]); return { id: "child-0001", ...data }; },
      update: async ({ data }) => { state.writes.push([`${String(key)}.update`, data]); return { id: "child-0001", ...data }; },
      delete: async () => { state.writes.push([`${String(key)}.delete`]); return {}; }
    };
  }
});
const hooks = registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier in mocks) return { url: `data:text/javascript,${encodeURIComponent(mocks[specifier])}`, shortCircuit: true };
    if (specifier === "next/server") return nextResolve("next/server.js", context);
    if (specifier.startsWith("@/")) return { url: new URL(`../src/${specifier.slice(2)}.ts`, import.meta.url).href, shortCircuit: true };
    if (specifier.startsWith(".") && context.parentURL?.endsWith(".ts")) {
      const candidate = new URL(`${specifier}.ts`, context.parentURL);
      if (existsSync(candidate)) return { url: candidate.href, shortCircuit: true };
    }
    return nextResolve(specifier, context);
  },
  load(url, context, nextLoad) {
    if (url.endsWith(".ts") && !url.includes("node_modules")) return {
      format: "module", shortCircuit: true,
      source: ts.transpileModule(readFileSync(fileURLToPath(url), "utf8"), {
        compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 }
      }).outputText
    };
    return nextLoad(url, context);
  }
});
const routes = {};
for (const path of ["leads", "leads/[id]", "leads/[id]/notes", "leads/[id]/notes/[noteId]",
  "leads/[id]/tasks", "leads/[id]/tasks/[taskId]", "leads/[id]/visits", "leads/[id]/visits/[visitId]",
  "owner/leads/[id]", "owner/leads/[id]/notes", "pro/leads", "pro/calendar", "pro/leads/[id]",
  "pro/leads/[id]/notes", "pro/leads/[id]/tasks", "pro/leads/[id]/documents",
  "pro/leads/[id]/assignments", "pro/leads/[id]/commission"])
  routes[path] = await import(`../backend/api/${path}/route.ts`);
const policy = await import("../src/lib/leads/access.ts");
hooks.deregister();

async function call(path, method, body = {}, id = "lead-own-0001") {
  return routes[path][method](new Request(`https://fixture.invalid/api/${path.replace("[id]", id)}`, {
    method, ...(method === "GET" ? {} : { headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
  }), { params: Promise.resolve({ id, noteId: "child-0001", taskId: "child-0001", visitId: "child-0001" }) });
}
const mutations = [
  ["leads/[id]", "PATCH"], ["leads/[id]/notes", "POST"], ["leads/[id]/notes/[noteId]", "PATCH"],
  ["leads/[id]/notes/[noteId]", "DELETE"], ["leads/[id]/tasks", "POST"], ["leads/[id]/tasks/[taskId]", "PATCH"],
  ["leads/[id]/visits", "POST"], ["leads/[id]/visits/[visitId]", "PATCH"],
  ["owner/leads/[id]", "PATCH"], ["owner/leads/[id]/notes", "POST"],
  ["pro/leads/[id]", "PATCH"], ["pro/leads/[id]/notes", "POST"], ["pro/leads/[id]/tasks", "POST"],
  ["pro/leads/[id]/documents", "POST"], ["pro/leads/[id]/assignments", "POST"], ["pro/leads/[id]/commission", "POST"]
];

test("actual lead handlers enforce the buyer/CRM boundary", async (t) => {
  await t.test("unauthenticated reads, creation and every mutation return 401 without writes", async () => {
    reset(null);
    for (const [path, method] of [["leads", "GET"], ["leads/[id]", "GET"], ["pro/leads", "GET"], ["pro/calendar", "GET"], ["leads", "POST"], ["pro/leads", "POST"], ...mutations])
      assert.equal((await call(path, method)).status, 401, `${method} ${path}`);
    assert.deepEqual(state.writes, []);
  });
  await t.test("buyer enquiry submission preserves flow and ignores CRM fields", async () => {
    reset();
    const response = await call("leads", "POST", { name: "Demo Buyer", phone: "+919876543210", message: "Interested", propertyId: "property-0001", stage: "WON", assignedTo: "buyer", dealValue: 999 });
    assert.equal(response.status, 200);
    const body = await response.json();
    assert.equal(body.ok, true);
    const data = state.writes.find(([name]) => name === "lead.create")[1];
    assert.equal(data.userId, "buyer");
    for (const key of ["stage", "assignedTo", "dealValue"]) assert.equal(data[key], undefined);
    assert.deepEqual(Object.keys(body.lead).sort(), Object.keys(policy.buyerEnquirySelect).sort());
  });
  await t.test("own detail and inbox expose only the explicit buyer projection", async () => {
    reset();
    for (const path of ["leads", "leads/[id]"]) {
      const response = await call(path, "GET");
      assert.equal(response.status, 200);
      const body = await response.json();
      const items = body.leads ?? [body.lead];
      assert.equal(items.length, 1);
      for (const item of items) {
        assert.deepEqual(Object.keys(item).sort(), Object.keys(policy.buyerEnquirySelect).sort());
        assert.deepEqual(Object.keys(item.property).sort(), ["id", "title"]);
        assert.equal(JSON.stringify(item).includes("PRIVATE"), false);
      }
    }
    assert.deepEqual((await (await call("pro/leads", "GET")).json()).leads, []);
    assert.equal((await call("leads/[id]", "GET", {}, "lead-other-0002")).status, 403);
  });
  await t.test("unassigned and property-less enquiries remain readable without CRM access", async () => {
    reset();
    state.leads = [fixture({ assignedTo: null, property: null, propertyId: null })];
    assert.equal((await (await call("leads", "GET")).json()).leads.length, 1);
    assert.equal((await call("leads/[id]", "GET")).status, 200);
    assert.equal((await call("leads/[id]", "PATCH", { stage: "WON" })).status, 403);
    assert.deepEqual(state.writes, []);
  });
  await t.test("calendar excludes creator-only CRM tasks and visits", async () => {
    reset();
    assert.deepEqual(await (await call("pro/calendar", "GET")).json(), { tasks: [], visits: [] });
    reset("broker", "BROKER");
    const calendar = await (await call("pro/calendar", "GET")).json();
    assert.equal(calendar.visits.length, 1);
    assert.equal(calendar.tasks.length, 1);
  });
  for (const [id, role] of [["buyer", "USER"], ["buyer", "BROKER"], ["unrelated", "USER"], ["team-member", "BROKER"], ["unrelated-owner", "OWNER"]]) {
    await t.test(`${id} cannot mutate through any general, owner or Pro endpoint`, async () => {
      reset(id, role);
      for (const [path, method] of mutations) {
        const response = await call(path, method, { stage: "WON", note: "Forbidden", title: "Forbidden" });
        assert.ok([403, 404].includes(response.status), `${method} ${path}: ${response.status}`);
      }
      assert.deepEqual(state.writes, []);
    });
  }
  await t.test("buyer cannot manufacture CRM assignment through manual Pro creation", async () => {
    reset();
    assert.equal((await call("pro/leads", "POST", { name: "Demo Buyer", phone: "+919876543210", message: "Interested" })).status, 403);
    assert.deepEqual(state.writes, []);
    reset("broker", "BROKER");
    assert.equal((await call("pro/leads", "POST", { name: "Demo Buyer", phone: "+919876543210", message: "Interested" })).status, 200);
  });
  for (const [id, role] of [["broker", "BROKER"], ["owner", "OWNER"], ["admin", "ADMIN"], ["super", "SUPER_ADMIN"]]) {
    await t.test(`${role} retains verified CRM read, stage, notes and task access`, async () => {
      reset(id, role);
      assert.equal((await call("leads/[id]", "GET")).status, 200);
      assert.equal((await (await call("leads/[id]", "GET")).json()).lead.notes[0].note, "PRIVATE NOTE");
      for (const [path, method, body] of [["leads/[id]", "PATCH", { stage: "CONTACTED" }],
        ["leads/[id]/notes", "POST", { note: "Internal note" }], ["leads/[id]/tasks", "POST", { title: "Call buyer" }]])
        assert.equal((await call(path, method, body)).status, 200, path);
    });
  }
  await t.test("existing explicit assignment is retained without inventing team role permissions", async () => {
    reset("broker", "USER");
    assert.equal((await call("leads/[id]", "PATCH", { stage: "CONTACTED" })).status, 200);
  });
  await t.test("owner-specific and Pro-specific checks keep their established scopes", async () => {
    reset("owner", "OWNER");
    assert.equal((await call("owner/leads/[id]", "PATCH", { stage: "CONTACTED" })).status, 200);
    assert.equal((await call("owner/leads/[id]/notes", "POST", { note: "Owner note" })).status, 200);
    assert.equal((await call("pro/leads/[id]", "PATCH", { stage: "CONTACTED" })).status, 403);
    reset("broker", "BROKER");
    assert.equal((await call("pro/leads/[id]", "PATCH", { stage: "CONTACTED" })).status, 200);
  });
  await t.test("authorized broker and administrator retain documents, assignment and commission operations", async () => {
    for (const [id, role] of [["broker", "BROKER"], ["admin", "ADMIN"]]) {
      reset(id, role);
      assert.equal((await call("pro/leads/[id]/documents", "POST", {
        title: "Client agreement", documentType: "AGREEMENT", fileUrl: "https://fixture.invalid/document"
      })).status, 400);
      assert.equal((await call("pro/leads/[id]/documents", "POST", {
        title: "Client agreement", documentType: "AGREEMENT", fileUrl: "/api/private-files/00000000-0000-4000-8000-000000000001"
      })).status, 200);
      assert.equal((await call("pro/leads/[id]/assignments", "POST", {})).status, 200);
      assert.equal((await call("pro/leads/[id]/commission", "POST", { dealValue: 100000, commissionPercent: 2 })).status, 200);
    }
  });
  await t.test("a valid CRM parent does not authorize child IDs belonging to another lead", async () => {
    reset("broker", "BROKER");
    const original = state.db.leadNote;
    // Override the proxy boundary for a child owned by a different lead.
    state.db.leadNote = { ...original, findUnique: async () => ({ id: "child-0001", leadId: "lead-other-0002", authorId: "broker" }) };
    try {
      assert.equal((await call("leads/[id]/notes/[noteId]", "PATCH", { note: "Changed" })).status, 404);
      assert.equal((await call("leads/[id]/notes/[noteId]", "DELETE")).status, 404);
      assert.deepEqual(state.writes, []);
    } finally {
      delete state.db.leadNote;
    }
  });
  await t.test("Next.js routes expose the inspected backend handlers", () => {
    for (const [path, handler] of Object.entries(routes)) {
      const source = readFileSync(new URL(`../src/app/api/${path}/route.ts`, import.meta.url), "utf8");
      assert.ok(source.includes(`@backend/api/${path}/route`), path);
      for (const method of Object.keys(handler)) assert.ok(source.includes(method), `${method} ${path}`);
    }
  });
});
