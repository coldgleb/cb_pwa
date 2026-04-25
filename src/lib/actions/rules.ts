"use server";

import { db } from "@/db";
import { userCashbackRules, bankCategories } from "@/db/schema";
import { auth } from "@/auth";
import { revalidatePath } from "next/cache";

import { and, eq, lte, gte, inArray } from "drizzle-orm";

export async function saveMonthlyRules(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const userCardId = parseInt(formData.get("userCardId") as string);
  const yearMonth = formData.get("month") as string; // Format: "YYYY-MM"
  
  if (isNaN(userCardId) || !yearMonth) throw new Error("Invalid data");

  const startDate = `${yearMonth}-01`;
  const [year, month] = yearMonth.split("-").map(Number);
  const lastDay = new Date(year, month, 0).getDate();
  const endDate = `${yearMonth}-${String(lastDay).padStart(2, "0")}`;

  const entries = Array.from(formData.entries());
  const categoryPercentages = entries
    .filter(([key]) => key.startsWith("cat_"))
    .map(([key, value]) => ({
      bankCategoryId: parseInt(key.replace("cat_", "")),
      percentage: parseFloat(value as string),
    }))
    .filter(r => !isNaN(r.bankCategoryId) && !isNaN(r.percentage));

  if (categoryPercentages.length === 0) return;

  const categoryIds = categoryPercentages.map(r => r.bankCategoryId);
  const categoriesData = await db
    .select({ id: bankCategories.id, tiers: bankCategories.tiers, name: bankCategories.name })
    .from(bankCategories)
    .where(inArray(bankCategories.id, categoryIds));

  const catsMap = new Map(categoriesData.map(c => [c.id, c]));

  const rulesToSave = categoryPercentages.map(r => {
    const cat = catsMap.get(r.bankCategoryId);
    const isNoCashback = cat?.name === "Без кешбэка";
    
    return {
      userCardId,
      bankCategoryId: r.bankCategoryId,
      percentage: isNoCashback ? 0 : r.percentage,
      tiers: isNoCashback ? "[]" : (cat?.tiers || "[]"),
      startDate,
      endDate
    };
  });

  // 1. Delete existing rules for this card in this period
  await db.delete(userCashbackRules)
    .where(
      and(
        eq(userCashbackRules.userCardId, userCardId),
        eq(userCashbackRules.startDate, startDate),
        eq(userCashbackRules.endDate, endDate)
      )
    );

  // 2. Insert new rules
  await db.insert(userCashbackRules).values(rulesToSave);

  revalidatePath(`/cards/${userCardId}`);
}

export async function copyRulesFromPreviousMonth(userCardId: number, targetMonth: string) {
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
      categoryName: bankCategories.name
    })
    .from(userCashbackRules)
    .leftJoin(bankCategories, eq(userCashbackRules.bankCategoryId, bankCategories.id))
    .where(
      and(
        eq(userCashbackRules.userCardId, userCardId),
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
        eq(userCashbackRules.userCardId, userCardId),
        eq(userCashbackRules.startDate, targetStartDate),
        eq(userCashbackRules.endDate, targetEndDate)
      )
    );

  // Insert copied rules
  await db.insert(userCashbackRules).values(
    prevRules.map(r => ({
      userCardId,
      bankCategoryId: r.bankCategoryId as number,
      percentage: r.categoryName === "Без кешбэка" ? 0 : r.percentage,
      tiers: r.categoryName === "Без кешбэка" ? "[]" : r.tiers,
      startDate: targetStartDate,
      endDate: targetEndDate
    }))
  );

  revalidatePath(`/cards/${userCardId}`);
}
