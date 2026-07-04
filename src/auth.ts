import NextAuth from "next-auth";
import type { Provider } from "next-auth/providers";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import Nodemailer from "next-auth/providers/nodemailer";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { db } from "@/lib/db";
import { env, isDemoLoginEnabled, isEmailLoginEnabled, isGoogleLoginEnabled, isMobileOtpLoginEnabled } from "@/lib/env";
import { isDemoMobileOtp, normalizePhone } from "@/lib/auth/otp";
import { verifyPassword } from "@/lib/auth/password";
import { normalizeRole } from "@/lib/auth/roles";

const providers: Provider[] = [];
const DEMO_USER_ID = "homezone-demo-user";
const MOBILE_DEMO_USER_ID = "homezone-mobile-demo-user";
const MOBILE_DEMO_EMAIL = "mobile-demo@homezone.ai";

if (isGoogleLoginEnabled()) {
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

providers.push(
  Credentials({
    id: "password",
    name: "Email and Password",
    credentials: {
      email: { label: "Email", type: "email" },
      password: { label: "Password", type: "password" }
    },
    async authorize(credentials) {
      const email = String(credentials?.email ?? "").trim().toLowerCase();
      const password = String(credentials?.password ?? "");

      if (!email || !password) return null;

      const user = await db.user.findUnique({
        include: {
          passwordCredential: true
        },
        where: {
          email
        }
      });

      if (!user?.passwordCredential) return null;

      const valid = await verifyPassword(password, user.passwordCredential.passwordHash);
      if (!valid) return null;

      return {
        email: user.email,
        id: user.id,
        image: user.image,
        name: user.name
      };
    }
  })
);

if (isDemoLoginEnabled()) {
  providers.push(
    Credentials({
      id: "demo",
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

        return {
          id: DEMO_USER_ID,
          email,
          name: "HomeZone Local User"
        };
      }
    })
  );
}

if (isMobileOtpLoginEnabled()) {
  providers.push(
    Credentials({
      id: "mobile-demo",
      name: "Demo Mobile OTP",
      credentials: {
        code: { label: "OTP", type: "text" },
        phone: { label: "Phone", type: "tel" }
      },
      async authorize(credentials) {
        const phone = normalizePhone(String(credentials?.phone ?? ""));
        const code = String(credentials?.code ?? "").trim();

        if (!isDemoMobileOtp(phone, code)) {
          return null;
        }

        return {
          email: MOBILE_DEMO_EMAIL,
          id: MOBILE_DEMO_USER_ID,
          name: "HomeZone Mobile User"
        };
      }
    })
  );
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(db),
  providers,
  secret: env.AUTH_SECRET ?? (env.NODE_ENV === "production" ? undefined : "development-only-auth-secret-change-before-deploy"),
  trustHost: true,
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
      if (token.id === DEMO_USER_ID || token.id === MOBILE_DEMO_USER_ID) {
        token.role = "USER";
        token.whatsappVerified = true;
        return token;
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
