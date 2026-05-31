import { createClient } from "@libsql/client";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config();

async function main() {
  console.log("DATABASE_URL:", process.env.DATABASE_URL);
  const client = createClient({
    url: process.env.DATABASE_URL!,
    authToken: process.env.DATABASE_AUTH_TOKEN,
  });

  try {
    const userId = "baaa1eea-9680-46dd-9178-eebe2406cbe0";
    console.log(`Testing query for userId: ${userId}`);
    const result = await client.execute({
        sql: 'select "id" from "users" where "id" = ? limit ?',
        args: [userId, 1]
    });
    console.log("Query result:", result.rows);
  } catch (e) {
    console.error("Libsql Query Error:", e);
  }
}

main();
