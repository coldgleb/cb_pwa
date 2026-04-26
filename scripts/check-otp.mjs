import { db } from "./src/db/index.js";
import { banks, bankCards, userCards, transactions } from "./src/db/schema.js";
import { eq, like } from "drizzle-orm";

async function checkOTP() {
  const otpBanks = await db.select().from(banks).where(like(banks.name, "%ОТП%"));
  console.log("OTP Banks:", otpBanks);

  for (const bank of otpBanks) {
    const cards = await db.select().from(bankCards).where(eq(bankCards.bankId, bank.id));
    console.log(`Cards for ${bank.name}:`, cards);

    for (const card of cards) {
      const uCards = await db.select().from(userCards).where(eq(userCards.bankCardId, card.id));
      for (const uc of uCards) {
        const txs = await db.select().from(transactions).where(eq(transactions.userCardId, uc.id)).limit(5);
        console.log(`Sample transactions for UserCard ${uc.id}:`, txs.map(t => ({
          id: t.id,
          amount: t.amount,
          cashback: t.calculatedCashback,
          merchant: t.merchantName
        })));
      }
    }
  }
}

checkOTP().catch(console.error);
