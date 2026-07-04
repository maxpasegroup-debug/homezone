import { db } from "../src/lib/db.ts";
import { hashPassword } from "../src/lib/auth/password.ts";

const allowedRoles = ["ADMIN", "SUPER_ADMIN"] as const;
type AdminRole = (typeof allowedRoles)[number];

async function main() {
  const email = (process.env.ADMIN_EMAIL?.trim() || "admin@homezone.com").toLowerCase();
  const password = process.env.ADMIN_PASSWORD?.trim() || "@Legacy#2026";
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

  const passwordHash = await hashPassword(password);
  await db.passwordCredential.upsert({
    create: {
      passwordHash,
      userId: user.id
    },
    update: {
      passwordHash
    },
    where: {
      userId: user.id
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
