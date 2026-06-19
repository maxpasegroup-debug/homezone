import { db } from "../src/lib/db.ts";

const allowedRoles = ["ADMIN", "SUPER_ADMIN"] as const;
type AdminRole = (typeof allowedRoles)[number];

function requireValue(name: string) {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`${name} is required`);
  }
  return value;
}

async function main() {
  const email = requireValue("ADMIN_EMAIL").toLowerCase();
  const name = process.env.ADMIN_NAME?.trim() || email;
  const role = (process.env.ADMIN_ROLE?.trim() || "ADMIN") as AdminRole;

  if (!allowedRoles.includes(role)) {
    throw new Error("ADMIN_ROLE must be ADMIN or SUPER_ADMIN");
  }

  const user = await db.user.upsert({
    where: {
      email
    },
    update: {
      name
    },
    create: {
      email,
      name
    }
  });

  const profile = await db.profile.upsert({
    where: {
      userId: user.id
    },
    update: {
      fullName: name,
      role
    },
    create: {
      country: "India",
      fullName: name,
      role,
      userId: user.id
    }
  });

  console.log(`Admin bootstrap complete: ${email} -> ${profile.role}`);
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : "Admin bootstrap failed");
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });
