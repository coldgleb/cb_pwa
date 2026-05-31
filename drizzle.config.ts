import { defineConfig } from "drizzle-kit";
import * as dotenv from "dotenv";

// Next.js обычно использует .env.local, подгружаем его тоже
dotenv.config({ path: ".env" });
dotenv.config();

if (!process.env.DATABASE_URL) {
  console.warn("WARNING: DATABASE_URL is not set. Database operations might fail.");
}

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "turso",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
    authToken: process.env.DATABASE_AUTH_TOKEN,
  },
});
