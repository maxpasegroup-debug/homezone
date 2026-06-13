import NextAuth from "next-auth";
import type { Provider } from "next-auth/providers";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { db } from "@/lib/db";

const providers: Provider[] = [];

if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  providers.push(
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET
    })
  );
}

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
      const demoEmail = process.env.DEMO_EMAIL ?? "demo@homezone.ai";
      const demoPassword = process.env.DEMO_PASSWORD ?? "HomeZone@123";

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
              role: "BUYER",
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
          role: "BUYER",
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

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(db),
  providers,
  session: {
    strategy: "jwt"
  },
  pages: {
    signIn: "/auth"
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user?.id) {
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = String(token.id);
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
          avatarUrl: user.image
        }
      });
    }
  }
});
