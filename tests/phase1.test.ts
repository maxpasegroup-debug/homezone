import assert from "node:assert/strict";
import { checkRateLimit, clearRateLimitBucketsForTests } from "../src/lib/api/rate-limit.ts";
import { currencySchema, marketplaceFilterSchema, propertyCreateSchema, profileUpdateSchema } from "../src/lib/api/validation.ts";
import { isAdminRole, normalizeRole } from "../src/lib/auth/roles.ts";

function run(name: string, assertion: () => void) {
  assertion();
  console.log(`ok - ${name}`);
}

run("normalizes legacy BUYER role to USER", () => {
  assert.equal(normalizeRole("BUYER"), "USER");
  assert.equal(normalizeRole(undefined), "USER");
});

run("recognizes ADMIN and SUPER_ADMIN as admin roles", () => {
  assert.equal(isAdminRole("ADMIN"), true);
  assert.equal(isAdminRole("SUPER_ADMIN"), true);
  assert.equal(isAdminRole("USER"), false);
});

run("profile update does not accept privileged roles", () => {
  assert.equal(profileUpdateSchema.safeParse({ role: "USER" }).success, true);
  assert.equal(profileUpdateSchema.safeParse({ role: "ADMIN" }).success, false);
  assert.equal(profileUpdateSchema.safeParse({ role: "SUPER_ADMIN" }).success, false);
});

run("property intent accepts final production categories", () => {
  assert.equal(propertyCreateSchema.safeParse({
    category: "COMMERCIAL",
    title: "Lease-ready office",
    description: "A verified commercial office available for long-term lease.",
    intent: "lease",
    propertyType: "Commercial",
    country: "United Arab Emirates",
    currency: "AED",
    city: "Kochi",
    amenities: []
  }).success, true);
});

run("currency is validated against Phase 2A allowlist", () => {
  assert.equal(currencySchema.safeParse("INR").success, true);
  assert.equal(currencySchema.safeParse("AED").success, true);
  assert.equal(currencySchema.safeParse("JPY").success, false);
});

run("marketplace filters parse global search fields", () => {
  const parsed = marketplaceFilterSchema.safeParse({
    category: "land",
    city: "Dubai",
    country: "United Arab Emirates",
    maxPrice: "1000000",
    purpose: "invest",
    verifiedOnly: "true"
  });

  assert.equal(parsed.success, true);
  if (parsed.success) {
    assert.equal(parsed.data.category, "LAND");
    assert.equal(parsed.data.purpose, "INVEST");
    assert.equal(parsed.data.verifiedOnly, true);
  }
});

run("rate limiter blocks after configured limit", () => {
  clearRateLimitBucketsForTests();

  assert.equal(checkRateLimit({ key: "test", limit: 2, windowMs: 60_000 }).allowed, true);
  assert.equal(checkRateLimit({ key: "test", limit: 2, windowMs: 60_000 }).allowed, true);
  assert.equal(checkRateLimit({ key: "test", limit: 2, windowMs: 60_000 }).allowed, false);
});
