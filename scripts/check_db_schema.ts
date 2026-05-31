import { createClient } from "@libsql/client";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config();

async function main() {
  const client = createClient({
    url: process.env.DATABASE_URL!,
    authToken: process.env.DATABASE_AUTH_TOKEN,
  });

  try {
    const tables = await client.execute("SELECT name FROM sqlite_master WHERE type='table';");
    console.log("Tables in database:", tables.rows.map(r => r.name));

    for (const table of tables.rows) {
        const name = table.name as string;
        const schema = await client.execute(`PRAGMA table_info(${name});`);
        console.log(`\nSchema for ${name}:`);
        console.table(schema.rows);
    }
  } catch (e) {
    console.error("Error connecting to database:", e);
  }
}

main();
