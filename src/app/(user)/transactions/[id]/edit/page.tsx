import { db } from "@/db";
import { userCards, bankCards, banks, mccCodes, merchants, transactions } from "@/db/schema";
import { auth } from "@/auth";
import { css } from "../../../../../../styled-system/css";
import { container, flex, stack } from "../../../../../../styled-system/patterns";
import { eq, asc, and } from "drizzle-orm";
import { redirect, notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import TransactionForm from "@/components/TransactionForm";

export default async function EditTransactionPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) redirect("/");

  const { id } = await params;
  const txId = parseInt(id);
  if (isNaN(txId)) notFound();

  // Fetch the transaction and verify ownership
  const [tx] = await db
    .select()
    .from(transactions)
    .where(and(eq(transactions.id, txId), eq(transactions.userId, session.user.id!)))
    .limit(1);

  if (!tx) notFound();

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

  return (
    <div className={css({ minH: "100vh", bg: "#f4f4f4" })}>
      <div className="sber-container">
        <header className={stack({ gap: "4px", mb: "32px" })}>
          <a href="/transactions" className="sber-icon-button">
            <ArrowLeft size={20} />
          </a>
          <h1 className={css({ fontSize: "24px", fontWeight: "800", color: "#000" })}>Редактировать покупку</h1>
        </header>

        <div className={stack({ gap: "40px" })}>
          <TransactionForm 
            cards={myCards}
            merchants={allMerchants}
            mccs={allMcc}
            initialData={tx}
          />
        </div>
      </div>
    </div>
  );
}
