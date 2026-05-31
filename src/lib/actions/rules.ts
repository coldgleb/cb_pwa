"use server";

import { db } from "@/db";
import { userCashbackRules, bankCategories, userCards, bankCards } from "@/db/schema";
import { auth } from "@/auth";
import { revalidatePath } from "next/cache";
import { and, eq, lte, gte, inArray } from "drizzle-orm";
import { recalculateTransactionsForUserCard, bulkRecalculateTransactions } from "./cashback-engine";

export async function saveMonthlyRules(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const loyaltyProgramId = parseInt(formData.get("loyaltyProgramId") as string);
  const yearMonth = formData.get("month") as string; // Format: "YYYY-MM"
  
  if (isNaN(loyaltyProgramId) || !yearMonth) throw new Error("Invalid data");

  const startDate = `${yearMonth}-01`;
  const [year, month] = yearMonth.split("-").map(Number);
  const lastDay = new Date(year, month, 0).getDate();
  const endDate = `${yearMonth}-${String(lastDay).padStart(2, "0")}`;

  // 1. Fetch old rules for comparison
  const oldRules = await db
    .select()
    .from(userCashbackRules)
    .where(
        and(
            eq(userCashbackRules.userId, session.user.id),
            eq(userCashbackRules.loyaltyProgramId, loyaltyProgramId),
            eq(userCashbackRules.startDate, startDate),
            eq(userCashbackRules.endDate, endDate)
        )
    );

  const entries = Array.from(formData.entries());
  
  // Extract percentages
  const categoryData = entries
    .filter(([key]) => key.startsWith("cat_"))
    .map(([key, value]) => {
      const id = parseInt(key.replace("cat_", ""));
      const percentage = parseFloat(value as string);
      const limit = parseFloat(formData.get(`limit_${id}`) as string) || null;
      return { id, percentage, limit };
    })
    .filter(r => !isNaN(r.id) && !isNaN(r.percentage));

  if (categoryData.length === 0) return;

  const categoryIds = categoryData.map(r => r.id);
  const categoriesData = await db
    .select({ id: bankCategories.id, tiers: bankCategories.tiers, name: bankCategories.name })
    .from(bankCategories)
    .where(inArray(bankCategories.id, categoryIds));

  const catsMap = new Map(categoriesData.map(c => [c.id, c]));

  const rulesToSave = categoryData.map(r => {
    const cat = catsMap.get(r.id);
    const isNoCashback = cat?.name === "Без кешбэка";
    
    return {
      userId: session.user.id!,
      loyaltyProgramId,
      bankCategoryId: r.id,
      percentage: isNoCashback ? 0 : r.percentage,
      tiers: isNoCashback ? "[]" : (cat?.tiers || "[]"),
      startDate,
      endDate,
      cashbackLimit: isNoCashback ? null : r.limit,
    };
  });

  // 2. Identify affected categories
  const affectedCategoryIds: number[] = [];
  
  // Find changed or new
  for (const newRule of rulesToSave) {
      const old = oldRules.find(o => o.bankCategoryId === newRule.bankCategoryId);
      if (!old || old.percentage !== newRule.percentage || old.cashbackLimit !== newRule.cashbackLimit) {
          affectedCategoryIds.push(newRule.bankCategoryId);
      }
  }
  // Find removed
  for (const old of oldRules) {
      if (old.bankCategoryId && !rulesToSave.some(r => r.bankCategoryId === old.bankCategoryId)) {
          affectedCategoryIds.push(old.bankCategoryId);
      }
  }

  // 3. Update database
  await db.delete(userCashbackRules)
    .where(
      and(
        eq(userCashbackRules.userId, session.user.id),
        eq(userCashbackRules.loyaltyProgramId, loyaltyProgramId),
        eq(userCashbackRules.startDate, startDate),
        eq(userCashbackRules.endDate, endDate)
      )
    );

  await db.insert(userCashbackRules).values(rulesToSave);

  // 4. Find all user cards of this user that belong to this loyalty program
  const cards = await db
    .select({ id: userCards.id })
    .from(userCards)
    .innerJoin(bankCards, eq(userCards.bankCardId, bankCards.id))
    .where(
      and(
        eq(userCards.userId, session.user.id),
        eq(bankCards.loyaltyProgramId, loyaltyProgramId)
      )
    );

  // 5. Perform optimized recalculation for each card in parallel
  await Promise.all(cards.map(async (card) => {
    const [userCard] = await db.select({ limit: userCards.cashbackLimit }).from(userCards).where(eq(userCards.id, card.id)).limit(1);
    
    if (userCard?.limit !== null) {
        // Recalculate ALL for this month
        await bulkRecalculateTransactions(card.id, startDate, endDate);
    } else if (affectedCategoryIds.length > 0) {
        // Recalculate ONLY affected categories
        await bulkRecalculateTransactions(card.id, startDate, endDate, affectedCategoryIds);
    }
  }));

  revalidatePath("/cards");
  revalidatePath(`/cards/loyalty-programs/${loyaltyProgramId}`);
}

export async function copyRulesFromPreviousMonth(loyaltyProgramId: number, targetMonth: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const [year, month] = targetMonth.split("-").map(Number);
  
  // Calculate previous month
  const prevDate = new Date(year, month - 2, 1);
  const prevYearMonth = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, "0")}`;
  const prevStartDate = `${prevYearMonth}-01`;
  const prevLastDay = new Date(prevDate.getFullYear(), prevDate.getMonth() + 1, 0).getDate();
  const prevEndDate = `${prevYearMonth}-${String(prevLastDay).padStart(2, "0")}`;

  const prevRules = await db
    .select({
      id: userCashbackRules.id,
      bankCategoryId: userCashbackRules.bankCategoryId,
      percentage: userCashbackRules.percentage,
      tiers: userCashbackRules.tiers,
      cashbackLimit: userCashbackRules.cashbackLimit,
      categoryName: bankCategories.name
    })
    .from(userCashbackRules)
    .leftJoin(bankCategories, eq(userCashbackRules.bankCategoryId, bankCategories.id))
    .where(
      and(
        eq(userCashbackRules.userId, session.user.id),
        eq(userCashbackRules.loyaltyProgramId, loyaltyProgramId),
        eq(userCashbackRules.startDate, prevStartDate),
        eq(userCashbackRules.endDate, prevEndDate)
      )
    );

  if (prevRules.length === 0) throw new Error("No rules found in previous month");

  const targetStartDate = `${targetMonth}-01`;
  const targetLastDay = new Date(year, month, 0).getDate();
  const targetEndDate = `${targetMonth}-${String(targetLastDay).padStart(2, "0")}`;

  // Delete current target month rules first
  await db.delete(userCashbackRules)
    .where(
      and(
        eq(userCashbackRules.userId, session.user.id),
        eq(userCashbackRules.loyaltyProgramId, loyaltyProgramId),
        eq(userCashbackRules.startDate, targetStartDate),
        eq(userCashbackRules.endDate, targetEndDate)
      )
    );

  // Insert copied rules
  await db.insert(userCashbackRules).values(
    prevRules.map(r => ({
      userId: session.user.id!,
      loyaltyProgramId,
      bankCategoryId: r.bankCategoryId as number,
      percentage: r.categoryName === "Без кешбэка" ? 0 : r.percentage,
      tiers: r.categoryName === "Без кешбэка" ? "[]" : r.tiers,
      cashbackLimit: r.categoryName === "Без кешбэка" ? null : r.cashbackLimit,
      startDate: targetStartDate,
      endDate: targetEndDate
    }))
  );

  // Find all user cards of this user that belong to this loyalty program
  const cards = await db
    .select({ id: userCards.id })
    .from(userCards)
    .innerJoin(bankCards, eq(userCards.bankCardId, bankCards.id))
    .where(
      and(
        eq(userCards.userId, session.user.id),
        eq(bankCards.loyaltyProgramId, loyaltyProgramId)
      )
    );

  await Promise.all(cards.map(card => 
    recalculateTransactionsForUserCard(card.id, targetStartDate, targetEndDate)
  ));
  
  revalidatePath("/cards");
  revalidatePath(`/cards/loyalty-programs/${loyaltyProgramId}`);
}
