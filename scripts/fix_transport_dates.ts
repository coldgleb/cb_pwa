import { db } from "../src/db";
import { bankCategories, bankCategoryMcc } from "../src/db/schema";
import { eq } from "drizzle-orm";
import { recalculateTransactionsForUserCard } from "../src/lib/actions/transactions";

async function main() {
  console.log("Fixing Category 19 (Транспорт) dates...");

  // 1. Set Category 19 endDate to null
  await db
    .update(bankCategories)
    .set({ endDate: null })
    .where(eq(bankCategories.id, 19));
  console.log("Category 19 endDate updated to null.");

  // 2. Set all MCC mappings for Category 19 endDate to null
  await db
    .update(bankCategoryMcc)
    .set({ endDate: null })
    .where(eq(bankCategoryMcc.categoryId, 19));
  console.log("All MCC mappings for Category 19 endDate updated to null.");

  // 3. Recalculate transactions for UserCard 1
  console.log("Recalculating transactions...");
  const count = await recalculateTransactionsForUserCard(1);
  console.log(`Recalculated successfully. Count: ${count}`);
}

main().catch(console.error);
