import { db } from "@/db";
import { userCards, bankCards, banks, mccCodes, merchants } from "@/db/schema";
import { auth } from "@/auth";
import { css } from "../../../../../styled-system/css";
import { container, flex, stack } from "../../../../../styled-system/patterns";
import { eq, asc } from "drizzle-orm";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import TransactionForm from "@/components/TransactionForm";
import { getTransactionTemplates } from "@/lib/actions/transaction-templates";
import { getSpendingCategoryOptions } from "@/lib/actions/spending-categories";

export const dynamic = "force-dynamic";

export default async function NewTransactionPage() {
  const session = await auth();
  if (!session) redirect("/");

  const myCards = await db
    .select({
      id: userCards.id,
      cardName: bankCards.name,
      bankName: banks.name,
      lastFour: userCards.lastFourDigits,
    })
    .from(userCards)
    .innerJoin(bankCards, eq(userCards.bankCardId, bankCards.id))
    .innerJoin(banks, eq(bankCards.bankId, banks.id))
    .where(eq(userCards.userId, session.user.id!));

  const allMcc = await db.select().from(mccCodes).orderBy(asc(mccCodes.code));
  const allMerchants = await db.select().from(merchants).orderBy(asc(merchants.name));
  const templates = await getTransactionTemplates();
  const spendingCategories = await getSpendingCategoryOptions();

  return (
    <div className={css({ minH: "100vh", bg: "var(--background)" })}>
      <div className="sber-container">
        <header className={stack({ gap: "4px", mb: "32px" })}>
          <a href="/" className="sber-icon-button">
            <ArrowLeft size={20} />
          </a>
          <h1 className={css({ fontSize: "24px", fontWeight: "800", color: "var(--foreground)" })}>Покупка</h1>
        </header>

        <div className={css({ maxW: "512px", mx: "auto", w: "full" })}>
          <TransactionForm 
            cards={myCards}
            merchants={allMerchants}
            mccs={allMcc}
            templates={templates}
            spendingCategories={spendingCategories}
          />
        </div>
      </div>
    </div>
  );
}
