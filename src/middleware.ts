import NextAuth from "next-auth";
import { authConfig } from "./auth.config";

export default NextAuth(authConfig).auth;

export const config = {
  // Исключаем системные файлы и API маршруты из проверки middleware
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|icons|sw.js|manifest.json).*)'],
};
