import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { registerHooks } from "node:module";
import { fileURLToPath } from "node:url";
import { test } from "node:test";
import ts from "typescript";

// Real public handlers/projections against isolated in-memory Prisma boundaries.
// No database, HTTP server, accounts or storage providers are contacted.
const state = { rows: [], calls: [], fail: false, diagnostic: null };
globalThis.__publicProjects = state;
const photo = "https://images.fixture.invalid/project.jpg";
function matches(row, where = {}) {
  return Object.entries(where).every(([key, value]) => {
    if (key === "OR") return value.some(part => matches(row, part));
    if (value && typeof value === "object") {
      if ("is" in value) return row[key] != null && matches(row[key], value.is);
      if ("not" in value) return row[key] !== value.not;
      if ("equals" in value) return String(row[key]).toLowerCase() === value.equals.toLowerCase();
      if ("contains" in value) return String(row[key] ?? "").toLowerCase().includes(value.contains.toLowerCase());
    }
    return row[key] === value;
  });
}
function project(row, select) {
  if (!row) return null;
  return Object.fromEntries(Object.entries(select).map(([key, selected]) => [key,
    selected === true ? row[key] : row[key].filter(unit => matches(unit, selected.where))
      .slice(selected.skip, selected.skip + selected.take).map(unit => project(unit, selected.select))]));
}
function rows() {
  const base = {
    id: "project-public-0001", builderId: "PRIVATE_BUILDER", name: "Fixture homes", city: "Kochi",
    locality: "Fixture locality", address: "Public marketing address", description: "Public project description",
    amenities: ["Garden"], constructionStatus: "READY", completionDate: null, unitsCount: 30,
    availableUnits: 26, mediaUrls: [photo], status: "PUBLISHED",
    createdAt: new Date("2026-11-07T00:00:00Z"), updatedAt: new Date("2026-11-07T00:00:00Z"),
    floorPlanUrls: [photo], masterPlanUrl: photo, brochureUrl: "https://fixture.invalid/private-brochure.pdf",
    builder: { role: "BUILDER", verificationStatus: "PENDING", phone: "PRIVATE_CONTACT" },
    team: ["PRIVATE_TEAM"], bookings: ["PRIVATE_BOOKINGS"], aiReport: "PRIVATE_REPORT", activities: ["PRIVATE_ACTIVITY"],
    units: Array.from({ length: 26 }, (_, i) => ({
      id: `unit-${i}`, unitType: "Apartment", areaValue: "1200", areaUnit: "sqft", bedrooms: 2,
      bathrooms: null, price: "5000000", imageUrls: [photo], status: "AVAILABLE",
      unitNumber: "PRIVATE_NUMBER", floor: 1, bookings: ["PRIVATE_BOOKING"], towerId: "PRIVATE_TOWER"
    })).concat([{ id: "reserved-unit", status: "RESERVED" }, { id: "sold-unit", status: "SOLD" }, { id: "blocked-unit", status: "BLOCKED" }])
  };
  return [base, ...["DRAFT", "ARCHIVED", "COMPLETED"].map((status, i) => ({ ...base, id: `private-status-${i}`, status })),
    { ...base, id: "project-orphaned", builder: null },
    { ...base, id: "project-suspended", builder: { role: "BUILDER", verificationStatus: "SUSPENDED" } },
    { ...base, id: "project-former-builder", builder: { role: "USER", verificationStatus: "VERIFIED" } }];
}
state.db = { builderProject: {
  findMany: async args => {
    state.calls.push(args);
    if (state.fail) throw new Error("PRIVATE_STORAGE_FAILURE");
    return state.rows.filter(row => matches(row, args.where)).slice(args.skip, args.skip + args.take).map(row => project(row, args.select));
  },
  findFirst: async args => {
    state.calls.push(args);
    if (state.fail) throw new Error("PRIVATE_STORAGE_FAILURE");
    return project(state.rows.find(row => matches(row, args.where)), args.select);
  }
} };
const mocks = {
  "@/lib/db": "export const db=globalThis.__publicProjects.db;",
  "@/lib/logging/logger": "export const captureException=e=>{globalThis.__publicProjects.diagnostic=e.message;};"
};
const hooks = registerHooks({
  resolve(specifier, context, next) {
    if (mocks[specifier]) return { url: `data:text/javascript,${encodeURIComponent(mocks[specifier])}`, shortCircuit: true };
    if (specifier === "next/server") return next("next/server.js", context);
    if (specifier.startsWith("@/")) return { url: new URL(`../src/${specifier.slice(2)}.ts`, import.meta.url).href, shortCircuit: true };
    return next(specifier, context);
  },
  load(url, context, next) {
    if (url.endsWith(".ts") && !url.includes("node_modules")) return {
      format: "module", shortCircuit: true,
      source: ts.transpileModule(readFileSync(fileURLToPath(url), "utf8"), {
        compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 }
      }).outputText
    };
    return next(url, context);
  }
});
const catalog = await import("../src/app/api/mobile/projects/route.ts");
const detail = await import("../src/app/api/mobile/projects/[id]/route.ts");
const contracts = await import("../src/lib/builder/mobile-catalog.ts");
hooks.deregister();
const request = (query = "") => new Request("https://fixture.invalid/api/mobile/projects" + query);
const read = (id = "project-public-0001", query = "") => detail.GET(request(query), { params: Promise.resolve({ id }) });
function reset() { state.rows = rows(); state.calls = []; state.fail = false; state.diagnostic = null; }

test("public Builder projects stay isolated from private Builder workspace data", async t => {
  await t.test("only published projects of current nonsuspended Builders appear publicly", async () => {
    reset();
    const response = await catalog.GET(request());
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("cache-control"), "no-store");
    const body = await response.json();
    assert.deepEqual(body.projects.map(row => row.id), ["project-public-0001"]);
    assert.equal(body.page, 1); assert.equal(body.hasMore, false); assert.equal(body.source, "database");
    assert.doesNotMatch(JSON.stringify(body), /PRIVATE|builderId|brochure|team|bookings|aiReport|floorPlan/);
    for (const id of state.rows.slice(1).map(row => row.id)) assert.equal((await read(id)).status, 404);
    assert.equal((await read("missing-project")).status, 404);
  });
  await t.test("strict bounded queries reject duplicates, unknown filters and invalid detail pages without storage", async () => {
    reset();
    for (const query of ["?page=0", "?page=1001", "?pageSize=25", "?page=1&page=2", "?city=", "?keyword=", "?keyword=" + "a".repeat(121), "?builderId=other", "?status=DRAFT"]) {
      assert.equal((await catalog.GET(request(query))).status, 400);
    }
    for (const query of ["?unitsPage=0", "?unitsPage=1001", "?unitsPage=1&unitsPage=2", "?status=DRAFT"]) assert.equal((await read(undefined, query)).status, 400);
    for (const id of ["short", "x".repeat(129), "../private"]) assert.equal((await read(id)).status, 404);
    assert.equal(state.calls.length, 0);
  });
  await t.test("city and keyword combine with stable lookahead pagination", async () => {
    reset();
    state.rows = Array.from({ length: 5 }, (_, i) => ({ ...rows()[0], id: "project-page-" + i }));
    const response = await catalog.GET(request("?page=2&pageSize=2&city=kochi&keyword=homes"));
    const body = await response.json();
    assert.deepEqual(body.projects.map(row => row.id), ["project-page-2", "project-page-3"]);
    assert.equal(body.hasMore, true); assert.equal(body.page, 2);
    assert.deepEqual(state.calls[0].orderBy, [{ createdAt: "desc" }, { id: "asc" }]);
    assert.equal(state.calls[0].skip, 2); assert.equal(state.calls[0].take, 3);
    assert.equal((await (await catalog.GET(request("?city=Delhi"))).json()).projects.length, 0);
    assert.equal((await (await catalog.GET(request("?keyword=missing"))).json()).hasMore, false);
  });
  await t.test("detail pages only AVAILABLE units with a fixed public projection and no invented currency", async () => {
    reset();
    const first = await read(); const { project: row } = await first.json();
    assert.equal(first.headers.get("cache-control"), "no-store");
    assert.equal(row.units.length, 24); assert.equal(row.unitsPage, 1); assert.equal(row.unitsHasMore, true);
    assert.equal(row.units[0].price, "5000000"); assert.equal(row.units[0].currency, undefined);
    assert.equal(row.units[0].bathrooms, null);
    assert.doesNotMatch(JSON.stringify(row), /PRIVATE|brochureUrl|qrCodeUrl|unitNumber|towerId|builderId/);
    const last = await (await read(undefined, "?unitsPage=2")).json();
    assert.deepEqual(last.project.units.map(unit => unit.id), ["unit-24", "unit-25"]);
    assert.equal(last.project.unitsPage, 2); assert.equal(last.project.unitsHasMore, false);
    assert.equal(state.calls[1].select.units.skip, 24); assert.equal(state.calls[1].select.units.take, 25);
  });
  await t.test("public assets reject private documents, signed URLs and malformed media", async () => {
    reset();
    const blocked = ["http://images.fixture.invalid/a.jpg", "https://u:p@images.fixture.invalid/a.jpg", photo + "?token=private", photo + "#private", "https://fixture.invalid/api/private-files/private.jpg", "https://fixture.invalid/brochure.pdf", "not a URL"];
    state.rows[0].mediaUrls = [photo, ...blocked];
    state.rows[0].floorPlanUrls = [photo, ...blocked];
    state.rows[0].masterPlanUrl = blocked[4];
    state.rows[0].units[0].imageUrls = [photo, ...blocked];
    const { project: row } = await (await read()).json();
    assert.deepEqual(row.mediaUrls, [photo]); assert.deepEqual(row.floorPlanUrls, [photo]);
    assert.equal(row.masterPlanUrl, null); assert.deepEqual(row.units[0].imageUrls, [photo]);
    assert.equal(contracts.publicProjectImage("https://res.cloudinary.com/fixture/image/upload/v1/example"), "https://res.cloudinary.com/fixture/image/upload/v1/example");
  });
  await t.test("oversized legacy arrays are bounded without breaking the catalogue or owned records", async () => {
    reset();
    for (const key of ["amenities", "mediaUrls", "floorPlanUrls"]) state.rows[0][key] = Array(125).fill(key === "amenities" ? "Garden" : photo);
    state.rows[0].units[0].imageUrls = Array(125).fill(photo);
    const listing = await (await catalog.GET(request())).json();
    const { project: row } = await (await read()).json();
    assert.equal(listing.projects[0].amenities.length, 100); assert.equal(listing.projects[0].mediaUrls.length, 100);
    for (const key of ["amenities", "mediaUrls", "floorPlanUrls"]) { assert.equal(row[key].length, 100); assert.equal(state.rows[0][key].length, 125); }
    assert.equal(row.units[0].imageUrls.length, 100);
  });
  await t.test("blank and oversized legacy amenities or image URLs cannot invalidate the public response", async () => {
    reset();
    const oversizedImage = "https://images.fixture.invalid/" + "a".repeat(20_000) + ".jpg";
    const originalAmenities = ["", "   ", "  Garden  ", "x".repeat(20_001)];
    state.rows[0].amenities = [...originalAmenities];
    state.rows[0].mediaUrls = [oversizedImage, photo];
    state.rows[0].floorPlanUrls = [oversizedImage, photo];
    state.rows[0].masterPlanUrl = oversizedImage;
    state.rows[0].units[0].imageUrls = [oversizedImage, photo];
    const listing = await (await catalog.GET(request())).json();
    const { project: row } = await (await read()).json();
    for (const result of [listing.projects[0], row]) {
      assert.deepEqual(result.amenities, ["Garden", "x".repeat(20_000)]);
      assert.deepEqual(result.mediaUrls, [photo]);
    }
    assert.deepEqual(row.floorPlanUrls, [photo]); assert.equal(row.masterPlanUrl, null);
    assert.deepEqual(row.units[0].imageUrls, [photo]);
    assert.deepEqual(state.rows[0].amenities, originalAmenities);
    assert.deepEqual(state.rows[0].mediaUrls, [oversizedImage, photo]);
  });
  await t.test("storage failures return real generic errors rather than demo projects or internal details", async () => {
    reset(); state.fail = true;
    for (const response of [await catalog.GET(request()), await read()]) {
      assert.equal(response.status, 500); assert.doesNotMatch(JSON.stringify(await response.json()), /PRIVATE_STORAGE/);
    }
    assert.equal(state.diagnostic, "Mobile project unavailable");
  });
});
