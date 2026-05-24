import type { NextAuthConfig } from "next-auth";

export const authConfig = {
  trustHost: true,
  secret: process.env.AUTH_SECRET,
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/",
  },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isOnAdmin = nextUrl.pathname.startsWith("/admin");
      const isOnUserArea = nextUrl.pathname.startsWith("/cards") || nextUrl.pathname.startsWith("/transactions");
      
      console.log(`[AUTH] Middleware Path: ${nextUrl.pathname}, LoggedIn: ${isLoggedIn}, User: ${auth?.user?.email}`);

      if (isOnAdmin || isOnUserArea) {
        if (isLoggedIn) return true;
        return false; // Redirect to login
      }
      return true;
    },
  },
  providers: [], // Провайдеры будут добавлены в основном файле auth.ts
} satisfies NextAuthConfig;
