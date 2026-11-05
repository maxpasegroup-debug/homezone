import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { registerHooks } from "node:module";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import ts from "typescript";

// Real engagement routes/services, synthetic identities and transactional stores.
// No network, provider, Prisma client or database connection is used.
const state = { actor: null, profiles: [], properties: [], preferences: [], subscriptions: [], unlocks: [],
  conversations: [], blocks: [], messages: [], reports: [], adminReports: [], notifications: [], counters: [], locks: [] };
globalThis.__engagementFixture = state;
function matches(row, where = {}) {
  if (!row) return false;
  return Object.entries(where).every(([key, value]) => {
    if (key === "OR") return value.some(part => matches(row, part));
    if (key === "AND") return value.every(part => matches(row, part));
    const actual = row[key];
    if (value && typeof value === "object" && !(value instanceof Date)) {
      if ("some" in value) return actual.some(item => matches(item, value.some));
      if ("in" in value) return value.in.includes(actual);
      if ("gt" in value) return actual > value.gt;
      if ("lt" in value) return actual < value.lt;
      if ("lte" in value) return actual <= value.lte;
      return matches(actual ?? row, value);
    }
    return actual instanceof Date && value instanceof Date ? actual.getTime() === value.getTime() : actual === value;
  });
}
function projected(row, select) {
  if (!row) return null;
  if (!select) return structuredClone(row);
  return Object.fromEntries(Object.entries(select).filter(([, value]) => value).map(([key, value]) =>
    [key, value === true ? structuredClone(row[key]) : projected(row[key], value.select)]));
}
function related(row) {
  return { ...row, property: state.properties.find(item => item.id === row.propertyId),
    buyer: state.profiles.find(item => item.id === row.buyerId), owner: state.profiles.find(item => item.id === row.ownerId) };
}
function many(rows, args = {}) {
  let found = rows.filter(row => matches(row, args.where));
  const order = args.orderBy ? (Array.isArray(args.orderBy) ? args.orderBy : [args.orderBy]) : [];
  found = found.sort((a, b) => {
    for (const term of order) { const [key, direction] = Object.entries(term)[0];
      const d = a[key] < b[key] ? -1 : a[key] > b[key] ? 1 : 0; if (d) return direction === "desc" ? -d : d; }
    return 0;
  });
  return found.slice(0, args.take ?? found.length).map(row => projected(row, args.select));
}
let queue = Promise.resolve();
const db = {
  $queryRaw: async (strings, ...values) => { state.locks.push({ query: strings.join("?"), values }); return []; },
  $transaction: callback => { const task = queue.then(() => callback(db)); queue = task.catch(() => {}); return task; },
  profile: { findUnique: async args => projected(state.profiles.find(row => matches(row, args.where)), args.select),
    findMany: async args => many(state.profiles, args) },
  property: { findUnique: async args => projected(state.properties.find(row => matches(row, args.where)), args.select) },
  registrationBudget: { findMany: async () => [], deleteMany: async () => ({ count: 0 }) },
  ownerContactPreference: {
    findUnique: async args => projected(state.preferences.find(row => matches(row, args.where)), args.select),
    upsert: async args => { let row = state.preferences.find(item => matches(item, args.where));
      if (row) Object.assign(row, args.update); else state.preferences.push(row = { ...args.create }); return projected(row, args.select); }
  },
  subscription: {
    findMany: async args => many(state.subscriptions, args),
    findFirst: async args => many(state.subscriptions, args)[0] ?? null,
    update: async args => { const row = state.subscriptions.find(item => item.id === args.where.id);
      row.contactsUsed += args.data.contactsUsed.increment; return structuredClone(row); }
  },
  ownerContactUnlock: {
    findUnique: async args => projected(state.unlocks.find(row => matches(row, args.where.buyerId_ownerId)), args.select),
    create: async args => { const row = { id: `unlock-${state.unlocks.length}`, ...args.data }; state.unlocks.push(row); return row; }
  },
  propertyConversation: {
    findUnique: async args => projected(state.conversations.map(related).find(row => matches(row, args.where)), args.select),
    findMany: async args => many(state.conversations.map(related), args),
    upsert: async args => { let row = state.conversations.find(item => matches(item, args.where.propertyId_buyerId));
      if (!row) state.conversations.push(row = { id: "conversation-0002", buyerBlocked: false, ownerBlocked: false,
        updatedAt: new Date(), ...args.create }); return projected(row, args.select); },
    update: async args => { const row = state.conversations.find(item => item.id === args.where.id); Object.assign(row, args.data); return row; },
    updateMany: async args => { const rows = state.conversations.filter(item => matches(item, args.where));
      rows.forEach(row => Object.assign(row, args.data)); return { count: rows.length }; }
  },
  buyerOwnerBlock: {
    findUnique: async args => projected(state.blocks.find(row => matches(row, args.where.buyerId_ownerId)), args.select),
    findMany: async args => many(state.blocks, args),
    upsert: async args => { let row = state.blocks.find(item => matches(item, args.where.buyerId_ownerId));
      if (row) Object.assign(row, args.update); else state.blocks.push(row = { ...args.create }); return projected(row, args.select); }
  },
  chatMessage: {
    findUnique: async args => projected(state.messages.find(row => matches(row, args.where.conversationId_senderId_clientMessageId)), args.select),
    findFirst: async args => many(state.messages, args)[0] ?? null,
    findMany: async args => many(state.messages, args),
    create: async args => { const row = { id: `message-${String(state.messages.length).padStart(6, "0")}`, createdAt: new Date(), ...args.data };
      state.messages.push(row); return projected(row, args.select); }
  },
  conversationReport: {
    findUnique: async args => projected(state.reports.find(item => matches(item, args.where.conversationId_reporterId)), args.select),
    create: async args => { const row = { id: "report-0001", ...args.data }; state.reports.push(row); return projected(row, args.select); }
  },
  report: { create: async args => { state.adminReports.push(args.data); return { id: "admin-report-001" }; } },
  notification: { create: async args => { state.notifications.push(args.data); return args.data; } }
};
state.db = db;
const mocks = {
  "@/auth": "export const auth = async () => globalThis.__engagementFixture.actor ? {user:{id:globalThis.__engagementFixture.actor.userId}} : null;",
  "@/lib/db": "export const db = globalThis.__engagementFixture.db;",
  "@/lib/auth/redirect": "export const authOrigin = () => 'https://homezone-staging.up.railway.app';",
  "@/lib/auth/registration-admission": `export class AdmissionDenied extends Error { constructor(until){super();this.until=until;} }
    export async function budgets(tx,specs){const s=globalThis.__engagementFixture;s.counters.push(specs);
      if(s.denied)throw new AdmissionDenied(new Date(Date.now()+60000));}`
};
const hooks = registerHooks({
  resolve(specifier, context, next) {
    if (mocks[specifier]) return { url: `data:text/javascript,${encodeURIComponent(mocks[specifier])}`, shortCircuit: true };
    if (specifier.startsWith("@/")) return { url: new URL(`../src/${specifier.slice(2)}.ts`, import.meta.url).href, shortCircuit: true };
    if (specifier.startsWith("./") && context.parentURL?.includes("/engagement/") && !specifier.endsWith(".ts")) {
      return { url: new URL(`${specifier}.ts`, context.parentURL).href, shortCircuit: true };
    }
    return next(specifier, context);
  },
  load(url, context, next) {
    if (url.endsWith(".ts") && !url.includes("node_modules")) return { format: "module", shortCircuit: true,
      source: ts.transpileModule(readFileSync(fileURLToPath(url), "utf8"), {
        compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 }
      }).outputText };
    return next(url, context);
  }
});
const conversations = await import("../src/app/api/mobile/conversations/route.ts");
const messages = await import("../src/app/api/mobile/conversations/[id]/messages/route.ts");
const conversation = await import("../src/app/api/mobile/conversations/[id]/route.ts");
const contact = await import("../src/app/api/mobile/properties/[id]/contact/route.ts");
const preferences = await import("../src/app/api/mobile/contact-preferences/route.ts");
hooks.deregister();
const buyerId = "buyer-000001", ownerId = "owner-000001", propertyId = "property-000001", conversationId = "conversation-0001";
function reset() {
  process.env.HOMEZONE_ENGAGEMENT_ENABLED = "true";
  state.denied = false;
  state.profiles = [
    { id: buyerId, userId: "user-buyer-001", role: "USER", fullName: "Synthetic Buyer", verificationStatus: "PENDING" },
    { id: ownerId, userId: "user-owner-001", role: "OWNER", fullName: "Synthetic Owner", verificationStatus: "PENDING" }
  ];
  state.actor = state.profiles[0];
  state.properties = [{ id: propertyId, ownerId, title: "Synthetic published listing", status: "PUBLISHED" }];
  state.preferences = [{ profileId: ownerId, phone: "+919000000001", sharingEnabled: true, consentVersion: "owner-contact-v1" }];
  state.subscriptions = [{ id: "subscription-001", profileId: buyerId, product: "BUYER_PLUS", status: "ACTIVE",
    startsAt: new Date(Date.now() - 1000), endsAt: new Date(Date.now() + 86400000), contactLimit: 10, contactsUsed: 0,
    payments: [{ status: "PAID", payerId: buyerId, product: "BUYER_PLUS", amount: 29900, currency: "INR" }] }];
  state.conversations = [{ id: conversationId, propertyId, buyerId, ownerId, buyerBlocked: false, ownerBlocked: false, updatedAt: new Date() }];
  for (const key of ["unlocks", "blocks", "messages", "reports", "adminReports", "notifications", "counters", "locks"]) state[key] = [];
}
const context = id => ({ params: Promise.resolve({ id }) });
const request = (path, method = "GET", body, headers = {}) => new Request(`https://homezone-staging.up.railway.app${path}`, {
  method, headers: { ...(body === undefined ? {} : { "Content-Type": "application/json" }), ...headers },
  ...(body === undefined ? {} : { body: JSON.stringify(body) })
});
const send = body => messages.POST(request("/api/mobile/conversations/x/messages", "POST", body), context(conversationId));

test("activation, authentication, admin and suspension gates fail closed", async () => {
  reset(); delete process.env.HOMEZONE_ENGAGEMENT_ENABLED;
  assert.equal((await conversations.GET(request("/api/mobile/conversations"))).status, 503);
  process.env.HOMEZONE_ENGAGEMENT_ENABLED = "TRUE";
  assert.equal((await conversations.GET(request("/api/mobile/conversations"))).status, 503);
  process.env.HOMEZONE_ENGAGEMENT_ENABLED = "true"; state.actor = null;
  assert.equal((await conversations.GET(request("/api/mobile/conversations"))).status, 401);
  state.actor = state.profiles[0]; state.actor.role = "ADMIN";
  assert.equal((await conversations.GET(request("/api/mobile/conversations"))).status, 403);
  state.actor.role = "USER"; state.actor.verificationStatus = "SUSPENDED";
  assert.equal((await conversations.GET(request("/api/mobile/conversations"))).status, 403);
  assert.equal(state.counters.length, 0);
});

test("native cookie writes retain exact browser Origin and Sec-Fetch protections", async () => {
  reset();
  for (const headers of [{ Origin: "https://other.invalid" }, { "Sec-Fetch-Site": "cross-site" }]) {
    assert.equal((await conversations.POST(request("/api/mobile/conversations", "POST", { propertyId }, headers))).status, 403);
  }
  assert.equal((await conversations.POST(request("/api/mobile/conversations", "POST", { propertyId }))).status, 200);
});

test("strict bounded messages support Unicode and reject unexpected credential fields", async () => {
  reset();
  assert.equal((await send({ body: "Hello", clientMessageId: "client-message-001", role: "ADMIN" })).status, 400);
  assert.equal((await send({ body: "x".repeat(13000), clientMessageId: "client-message-001" })).status, 400);
  assert.equal((await send({ body: "🏠".repeat(900), clientMessageId: "client-message-001" })).status, 200);
  assert.equal(state.notifications.length, 1);
  assert.equal(JSON.stringify(state.notifications).includes("🏠"), false);
});

test("foreign conversations, transferred listings and suspended peers remain inaccessible", async () => {
  reset(); state.conversations[0].buyerId = "different-buyer";
  assert.equal((await messages.GET(request("/messages"), context(conversationId))).status, 404);
  reset(); state.properties[0].ownerId = "different-owner";
  assert.equal((await messages.GET(request("/messages"), context(conversationId))).status, 404);
  reset(); state.profiles[1].verificationStatus = "SUSPENDED";
  assert.equal((await messages.GET(request("/messages"), context(conversationId))).status, 404);
  reset(); state.properties[0].status = "ARCHIVED";
  assert.equal((await messages.GET(request("/messages"), context(conversationId))).status, 404);
  assert.equal(state.messages.length, 0);
});

test("send acknowledgments are idempotent and conflicting client IDs are rejected", async () => {
  reset(); const body = { body: "Is a visit available?", clientMessageId: "client-message-001" };
  const first = await (await send(body)).json(), second = await (await send(body)).json();
  assert.equal(first.message.id, second.message.id);
  assert.equal(state.messages.length, 1); assert.equal(state.notifications.length, 1);
  assert.equal((await send({ ...body, body: "Changed text" })).status, 409);
  const read = await (await messages.GET(request("/messages"), context(conversationId))).json();
  assert.deepEqual(Object.keys(read.messages[0]).sort(), ["body", "createdAt", "id", "mine"]);
  assert.equal(read.messages[0].mine, true); assert.equal(read.nextCursor, first.message.id);
});

test("pair blocking prevents new-property bypass and contact disclosure", async () => {
  reset();
  state.conversations.push({ id: "conversation-older", propertyId: "property-older", buyerId, ownerId,
    buyerBlocked: false, ownerBlocked: true, updatedAt: new Date() });
  state.blocks.push({ buyerId, ownerId, buyerBlocked: false, ownerBlocked: true });
  assert.equal((await send({ body: "Hello", clientMessageId: "client-message-001" })).status, 403);
  assert.equal((await conversations.POST(request("/conversations", "POST", { propertyId }))).status, 403);
  assert.equal((await (await contact.POST(request("/contact", "POST"), context(propertyId))).json()).status, "unavailable");
  assert.equal(state.messages.length, 0); assert.equal(state.unlocks.length, 0);
});

test("unblock clears only the authenticated person's pair flags", async () => {
  reset(); state.conversations[0].buyerBlocked = true; state.conversations[0].ownerBlocked = true;
  state.conversations.push({ ...state.conversations[0], id: "conversation-older" });
  state.blocks.push({ buyerId, ownerId, buyerBlocked: true, ownerBlocked: true });
  const result = await (await conversation.PATCH(request("/conversation", "PATCH", { blocked: false }), context(conversationId))).json();
  assert.equal(result.blockedByMe, false); assert.equal(result.blocked, true);
  assert.equal(state.conversations.every(row => row.buyerBlocked === false && row.ownerBlocked === true), true);
  assert.equal(state.blocks[0].buyerBlocked, false); assert.equal(state.blocks[0].ownerBlocked, true);
});

test("pair blocks survive listing/conversation deletion and inbox rows show the pair state", async () => {
  reset();
  const blocked = await conversation.PATCH(request("/conversation", "PATCH", { blocked: true }), context(conversationId));
  assert.equal(blocked.status, 200);
  state.conversations[0].buyerBlocked = false; // Inbox must read the durable pair ledger.
  const inbox = await (await conversations.GET(request("/conversations"))).json();
  assert.equal(inbox.conversations[0].blockedByMe, true); assert.equal(inbox.conversations[0].blocked, true);
  state.conversations = [];
  const replacementId = "property-replacement";
  state.properties = [{ id: replacementId, ownerId, title: "Synthetic replacement", status: "PUBLISHED" }];
  assert.equal((await conversations.POST(request("/conversations", "POST", { propertyId: replacementId }))).status, 403);
  assert.equal((await (await contact.POST(request("/contact", "POST"), context(replacementId))).json()).status, "unavailable");
});

test("contact GET is read-only; concurrent duplicate unlocks debit one unique owner", async () => {
  reset(); const before = await (await contact.GET(request("/contact"), context(propertyId))).json();
  assert.deepEqual(before, { status: "available", alreadyUnlocked: false, remaining: 10 });
  assert.equal(state.unlocks.length, 0);
  const results = await Promise.all([contact.POST(request("/contact", "POST"), context(propertyId)), contact.POST(request("/contact", "POST"), context(propertyId))]);
  assert.equal(results.every(row => row.status === 200), true);
  assert.equal(state.unlocks.length, 1); assert.equal(state.subscriptions[0].contactsUsed, 1);
  const after = await (await contact.GET(request("/contact"), context(propertyId))).json();
  assert.equal(after.alreadyUnlocked, true); assert.equal(after.phone, "+919000000001");
  assert.equal(after.remaining, 9);
  assert.equal(state.locks.some(lock => lock.query.includes('"Subscription"')), true);
});

test("overlapping paid plans use available later credits and allow repeat owners at zero credits", async () => {
  reset(); state.subscriptions[0].contactsUsed = 10;
  state.subscriptions.push({ ...structuredClone(state.subscriptions[0]), id: "subscription-002", contactsUsed: 0,
    endsAt: new Date(Date.now() + 2 * 86400000) });
  const result = await (await contact.POST(request("/contact", "POST"), context(propertyId))).json();
  assert.equal(result.phone, "+919000000001"); assert.equal(result.remaining, 9);
  assert.equal(state.subscriptions[0].contactsUsed, 10); assert.equal(state.subscriptions[1].contactsUsed, 1);
  assert.equal(state.unlocks[0].subscriptionId, "subscription-002");
  state.subscriptions[1].contactsUsed = 10;
  const repeat = await (await contact.GET(request("/contact"), context(propertyId))).json();
  assert.equal(repeat.alreadyUnlocked, true); assert.equal(repeat.remaining, 0); assert.ok(repeat.phone);
});

test("contact consent, expiry, paid status, allowance and revocation gate every disclosure", async () => {
  for (const scenario of ["no-consent", "expired", "unpaid", "full", "revoked"]) {
    reset();
    if (scenario === "no-consent") state.preferences[0].sharingEnabled = false;
    if (scenario === "expired") state.subscriptions[0].endsAt = new Date(0);
    if (scenario === "unpaid") state.subscriptions[0].payments[0].status = "PENDING";
    if (scenario === "full") state.subscriptions[0].contactsUsed = 10;
    if (scenario === "revoked") {
      state.unlocks.push({ id: "unlock-old", buyerId, ownerId, subscriptionId: "subscription-001" });
      state.preferences[0].consentVersion = null;
    }
    const result = await (await contact.POST(request("/contact", "POST"), context(propertyId))).json();
    assert.equal("phone" in result, false, scenario);
    assert.equal(state.subscriptions[0].contactsUsed, scenario === "full" ? 10 : 0);
  }
});

test("sharing uses an explicit separate contact preference, never login identity or Profile.phone", async () => {
  reset(); state.actor = state.profiles[1]; state.actor.phone = "+919999999999";
  const input = { phone: "90000 00002", sharingEnabled: true, consentAccepted: false };
  assert.equal((await preferences.PATCH(request("/preferences", "PATCH", input))).status, 400);
  const result = await (await preferences.PATCH(request("/preferences", "PATCH", { ...input, consentAccepted: true }))).json();
  assert.equal(result.phone, "+919000000002"); assert.equal(result.consentVersion, "owner-contact-v1");
  assert.equal(state.actor.phone, "+919999999999");
});

test("reports acknowledge a single durable report per participant without exposing stored reason", async () => {
  reset(); const input = { reason: "Synthetic inappropriate contact" };
  for (let i = 0; i < 2; i++) {
    const result = await conversation.POST(request("/conversation", "POST", input), context(conversationId));
    assert.deepEqual(await result.json(), { ok: true, reported: true });
  }
  assert.equal(state.reports.length, 1);
  assert.equal(state.adminReports.length, 1);
  assert.equal(state.adminReports[0].entityId, ownerId);
});

test("database-backed admission denial returns bounded Retry-After and no writes", async () => {
  reset(); state.denied = true;
  const result = await send({ body: "Hello", clientMessageId: "client-message-001" });
  assert.equal(result.status, 429); assert.ok(Number(result.headers.get("retry-after")) > 0);
  assert.equal(state.messages.length, 0);
  assert.equal(state.counters[0].every(counter => counter.key.startsWith("engagement:v1:")), true);
});

test("contact reads consume their own admission budget before acquiring heavy row locks", async () => {
  reset(); state.denied = true;
  const result = await contact.GET(request("/contact"), context(propertyId));
  assert.equal(result.status, 429);
  assert.equal(state.counters[0].every(counter => counter.key.includes("contact-read")), true);
  assert.equal(state.locks.length, 0);
  assert.equal(state.unlocks.length, 0);
});
