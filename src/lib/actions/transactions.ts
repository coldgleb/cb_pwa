"use server";

import { db } from "@/db";
import { bankCardSettings, bankCards, transactions, userCards, bankCategories, bankCategoryMcc, bankCategoryMerchant, merchants, userCashbackRules } from "@/db/schema";
import { auth } from "@/auth";
import { revalidatePath } from "next/cache";
import { and, eq, lte, gte, sql, desc, or, isNull } from "drizzle-orm";

/**
 * Helper to calculate cashback for a single transaction.
 * logic:
 * 1. Find user card and its historical rounding rule for the given date.
 * 2. Find category for this MCC or Merchant, respecting historical dates.
 * 3. Calculate using the active rule or "На все покупки", applying tiers.
 */
async function calculateCashbackForTransaction(
  paidAmount: number,
  mccCode: string,
  merchantName: string,
  userCardId: number,
  dateStr: string
) {
  // 1. Find the card and its historical rounding setting for THIS date
  const [cardInfo] = await db
    .select({ bankCardId: userCards.bankCardId })
    .from(userCards)
    .where(eq(userCards.id, userCardId))
    .limit(1);

  if (!cardInfo) return { cashback: 0, categoryId: null };

  const [historicalSetting] = await db
    .select({ roundingType: bankCardSettings.roundingType })
    .from(bankCardSettings)
    .where(
      and(
        eq(bankCardSettings.bankCardId, cardInfo.bankCardId),
        lte(bankCardSettings.startDate, dateStr)
      )
    )
    .orderBy(desc(bankCardSettings.startDate))
    .limit(1);

  // Fallback to legacy field or default
  const cardRounding = historicalSetting?.roundingType || "no_rounding";

  // 2. Find category for this MCC OR Merchant
  // First try merchant mapping
  const [merchant] = await db.select({ id: merchants.id }).from(merchants).where(eq(merchants.name, merchantName)).limit(1);
  let mapping;

  if (merchant) {
    [mapping] = await db
      .select({ 
        categoryId: bankCategoryMerchant.categoryId,
        categoryRounding: bankCategories.roundingType
      })
      .from(bankCategoryMerchant)
      .innerJoin(bankCategories, eq(bankCategoryMerchant.categoryId, bankCategories.id))
      .where(
        and(
          eq(bankCategoryMerchant.merchantId, merchant.id),
          eq(bankCategories.bankCardId, cardInfo.bankCardId),
          lte(bankCategoryMerchant.startDate, dateStr),
          or(isNull(bankCategoryMerchant.endDate), gte(bankCategoryMerchant.endDate, dateStr)),
          // NEW: Filter by category validity too
          lte(bankCategories.startDate, dateStr),
          or(isNull(bankCategories.endDate), gte(bankCategories.endDate, dateStr))
        )
      )
      .limit(1);
  }

  // If not found by merchant, try MCC mapping
  if (!mapping) {
    [mapping] = await db
      .select({ 
        categoryId: bankCategoryMcc.categoryId,
        categoryRounding: bankCategories.roundingType
      })
      .from(bankCategoryMcc)
      .innerJoin(bankCategories, eq(bankCategoryMcc.categoryId, bankCategories.id))
      .where(
        and(
          eq(bankCategoryMcc.mccCode, mccCode),
          eq(bankCategories.bankCardId, cardInfo.bankCardId),
          lte(bankCategoryMcc.startDate, dateStr),
          or(isNull(bankCategoryMcc.endDate), gte(bankCategoryMcc.endDate, dateStr)),
          // NEW: Filter by category validity too
          lte(bankCategories.startDate, dateStr),
          or(isNull(bankCategories.endDate), gte(bankCategories.endDate, dateStr))
        )
      )
      .limit(1);
  }

  let categoryId = mapping?.categoryId || null;
  let categoryRounding = mapping?.categoryRounding || "inherit";
  let percentage = 0;
  let ruleTiers = "[]";

  // 2.5 Quick check for "Без кешбэка" (Exclusion)
  // If the MCC belongs to "Без кешбэка", it's always 0% regardless of other rules
  const [catDetails] = await db
    .select({ name: bankCategories.name })
    .from(bankCategories)
    .where(eq(bankCategories.id, categoryId || -1))
    .limit(1);
  
  if (catDetails?.name === "Без кешбэка") {
    return { cashback: 0, categoryId };
  }

  // 3. Find active rule (current month/period)
  const findRule = async (catId: number) => {
    return (await db
      .select({ percentage: userCashbackRules.percentage, tiers: userCashbackRules.tiers })
      .from(userCashbackRules)
      .where(
        and(
          eq(userCashbackRules.userCardId, userCardId),
          eq(userCashbackRules.bankCategoryId, catId),
          lte(userCashbackRules.startDate, dateStr),
          gte(userCashbackRules.endDate, dateStr)
        )
      )
      .limit(1))[0];
  };

  const getBaseCategory = async () => {
    return (await db
      .select({ id: bankCategories.id, roundingType: bankCategories.roundingType })
      .from(bankCategories)
      .where(
        and(
          eq(bankCategories.bankCardId, cardInfo.bankCardId), 
          eq(bankCategories.name, "Остальные покупки"),
          lte(bankCategories.startDate, dateStr),
          or(isNull(bankCategories.endDate), gte(bankCategories.endDate, dateStr))
        )
      )
      .limit(1))[0];
  };

  if (categoryId) {
    const rule = await findRule(categoryId);
    if (rule) {
      percentage = rule.percentage;
      ruleTiers = rule.tiers;
    } else {
      const base = await getBaseCategory();
      if (base) {
        const baseRule = await findRule(base.id);
        if (baseRule) {
          percentage = baseRule.percentage;
          ruleTiers = baseRule.tiers;
          categoryId = base.id;
          categoryRounding = base.roundingType;
        }
      }
    }
  } else {
    const base = await getBaseCategory();
    if (base) {
      const baseRule = await findRule(base.id);
      if (baseRule) {
        percentage = baseRule.percentage;
        ruleTiers = baseRule.tiers;
        categoryId = base.id;
        categoryRounding = base.roundingType;
      }
    }
  }

  // Evaluate tiers
  try {
    const parsedTiers = JSON.parse(ruleTiers);
    if (Array.isArray(parsedTiers) && parsedTiers.length > 0) {
      // Sort tiers descending by minAmount
      parsedTiers.sort((a, b) => b.minAmount - a.minAmount);
      const matchedTier = parsedTiers.find(t => paidAmount >= t.minAmount);
      if (matchedTier) {
        percentage = matchedTier.percentage;
      }
    }
  } catch (e) {
    // Keep fallback percentage
  }

  // 4. Calculate with rounding
  const finalRounding = categoryRounding === "inherit" ? cardRounding : categoryRounding;
  let finalCalcAmount = paidAmount;

  if (finalRounding === "amount_100_down") {
    finalCalcAmount = Math.floor(paidAmount / 100) * 100;
  }

  let calculatedCashback = (finalCalcAmount * percentage) / 100;

  if (finalRounding === "cashback_0_01_down") {
    calculatedCashback = Math.floor(calculatedCashback * 100) / 100;
  } else if (finalRounding === "cashback_1_down") {
    calculatedCashback = Math.floor(calculatedCashback);
  } else if (finalRounding === "halva") {
    if (calculatedCashback < 1) {
      calculatedCashback = Math.floor(calculatedCashback * 100) / 100;
    } else {
      calculatedCashback = Math.floor(calculatedCashback);
    }
  }

  return { cashback: calculatedCashback, categoryId };
}

import { ensureMerchantExists } from "./merchants";

export async function createTransaction(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const amount = parseFloat(formData.get("amount") as string);
  const paidAmountRaw = formData.get("paidAmount") as string;
  const paidAmount = paidAmountRaw ? parseFloat(paidAmountRaw) : amount;
  const manualAdjustment = parseFloat(formData.get("manualAdjustment") as string) || 0;
  const mccCode = formData.get("mccCode") as string;
  const merchantName = formData.get("merchantName") as string;
  const userCardId = parseInt(formData.get("userCardId") as string);
  const dateStr = formData.get("date") as string || new Date().toISOString().split('T')[0];
  const transactionDate = new Date(dateStr);

  if (isNaN(amount) || !merchantName || isNaN(userCardId)) {
    throw new Error("Invalid input data");
  }

  // Ensure merchant exists and get its details
  await ensureMerchantExists(merchantName);

  const { cashback, categoryId } = await calculateCashbackForTransaction(
    paidAmount,
    mccCode,
    merchantName,
    userCardId,
    dateStr
  );

  await db.insert(transactions).values({
    userId: session.user.id,
    userCardId,
    amount,
    paidAmount,
    transactionDate,
    merchantName,
    mccCode,
    calculatedCashback: cashback,
    manualCashbackAdjustment: manualAdjustment,
    categoryId,
  });

  revalidatePath("/");
  revalidatePath("/transactions");
}

export async function updateTransaction(id: number, formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const amount = parseFloat(formData.get("amount") as string);
  const paidAmountRaw = formData.get("paidAmount") as string;
  const paidAmount = paidAmountRaw ? parseFloat(paidAmountRaw) : amount;
  const manualAdjustment = parseFloat(formData.get("manualAdjustment") as string) || 0;
  const mccCode = formData.get("mccCode") as string;
  const merchantName = formData.get("merchantName") as string;
  const userCardId = parseInt(formData.get("userCardId") as string);
  const dateStr = formData.get("date") as string || new Date().toISOString().split('T')[0];
  const transactionDate = new Date(dateStr);

  // Ensure merchant exists
  await ensureMerchantExists(merchantName);

  const { cashback, categoryId } = await calculateCashbackForTransaction(
    paidAmount,
    mccCode,
    merchantName,
    userCardId,
    dateStr
  );

  await db.update(transactions)
    .set({
      userCardId,
      amount,
      paidAmount,
      transactionDate,
      merchantName,
      mccCode,
      calculatedCashback: cashback,
      manualCashbackAdjustment: manualAdjustment,
      categoryId,
    })
    .where(eq(transactions.id, id));

  revalidatePath("/");
  revalidatePath("/transactions");
}

export async function deleteTransaction(id: number) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  await db.delete(transactions).where(eq(transactions.id, id));

  revalidatePath("/");
  revalidatePath("/transactions");
}

export async function recalculateTransactionsForBankCard(bankCardId: number) {
  const affectedUserCards = await db
    .select({ id: userCards.id })
    .from(userCards)
    .where(eq(userCards.bankCardId, bankCardId));
  
  if (affectedUserCards.length === 0) return;
  const userCardIds = affectedUserCards.map(c => c.id);

  const allAffectedTransactions = await db
    .select({
      id: transactions.id,
      paidAmount: transactions.paidAmount,
      amount: transactions.amount,
      mccCode: transactions.mccCode,
      merchantName: transactions.merchantName,
      userCardId: transactions.userCardId,
      transactionDate: transactions.transactionDate
    })
    .from(transactions)
    .where(sql`${transactions.userCardId} IN (${sql.join(userCardIds, sql`, `)})`);

  for (const tx of allAffectedTransactions) {
    const paid = tx.paidAmount || tx.amount;
    const dateStr = tx.transactionDate.toISOString().split('T')[0];
    const { cashback, categoryId } = await calculateCashbackForTransaction(
      paid,
      tx.mccCode || "",
      tx.merchantName,
      tx.userCardId,
      dateStr
    );

    await db.update(transactions)
      .set({ calculatedCashback: cashback, categoryId })
      .where(eq(transactions.id, tx.id));
  }
}
