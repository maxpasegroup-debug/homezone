import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    // Raw ORM diagnostics may serialize private inputs. Routes report safe,
    // structured failures; never emit SQL arguments or document metadata here.
    log: []
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = db;
}
