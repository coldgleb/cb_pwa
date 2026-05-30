import NextAuth, { type DefaultSession } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { db } from "./db";
import { users } from "./db/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { authConfig } from "./auth.config";

declare module "next-auth" {
  interface User {
    role?: string;
  }
  interface Session {
    user: {
      role?: string;
      id?: string;
    } & DefaultSession["user"];
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  trustHost: true,
  providers: [
    Credentials({
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const emailStr = (credentials.email as string).toLowerCase().trim();
        if (emailStr !== "saygingleb101@gmail.com") {
          console.log(`[AUTH] Access denied. Personal app only allows saygingleb101@gmail.com. Attempted: ${credentials.email}`);
          return null;
        }

        console.log(`[AUTH] Attempting login for: ${emailStr}`);

        const [user] = await db
          .select()
          .from(users)
          .where(eq(users.email, emailStr))
          .limit(1);

        if (!user) {
          console.log(`[AUTH] User not found: ${credentials.email}`);
          return null;
        }

        if (!user.password) {
          console.log(`[AUTH] User has no password set (possibly oauth user)`);
          return null;
        }

        const isValid = await bcrypt.compare(credentials.password as string, user.password);

        if (!isValid) {
          console.log(`[AUTH] Invalid password for: ${credentials.email}`);
          return null;
        }

        console.log(`[AUTH] Success! User ID: ${user.id}`);
        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.email = user.email;
      }
      
      if (process.env.ADMIN_EMAIL && token.email?.toLowerCase() === process.env.ADMIN_EMAIL.toLowerCase()) {
        token.role = "admin";
      }
      
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.id) {
        const userId = token.id as string;
        
        // Verify user exists in the DB (handles database resets)
        const [dbUser] = await db
          .select({ id: users.id })
          .from(users)
          .where(eq(users.id, userId))
          .limit(1);

        if (!dbUser) {
          // If user does not exist in DB, invalidate the session completely
          return null as any;
        }

        session.user.id = userId;
        session.user.role = token.role as string;
        session.user.email = token.email as string;
      }
      return session;
    },

  },
});
