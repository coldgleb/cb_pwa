import { db } from "../src/db";
import { bankCategories, bankCategoryMcc } from "../src/db/schema";
import { and, eq, lte, or, isNull, gte, sql, desc } from "drizzle-orm";

async function main() {
  const normalizedMcc = "4131";
  const loyaltyProgramId = 1;
  const dateStr = "2026-05-31";

  const rows = await db
    .select({ 
      categoryId: bankCategories.id,
      categoryName: bankCategories.name,
      categoryRounding: bankCategories.roundingType,
      defaultPercentage: bankCategories.defaultPercentage,
      tiers: bankCategories.tiers,
      lpId: bankCategories.loyaltyProgramId,
      mccStart: bankCategoryMcc.startDate,
      mccEnd: bankCategoryMcc.endDate,
      catStart: bankCategories.startDate,
      catEnd: bankCategories.endDate,
    })
    .from(bankCategoryMcc)
    .innerJoin(bankCategories, eq(bankCategoryMcc.categoryId, bankCategories.id))
    .where(
      and(
        eq(bankCategoryMcc.mccCode, normalizedMcc),
        eq(bankCategories.loyaltyProgramId, loyaltyProgramId),
        lte(bankCategoryMcc.startDate, dateStr),
        or(isNull(bankCategoryMcc.endDate), gte(bankCategoryMcc.endDate, dateStr)),
        lte(bankCategories.startDate, dateStr),
        or(isNull(bankCategories.endDate), gte(bankCategories.endDate, dateStr))
      )
    )
    .orderBy(
      sql`CASE WHEN trim(lower(${bankCategories.name})) = 'без кешбэка' THEN 0 ELSE 1 END`,
      desc(bankCategoryMcc.startDate),
      sql`CASE WHEN ${bankCategoryMcc.endDate} IS NULL THEN 0 ELSE 1 END`
    );

  console.log("Matched rows:", rows);
}

main().catch(console.error);
