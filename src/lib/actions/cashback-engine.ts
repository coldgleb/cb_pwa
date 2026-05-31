"use server";

import { db } from "@/db";
import { 
  bankCards, 
  transactions, 
  userCards, 
  bankCategories, 
  bankCategoryMcc, 
  bankCategoryMerchant, 
  merchants, 
  userCashbackRules, 
  bankExclusions,
  users,
  banks,
  loyaltyPrograms,
  loyaltyProgramSettings
} from "@/db/schema";
import { and, eq, lte, gte, sql, desc, or, isNull, inArray, asc } from "drizzle-orm";

/**
 * Helper to get YYYY-MM-DD in local time
 */
const toLocalDateStr = (date: Date) => {
  const offset = date.getTimezoneOffset();
  const localDate = new Date(date.getTime() - (offset * 60 * 1000));
  return localDate.toISOString().split('T')[0];
};

/**
 * Optimized engine for bulk recalculations.
 */
export async function bulkRecalculateTransactions(
  userCardId: number, 
  startDateStr: string, 
  endDateStr: string,
  onlyCategoryIds?: number[]
) {
  console.time("BulkRecalc");

  // 1. Fetch UserCard, Bank and Loyalty Program info
  const [cardInfo] = await db
    .select({ 
      bankCardId: userCards.bankCardId,
      userId: userCards.userId,
      globalLimit: userCards.cashbackLimit,
      bankId: bankCards.bankId,
      loyaltyProgramId: bankCards.loyaltyProgramId,
      programRounding: loyaltyPrograms.roundingType,
    })
    .from(userCards)
    .innerJoin(bankCards, eq(userCards.bankCardId, bankCards.id))
    .leftJoin(loyaltyPrograms, eq(bankCards.loyaltyProgramId, loyaltyPrograms.id))
    .where(eq(userCards.id, userCardId))
    .limit(1);

  if (!cardInfo) return 0;

  const loyaltyProgramId = cardInfo.loyaltyProgramId;
  if (!loyaltyProgramId) return 0;

  // 2. Fetch all required data for the card in bulk
  const [
    allCategories,
    allMccMappings,
    allMerchantMappings,
    allExclusions,
    allHistoricalSettings,
    allUserRules,
    allMerchants
  ] = await Promise.all([
    db.select().from(bankCategories).where(eq(bankCategories.loyaltyProgramId, loyaltyProgramId)),
    db.select().from(bankCategoryMcc).innerJoin(bankCategories, eq(bankCategoryMcc.categoryId, bankCategories.id)).where(eq(bankCategories.loyaltyProgramId, loyaltyProgramId)),
    db.select().from(bankCategoryMerchant).innerJoin(bankCategories, eq(bankCategoryMerchant.categoryId, bankCategories.id)).where(eq(bankCategories.loyaltyProgramId, loyaltyProgramId)),
    db.select().from(bankExclusions).where(eq(bankExclusions.bankCardId, cardInfo.bankCardId)),
    db.select().from(loyaltyProgramSettings).where(eq(loyaltyProgramSettings.loyaltyProgramId, loyaltyProgramId)).orderBy(desc(loyaltyProgramSettings.startDate)),
    db.select().from(userCashbackRules).where(and(eq(userCashbackRules.userId, cardInfo.userId), eq(userCashbackRules.loyaltyProgramId, loyaltyProgramId), lte(userCashbackRules.startDate, endDateStr), gte(userCashbackRules.endDate, startDateStr))),
    db.select().from(merchants)
  ]);

  // 3. Fetch Transactions to recalculate
  const conditions = [
    eq(transactions.userCardId, userCardId),
    eq(transactions.userId, cardInfo.userId),
    eq(transactions.type, "expense"),
    gte(transactions.transactionDate, new Date(startDateStr)),
    lte(transactions.transactionDate, new Date(endDateStr + "T23:59:59.999Z"))
  ];

  if (onlyCategoryIds && onlyCategoryIds.length > 0) {
      conditions.push(inArray(transactions.categoryId, onlyCategoryIds));
  }

  const txToRecalc = await db
    .select()
    .from(transactions)
    .where(and(...conditions))
    .orderBy(asc(transactions.transactionDate));

  if (txToRecalc.length === 0) return 0;

  // Use Map for faster lookup
  const userRulesMap = new Map(allUserRules.map(r => [r.bankCategoryId, r]));
  const userMerchantRulesMap = new Map(allUserRules.filter(r => r.merchantId).map(r => [r.merchantId, r]));

  // Track running totals for month for tiers/limits
  const monthlyCardSpent = new Map<string, number>(); // month -> amount
  const monthlyCategorySpent = new Map<string, number>(); // month-categoryId -> amount
  const monthlyCardCashback = new Map<string, number>(); // month -> amount
  const monthlyCategoryCashback = new Map<string, number>(); // month-categoryId -> amount

  const updates = [];

  for (const tx of txToRecalc) {
      const txDate = new Date(tx.transactionDate);
      const yearMonth = `${txDate.getFullYear()}-${String(txDate.getMonth() + 1).padStart(2, '0')}`;
      const txDateStr = toLocalDateStr(txDate);
      const paidAmount = tx.paidAmount || tx.amount;
      const mcc = tx.mccCode || "0000";
      const merchantName = tx.merchantName;

      // A. Check Exclusions
      const isExcluded = allExclusions.some(e => e.mccCode === mcc);
      if (isExcluded) {
          updates.push({ id: tx.id, calculatedCashback: 0, cashbackPercentage: 0, categoryId: null });
          continue;
      }

      // B. Find Merchant
      const merchant = merchantName ? allMerchants.find(m => m.name === merchantName) : null;
      
      // C. Match Rule
      let matchingRule: any = null;
      
      // 1. Direct Merchant Rule
      if (merchant) {
          matchingRule = userMerchantRulesMap.get(merchant.id);
      }

      // 2. MCC mapping
      if (!matchingRule) {
          const eligibleCatIds = allMccMappings
            .filter(m => m.bank_category_mcc.mccCode === mcc && m.bank_category_mcc.startDate <= txDateStr && (!m.bank_category_mcc.endDate || m.bank_category_mcc.endDate >= txDateStr))
            .map(m => m.bank_category_mcc.categoryId);
          
          matchingRule = allUserRules.find(r => r.bankCategoryId && eligibleCatIds.includes(r.bankCategoryId));
      }

      // 3. Merchant mapping
      if (!matchingRule && merchant) {
          const eligibleCatIds = allMerchantMappings
            .filter(m => m.bank_category_merchant.merchantId === merchant.id && m.bank_category_merchant.startDate <= txDateStr && (!m.bank_category_merchant.endDate || m.bank_category_merchant.endDate >= txDateStr))
            .map(m => m.bank_category_merchant.categoryId);
          
          matchingRule = allUserRules.find(r => r.bankCategoryId && eligibleCatIds.includes(r.bankCategoryId));
      }

      // 4. Base Fallback
      if (!matchingRule) {
          const baseCat = allCategories.find(c => c.name === "Остальные покупки");
          if (baseCat) {
              matchingRule = userRulesMap.get(baseCat.id);
          }
      }

      if (!matchingRule) {
          updates.push({ id: tx.id, calculatedCashback: 0, cashbackPercentage: 0, categoryId: null });
          continue;
      }

      const { bankCategoryId: categoryId, percentage, tiers, cashbackLimit: catLimit } = matchingRule;
      const tiersList = JSON.parse(tiers || "[]");

      // D. Calculate with Tiers
      const catKey = `${yearMonth}-${categoryId}`;
      const currentCatSpent = monthlyCategorySpent.get(catKey) || 0;
      const currentCardSpent = monthlyCardSpent.get(yearMonth) || 0;

      let nominalPercentage = percentage;
      if (tiersList.length > 0) {
          const sortedTiers = [...tiersList].sort((a, b) => b.from - a.from);
          const tier = sortedTiers.find(t => currentCardSpent >= t.from);
          if (tier) nominalPercentage = tier.percentage;
      }

      let rawCashback = (paidAmount * nominalPercentage) / 100;

      // F. Rounding
      const histSetting = allHistoricalSettings.find(s => s.startDate <= txDateStr);
      const cardRounding = histSetting?.roundingType || "no_rounding";
      const programRounding = (cardInfo.programRounding && cardInfo.programRounding !== "no_rounding") 
        ? cardInfo.programRounding 
        : cardRounding;
        
      const category = allCategories.find(c => c.id === categoryId);
      const categoryRounding = category?.roundingType || "inherit";
      const finalRounding = (categoryRounding === "inherit" || !categoryRounding) ? programRounding : categoryRounding;

      let finalCashback = applyRounding(rawCashback, paidAmount, finalRounding);

      // G. Apply Limits
      const globalLimit = cardInfo.globalLimit;
      const currentCardCashback = monthlyCardCashback.get(yearMonth) || 0;
      const currentCatCashback = monthlyCategoryCashback.get(catKey) || 0;

      if (catLimit !== null) {
          const remainingCat = Math.max(0, catLimit - currentCatCashback);
          finalCashback = Math.min(finalCashback, remainingCat);
      }
      if (globalLimit !== null) {
          const remainingGlobal = Math.max(0, globalLimit - currentCardCashback);
          finalCashback = Math.min(finalCashback, remainingGlobal);
      }

      // H. Update counters
      monthlyCardSpent.set(yearMonth, currentCardSpent + paidAmount);
      monthlyCategorySpent.set(catKey, currentCatSpent + paidAmount);
      monthlyCardCashback.set(yearMonth, currentCardCashback + finalCashback);
      monthlyCategoryCashback.set(catKey, currentCatCashback + finalCashback);

      updates.push({
          id: tx.id,
          calculatedCashback: finalCashback,
          cashbackPercentage: nominalPercentage,
          categoryId: categoryId,
      });
  }

  // 4. Batch update database
  for (const update of updates) {
      await db.update(transactions).set(update).where(eq(transactions.id, update.id));
  }

  console.timeEnd("BulkRecalc");
  return updates.length;
}

export async function calculateCashbackForTransaction(
  paidAmount: number,
  mccCode: string,
  merchantName: string | null | undefined,
  userCardId: number,
  dateStr: string,
  excludeTxId?: number
) {
  const normalizedMcc = mccCode || "0000";

  // 1. Parallelize all independent metadata fetches
  const [
    cardInfoData,
    historicalRoundingData,
    userRulesData,
    bankExclusionsData,
    merchantData
  ] = await Promise.all([
    db.select({ 
      bankCardId: userCards.bankCardId,
      userId: userCards.userId,
      globalLimit: userCards.cashbackLimit,
      bankId: bankCards.bankId,
      loyaltyProgramId: bankCards.loyaltyProgramId,
      programRounding: loyaltyPrograms.roundingType,
    })
    .from(userCards)
    .innerJoin(bankCards, eq(userCards.bankCardId, bankCards.id))
    .leftJoin(loyaltyPrograms, eq(bankCards.loyaltyProgramId, loyaltyPrograms.id))
    .where(eq(userCards.id, userCardId))
    .limit(1),

    // Fetch historical rounding setting
    db.select({ roundingType: loyaltyProgramSettings.roundingType })
    .from(loyaltyProgramSettings)
    .innerJoin(userCards, eq(userCards.id, userCardId))
    .innerJoin(bankCards, eq(userCards.bankCardId, bankCards.id))
    .where(
      and(
        eq(loyaltyProgramSettings.loyaltyProgramId, bankCards.loyaltyProgramId),
        lte(loyaltyProgramSettings.startDate, dateStr)
      )
    )
    .orderBy(desc(loyaltyProgramSettings.startDate))
    .limit(1),

    // Fetch user rules
    db.select({
      bankCategoryId: userCashbackRules.bankCategoryId,
      percentage: userCashbackRules.percentage,
      tiers: userCashbackRules.tiers,
      cashbackLimit: userCashbackRules.cashbackLimit,
      merchantId: userCashbackRules.merchantId,
    })
    .from(userCashbackRules)
    .innerJoin(userCards, eq(userCards.id, userCardId))
    .innerJoin(bankCards, eq(userCards.bankCardId, bankCards.id))
    .where(
      and(
        eq(userCashbackRules.userId, userCards.userId),
        eq(userCashbackRules.loyaltyProgramId, bankCards.loyaltyProgramId),
        lte(userCashbackRules.startDate, dateStr),
        gte(userCashbackRules.endDate, dateStr)
      )
    ),

    // Fetch exclusions
    db.select({ mccCode: bankExclusions.mccCode })
    .from(bankExclusions)
    .innerJoin(userCards, eq(userCards.id, userCardId))
    .where(eq(bankExclusions.bankCardId, userCards.bankCardId)),

    // Fetch merchant if name provided
    merchantName ? db.select().from(merchants).where(eq(merchants.name, merchantName)).limit(1) : Promise.resolve([])
  ]);

  const [cardInfo] = cardInfoData;
  if (!cardInfo) return { cashback: 0, categoryId: null, nominalPercentage: 0 };

  const [historicalSetting] = historicalRoundingData;
  const allUserRules = userRulesData;
  const isExcluded = bankExclusionsData.some(e => e.mccCode === normalizedMcc);
  const [merchant] = merchantData as any[];

  if (isExcluded) return { cashback: 0, categoryId: null, nominalPercentage: 0 };

  const loyaltyProgramId = cardInfo.loyaltyProgramId;
  const cardRounding = historicalSetting?.roundingType || cardInfo.programRounding || "no_rounding";

  // 2. Fetch specific category mappings in parallel
  const [mccMappings, merchantMappings] = await Promise.all([
    db.select({ categoryId: bankCategoryMcc.categoryId })
      .from(bankCategoryMcc)
      .where(
        and(
          eq(bankCategoryMcc.mccCode, normalizedMcc),
          lte(bankCategoryMcc.startDate, dateStr),
          or(isNull(bankCategoryMcc.endDate), gte(bankCategoryMcc.endDate, dateStr))
        )
      ),
    merchant ? 
      db.select({ categoryId: bankCategoryMerchant.categoryId })
        .from(bankCategoryMerchant)
        .where(
          and(
            eq(bankCategoryMerchant.merchantId, merchant.id),
            lte(bankCategoryMerchant.startDate, dateStr),
            or(isNull(bankCategoryMerchant.endDate), gte(bankCategoryMerchant.endDate, dateStr))
          )
        ) : Promise.resolve([])
  ]);

  const eligibleCategoryIds = new Set([
    ...mccMappings.map(m => m.categoryId),
    ...merchantMappings.map(m => m.categoryId)
  ]);

  // Find rules matching eligible categories or matching merchant directly
  let matchingRule = allUserRules.find(r => 
    (r.merchantId && merchant && r.merchantId === merchant.id) ||
    (r.bankCategoryId && eligibleCategoryIds.has(r.bankCategoryId))
  );

  // 3. Fallback to base category if no specific rule found
  if (!matchingRule) {
    const baseCategory = await db.select({ id: bankCategories.id })
      .from(bankCategories)
      .where(
        and(
          eq(bankCategories.loyaltyProgramId, loyaltyProgramId!),
          eq(bankCategories.name, "Остальные покупки")
        )
      )
      .limit(1);
    
    if (baseCategory[0]) {
      matchingRule = allUserRules.find(r => r.bankCategoryId === baseCategory[0].id);
    }
  }

  if (!matchingRule) return { cashback: 0, categoryId: null, nominalPercentage: 0 };

  const { bankCategoryId: categoryId, percentage, tiers, cashbackLimit: catLimit } = matchingRule;
  const tiersList = JSON.parse(tiers || "[]");

  // 4. Calculate total spent in this category/card for tiers/limits
  const [categorySpent, cardSpent] = await Promise.all([
     categoryId ? getCategorySpentForMonth(userCardId, categoryId, dateStr, excludeTxId) : Promise.resolve(0),
     getCardSpentForMonth(userCardId, dateStr, excludeTxId)
  ]);

  let nominalPercentage = percentage;
  if (tiersList.length > 0) {
    const sortedTiers = [...tiersList].sort((a, b) => b.from - a.from);
    const tier = sortedTiers.find(t => cardSpent >= t.from);
    if (tier) nominalPercentage = tier.percentage;
  }

  let rawCashback = (paidAmount * nominalPercentage) / 100;

  // 7. Applying Rounding
  const category = categoryId ? await db.select({ roundingType: bankCategories.roundingType }).from(bankCategories).where(eq(bankCategories.id, categoryId)).limit(1) : [];
  const categoryRounding = category[0]?.roundingType || "inherit";
  const finalRounding = categoryRounding === "inherit" ? cardRounding : categoryRounding;

  let finalCashback = applyRounding(rawCashback, paidAmount, finalRounding);

  // 8. Apply Limits
  const currentCardCashback = await getCardCashbackForMonth(userCardId, dateStr, excludeTxId);
  const globalLimit = cardInfo.globalLimit;

  if (catLimit !== null) {
    const currentCatCashback = await getCategoryCashbackForMonth(userCardId, categoryId!, dateStr, excludeTxId);
    const remainingCat = Math.max(0, catLimit - currentCatCashback);
    finalCashback = Math.min(finalCashback, remainingCat);
  }

  if (globalLimit !== null) {
    const remainingGlobal = Math.max(0, globalLimit - currentCardCashback);
    finalCashback = Math.min(finalCashback, remainingGlobal);
  }

  return { 
    cashback: finalCashback, 
    categoryId, 
    nominalPercentage 
  };
}

function applyRounding(cashback: number, amount: number, type: string): number {
  switch (type) {
    case "amount_100_down":
      return (Math.floor(amount / 100) * 100 * (cashback / amount));
    case "cashback_0_01_down":
      return Math.floor(cashback * 100) / 100;
    case "cashback_0_01_math":
      return Math.round(cashback * 100) / 100;
    case "cashback_1_down":
      return Math.floor(cashback);
    case "cashback_1_math":
      return Math.round(cashback);
    case "halva":
      if (cashback < 1) return Math.floor(cashback * 100) / 100;
      return Math.floor(cashback);
    default:
      return Math.round(cashback * 100) / 100;
  }
}

// Optimized helper queries for spent/cashback totals
async function getCategorySpentForMonth(userCardId: number, categoryId: number, dateStr: string, excludeTxId?: number) {
  const [year, month] = dateStr.split("-").map(Number);
  const start = new Date(year, month - 1, 1).getTime();
  const end = new Date(year, month, 0, 23, 59, 59, 999).getTime();

  const [res] = await db
    .select({ total: sql<number>`sum(${transactions.amount})` })
    .from(transactions)
    .where(
      and(
        eq(transactions.userCardId, userCardId),
        eq(transactions.categoryId, categoryId),
        gte(transactions.transactionDate, new Date(start)),
        lte(transactions.transactionDate, new Date(end)),
        excludeTxId ? sql`${transactions.id} != ${excludeTxId}` : sql`1=1`
      )
    );
  return Number(res?.total) || 0;
}

async function getCardSpentForMonth(userCardId: number, dateStr: string, excludeTxId?: number) {
  const [year, month] = dateStr.split("-").map(Number);
  const start = new Date(year, month - 1, 1).getTime();
  const end = new Date(year, month, 0, 23, 59, 59, 999).getTime();

  const [res] = await db
    .select({ total: sql<number>`sum(${transactions.amount})` })
    .from(transactions)
    .where(
      and(
        eq(transactions.userCardId, userCardId),
        gte(transactions.transactionDate, new Date(start)),
        lte(transactions.transactionDate, new Date(end)),
        excludeTxId ? sql`${transactions.id} != ${excludeTxId}` : sql`1=1`
      )
    );
  return Number(res?.total) || 0;
}

async function getCardCashbackForMonth(userCardId: number, dateStr: string, excludeTxId?: number) {
  const [year, month] = dateStr.split("-").map(Number);
  const start = new Date(year, month - 1, 1).getTime();
  const end = new Date(year, month, 0, 23, 59, 59, 999).getTime();

  const [res] = await db
    .select({ total: sql<number>`sum(${transactions.calculatedCashback})` })
    .from(transactions)
    .where(
      and(
        eq(transactions.userCardId, userCardId),
        gte(transactions.transactionDate, new Date(start)),
        lte(transactions.transactionDate, new Date(end)),
        excludeTxId ? sql`${transactions.id} != ${excludeTxId}` : sql`1=1`
      )
    );
  return Number(res?.total) || 0;
}

async function getCategoryCashbackForMonth(userCardId: number, categoryId: number, dateStr: string, excludeTxId?: number) {
  const [year, month] = dateStr.split("-").map(Number);
  const start = new Date(year, month - 1, 1).getTime();
  const end = new Date(year, month, 0, 23, 59, 59, 999).getTime();

  const [res] = await db
    .select({ total: sql<number>`sum(${transactions.calculatedCashback})` })
    .from(transactions)
    .where(
      and(
        eq(transactions.userCardId, userCardId),
        eq(transactions.categoryId, categoryId),
        gte(transactions.transactionDate, new Date(start)),
        lte(transactions.transactionDate, new Date(end)),
        excludeTxId ? sql`${transactions.id} != ${excludeTxId}` : sql`1=1`
      )
    );
  return Number(res?.total) || 0;
}

export async function recalculateTransactionsForUserCard(userCardId: number, startDate?: string, endDate?: string) {
    const start = startDate || "2000-01-01";
    const end = endDate || "2100-12-31";
    return bulkRecalculateTransactions(userCardId, start, end);
}

export async function recalculateTransactionsForBankCard(bankCardId: number) {
  const userCardsList = await db.select({ id: userCards.id }).from(userCards).where(eq(userCards.bankCardId, bankCardId));
  for (const uc of userCardsList) {
    await recalculateTransactionsForUserCard(uc.id);
  }
}

export async function recalculateTransactionsForBank(bankId: number) {
  const cards = await db.select({ id: bankCards.id }).from(bankCards).where(eq(bankCards.bankId, bankId));
  for (const card of cards) {
    await recalculateTransactionsForBankCard(card.id);
  }
}

export async function getAllUserCards() {
  return db
    .select({ 
      id: userCards.id,
      cardName: bankCards.name,
      bankName: banks.name,
      userName: users.name,
      txCount: sql<number>`(select count(*) from ${transactions} where ${transactions.userCardId} = ${userCards.id})`.mapWith(Number)
    })
    .from(userCards)
    .innerJoin(users, eq(userCards.userId, users.id))
    .innerJoin(bankCards, eq(userCards.bankCardId, bankCards.id))
    .innerJoin(banks, eq(bankCards.bankId, banks.id));
}

export async function recalculateTransactionsForMerchantNames(merchantNames: string[]) {
  const allUserCards = await db.select({ id: userCards.id }).from(userCards);
  for (const card of allUserCards) {
      await bulkRecalculateTransactions(card.id, "2000-01-01", "2100-12-31");
  }
}
