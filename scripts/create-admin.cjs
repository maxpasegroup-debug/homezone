const { PrismaClient } = require("@prisma/client");
const { randomBytes, scrypt: scryptCallback } = require("crypto");
const { promisify } = require("util");

const db = new PrismaClient();
const scrypt = promisify(scryptCallback);
const allowedRoles = ["ADMIN", "SUPER_ADMIN"];

async function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const derivedKey = await scrypt(password, salt, 64);
  return `scrypt:${salt}:${derivedKey.toString("hex")}`;
}

async function main() {
  const email = (process.env.ADMIN_EMAIL || "admin@homezone.com").trim().toLowerCase();
  const password = (process.env.ADMIN_PASSWORD || "@Legacy#2026").trim();
  const name = (process.env.ADMIN_NAME || "HomeZone Admin").trim();
  const role = (process.env.ADMIN_ROLE || "ADMIN").trim();

  if (!allowedRoles.includes(role)) {
    throw new Error("ADMIN_ROLE must be ADMIN or SUPER_ADMIN");
  }

  const user = await db.user.upsert({
    create: {
      email,
      name
    },
    update: {
      name
    },
    where: {
      email
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
    create: {
      country: "India",
      fullName: name,
      role,
      userId: user.id,
      verificationStatus: "VERIFIED",
      verifiedAt: new Date()
    },
    update: {
      fullName: name,
      role,
      verificationStatus: "VERIFIED",
      verifiedAt: new Date()
    },
    where: {
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
