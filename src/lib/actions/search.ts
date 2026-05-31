"use server";
import { db } from "@/db";
import { userCards, bankCards, banks, merchants, bankCategories } from "@/db/schema";
import { auth } from "@/auth";
import { eq, and, inArray } from "drizzle-orm";
import { ensureMerchantExists } from "./merchants";
import { calculateCashbackForTransaction } from "./cashback-engine";

export interface SearchResult {
  id: number;
  lastFour: string | null;
  cardName: string;
  bankName: string;
  bankLogo: string | null;
  bankWebsite: string | null;
  cashback: number;
  percentage: number;
  categoryName: string;
}

export async function findBestCardForPurchase(merchantName: string, mccCode: string, amount: number): Promise<SearchResult[]> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const todayStr = new Date().toISOString().split('T')[0];

  // If merchant is provided, ensure it exists (fetches from mcc-codes.ru if new)
  if (merchantName && !/^\d{4}$/.test(merchantName)) {
    await ensureMerchantExists(merchantName);
  }

  // Fetch all user cards (strictly filtered by debit/credit)
  const cards = await db.select({
    id: userCards.id,
    lastFour: userCards.lastFourDigits,
    cardName: bankCards.name,
    bankName: banks.name,
    bankLogo: banks.logo,
    bankWebsite: banks.website,
    loyaltyProgramId: bankCards.loyaltyProgramId,
  })
  .from(userCards)
  .innerJoin(bankCards, eq(userCards.bankCardId, bankCards.id))
  .innerJoin(banks, eq(bankCards.bankId, banks.id))
  .where(
    and(
      eq(userCards.userId, session.user.id),
      inArray(bankCards.accountType, ["debit", "credit"])
    )
  );

  // 1. Parallelize cashback calculation for all cards
  const calculations = await Promise.all(
    cards.map(card => 
      calculateCashbackForTransaction(amount, mccCode, merchantName, card.id, todayStr)
    )
  );

  // 2. Fetch all unique category names needed in one query
  const categoryIds = calculations.map(c => c.categoryId).filter((id): id is number => id !== null);
  const uniqueCategoryIds = Array.from(new Set(categoryIds));
  
  const categoriesData = uniqueCategoryIds.length > 0
    ? await db
        .select({ id: bankCategories.id, name: bankCategories.name })
        .from(bankCategories)
        .where(inArray(bankCategories.id, uniqueCategoryIds))
    : [];
  
  const categoryMap = new Map(categoriesData.map(c => [c.id, c.name]));

  const results: SearchResult[] = cards.map((card, idx) => {
    const calc = calculations[idx];
    const categoryName = calc.categoryId ? categoryMap.get(calc.categoryId) || "Остальные покупки" : "Остальные покупки";

    return {
      id: card.id,
      lastFour: card.lastFour,
      cardName: card.cardName,
      bankName: card.bankName,
      bankLogo: card.bankLogo,
      bankWebsite: card.bankWebsite,
      cashback: calc.cashback,
      percentage: calc.nominalPercentage || 0,
      categoryName
    };
  });

  return results.sort((a, b) => b.cashback - a.cashback);
}
