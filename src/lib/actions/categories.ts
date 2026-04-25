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
  const startDate = formData.get("startDate") as string || new Date().toISOString().split('T')[0];
  const endDate = formData.get("endDate") as string || null;

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
  
  if (name === "Без кешбэка") {
    finalPercentage = 0;
    finalTiers = "[]";
  }

  const [newCategory] = await db.insert(bankCategories).values({
    name,
    bankCardId,
    defaultPercentage: finalPercentage,
    roundingType,
    tiers: finalTiers,
    startDate,
    endDate: endDate || null,
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
          startDate: new Date().toISOString().split('T')[0]
        }))
      );
    }

    if (merchantIds.length > 0) {
      await db.insert(bankCategoryMerchant).values(
        merchantIds.map(merchantId => ({
          categoryId: newCategory.id,
          merchantId,
          startDate: new Date().toISOString().split('T')[0]
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

  if (category.name === "Без кешбэка") {
    finalPercentage = 0;
    finalTiers = "[]";
  }

  await db.update(bankCategories)
    .set({ defaultPercentage: finalPercentage, roundingType, tiers: finalTiers, startDate, endDate: endDate || null })
    .where(eq(bankCategories.id, id));

  await recalculateTransactionsForBankCard(bankCardId);
  revalidatePath(`/admin/bank-cards/${bankCardId}`);
}

import { eq } from "drizzle-orm";
