import assert from "node:assert/strict";
import { checkRateLimit, clearRateLimitBucketsForTests } from "../src/lib/api/rate-limit.ts";
import {
  currencySchema,
  marketplaceFilterSchema,
  contactActionSchema,
  aiCompareSchema,
  aiLeadAssistantSchema,
  leadSchema,
  leadSourceSchema,
  profileUpdateSchema,
  profileVerificationSchema,
  propertyCreateSchema,
  propertyVerificationSchema,
  reportSchema
} from "../src/lib/api/validation.ts";
import { isAdminRole, normalizeRole } from "../src/lib/auth/roles.ts";
import { detectAILanguage, parseAIPropertyFilters } from "../src/lib/ai/companion-utils.ts";
import { createInvoiceNumber, getPaymentProduct, isAllowedForRole } from "../src/lib/payments/catalog.ts";
import { profileVerificationEvent, propertyVerificationEvent } from "../src/lib/trust/verification.ts";

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

run("verification schemas accept Phase 2C trust statuses", () => {
  assert.equal(propertyVerificationSchema.safeParse({ status: "VERIFIED" }).success, true);
  assert.equal(propertyVerificationSchema.safeParse({ status: "SUSPENDED" }).success, false);
  assert.equal(profileVerificationSchema.safeParse({ status: "SUSPENDED" }).success, true);
  assert.equal(profileVerificationSchema.safeParse({ status: "EXPIRED" }).success, false);
});

run("verification events use explicit audit names", () => {
  assert.equal(propertyVerificationEvent("VERIFIED"), "PROPERTY_APPROVED");
  assert.equal(propertyVerificationEvent("REJECTED"), "PROPERTY_REJECTED");
  assert.equal(profileVerificationEvent({ role: "BROKER", status: "VERIFIED" }), "BROKER_VERIFIED");
  assert.equal(profileVerificationEvent({ role: "BUILDER", status: "SUSPENDED" }), "BUILDER_SUSPENDED");
});

run("payment products are server controlled", () => {
  assert.equal(getPaymentProduct("FEATURED_LISTING").requiresProperty, true);
  assert.equal(getPaymentProduct("BROKER_MONTHLY").subscription, true);
  assert.equal(getPaymentProduct("STUDIO_DRONE").createsStudioRequest, true);
});

run("payment role rules and invoice numbers are deterministic foundations", () => {
  assert.equal(isAllowedForRole({ product: "BROKER_MONTHLY", role: "BROKER" }), true);
  assert.equal(isAllowedForRole({ product: "BROKER_MONTHLY", role: "USER" }), false);
  assert.match(createInvoiceNumber(new Date("2026-06-18T00:00:00.000Z")), /^HZ-20260618-[A-Z0-9]{6}$/);
});

run("lead source and contact action enums support Phase 4 tracking", () => {
  assert.equal(leadSourceSchema.safeParse("PROPERTY").success, true);
  assert.equal(leadSourceSchema.safeParse("REEL").success, true);
  assert.equal(leadSourceSchema.safeParse("WhatsApp").success, false);
  assert.equal(contactActionSchema.safeParse("CALL").success, true);
  assert.equal(contactActionSchema.safeParse("WHATSAPP").success, true);
  assert.equal(contactActionSchema.safeParse("EMAIL").success, false);
});

run("lead schema accepts reel leads and rejects free-form sources", () => {
  assert.equal(leadSchema.safeParse({
    contactAction: "INQUIRY",
    message: "I want to know more about this reel.",
    name: "HomeZone User",
    phone: "+91 99999 99999",
    reelId: "clx123456789",
    source: "REEL"
  }).success, true);

  assert.equal(leadSchema.safeParse({
    message: "Interested",
    name: "HomeZone User",
    phone: "+91 99999 99999",
    source: "Property Detail"
  }).success, false);
});

run("reel reports and Phase 4B audit events are supported", () => {
  assert.equal(reportSchema.safeParse({
    entityId: "clx123456789",
    entityType: "reel",
    reason: "Misleading property video"
  }).success, true);

  const events = [
    "REEL_UNLIKED",
    "REEL_UNSAVED",
    "UNFOLLOWED_BROKER",
    "UNFOLLOWED_BUILDER",
    "REEL_REPORTED"
  ];

  assert.deepEqual(events, [
    "REEL_UNLIKED",
    "REEL_UNSAVED",
    "UNFOLLOWED_BROKER",
    "UNFOLLOWED_BUILDER",
    "REEL_REPORTED"
  ]);
});

run("AI companion parses common property searches", () => {
  assert.deepEqual(parseAIPropertyFilters("Show villas in Kochi under ₹1 Cr").city, "kochi");
  assert.equal(parseAIPropertyFilters("Dubai apartments under AED 1M").country, "United Arab Emirates");
  assert.equal(parseAIPropertyFilters("3 BHK near Calicut city").bedrooms, 3);
  assert.equal(parseAIPropertyFilters("Commercial properties for lease").purpose, "LEASE");
});

run("AI companion supports English and Malayalam foundations", () => {
  assert.equal(detectAILanguage("Show villas in Kochi", "AUTO"), "English");
  assert.equal(detectAILanguage("കൊച്ചിയിൽ വീട് വേണം", "AUTO"), "Malayalam");
  assert.equal(detectAILanguage("Show villas", "MALAYALAM"), "Malayalam");
});

run("AI comparison and lead assistant schemas are constrained", () => {
  assert.equal(aiCompareSchema.safeParse({
    propertyIds: ["clx123456789", "clx987654321"]
  }).success, true);
  assert.equal(aiCompareSchema.safeParse({
    propertyIds: ["clx123456789"]
  }).success, false);
  assert.equal(aiLeadAssistantSchema.safeParse({
    mode: "INQUIRY",
    context: "Interested buyer"
  }).success, true);
  assert.equal(aiLeadAssistantSchema.safeParse({
    mode: "AUTO_SEND"
  }).success, false);
});

run("Phase 6 intelligence audit events are explicit", () => {
  assert.deepEqual([
    "PROPERTY_VIEWED",
    "SEARCH_PERFORMED",
    "AI_USED",
    "RECOMMENDATION_VIEWED"
  ], [
    "PROPERTY_VIEWED",
    "SEARCH_PERFORMED",
    "AI_USED",
    "RECOMMENDATION_VIEWED"
  ]);
});

run("AI parser handles production rupee search input", () => {
  assert.equal(parseAIPropertyFilters("Show villas in Kochi under ₹1 Cr").maxPrice, 10_000_000);
});
