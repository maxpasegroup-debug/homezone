import NextAuth from "next-auth";
import type { Provider } from "next-auth/providers";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import Nodemailer from "next-auth/providers/nodemailer";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { db } from "@/lib/db";
import { env, isDemoLoginEnabled, isEmailLoginEnabled } from "@/lib/env";
import { normalizeRole } from "@/lib/auth/roles";

const providers: Provider[] = [];

if (env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET) {
  providers.push(
    Google({
      clientId: env.GOOGLE_CLIENT_ID,
      clientSecret: env.GOOGLE_CLIENT_SECRET
    })
  );
}

if (isEmailLoginEnabled()) {
  providers.push(
    Nodemailer({
      from: env.EMAIL_FROM,
      server: {
        auth: {
          pass: env.SMTP_PASSWORD,
          user: env.SMTP_USER
        },
        host: env.SMTP_HOST,
        port: env.SMTP_PORT,
        secure: env.SMTP_PORT === 465
      }
    })
  );
}

if (isDemoLoginEnabled()) {
  providers.push(
    Credentials({
      name: "Demo Account",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        const email = String(credentials?.email ?? "").trim().toLowerCase();
        const password = String(credentials?.password ?? "");
        const demoEmail = env.DEMO_EMAIL ?? "demo@homezone.ai";
        const demoPassword = env.DEMO_PASSWORD ?? "HomeZone@123";

        if (email !== demoEmail || password !== demoPassword) {
          return null;
        }

        const user = await db.user.upsert({
          where: {
            email
          },
          update: {
            name: "HomeZone Demo User"
          },
          create: {
            email,
            name: "HomeZone Demo User",
            profile: {
              create: {
                fullName: "HomeZone Demo User",
                phone: "+919999999999",
                whatsappVerified: true,
                role: "USER",
                country: "India",
                city: "Kochi"
              }
            }
          }
        });

        await db.profile.upsert({
          where: {
            userId: user.id
          },
          update: {
            whatsappVerified: true
          },
          create: {
            userId: user.id,
            fullName: user.name,
            phone: "+919999999999",
            whatsappVerified: true,
            role: "USER",
            country: "India",
            city: "Kochi"
          }
        });

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image
        };
      }
    })
  );
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(db),
  providers,
  session: {
    strategy: "jwt"
  },
  pages: {
    error: "/auth",
    signIn: "/auth"
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user?.id) {
        token.id = user.id;
      }
      if (token.id) {
        const profile = await db.profile.findUnique({
          where: {
            userId: String(token.id)
          },
          select: {
            role: true,
            whatsappVerified: true
          }
        });

        token.role = normalizeRole(profile?.role);
        token.whatsappVerified = Boolean(profile?.whatsappVerified);
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = String(token.id);
        session.user.role = normalizeRole(String(token.role ?? "USER"));
        session.user.whatsappVerified = Boolean(token.whatsappVerified);
      }
      return session;
    }
  },
  events: {
    async createUser({ user }) {
      if (!user.id) {
        return;
      }

      await db.profile.create({
        data: {
          user: {
            connect: {
              id: user.id
            }
          },
          fullName: user.name,
          avatarUrl: user.image,
          role: "USER"
        }
      });
    }
  }
});
