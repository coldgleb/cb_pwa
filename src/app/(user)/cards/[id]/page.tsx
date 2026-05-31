import { db } from "@/db";
import { banks, bankCards, userCards, transactions } from "@/db/schema";
import { auth } from "@/auth";
import EditUserCardForm from "@/components/EditUserCardForm";
import { updateUserCard } from "@/lib/actions/user-cards";
import { css } from "../../../../../styled-system/css";
import { stack, flex } from "../../../../../styled-system/patterns";
import { eq, and, sql } from "drizzle-orm";
import { redirect, notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import DeleteUserCardButton from "@/components/DeleteUserCardButton";

export const dynamic = "force-dynamic";

export default async function CardDetailsPage({ 
  params 
}: { 
  params: Promise<{ id: string }>
}) {
  const session = await auth();
  if (!session) redirect("/");

  const { id } = await params;
  const userCardId = parseInt(id);
  if (isNaN(userCardId)) notFound();

  // Verify the card belongs to the user
  const [card] = await db.select({
    id: userCards.id,
    name: bankCards.name,
    bankName: banks.name,
    bankCardId: userCards.bankCardId,
    lastFour: userCards.lastFourDigits,
    cashbackLimit: userCards.cashbackLimit,
    initialBalance: userCards.initialBalance,
    accountType: userCards.accountType,
    creditLimit: userCards.creditLimit,
    statementDay: userCards.statementDay,
    paymentDay: userCards.paymentDay,
    loyaltyProgramId: bankCards.loyaltyProgramId,
  })
  .from(userCards)
  .where(and(eq(userCards.id, userCardId), eq(userCards.userId, session.user.id!)))
  .leftJoin(bankCards, eq(userCards.bankCardId, bankCards.id))
  .leftJoin(banks, eq(bankCards.bankId, banks.id))
  .limit(1);

  if (!card) notFound();

  // Calculate current balance
  const cardSumStats = await db
    .select({
      type: transactions.type,
      sumAmount: sql<number>`sum(${transactions.amount})`
    })
    .from(transactions)
    .where(and(eq(transactions.userCardId, userCardId), eq(transactions.userId, session.user.id!)))
    .groupBy(transactions.type);

  const transferInStats = await db
    .select({
      sumAmount: sql<number>`sum(${transactions.amount})`
    })
    .from(transactions)
    .where(
      and(
        eq(transactions.toUserCardId, userCardId),
        eq(transactions.userId, session.user.id!),
        eq(transactions.type, "transfer")
      )
    );

  let currentBalance = Number(card.initialBalance) || 0;
  
  cardSumStats.forEach(stat => {
    const amt = Number(stat.sumAmount) || 0;
    if (stat.type === "income") currentBalance += amt;
    else if (stat.type === "expense" || stat.type === "transfer") currentBalance -= amt;
  });

  const transferInAmt = Number(transferInStats[0]?.sumAmount) || 0;
  currentBalance += transferInAmt;

  return (
    <div className={css({ minH: "100vh", bg: "var(--background)" })}>
      <div className="sber-container">
        <header className={flex({ align: "center", justify: "space-between", gap: "16px", mb: "32px" })}>
          <div className={stack({ gap: "4px" })}>
            <a href="/cards" className="sber-icon-button">
              <ArrowLeft size={20} />
            </a>
            <h1 className={css({ fontSize: "24px", fontWeight: "800", color: "var(--foreground)" })}>Настройка карты</h1>
            <p className={css({ fontSize: "14px", color: "secondaryText", fontWeight: "600" })}>
              {card.bankName} — {card.name} {card.lastFour ? `• ${card.lastFour}` : ''}
            </p>
          </div>
          <DeleteUserCardButton cardId={userCardId} />
        </header>

        <div className={stack({ gap: "40px" })}>
          <div className="sber-card" style={{ padding: '20px', background: 'linear-gradient(135deg, var(--sber-green) 0%, #1a8a2e 100%)', color: 'white', border: 'none' }}>
            <p className={css({ fontSize: '13px', fontWeight: '700', opacity: 0.9, textTransform: 'uppercase', mb: '4px' })}>Текущий баланс</p>
            <p className={css({ fontSize: '32px', fontWeight: '900' })}>{currentBalance.toLocaleString('ru-RU')} ₽</p>
            {card.accountType === 'credit' && card.creditLimit !== null && (
              <p className={css({ fontSize: '13px', mt: '8px', opacity: 0.9, fontWeight: '600' })}>
                Доступно с лимитом: {((card.creditLimit || 0) + currentBalance).toLocaleString('ru-RU')} ₽
              </p>
            )}
          </div>

          {/* Общие настройки */}
          <EditUserCardForm card={card} updateUserCardAction={updateUserCard.bind(null, userCardId)} />
        </div>
      </div>
    </div>
  );
}

