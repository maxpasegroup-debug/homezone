export const userRoles = [
  "user",
  "owner",
  "broker",
  "builder",
  "service_provider",
  "admin",
  "super_admin"
] as const;

export type UserRole = (typeof userRoles)[number];

export const protectedActions = [
  "contact_property",
  "save_property",
  "list_property",
  "book_studio",
  "request_service",
  "open_dashboard",
  "use_pro",
  "submit_builder_project"
] as const;

export const countryDefaults = {
  country: "India",
  currency: "INR",
  phoneCode: "+91",
  areaUnits: ["sqft", "cent", "acre", "sqm"],
  languages: ["English", "Malayalam", "Hindi"]
};
