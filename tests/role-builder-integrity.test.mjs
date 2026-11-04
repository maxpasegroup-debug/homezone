import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { registerHooks } from "node:module";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import ts from "typescript";

// Actual handlers and validators, with isolated in-memory authentication/storage.
// A transaction publishes its draft only after every write completes.
const state = { profile: null, tables: {}, writes: [], transactions: [], failAt: null };
globalThis.__homezoneBuilderIntegrity = state;
const mocks = {
  "@/auth": "export const auth = async () => globalThis.__homezoneBuilderIntegrity.profile ? {user:{id:globalThis.__homezoneBuilderIntegrity.profile.id}} : null;",
  "@/lib/auth/profile": "export const getOrCreateProfile = async () => globalThis.__homezoneBuilderIntegrity.profile;",
  "@/lib/db": "export const db = globalThis.__homezoneBuilderIntegrity.db;",
  "@/lib/platform/notifications": "export const createNotification = async () => {};",
  "@/lib/logging/logger": "export const captureException = () => {};"
};

function matches(row, where = {}) {
  return Object.entries(where).every(([key, value]) => {
    if (key === "OR") return value.some(part => matches(row, part));
    if (key === "AND") return value.every(part => matches(row, part));
    if (value && typeof value === "object") {
      if ("gt" in value) return row?.[key] > value.gt;
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
function client(tables, writes) {
  return new Proxy({ $queryRaw: async () => [] }, {
    get(target, model) {
      if (model in target) return target[model];
      return {
        findUnique: async ({ where, select }) => project((tables[model] ?? []).find(row => matches(row, where)), select),
        findFirst: async ({ where, select }) => project((tables[model] ?? []).find(row => matches(row, where)), select),
        findMany: async ({ where = {}, select }) => (tables[model] ?? []).filter(row => matches(row, where)).map(row => project(row, select)),
        count: async ({ where }) => (tables[model] ?? []).filter(row => matches(row, where)).length,
        create: async ({ data }) => {
          if (state.failAt === `${String(model)}.create`) throw new Error("Synthetic storage failure");
          if (model === "builderUnit" && tables.builderUnit.some(row => row.projectId === data.projectId && row.unitNumber === data.unitNumber)) {
            throw Object.assign(new Error("Synthetic uniqueness violation"), { code: "P2002" });
          }
          const row = { id: `${String(model)}-created-${(tables[model] ?? []).length}`, ...structuredClone(data) };
          if (model === "builderUnit") row.project = tables.builderProject.find(item => item.id === row.projectId);
          (tables[model] ??= []).push(row);
          writes.push(`${String(model)}.create`);
          return structuredClone(row);
        },
        update: async ({ where, data }) => {
          if (state.failAt === `${String(model)}.update`) throw new Error("Synthetic storage failure");
          const row = tables[model].find(item => matches(item, where));
          if (!row) throw new Error("Synthetic missing row");
          update(row, data);
          writes.push(`${String(model)}.update`);
          return structuredClone(row);
        },
        updateMany: async ({ where, data }) => {
          if (state.failAt === `${String(model)}.updateMany`) throw new Error("Synthetic storage failure");
          const rows = (tables[model] ?? []).filter(item => matches(item, where));
          for (const row of rows) update(row, data);
          writes.push(`${String(model)}.updateMany`);
          return { count: rows.length };
        }
      };
    }
  });
}
function update(row, data) {
  for (const [key, value] of Object.entries(data)) {
    if (value === undefined) continue;
    if (value && typeof value === "object" && "increment" in value) row[key] += value.increment;
    else if (value && typeof value === "object" && "decrement" in value) row[key] -= value.decrement;
    else row[key] = structuredClone(value);
  }
}
state.db = new Proxy({}, {
  get(_target, key) {
    if (key === "$transaction") return async (callback, options) => {
      state.transactions.push(options);
      state.beforeTransaction?.();
      const draft = structuredClone(state.tables);
      const writes = [];
      const result = await callback(client(draft, writes));
      state.tables = draft;
      state.writes.push(...writes);
      return result;
    };
    return client(state.tables, state.writes)[key];
  }
});

function reset(role = "BUILDER") {
  state.profile = { id: "actor-fixture-0001", role, verificationStatus: "VERIFIED" };
  state.tables = {
    profile: [structuredClone(state.profile)],
    subscription: [],
    builderProject: [
      { id: "project-own-0001", builderId: state.profile.id, name: "Owned project", unitsCount: 0, availableUnits: 0 },
      { id: "project-foreign-0002", builderId: "other-actor-0002", name: "Foreign project", unitsCount: 0, availableUnits: 0 }
    ],
    builderTower: [
      { id: "tower-own-0001", projectId: "project-own-0001" },
      { id: "tower-foreign-0002", projectId: "project-foreign-0002" }
    ],
    builderUnit: [], builderActivityLog: [], builderCampaign: [], builderTeamMember: [], builderBooking: [],
    lead: [{ id: "lead-own-0001", assignedTo: state.profile.id, property: { ownerId: "property-owner-0001" }, stage: "NEW" }],
    brokerCommission: [], brokerTeamMember: [], leadTimelineEvent: []
  };
  state.failAt = null;
  state.writes = [];
  state.transactions = [];
  state.beforeTransaction = null;
}

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
for (const path of ["builder/reports", "builder/projects", "builder/projects/[id]", "builder/projects/[id]/units",
  "builder/projects/[id]/campaigns", "builder/projects/[id]/towers", "builder/projects/[id]/team",
  "builder/projects/[id]/bookings", "builder/bookings/[id]", "pro/leads/[id]/commission"]) {
  routes[path] = await import(`../backend/api/${path}/route.ts`);
}
routes["mobile/workspace/[id]"] = await import("../src/app/api/mobile/workspace/[id]/route.ts");
hooks.deregister();

async function call(path, method = "POST", body = {}, id = "project-own-0001") {
  return routes[path][method](new Request("https://fixture.invalid/action", {
    method, ...(method === "GET" ? {} : { headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
  }), { params: Promise.resolve({ id }) });
}
const unit = { unitNumber: "A-101", unitType: "Apartment", status: "AVAILABLE" };
const projectBody = { name: "Actual project", city: "Pune", description: "A sufficiently detailed project description" };

test("unit creation rejects towers belonging to another project without writes", async () => {
  reset();
  const response = await call("builder/projects/[id]/units", "POST", { ...unit, towerId: "tower-foreign-0002" });
  assert.equal(response.status, 400);
  assert.deepEqual(state.writes, []);
  assert.equal(state.tables.builderUnit.length, 0);
});

test("unit creation rejects unknown towers and unauthorized parent projects", async () => {
  reset();
  assert.equal((await call("builder/projects/[id]/units", "POST", { ...unit, towerId: "tower-missing-0001" })).status, 400);
  assert.equal((await call("builder/projects/[id]/units", "POST", unit, "project-foreign-0002")).status, 403);
  assert.deepEqual(state.writes, []);
});

test("valid unit, counters and activity commit together under serializable admission", async () => {
  for (const towerId of [undefined, "tower-own-0001"]) {
    reset();
    const response = await call("builder/projects/[id]/units", "POST", { ...unit, towerId });
    assert.equal(response.status, 200);
    assert.equal((await response.json()).unit.towerId, towerId);
    assert.equal(state.tables.builderUnit.length, 1);
    assert.equal(state.tables.builderProject[0].unitsCount, 1);
    assert.equal(state.tables.builderProject[0].availableUnits, 1);
    assert.equal(state.tables.builderActivityLog.length, 1);
    assert.equal(state.transactions[0].isolationLevel, "Serializable");
  }
});

test("unit counter or activity failure rolls back the unit and every related write", async () => {
  for (const failAt of ["builderProject.update", "builderActivityLog.create"]) {
    reset(); state.failAt = failAt;
    assert.equal((await call("builder/projects/[id]/units", "POST", unit)).status, 500);
    assert.equal(state.tables.builderUnit.length, 0);
    assert.equal(state.tables.builderProject[0].unitsCount, 0);
    assert.deepEqual(state.writes, []);
  }
});

test("duplicate unit number cannot increment counters or add activity", async () => {
  reset();
  assert.equal((await call("builder/projects/[id]/units", "POST", unit)).status, 200);
  const before = structuredClone(state.tables);
  assert.equal((await call("builder/projects/[id]/units", "POST", unit)).status, 500);
  assert.deepEqual(state.tables, before);
});

test("unit ownership is checked again inside the write transaction", async () => {
  reset();
  state.beforeTransaction = () => { state.tables.builderProject[0].builderId = "foreign-after-admission"; };
  assert.equal((await call("builder/projects/[id]/units", "POST", unit)).status, 403);
  assert.deepEqual(state.writes, []);
});

test("Builder plan limits are counted within serializable create transactions", async () => {
  const cases = [
    ["builder/projects", projectBody, "builderProject", 5, { builderId: "actor-fixture-0001" }],
    ["builder/projects/[id]/units", unit, "builderUnit", 500, { project: { builderId: "actor-fixture-0001" } }],
    ["builder/projects/[id]/team", { name: "Contact only" }, "builderTeamMember", 8, { builderId: "actor-fixture-0001" }]
  ];
  for (const [path, body, model, count, fields] of cases) {
    reset();
    if (model === "builderProject") state.tables[model] = [state.tables.builderProject[0]];
    while (state.tables[model].length < count) state.tables[model].push({ id: `${model}-limit-${state.tables[model].length}`, ...fields });
    assert.equal((await call(path, "POST", body)).status, 403, path);
    assert.equal(state.transactions[0].isolationLevel, "Serializable");
    assert.deepEqual(state.writes, []);
  }
});

const activityCreates = [
  ["builder/projects", projectBody, "builderProject"],
  ["builder/projects/[id]/campaigns", { name: "Local campaign", channel: "HOMEZONE" }, "builderCampaign"],
  ["builder/projects/[id]/towers", { name: "Tower A", floors: 5 }, "builderTower"],
  ["builder/projects/[id]/team", { name: "Contact only", role: "SALES" }, "builderTeamMember"]
];
for (const [path, body, model] of activityCreates) {
  test(`${path} commits its record and activity together`, async () => {
    reset();
    const count = state.tables[model].length;
    assert.equal((await call(path, "POST", body)).status, 200);
    assert.equal(state.tables[model].length, count + 1);
    assert.equal(state.tables.builderActivityLog.length, 1);
  });
  test(`${path} activity failure leaves no primary record`, async () => {
    reset(); state.failAt = "builderActivityLog.create";
    const before = structuredClone(state.tables);
    assert.equal((await call(path, "POST", body)).status, 500);
    assert.deepEqual(state.tables, before);
    assert.deepEqual(state.writes, []);
  });
}

test("project editing rolls back when its activity cannot be saved", async () => {
  reset(); state.failAt = "builderActivityLog.create";
  assert.equal((await call("builder/projects/[id]", "PATCH", { name: "Changed name" })).status, 500);
  assert.equal(state.tables.builderProject[0].name, "Owned project");
  assert.deepEqual(state.writes, []);
});

test("reservation activity failure rolls back booking, inventory and availability", async () => {
  reset();
  await call("builder/projects/[id]/units", "POST", unit);
  const before = structuredClone(state.tables);
  state.failAt = "builderActivityLog.create";
  assert.equal((await call("builder/projects/[id]/bookings", "POST", { unitId: state.tables.builderUnit[0].id })).status, 500);
  assert.deepEqual(state.tables, before);
});

test("booking status activity failure rolls back booking and unit status", async () => {
  reset();
  await call("builder/projects/[id]/units", "POST", unit);
  const bookingResponse = await call("builder/projects/[id]/bookings", "POST", { unitId: state.tables.builderUnit[0].id });
  assert.equal(bookingResponse.status, 200);
  const booking = (await bookingResponse.json()).booking;
  // Prisma includes these relations in the initial booking read.
  Object.assign(state.tables.builderBooking[0], { project: state.tables.builderProject[0], unit: state.tables.builderUnit[0] });
  const before = structuredClone(state.tables);
  state.failAt = "builderActivityLog.create";
  assert.equal((await call("builder/bookings/[id]", "PATCH", { action: "CONFIRM" }, booking.id)).status, 500);
  assert.deepEqual(state.tables, before);
});

test("commission, lead state and timeline commit together", async () => {
  reset("BROKER");
  const response = await call("pro/leads/[id]/commission", "POST", { dealValue: 100000, commissionPercent: 2, status: "PAID" }, "lead-own-0001");
  assert.equal(response.status, 200);
  assert.equal((await response.json()).commission.commissionAmount, 2000);
  assert.equal(state.tables.lead[0].stage, "WON");
  assert.equal(state.tables.leadTimelineEvent.length, 1);
});

test("commission lead/timeline failures roll back every write", async () => {
  for (const failAt of ["lead.update", "leadTimelineEvent.create"]) {
    reset("BROKER"); state.failAt = failAt;
    const before = structuredClone(state.tables);
    assert.equal((await call("pro/leads/[id]/commission", "POST", { dealValue: 100000, commissionPercent: 2 }, "lead-own-0001")).status, 500);
    assert.deepEqual(state.tables, before);
    assert.deepEqual(state.writes, []);
  }
});

test("commission transaction rejects a role/suspension or lead access change after admission", async () => {
  for (const change of [
    () => { state.tables.profile[0].role = "USER"; },
    () => { state.tables.profile[0].verificationStatus = "SUSPENDED"; },
    () => { state.tables.lead[0].assignedTo = "foreign-broker"; }
  ]) {
    reset("BROKER"); state.beforeTransaction = change;
    assert.equal((await call("pro/leads/[id]/commission", "POST", { dealValue: 100000, commissionPercent: 2 }, "lead-own-0001")).status, 403);
    assert.deepEqual(state.writes, []);
  }
});

test("Broker commission agent attribution requires self or an active linked own-team account", async () => {
  const body = { dealValue: 100000, commissionPercent: 2, agentId: "agent-fixture-0001" };
  for (const membership of [null,
    { brokerId: "foreign-broker", profileId: body.agentId, active: true },
    { brokerId: "actor-fixture-0001", profileId: body.agentId, active: false },
    { brokerId: "actor-fixture-0001", profileId: null, active: true }
  ]) {
    reset("BROKER");
    if (membership) state.tables.brokerTeamMember = [{ id: "member-fixture-0001", ...membership }];
    assert.equal((await call("pro/leads/[id]/commission", "POST", body, "lead-own-0001")).status, 403);
    assert.deepEqual(state.writes, []);
  }
  reset("BROKER");
  state.tables.brokerTeamMember = [{ id: "member-fixture-0001", brokerId: state.profile.id, profileId: body.agentId, active: true }];
  assert.equal((await call("pro/leads/[id]/commission", "POST", body, "lead-own-0001")).status, 200);
  reset("BROKER");
  assert.equal((await call("pro/leads/[id]/commission", "POST", { ...body, agentId: state.profile.id }, "lead-own-0001")).status, 200);
});

test("administrator commission attribution retains its existing explicit override", async () => {
  reset("ADMIN");
  assert.equal((await call("pro/leads/[id]/commission", "POST", { dealValue: 100000, commissionPercent: 2, agentId: "agent-fixture-0001" }, "lead-own-0001")).status, 200);
});

const builderMutations = [
  ["builder/projects", "POST", projectBody],
  ["builder/projects/[id]", "PATCH", { name: "Changed project" }],
  ["builder/projects/[id]/units", "POST", unit],
  ["builder/projects/[id]/towers", "POST", { name: "Tower B" }],
  ["builder/projects/[id]/team", "POST", { name: "Contact only" }],
  ["builder/projects/[id]/campaigns", "POST", { name: "Campaign B", channel: "HOMEZONE" }],
  ["builder/projects/[id]/bookings", "POST", { unitId: "unit-seeded-0001" }],
  ["builder/bookings/[id]", "PATCH", { action: "CONFIRM" }, "booking-seeded-0001"]
];
function seedBooking() {
  const seededUnit = { id: "unit-seeded-0001", projectId: "project-own-0001", unitNumber: "B-101", status: "RESERVED" };
  state.tables.builderUnit.push(seededUnit);
  state.tables.builderBooking.push({
    id: "booking-seeded-0001", projectId: "project-own-0001", unitId: seededUnit.id, status: "RESERVED",
    project: state.tables.builderProject[0], unit: seededUnit
  });
}

test("demoted non-Builder roles cannot use retained Builder ownership through any handler", async () => {
  for (const role of ["USER", "OWNER", "BROKER", "SERVICE_PROVIDER"]) {
    for (const [path, method, body, id] of [...builderMutations,
      ["builder/projects", "GET", {}], ["builder/reports", "GET", {}]]) {
      reset(role); seedBooking();
      assert.equal((await call(path, method, body, id)).status, 403, `${role}: ${method} ${path}`);
      assert.deepEqual(state.writes, []);
    }
  }
});

test("Builder handlers reject stale role snapshots and suspended account admission", async () => {
  for (const change of [
    () => { state.tables.profile[0].role = "OWNER"; },
    () => { state.tables.profile[0].verificationStatus = "SUSPENDED"; }
  ]) {
    for (const [path, method, body, id] of [...builderMutations,
      ["builder/projects", "GET", {}], ["builder/reports", "GET", {}]]) {
      reset(); seedBooking(); change();
      assert.equal((await call(path, method, body, id)).status, 403, `${method} ${path}`);
      assert.deepEqual(state.writes, []);
    }
  }
});

test("Builder mutations recheck role and suspension under account/parent locks before writing", async () => {
  for (const change of [
    () => { state.tables.profile[0].role = "USER"; },
    () => { state.tables.profile[0].verificationStatus = "SUSPENDED"; }
  ]) {
    for (const [path, method, body, id] of builderMutations) {
      reset(); seedBooking(); state.beforeTransaction = change;
      assert.equal((await call(path, method, body, id)).status, 403, `${method} ${path}`);
      assert.deepEqual(state.writes, []);
    }
  }
});

test("current administrator project override remains available and stale administrators lose it", async () => {
  for (const role of ["ADMIN", "SUPER_ADMIN"]) {
    reset(role);
    assert.equal((await call("builder/projects/[id]/units", "POST", unit, "project-foreign-0002")).status, 200);
    reset(role);
    state.tables.profile[0].role = "USER";
    assert.equal((await call("builder/projects/[id]/units", "POST", unit, "project-foreign-0002")).status, 403);
    assert.deepEqual(state.writes, []);
  }
});

const nativeEdits = [
  ["units", "builderUnit", { unitNumber: "Edited unit" }],
  ["towers", "builderTower", { name: "Edited tower" }],
  ["builderTeam", "builderTeamMember", { name: "Edited contact" }],
  ["campaigns", "builderCampaign", { name: "Edited campaign" }]
];
function seedNativeChild(model) {
  state.tables[model].push({ id: "child-native-0001", projectId: "project-own-0001", builderId: state.profile.id, status: "AVAILABLE" });
}
test("native Builder edits use the same fresh role/ownership transaction admission", async () => {
  for (const [module, model, values] of nativeEdits) {
    reset(); seedNativeChild(model);
    assert.equal((await call("mobile/workspace/[id]", "PATCH", { module, parent: "project-own-0001", ...values }, "child-native-0001")).status, 200);
    assert.equal(state.writes.length, 1);
    for (const change of [
      () => { state.tables.profile[0].role = "USER"; },
      () => { state.tables.profile[0].verificationStatus = "SUSPENDED"; },
      () => { state.tables.builderProject[0].builderId = "new-owner-fixture"; }
    ]) {
      reset(); seedNativeChild(model); state.beforeTransaction = change;
      assert.equal((await call("mobile/workspace/[id]", "PATCH", { module, parent: "project-own-0001", ...values }, "child-native-0001")).status, 403, module);
      assert.deepEqual(state.writes, []);
    }
  }
});

test("native Builder edits retain non-Builder/Admin denial and AVAILABLE-only unit changes", async () => {
  for (const role of ["USER", "OWNER", "BROKER", "SERVICE_PROVIDER", "ADMIN", "SUPER_ADMIN"]) {
    reset(role); seedNativeChild("builderUnit");
    assert.equal((await call("mobile/workspace/[id]", "PATCH", { module: "units", parent: "project-own-0001", price: 100 }, "child-native-0001")).status, 403);
    assert.deepEqual(state.writes, []);
  }
  reset(); seedNativeChild("builderUnit");
  state.tables.builderUnit[0].status = "RESERVED";
  assert.equal((await call("mobile/workspace/[id]", "PATCH", { module: "units", parent: "project-missing-0001", price: 100 }, "child-native-0001")).status, 403);
  assert.equal((await call("mobile/workspace/[id]", "PATCH", { module: "units", parent: "project-own-0001", price: 100 }, "child-native-0001")).status, 409);
  assert.equal(state.tables.builderUnit[0].price, undefined);
  assert.equal((await call("mobile/workspace/[id]", "PATCH", { module: "units", parent: "project-own-0001", towerId: "tower-foreign-0002" }, "child-native-0001")).status, 400);
});

test("Builder contact creation cannot bind an arbitrary account", async () => {
  reset();
  assert.equal((await call("builder/projects/[id]/team", "POST", { name: "Contact only", profileId: "foreign-profile-0001" })).status, 403);
  assert.deepEqual(state.writes, []);
});
