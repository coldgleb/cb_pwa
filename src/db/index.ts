import { drizzle } from "drizzle-orm/libsql";
import { createClient } from "@libsql/client";
import * as schema from "./schema";
import * as dotenv from "dotenv";

// Load environment variables for standalone scripts
dotenv.config({ path: ".env.local", override: true });
dotenv.config();

const globalForDb = globalThis as unknown as {
  db: ReturnType<typeof drizzle<typeof schema>> | undefined;
};

export const db =
  globalForDb.db ??
  drizzle(
    createClient({
      url: process.env.DATABASE_URL!,
      authToken: process.env.DATABASE_AUTH_TOKEN,
    }),
    { schema }
  );

if (process.env.NODE_ENV !== "production") globalForDb.db = db;
