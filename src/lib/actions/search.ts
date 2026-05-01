"use server";
import { db } from "@/db";
import { userCards, bankCards, banks, merchants, bankCategories } from "@/db/schema";
import { auth } from "@/auth";
import { eq } from "drizzle-orm";
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

  // Fetch all user cards
  const cards = await db.select({
    id: userCards.id,
    lastFour: userCards.lastFourDigits,
    cardName: bankCards.name,
    bankName: banks.name,
    bankLogo: banks.logo,
    bankWebsite: banks.website,
  })
  .from(userCards)
  .innerJoin(bankCards, eq(userCards.bankCardId, bankCards.id))
  .innerJoin(banks, eq(bankCards.bankId, banks.id))
  .where(eq(userCards.userId, session.user.id));

  const results: SearchResult[] = [];
  for (const card of cards) {
    const { cashback, categoryId, nominalPercentage } = await calculateCashbackForTransaction(
      amount,
      mccCode,
      merchantName,
      card.id,
      todayStr
    );

    let categoryName = "Остальные покупки";
    if (categoryId) {
       const [cat] = await db.select({ name: bankCategories.name }).from(bankCategories).where(eq(bankCategories.id, categoryId)).limit(1);
       if (cat) categoryName = cat.name;
    }

    results.push({
      id: card.id,
      lastFour: card.lastFour,
      cardName: card.cardName,
      bankName: card.bankName,
      bankLogo: card.bankLogo,
      bankWebsite: card.bankWebsite,
      cashback,
      percentage: nominalPercentage || 0,
      categoryName
    });
  }

  return results.sort((a, b) => b.cashback - a.cashback);
}
