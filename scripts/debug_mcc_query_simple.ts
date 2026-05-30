import { db } from "../src/db";
import { bankCategories, bankCategoryMcc } from "../src/db/schema";
import { eq } from "drizzle-orm";

async function main() {
  const cats = await db.select().from(bankCategories).where(eq(bankCategories.id, 19));
  console.log("Category 19:", cats);

  const mccs = await db.select().from(bankCategoryMcc).where(eq(bankCategoryMcc.categoryId, 19));
  console.log("MCCs for Category 19:", mccs);
}

main().catch(console.error);
