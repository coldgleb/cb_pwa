import { db } from "../src/db";
import { sql } from "drizzle-orm";

async function main() {
  console.log("Dropping tables with schema conflicts...");
  
  // Drop referencing tables first
  const tables = [
    "transaction_category_splits",
    "transactions",
    "user_cashback_rules",
    "bank_category_mcc",
    "bank_category_merchant",
    "bank_categories"
  ];

  for (const table of tables) {
    try {
      console.log(`Dropping table ${table}...`);
      await db.run(sql.raw(`DROP TABLE IF EXISTS ${table}`));
      console.log(`Dropped ${table}`);
    } catch (e) {
      console.error(`Error dropping ${table}:`, e);
    }
  }

  console.log("Cleanup completed!");
}

main().catch(console.error);
