"use server";

import { db } from "@/db";
import { bankCategories, bankCategoryMcc, mccCodes, bankCategoryMerchant } from "@/db/schema";
import { auth } from "@/auth";
import { revalidatePath } from "next/cache";

import { recalculateTransactionsForBankCard } from "./transactions";

export async function createBankCategory(formData: FormData) {
  const session = await auth();
  if (session?.user?.role !== "admin") throw new Error("Unauthorized");

  const name = formData.get("name") as string;
  const bankCardId = parseInt(formData.get("bankCardId") as string);
  const defaultPercentage = parseFloat(formData.get("defaultPercentage") as string);
  const roundingType = formData.get("roundingType") as string || "inherit";
  const mccText = formData.get("mccText") as string || "";
  const tiersRaw = formData.get("tiers") as string || "[]";
  const merchantIdsRaw = formData.get("merchantIds") as string || "[]";
  const startDate = formData.get("startDate") as string || "2000-01-01";
  const endDate = formData.get("endDate") as string || null;
  const cashbackLimit = parseFloat(formData.get("cashbackLimit") as string) || null;

  if (!name || isNaN(bankCardId) || isNaN(defaultPercentage)) {
    throw new Error("Invalid data");
  }

  let tiers = "[]";
  try {
    const parsed = JSON.parse(tiersRaw);
    if (Array.isArray(parsed)) {
      tiers = JSON.stringify(parsed);
    }
  } catch (e) {
    // fallback
  }

  let merchantIds: number[] = [];
  try {
    const parsed = JSON.parse(merchantIdsRaw);
    if (Array.isArray(parsed)) {
      merchantIds = parsed.map(Number).filter(n => !isNaN(n));
    }
  } catch (e) {
    // fallback
  }

  // Parse MCC codes using regex (any 4-digit number)
  const codes = [...new Set(mccText.match(/\b\d{4}\b/g) || [])];

  let finalTiers = tiers;
  let finalPercentage = defaultPercentage;
  let finalLimit = cashbackLimit;
  
  if (name === "Без кешбэка") {
    finalPercentage = 0;
    finalTiers = "[]";
    finalLimit = null;
  }

  const [newCategory] = await db.insert(bankCategories).values({
    name,
    bankCardId,
    defaultPercentage: finalPercentage,
    roundingType,
    tiers: finalTiers,
    startDate,
    endDate: endDate || null,
    cashbackLimit: finalLimit,
  }).returning();

  if (newCategory) {
    if (codes.length > 0) {
      for (const code of codes) {
        await db.insert(mccCodes)
          .values({ code, description: "Добавлен автоматически" })
          .onConflictDoNothing();
      }

      await db.insert(bankCategoryMcc).values(
        codes.map(code => ({
          categoryId: newCategory.id,
          mccCode: code,
          startDate: startDate
        }))
      );
    }

    if (merchantIds.length > 0) {
      await db.insert(bankCategoryMerchant).values(
        merchantIds.map(merchantId => ({
          categoryId: newCategory.id,
          merchantId,
          startDate: startDate
        }))
      );
    }
  }

  await recalculateTransactionsForBankCard(bankCardId);
  revalidatePath(`/admin/bank-cards/${bankCardId}`);
}

export async function updateBankCategory(id: number, formData: FormData) {
  const session = await auth();
  if (session?.user?.role !== "admin") throw new Error("Unauthorized");

  const [category] = await db.select({ name: bankCategories.name }).from(bankCategories).where(eq(bankCategories.id, id)).limit(1);
  if (!category) throw new Error("Category not found");

  const defaultPercentage = parseFloat(formData.get("defaultPercentage") as string);
  const roundingType = formData.get("roundingType") as string;
  const bankCardId = parseInt(formData.get("bankCardId") as string);
  const tiersRaw = formData.get("tiers") as string || "[]";
  const startDate = formData.get("startDate") as string;
  const endDate = formData.get("endDate") as string || null;
  const cashbackLimit = parseFloat(formData.get("cashbackLimit") as string) || null;

  if (isNaN(defaultPercentage)) throw new Error("Invalid data");

  let tiers = "[]";
  try {
    const parsed = JSON.parse(tiersRaw);
    if (Array.isArray(parsed)) {
      tiers = JSON.stringify(parsed);
    }
  } catch (e) {
    // fallback
  }

  let finalPercentage = defaultPercentage;
  let finalTiers = tiers;
  let finalLimit = cashbackLimit;

  if (category.name === "Без кешбэка") {
    finalPercentage = 0;
    finalTiers = "[]";
    finalLimit = null;
  }

  await db.update(bankCategories)
    .set({ 
      defaultPercentage: finalPercentage, 
      roundingType, 
      tiers: finalTiers, 
      startDate, 
      endDate: endDate || null,
      cashbackLimit: finalLimit
    })
    .where(eq(bankCategories.id, id));

  // Propagate startDate to active links
  await db.update(bankCategoryMerchant)
    .set({ startDate })
    .where(and(eq(bankCategoryMerchant.categoryId, id), isNull(bankCategoryMerchant.endDate)));

  await db.update(bankCategoryMcc)
    .set({ startDate })
    .where(and(eq(bankCategoryMcc.categoryId, id), isNull(bankCategoryMcc.endDate)));

  await recalculateTransactionsForBankCard(bankCardId);
  revalidatePath(`/admin/bank-cards/${bankCardId}`);
}

export async function duplicateBankCategory(id: number) {
  const session = await auth();
  if (session?.user?.role !== "admin") throw new Error("Unauthorized");

  const [category] = await db.select().from(bankCategories).where(eq(bankCategories.id, id)).limit(1);
  if (!category) throw new Error("Category not found");

  const today = new Date().toISOString().split('T')[0];

  // 1. Create new category
  const [newCategory] = await db.insert(bankCategories).values({
    bankCardId: category.bankCardId,
    name: `${category.name} (Копия)`,
    defaultPercentage: category.defaultPercentage,
    tiers: category.tiers,
    roundingType: category.roundingType,
    startDate: today,
    endDate: null,
    cashbackLimit: category.cashbackLimit,
  }).returning();

  if (!newCategory) throw new Error("Failed to create duplicate category");

  // 2. Copy active MCCs
  const activeMccs = await db
    .select()
    .from(bankCategoryMcc)
    .where(
      and(
        eq(bankCategoryMcc.categoryId, category.id),
        isNull(bankCategoryMcc.endDate)
      )
    );

  if (activeMccs.length > 0) {
    await db.insert(bankCategoryMcc).values(
      activeMccs.map(m => ({
        categoryId: newCategory.id,
        mccCode: m.mccCode,
        startDate: today,
      }))
    );
  }

  // 3. Copy active Merchants
  const activeMerchants = await db
    .select()
    .from(bankCategoryMerchant)
    .where(
      and(
        eq(bankCategoryMerchant.categoryId, category.id),
        isNull(bankCategoryMerchant.endDate)
      )
    );

  if (activeMerchants.length > 0) {
    await db.insert(bankCategoryMerchant).values(
      activeMerchants.map(m => ({
        categoryId: newCategory.id,
        merchantId: m.merchantId,
        startDate: today,
      }))
    );
  }

  await recalculateTransactionsForBankCard(category.bankCardId);
  revalidatePath(`/admin/bank-cards/${category.bankCardId}`);
}

export async function deleteBankCategory(id: number) {
  const session = await auth();
  if (session?.user?.role !== "admin") throw new Error("Unauthorized");

  const [category] = await db.select({ bankCardId: bankCategories.bankCardId }).from(bankCategories).where(eq(bankCategories.id, id)).limit(1);
  if (!category) throw new Error("Category not found");

  // 1. Delete associated MCC links
  await db.delete(bankCategoryMcc).where(eq(bankCategoryMcc.categoryId, id));

  // 2. Delete associated Merchant links
  await db.delete(bankCategoryMerchant).where(eq(bankCategoryMerchant.categoryId, id));

  // 3. Reset categoryId in transactions (historical data stays, but link is broken)
  await db.update(transactions)
    .set({ categoryId: null })
    .where(eq(transactions.categoryId, id));

  // 4. Delete the category itself
  await db.delete(bankCategories).where(eq(bankCategories.id, id));

  await recalculateTransactionsForBankCard(category.bankCardId);
  revalidatePath(`/admin/bank-cards/${category.bankCardId}`);
}

import { eq, isNull, and } from "drizzle-orm";
import { transactions, bankExclusions, bankCards } from "@/db/schema";

export async function addBankCardExclusion(bankCardId: number, mccCode: string) {
  const session = await auth();
  if (session?.user?.role !== "admin") throw new Error("Unauthorized");

  if (!mccCode || mccCode.length !== 4) throw new Error("Invalid MCC code");

  const [card] = await db.select({ bankId: bankCards.bankId }).from(bankCards).where(eq(bankCards.id, bankCardId)).limit(1);
  if (!card) throw new Error("Bank card not found");

  await db.insert(bankExclusions).values({
    bankId: card.bankId,
    mccCode,
  }).onConflictDoNothing();

  await recalculateTransactionsForBankCard(bankCardId);
  revalidatePath(`/admin/bank-cards/${bankCardId}`);
}

export async function removeBankCardExclusion(bankCardId: number, mccCode: string) {
  const session = await auth();
  if (session?.user?.role !== "admin") throw new Error("Unauthorized");

  const [card] = await db.select({ bankId: bankCards.bankId }).from(bankCards).where(eq(bankCards.id, bankCardId)).limit(1);
  if (!card) throw new Error("Bank card not found");

  await db.delete(bankExclusions).where(
    and(
      eq(bankExclusions.bankId, card.bankId),
      eq(bankExclusions.mccCode, mccCode)
    )
  );

  await recalculateTransactionsForBankCard(bankCardId);
  revalidatePath(`/admin/bank-cards/${bankCardId}`);
}
