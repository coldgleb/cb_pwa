import { db } from "@/db";
import { banks, bankCards, userCards, bankCategories, userCashbackRules } from "@/db/schema";
import { auth } from "@/auth";
import MonthlyRulesForm from "@/components/MonthlyRulesForm";
import { updateUserCard } from "@/lib/actions/user-cards";
import { css } from "../../../../../styled-system/css";
import { stack, flex } from "../../../../../styled-system/patterns";
import { eq, desc, and } from "drizzle-orm";
import { redirect, notFound } from "next/navigation";
import { ArrowLeft, Calendar, CreditCard, Save } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function CardDetailsPage({ 
  params, 
  searchParams 
}: { 
  params: Promise<{ id: string }>,
  searchParams: Promise<{ month?: string }>
}) {
  const session = await auth();
  if (!session) redirect("/");

  const { id } = await params;
  const userCardId = parseInt(id);
  if (isNaN(userCardId)) notFound();

  const queryParams = await searchParams;
  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const yearMonth = queryParams.month || currentMonth;
  const startDate = `${yearMonth}-01`;

  // Verify the card belongs to the user
  const [card] = await db.select({
    id: userCards.id,
    name: bankCards.name,
    bankName: banks.name,
    bankCardId: userCards.bankCardId,
    lastFour: userCards.lastFourDigits,
    cashbackLimit: userCards.cashbackLimit,
  })
  .from(userCards)
  .where(and(eq(userCards.id, userCardId), eq(userCards.userId, session.user.id!)))
  .leftJoin(bankCards, eq(userCards.bankCardId, bankCards.id))
  .leftJoin(banks, eq(bankCards.bankId, banks.id))
  .limit(1);

  if (!card) notFound();

  const allCategories = await db.select().from(bankCategories);

  const activeRules = await db.select({
    id: userCashbackRules.id,
    percentage: userCashbackRules.percentage,
    bankCategoryId: userCashbackRules.bankCategoryId,
    categoryName: bankCategories.name,
  })
  .from(userCashbackRules)
  .leftJoin(bankCategories, eq(userCashbackRules.bankCategoryId, bankCategories.id))
  .where(
    and(
      eq(userCashbackRules.userCardId, userCardId),
      eq(userCashbackRules.startDate, startDate)
    )
  )
  .orderBy(desc(userCashbackRules.percentage));

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
          <section className="sber-card">
            <div className={flex({ align: "center", gap: "10px", mb: "24px" })}>
              <div className={css({ p: "6px", bg: "var(--secondary-text)", borderRadius: "8px", color: "white" })}>
                <CreditCard size={18} />
              </div>
              <h2 className={css({ fontSize: "17px", fontWeight: "700", color: "var(--foreground)" })}>Настройки карты</h2>
            </div>

            <form action={updateUserCard.bind(null, userCardId)} className={stack({ gap: "20px" })}>
              <div className={flex({ gap: "12px", wrap: "wrap" })}>
                <div className={stack({ gap: "6px", flex: 1, minW: "140px" })}>
                  <label className="sber-label">ПОСЛЕДНИЕ 4 ЦИФРЫ</label>
                  <input
                    name="lastFourDigits"
                    type="text"
                    maxLength={4}
                    defaultValue={card.lastFour || ""}
                    placeholder="0000"
                    className="sber-input"
                  />
                </div>
                <div className={stack({ gap: "6px", flex: 1, minW: "140px" })}>
                  <label className="sber-label">ЛИМИТ КЕШБЭКА (₽)</label>
                  <input
                    name="cashbackLimit"
                    type="number"
                    defaultValue={card.cashbackLimit || ""}
                    placeholder="Например, 5000"
                    className="sber-input"
                  />
                </div>
              </div>
              <button type="submit" className="sber-button" style={{ backgroundColor: "var(--secondary-text)" }}>
                <Save size={18} /> Сохранить настройки
              </button>
            </form>
          </section>

          <MonthlyRulesForm 
            key={yearMonth}
            userCards={[{ id: card.id, name: card.name, bankName: card.bankName, bankCardId: card.bankCardId }]} 
            allCategories={allCategories} 
            initialMonth={yearMonth}
            activeRules={activeRules.map(r => ({ categoryId: r.bankCategoryId!, percentage: r.percentage }))}
          />
        </div>
      </div>
    </div>
  );
}
