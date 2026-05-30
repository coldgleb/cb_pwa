import { db } from "@/db";
import { banks, bankCards, userCards } from "@/db/schema";
import { auth } from "@/auth";
import EditUserCardForm from "@/components/EditUserCardForm";
import { updateUserCard } from "@/lib/actions/user-cards";
import { css } from "../../../../../styled-system/css";
import { stack } from "../../../../../styled-system/patterns";
import { eq, and } from "drizzle-orm";
import { redirect, notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

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
    loyaltyProgramId: bankCards.loyaltyProgramId,
  })
  .from(userCards)
  .where(and(eq(userCards.id, userCardId), eq(userCards.userId, session.user.id!)))
  .leftJoin(bankCards, eq(userCards.bankCardId, bankCards.id))
  .leftJoin(banks, eq(bankCards.bankId, banks.id))
  .limit(1);

  if (!card) notFound();

  return (
    <div className={css({ minH: "100vh", bg: "var(--background)" })}>
      <div className="sber-container">
        <header className={stack({ gap: "4px", mb: "32px" })}>
          <a href="/cards" className="sber-icon-button">
            <ArrowLeft size={20} />
          </a>
          <h1 className={css({ fontSize: "24px", fontWeight: "800", color: "var(--foreground)" })}>Настройка карты</h1>
          <p className={css({ fontSize: "14px", color: "secondaryText", fontWeight: "600" })}>
            {card.bankName} — {card.name} {card.lastFour ? `• ${card.lastFour}` : ''}
          </p>
        </header>

        <div className={stack({ gap: "40px" })}>
          {/* Общие настройки */}
          <EditUserCardForm card={card} updateUserCardAction={updateUserCard.bind(null, userCardId)} />
        </div>
      </div>
    </div>
  );
}

