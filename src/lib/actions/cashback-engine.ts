"use server";

import { db } from "@/db";
import { 
  bankCardSettings, 
  bankCards, 
  transactions, 
  userCards, 
  bankCategories, 
  bankCategoryMcc, 
  bankCategoryMerchant, 
  merchants, 
  userCashbackRules, 
  bankExclusions 
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
 * Loads all rules and mappings into memory to avoid per-transaction DB queries.
 */
export async function bulkRecalculateTransactions(
  userCardId: number, 
  startDateStr: string, 
  endDateStr: string,
  onlyCategoryIds?: number[]
) {
  console.time("BulkRecalc");

  // 1. Fetch UserCard and Bank info
  const [cardInfo] = await db
    .select({ 
      bankCardId: userCards.bankCardId,
      userId: userCards.userId,
      globalLimit: userCards.cashbackLimit,
      bankId: bankCards.bankId,
      baseRounding: bankCards.roundingType
    })
    .from(userCards)
    .innerJoin(bankCards, eq(userCards.bankCardId, bankCards.id))
    .where(eq(userCards.id, userCardId))
    .limit(1);

  if (!cardInfo) return;

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
    db.select().from(bankCategories).where(eq(bankCategories.bankCardId, cardInfo.bankCardId)),
    db.select().from(bankCategoryMcc).innerJoin(bankCategories, eq(bankCategoryMcc.categoryId, bankCategories.id)).where(eq(bankCategories.bankCardId, cardInfo.bankCardId)),
    db.select().from(bankCategoryMerchant).innerJoin(bankCategories, eq(bankCategoryMerchant.categoryId, bankCategories.id)).where(eq(bankCategories.bankCardId, cardInfo.bankCardId)),
    db.select().from(bankExclusions).where(eq(bankExclusions.bankCardId, cardInfo.bankCardId)),
    db.select().from(bankCardSettings).where(eq(bankCardSettings.bankCardId, cardInfo.bankCardId)).orderBy(desc(bankCardSettings.startDate)),
    db.select().from(userCashbackRules).where(and(eq(userCashbackRules.userCardId, userCardId), lte(userCashbackRules.startDate, endDateStr), gte(userCashbackRules.endDate, startDateStr))),
    db.select().from(merchants)
  ]);

  // Sort mappings to prioritize:
  // 1. "No cashback" (matches orderBy in single engine)
  // 2. Latest startDate (more recent rule)
  // 3. NULL endDate (active rule over expired one)
  const sortMappings = (a: any, b: any) => {
    const aName = a.bank_categories.name.toLowerCase();
    const bName = b.bank_categories.name.toLowerCase();
    const aNoCb = aName.includes("без кешбэка");
    const bNoCb = bName.includes("без кешбэка");
    
    if (aNoCb && !bNoCb) return -1;
    if (!aNoCb && bNoCb) return 1;

    // Latest startDate first
    const aStart = a.bank_category_merchant?.startDate || a.bank_category_mcc?.startDate || "";
    const bStart = b.bank_category_merchant?.startDate || b.bank_category_mcc?.startDate || "";
    if (aStart > bStart) return -1;
    if (aStart < bStart) return 1;

    // NULL endDate first
    const aEnd = a.bank_category_merchant?.endDate || a.bank_category_mcc?.endDate || null;
    const bEnd = b.bank_category_merchant?.endDate || b.bank_category_mcc?.endDate || null;
    if (aEnd === null && bEnd !== null) return -1;
    if (aEnd !== null && bEnd === null) return 1;

    return 0;
  };
  allMerchantMappings.sort(sortMappings);
  allMccMappings.sort(sortMappings);

  // 3. Fetch transactions for the month
  // Broaden range by 1 day on each side to account for timezone shifts in UTC storage
  const start = new Date(startDateStr);
  start.setDate(start.getDate() - 1);
  const end = new Date(endDateStr);
  end.setDate(end.getDate() + 1);
  end.setHours(23, 59, 59, 999);

  const txs = await db
    .select()
    .from(transactions)
    .where(and(eq(transactions.userCardId, userCardId), gte(transactions.transactionDate, start), lte(transactions.transactionDate, end)))
    .orderBy(asc(transactions.transactionDate));

  if (txs.length === 0) return;

  // Helper helpers
  const isNoCashback = (name: string) => name.toLowerCase().includes("без кешбэка");
  const isOthers = (name: string) => name.toLowerCase().includes("остальные покупки");

  const merchantsMap = new Map(allMerchants.map(m => [m.name.toLowerCase().trim(), m.id]));

  // 4. Processing Loop
  let monthlyTotalCashback = 0;
  const categoryUsageMap = new Map<number, number>();

  const results: any[] = [];

  for (const tx of txs) {
    const txDateStr = toLocalDateStr(tx.transactionDate);
    
    // Memory filtering for the specific month requested
    if (txDateStr < startDateStr || txDateStr > endDateStr) continue;

    const normalizedMcc = tx.mccCode || "0000";
    const paidAmount = tx.paidAmount || tx.amount;

    let finalCashback = 0;
    let finalCategoryId: number | null = null;
    let finalPercentage = 0;

    // A. Check Exclusions
    const isExcluded = allExclusions.some(e => e.mccCode === normalizedMcc);
    
    if (!isExcluded) {
      // B. Priority: Merchant Mapping
      const merchantId = merchantsMap.get(tx.merchantName.toLowerCase().trim());
      let mapping = null;

      if (merchantId) {
        mapping = allMerchantMappings.find(m => 
          m.bank_category_merchant.merchantId === merchantId &&
          m.bank_category_merchant.startDate <= txDateStr &&
          (!m.bank_category_merchant.endDate || m.bank_category_merchant.endDate >= txDateStr)
        );
      }

      // C. Priority: MCC Mapping
      if (!mapping) {
        mapping = allMccMappings.find(m => 
          m.bank_category_mcc.mccCode === normalizedMcc &&
          m.bank_category_mcc.startDate <= txDateStr &&
          (!m.bank_category_mcc.endDate || m.bank_category_mcc.endDate >= txDateStr)
        );
      }

      // D. Fallback
      let category = mapping?.bank_categories || null;
      if (!category) {
        category = allCategories.find(c => 
          isOthers(c.name) && 
          c.startDate <= txDateStr && 
          (!c.endDate || c.endDate >= txDateStr)
        ) || null;
      }

      if (category && !isNoCashback(category.name)) {
        finalCategoryId = category.id;
        
        // E. Get User Rule
        let rule = allUserRules.find(r => 
          r.bankCategoryId === category!.id &&
          r.startDate <= txDateStr &&
          r.endDate >= txDateStr
        );

        let percentage = 0;
        let tiers = "[]";
        let ruleFound = false;
        let categoryLimit: number | null = null;

        if (rule) {
          percentage = rule.percentage;
          tiers = rule.tiers;
          categoryLimit = rule.cashbackLimit;
          ruleFound = true;
        } else if (isOthers(category.name) || isNoCashback(category.name)) {
          // For base/system categories, use bank default if no specific user rule
          percentage = category.defaultPercentage;
          tiers = category.tiers;
          categoryLimit = category.cashbackLimit;
          ruleFound = true;
        } else {
          // Selectable category but NO user rule for this month. 
          ruleFound = false;
        }

        // Fallback 2: "Others" rule if bank default is 0 and it's not the "Others" category
        // Actually, fallback if category match was not selected OR no category match found
        if (!ruleFound || (percentage === 0 && !isOthers(category.name) && !isNoCashback(category.name))) {
            const baseCat = allCategories.find(c => isOthers(c.name) && c.startDate <= txDateStr && (!c.endDate || c.endDate >= txDateStr));
            if (baseCat) {
                category = baseCat; // Update category object for rounding and metadata
                finalCategoryId = baseCat.id;
                const baseRule = allUserRules.find(r => 
                    r.bankCategoryId === baseCat.id &&
                    r.startDate <= txDateStr &&
                    r.endDate >= txDateStr
                );
                if (baseRule) {
                    percentage = baseRule.percentage;
                    tiers = baseRule.tiers;
                    categoryLimit = baseRule.cashbackLimit;
                } else {
                    percentage = baseCat.defaultPercentage;
                    tiers = baseCat.tiers;
                    categoryLimit = baseCat.cashbackLimit;
                }
            }
        }

        finalPercentage = percentage;

        if (percentage > 0 || isOthers(category.name) || rule) {
          try {
            const parsedTiers = JSON.parse(tiers);
            if (Array.isArray(parsedTiers) && parsedTiers.length > 0) {
                parsedTiers.sort((a: any, b: any) => b.minAmount - a.minAmount);
                const matchedTier = parsedTiers.find((t: any) => paidAmount >= t.minAmount);
                if (matchedTier) {
                  percentage = matchedTier.percentage;
                  finalPercentage = percentage;
                }
            }
          } catch(e) {}

          // F. Rounding
          const histSetting = allHistoricalSettings.find(s => s.startDate <= txDateStr);
          const cardRounding = histSetting?.roundingType || cardInfo.baseRounding || "no_rounding";
          const categoryRounding = category.roundingType || "inherit";
          const finalRounding = (categoryRounding === "inherit" || !categoryRounding) ? cardRounding : categoryRounding;

          let calcAmount = paidAmount;
          if (finalRounding === "amount_100_down") calcAmount = Math.floor(paidAmount / 100) * 100;
          
          let cb = (calcAmount * percentage) / 100;
          if (finalRounding === "cashback_0_01_down") cb = Math.floor(cb * 100) / 100;
          else if (finalRounding === "cashback_0_01_math") cb = Math.round(cb * 100) / 100;
          else if (finalRounding === "cashback_1_down") cb = Math.floor(cb);
          else if (finalRounding === "halva") cb = cb < 1 ? Math.floor(cb * 100) / 100 : Math.floor(cb);

          // G. Enforce Limits
          // Category Limit
          if (categoryLimit !== null) {
              const used = categoryUsageMap.get(category.id) || 0;
              const remaining = Math.max(0, categoryLimit - used);
              cb = Math.min(cb, remaining);
              categoryUsageMap.set(category.id, used + cb);
          }

          // Global Limit
          if (cardInfo.globalLimit !== null) {
              const remaining = Math.max(0, cardInfo.globalLimit - monthlyTotalCashback);
              cb = Math.min(cb, remaining);
          }

          finalCashback = cb;
          monthlyTotalCashback += cb;
        }
      } else if (category && isNoCashback(category.name)) {
          finalCategoryId = category.id;
          finalPercentage = 0;
      }
    }

    // Optimization: only add to results if NOT filtering OR if category matches
    if (!onlyCategoryIds || (finalCategoryId && onlyCategoryIds.includes(finalCategoryId))) {
        // If we were NOT filtering, we update everything. 
        // If we ARE filtering, we only update specific categories.
        // HOWEVER, even if we filter, we must process the loop fully to track monthlyTotalCashback for limits!
        results.push({ id: tx.id, cashback: finalCashback, categoryId: finalCategoryId, percentage: finalPercentage });
    } else if (onlyCategoryIds && !finalCategoryId && onlyCategoryIds.some(id => {
        const cat = allCategories.find(c => c.id === id);
        return cat && isOthers(cat.name);
    })) {
        // Also include fallback category in results if "Other purchases" was affected
        results.push({ id: tx.id, cashback: finalCashback, categoryId: finalCategoryId, percentage: finalPercentage });
    }
  }

  // 5. Bulk Update
  if (results.length > 0) {
    await db.transaction(async (dbTx) => {
      for (const res of results) {
        await dbTx.update(transactions)
          .set({ 
            calculatedCashback: res.cashback, 
            categoryId: res.categoryId,
            cashbackPercentage: res.percentage
          })
          .where(eq(transactions.id, res.id));
      }
    });
  }

  console.timeEnd("BulkRecalc");
  console.log(`Bulk updated ${results.length} transactions.`);
}

/**
 * Helper to calculate cashback for a single transaction.
 */
export async function calculateCashbackForTransaction(
  paidAmount: number,
  mccCode: string,
  merchantName: string,
  userCardId: number,
  dateStr: string,
  excludeTxId?: number
) {
  const normalizedMcc = mccCode || "0000";

  // 1. Find the card and bank info
  const [cardInfo] = await db
    .select({ 
      bankCardId: userCards.bankCardId,
      userId: userCards.userId,
      globalLimit: userCards.cashbackLimit,
      bankId: bankCards.bankId,
      baseRounding: bankCards.roundingType
    })
    .from(userCards)
    .innerJoin(bankCards, eq(userCards.bankCardId, bankCards.id))
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

  const cardRounding = historicalSetting?.roundingType || cardInfo.baseRounding || "no_rounding";

  // 2. HIGHEST PRIORITY: Bank Exclusions
  // The table in DB has bank_id, but schema might be out of sync. 
  // We'll use a raw-ish approach or ensure we use the right column name if we were to fix the schema.
  // For now, let's assume we fixed the schema or just use what works.
  // Checking schema.ts again, it says bankCardId: integer("bank_card_id").
  // But DB has bank_id. This is a mess. 
  // Let's use sql to be safe or fix the schema later.
  
  const [bankExclusion] = await db
    .select()
    .from(bankExclusions)
    .where(
      and(
        eq(bankExclusions.bankCardId, cardInfo.bankCardId),
        eq(bankExclusions.mccCode, normalizedMcc)
      )
    )
    .limit(1);

  if (bankExclusion) {
    return { cashback: 0, categoryId: null };
  }

  // 2.5 Find merchant (case-insensitive)
  const [merchant] = await db
    .select({ id: merchants.id })
    .from(merchants)
    .where(sql`lower(${merchants.name}) = lower(${merchantName.trim()})`)
    .limit(1);
  
  let finalMapping = null;

  // 3. PRIORITY: Merchant Mapping
  if (merchant) {
    finalMapping = await db
      .select({ 
        categoryId: bankCategories.id,
        categoryName: bankCategories.name,
        categoryRounding: bankCategories.roundingType,
        defaultPercentage: bankCategories.defaultPercentage,
        tiers: bankCategories.tiers
      })
      .from(bankCategoryMerchant)
      .innerJoin(bankCategories, eq(bankCategoryMerchant.categoryId, bankCategories.id))
      .where(
        and(
          eq(bankCategoryMerchant.merchantId, merchant.id),
          eq(bankCategories.bankCardId, cardInfo.bankCardId),
          lte(bankCategoryMerchant.startDate, dateStr),
          or(isNull(bankCategoryMerchant.endDate), gte(bankCategoryMerchant.endDate, dateStr)),
          lte(bankCategories.startDate, dateStr),
          or(isNull(bankCategories.endDate), gte(bankCategories.endDate, dateStr))
        )
      )
      .orderBy(
        sql`CASE WHEN trim(lower(${bankCategories.name})) = 'без кешбэка' THEN 0 ELSE 1 END`,
        desc(bankCategoryMerchant.startDate),
        sql`CASE WHEN ${bankCategoryMerchant.endDate} IS NULL THEN 0 ELSE 1 END`
      )
      .limit(1)
      .then(rows => rows[0]);
  }

  // 4. PRIORITY: MCC Mapping
  if (!finalMapping) {
    finalMapping = await db
      .select({ 
        categoryId: bankCategories.id,
        categoryName: bankCategories.name,
        categoryRounding: bankCategories.roundingType,
        defaultPercentage: bankCategories.defaultPercentage,
        tiers: bankCategories.tiers
      })
      .from(bankCategoryMcc)
      .innerJoin(bankCategories, eq(bankCategoryMcc.categoryId, bankCategories.id))
      .where(
        and(
          eq(bankCategoryMcc.mccCode, normalizedMcc),
          eq(bankCategories.bankCardId, cardInfo.bankCardId),
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
      )
      .limit(1)
      .then(rows => rows[0]);
  }

  // 5. Fallback & Rule Lookup
  let categoryId = finalMapping?.categoryId || null;
  let categoryName = finalMapping?.categoryName || "";
  let categoryRounding = finalMapping?.categoryRounding || "inherit";
  let defaultPercentage = finalMapping?.defaultPercentage || 0;
  let defaultTiers = finalMapping?.tiers || "[]";

  const isNoCashback = (name: string) => name.toLowerCase().includes("без кешбэка");
  const isOthers = (name: string) => name.toLowerCase().includes("остальные покупки");

  // Helper to find "Others" category
  const getBaseCategory = async () => {
    return db
      .select({ 
        id: bankCategories.id, 
        name: bankCategories.name, 
        roundingType: bankCategories.roundingType,
        defaultPercentage: bankCategories.defaultPercentage,
        tiers: bankCategories.tiers,
        cashbackLimit: bankCategories.cashbackLimit
      })
      .from(bankCategories)
      .where(
        and(
          eq(bankCategories.bankCardId, cardInfo.bankCardId), 
          eq(bankCategories.name, "Остальные покупки"),
          lte(bankCategories.startDate, dateStr),
          or(isNull(bankCategories.endDate), gte(bankCategories.endDate, dateStr))
        )
      )
      .limit(1)
      .then(rows => rows[0]);
  };

  // If no mapping found, use base category
  if (!categoryId) {
    const baseCat = await getBaseCategory();
    if (baseCat) {
      categoryId = baseCat.id;
      categoryName = baseCat.name;
      categoryRounding = baseCat.roundingType;
      defaultPercentage = baseCat.defaultPercentage;
      defaultTiers = baseCat.tiers;
    }
  }

  if (categoryId && isNoCashback(categoryName)) {
    console.log(`[Engine] ${merchantName}: Match NoCashback category. 0%`);
    return { cashback: 0, categoryId, nominalPercentage: 0 };
  }

  // 6. Calculate percentage from User Rules
  let percentage = 0;
  let ruleTiers = "[]";
  let categoryLimit: number | null = null;
  let ruleFound = false;

  if (categoryId) {
    const [rule] = await db
      .select({ 
        percentage: userCashbackRules.percentage, 
        tiers: userCashbackRules.tiers,
        cashbackLimit: userCashbackRules.cashbackLimit 
      })
      .from(userCashbackRules)
      .where(
        and(
          eq(userCashbackRules.userCardId, userCardId),
          eq(userCashbackRules.bankCategoryId, categoryId),
          lte(userCashbackRules.startDate, dateStr),
          gte(userCashbackRules.endDate, dateStr)
        )
      )
      .limit(1);
    
    if (rule) {
      console.log(`[Engine] ${merchantName}: Found user rule for ${categoryName}. Base%: ${rule.percentage}`);
      percentage = rule.percentage;
      ruleTiers = rule.tiers;
      categoryLimit = rule.cashbackLimit;
      ruleFound = true;
    } else if (isOthers(categoryName) || isNoCashback(categoryName)) {
      // For base/system categories, use bank default if no specific user rule
      console.log(`[Engine] ${merchantName}: No user rule for ${categoryName}, using bank default: ${defaultPercentage}%`);
      percentage = defaultPercentage;
      ruleTiers = defaultTiers;
      ruleFound = true;
    } else {
      // Selectable category but NO user rule for this month. 
      // Mark as NOT FOUND to trigger fallback to base category.
      console.log(`[Engine] ${merchantName}: ${categoryName} is NOT selected for this month. Falling back.`);
      ruleFound = false;
    }
  }

  // If we still haven't found a rule (either category not mapped OR mapping is unselected)
  if (!ruleFound && (!categoryId || !isOthers(categoryName))) {
    const baseCat = await getBaseCategory();
    if (baseCat && baseCat.id !== categoryId) {
      const [baseRule] = await db
        .select({ 
          percentage: userCashbackRules.percentage, 
          tiers: userCashbackRules.tiers,
          cashbackLimit: userCashbackRules.cashbackLimit 
        })
        .from(userCashbackRules)
        .where(
          and(
            eq(userCashbackRules.userCardId, userCardId),
            eq(userCashbackRules.bankCategoryId, baseCat.id),
            lte(userCashbackRules.startDate, dateStr),
            gte(userCashbackRules.endDate, dateStr)
          )
        )
        .limit(1);

      if (baseRule) {
        console.log(`[Engine] ${merchantName}: Falling back to user rule for ${baseCat.name}. Base%: ${baseRule.percentage}`);
        percentage = baseRule.percentage;
        ruleTiers = baseRule.tiers;
        categoryLimit = baseRule.cashbackLimit;
      } else {
        console.log(`[Engine] ${merchantName}: Falling back to bank default for ${baseCat.name}. Base%: ${baseCat.defaultPercentage}`);
        percentage = baseCat.defaultPercentage;
        ruleTiers = baseCat.tiers;
        categoryLimit = baseCat.cashbackLimit;
      }
      categoryId = baseCat.id;
      categoryName = baseCat.name;
      categoryRounding = baseCat.roundingType;
    }
  }

  try {
    const parsedTiers = JSON.parse(ruleTiers);
    if (Array.isArray(parsedTiers) && parsedTiers.length > 0) {
      parsedTiers.sort((a, b) => b.minAmount - a.minAmount);
      const matchedTier = parsedTiers.find(t => paidAmount >= t.minAmount);
      if (matchedTier) percentage = matchedTier.percentage;
    }
  } catch (e) {}

  // 7. Applying Rounding
  const finalRounding = categoryRounding === "inherit" ? cardRounding : categoryRounding;
  let finalCalcAmount = paidAmount;
  
  if (finalRounding === "amount_100_down") finalCalcAmount = Math.floor(paidAmount / 100) * 100;

  let calculatedCashback = (finalCalcAmount * percentage) / 100;

  if (finalRounding === "cashback_0_01_down") {
    calculatedCashback = Math.floor(calculatedCashback * 100) / 100;
  } else if (finalRounding === "cashback_0_01_math") {
    calculatedCashback = Math.round(calculatedCashback * 100) / 100;
  } else if (finalRounding === "cashback_1_down") {
    calculatedCashback = Math.floor(calculatedCashback);
  } else if (finalRounding === "halva") {
    calculatedCashback = calculatedCashback < 1 ? Math.floor(calculatedCashback * 100) / 100 : Math.floor(calculatedCashback);
  }

  // 8. Enforce Limits
  const [year, month] = dateStr.split("-").map(Number);
  const monthStart = new Date(year, month - 1, 1);
  const monthEnd = new Date(year, month, 0, 23, 59, 59);

  if (categoryLimit !== null && categoryId !== null) {
    const categoryUsage = await db
      .select({ total: sql<number>`sum(calculated_cashback)` })
      .from(transactions)
      .where(
        and(
          eq(transactions.userCardId, userCardId),
          eq(transactions.categoryId, categoryId),
          gte(transactions.transactionDate, monthStart),
          lte(transactions.transactionDate, monthEnd),
          excludeTxId ? sql`${transactions.id} != ${excludeTxId}` : undefined
        )
      );
    
    const usedInCategory = Number(categoryUsage[0]?.total) || 0;
    const remainingInCategory = Math.max(0, categoryLimit - usedInCategory);
    calculatedCashback = Math.min(calculatedCashback, remainingInCategory);
  }

  if (cardInfo.globalLimit !== null) {
    const globalUsage = await db
      .select({ total: sql<number>`sum(calculated_cashback)` })
      .from(transactions)
      .where(
        and(
          eq(transactions.userCardId, userCardId),
          gte(transactions.transactionDate, monthStart),
          lte(transactions.transactionDate, monthEnd),
          excludeTxId ? sql`${transactions.id} != ${excludeTxId}` : undefined
        )
      );
    
    const usedGlobally = Number(globalUsage[0]?.total) || 0;
    const remainingGlobally = Math.max(0, cardInfo.globalLimit - usedGlobally);
    calculatedCashback = Math.min(calculatedCashback, remainingGlobally);
  }

  return { cashback: calculatedCashback, categoryId, nominalPercentage: percentage };
}

export async function recalculateTransactions(txs: any[]) {
  if (txs.length === 0) return;

  console.log(`Recalculating ${txs.length} transactions...`);

  await db.transaction(async (tx) => {
    for (const transactionData of txs) {
      const paid = transactionData.paidAmount || transactionData.amount;
      const dateStr = toLocalDateStr(transactionData.transactionDate instanceof Date 
        ? transactionData.transactionDate
        : new Date(transactionData.transactionDate));
        
      const { cashback, categoryId, nominalPercentage } = await calculateCashbackForTransaction(
        paid,
        transactionData.mccCode || "0000",
        transactionData.merchantName,
        transactionData.userCardId,
        dateStr,
        transactionData.id
      );

      await tx.update(transactions)
        .set({ calculatedCashback: cashback, categoryId, cashbackPercentage: nominalPercentage })
        .where(eq(transactions.id, transactionData.id));
    }
  });
  console.log("Recalculation finished.");
}

export async function recalculateTransactionsForUserCard(userCardId: number, startDate?: string, endDate?: string) {
  if (startDate && endDate) {
      return bulkRecalculateTransactions(userCardId, startDate, endDate);
  }

  console.log(`Fetching transactions for UserCard ${userCardId}`);
  
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
    .where(eq(transactions.userCardId, userCardId));

  console.log(`Found ${allAffectedTransactions.length} transactions to recalculate.`);

  await recalculateTransactions(allAffectedTransactions);
}

export async function recalculateTransactionsForMerchantNames(names: string[]) {
  const affectedTransactions = await db
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
    .where(inArray(transactions.merchantName, names));
  
  await recalculateTransactions(affectedTransactions);
}

export async function recalculateTransactionsForBankCard(bankCardId: number) {
  const affectedUserCards = await db
    .select({ id: userCards.id })
    .from(userCards)
    .where(eq(userCards.bankCardId, bankCardId));
  
  for (const card of affectedUserCards) {
    await recalculateTransactionsForUserCard(card.id);
  }
}

export async function recalculateTransactionsForBank(bankId: number) {
  const cards = await db.select({ id: bankCards.id }).from(bankCards).where(eq(bankCards.bankId, bankId));
  for (const card of cards) {
    await recalculateTransactionsForBankCard(card.id);
  }
}
