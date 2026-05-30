"use server";

import { db } from "@/db";
import { bankCategories, bankCategoryMcc, mccCodes, bankCategoryMerchant, bankCards, transactions, bankExclusions } from "@/db/schema";
import { auth } from "@/auth";
import { revalidatePath } from "next/cache";
import { eq, isNull, and, inArray } from "drizzle-orm";

import { recalculateTransactionsForBankCard } from "./transactions";

async function recalculateTransactionsForLoyaltyProgram(loyaltyProgramId: number) {
  const cards = await db
    .select({ id: bankCards.id })
    .from(bankCards)
    .where(eq(bankCards.loyaltyProgramId, loyaltyProgramId));
  for (const card of cards) {
    await recalculateTransactionsForBankCard(card.id);
  }
}

export async function createBankCategory(formData: FormData) {
  const session = await auth();
  if (session?.user?.role !== "admin") throw new Error("Unauthorized");

  const name = formData.get("name") as string;
  const loyaltyProgramId = parseInt(formData.get("loyaltyProgramId") as string);
  const defaultPercentage = parseFloat(formData.get("defaultPercentage") as string);
  const roundingType = formData.get("roundingType") as string || "inherit";
  const mccText = formData.get("mccText") as string || "";
  const tiersRaw = formData.get("tiers") as string || "[]";
  const merchantIdsRaw = formData.get("merchantIds") as string || "[]";
  const startDate = formData.get("startDate") as string || "2000-01-01";
  const endDate = formData.get("endDate") as string || null;
  const cashbackLimit = parseFloat(formData.get("cashbackLimit") as string) || null;

  if (!name || isNaN(loyaltyProgramId) || isNaN(defaultPercentage)) {
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
  if (name && name.toLowerCase().includes("без кешбэка") && !codes.includes("0000")) {
    codes.push("0000");
  }

  let finalTiers = tiers;
  let finalPercentage = defaultPercentage;
  let finalLimit = cashbackLimit;
  
  if (name && name.toLowerCase().includes("без кешбэка")) {
    finalPercentage = 0;
    finalTiers = "[]";
    finalLimit = null;
  }

  const [newCategory] = await db.insert(bankCategories).values({
    name,
    loyaltyProgramId,
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

  await recalculateTransactionsForLoyaltyProgram(loyaltyProgramId);
  revalidatePath(`/admin/loyalty-programs/${loyaltyProgramId}`);
}

export async function updateBankCategory(id: number, formData: FormData) {
  const session = await auth();
  if (session?.user?.role !== "admin") throw new Error("Unauthorized");

  const [category] = await db.select({ name: bankCategories.name }).from(bankCategories).where(eq(bankCategories.id, id)).limit(1);
  if (!category) throw new Error("Category not found");

  const name = formData.get("name") as string;
  const defaultPercentage = parseFloat(formData.get("defaultPercentage") as string);
  const roundingType = formData.get("roundingType") as string;
  const loyaltyProgramId = parseInt(formData.get("loyaltyProgramId") as string);
  const tiersRaw = formData.get("tiers") as string || "[]";
  const startDate = formData.get("startDate") as string;
  const endDate = formData.get("endDate") as string || null;
  const cashbackLimit = parseFloat(formData.get("cashbackLimit") as string) || null;

  if (isNaN(defaultPercentage) || isNaN(loyaltyProgramId)) throw new Error("Invalid data");

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

  if (category.name.toLowerCase().includes("без кешбэка") || (name && name.toLowerCase().includes("без кешбэка"))) {
    finalPercentage = 0;
    finalTiers = "[]";
    finalLimit = null;
  }

  await db.update(bankCategories)
    .set({ 
      name: name || category.name,
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

  // Sync MCCs if mccText is provided
  if (formData.has("mccText")) {
    const mccText = formData.get("mccText") as string;
    const newCodes = new Set(mccText.match(/\b\d{4}\b/g) || []);
    if ((category.name.toLowerCase().includes("без кешбэка") || (name && name.toLowerCase().includes("без кешбэка"))) && !newCodes.has("0000")) {
      newCodes.add("0000");
    }
    
    // Get current active MCCs
    const activeMccs = await db
      .select({ mccCode: bankCategoryMcc.mccCode })
      .from(bankCategoryMcc)
      .where(and(eq(bankCategoryMcc.categoryId, id), isNull(bankCategoryMcc.endDate)));
    
    const currentCodes = new Set(activeMccs.map(m => m.mccCode));
    const effectiveDate = startDate || "2000-01-01";
    const yesterday = new Date(new Date(effectiveDate).getTime() - 86400000).toISOString().split('T')[0];

    // Determine which to remove and which to add
    const toRemove = [...currentCodes].filter(code => !newCodes.has(code));
    const toAdd = [...newCodes].filter(code => !currentCodes.has(code));

    if (toRemove.length > 0) {
      await db.update(bankCategoryMcc)
        .set({ endDate: yesterday })
        .where(
          and(
            eq(bankCategoryMcc.categoryId, id),
            inArray(bankCategoryMcc.mccCode, toRemove),
            isNull(bankCategoryMcc.endDate)
          )
        );
    }

    if (toAdd.length > 0) {
      for (const code of toAdd) {
        await db.insert(mccCodes)
          .values({ code, description: "Добавлен автоматически" })
          .onConflictDoNothing();
          
        await db.insert(bankCategoryMcc).values({
          categoryId: id,
          mccCode: code,
          startDate: effectiveDate,
        });
      }
    }
  }

  await recalculateTransactionsForLoyaltyProgram(loyaltyProgramId);
  revalidatePath(`/admin/loyalty-programs/${loyaltyProgramId}`);
}

export async function duplicateBankCategory(id: number) {
  const session = await auth();
  if (session?.user?.role !== "admin") throw new Error("Unauthorized");

  const [category] = await db.select().from(bankCategories).where(eq(bankCategories.id, id)).limit(1);
  if (!category) throw new Error("Category not found");

  const today = new Date().toISOString().split('T')[0];

  // 1. Create new category
  const [newCategory] = await db.insert(bankCategories).values({
    loyaltyProgramId: category.loyaltyProgramId,
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

  await recalculateTransactionsForLoyaltyProgram(category.loyaltyProgramId);
  revalidatePath(`/admin/loyalty-programs/${category.loyaltyProgramId}`);
}

export async function deleteBankCategory(id: number) {
  const session = await auth();
  if (session?.user?.role !== "admin") throw new Error("Unauthorized");

  const [category] = await db.select({ loyaltyProgramId: bankCategories.loyaltyProgramId }).from(bankCategories).where(eq(bankCategories.id, id)).limit(1);
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

  await recalculateTransactionsForLoyaltyProgram(category.loyaltyProgramId);
  revalidatePath(`/admin/loyalty-programs/${category.loyaltyProgramId}`);
}


export async function addBankCardExclusion(bankCardId: number, mccCode: string) {
  const session = await auth();
  if (session?.user?.role !== "admin") throw new Error("Unauthorized");

  if (!mccCode || mccCode.length !== 4) throw new Error("Invalid MCC code");

  await db.insert(bankExclusions).values({
    bankCardId,
    mccCode,
  }).onConflictDoNothing();

  await recalculateTransactionsForBankCard(bankCardId);
  revalidatePath(`/admin/bank-cards/${bankCardId}`);
}

export async function removeBankCardExclusion(bankCardId: number, mccCode: string) {
  const session = await auth();
  if (session?.user?.role !== "admin") throw new Error("Unauthorized");

  await db.delete(bankExclusions).where(
    and(
      eq(bankExclusions.bankCardId, bankCardId),
      eq(bankExclusions.mccCode, mccCode)
    )
  );

  await recalculateTransactionsForBankCard(bankCardId);
  revalidatePath(`/admin/bank-cards/${bankCardId}`);
}
