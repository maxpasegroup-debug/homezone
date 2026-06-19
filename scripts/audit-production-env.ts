import { getProductionEnvAudit } from "../src/lib/env.ts";

const audit = getProductionEnvAudit();

console.log("HomeZone production environment audit");
console.log(`NODE_ENV: ${audit.nodeEnv}`);
console.log(`HOMEZONE_ENFORCE_ENV: ${audit.enforceEnv}`);
console.log(`Launch ready: ${audit.ready ? "yes" : "no"}`);
console.log("");

for (const group of audit.groups) {
  console.log(`${group.name}`);
  console.log(`  present: ${group.present.length ? group.present.join(", ") : "none"}`);
  console.log(`  missing: ${group.missing.length ? group.missing.join(", ") : "none"}`);
}

if (!audit.ready) {
  console.error("");
  console.error(`Missing ${audit.missing.length} required launch variable(s): ${audit.missing.join(", ")}`);
  process.exitCode = 1;
}
