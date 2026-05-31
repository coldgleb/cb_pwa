import { db } from "@/db";
import { banks, bankCards, userCards, loyaltyPrograms, transactions, userCashbackRules } from "@/db/schema";
import { auth } from "@/auth";
import { css } from "../../../../styled-system/css";
import { stack, flex } from "../../../../styled-system/patterns";
import { eq, asc, and, sql, gte, lte } from "drizzle-orm";
import { redirect } from "next/navigation";
import { ArrowLeft, Check } from "lucide-react";
import AddCardModalWrapper from "@/components/AddCardModalWrapper";
import UserCardsList from "@/components/UserCardsList";
import { getIconUrl } from "@/lib/utils/icons";

export const dynamic = "force-dynamic";

export default async function UserCardsPage() {
  const session = await auth();
  if (!session) redirect("/");

  const allBanks = await db.select().from(banks).orderBy(asc(banks.name));
  const availableCardTypes = await db.select({
    id: bankCards.id,
    bankId: bankCards.bankId,
    name: bankCards.name,
    accountType: bankCards.accountType,
  })
  .from(bankCards)
  .where(eq(bankCards.isArchived, false))
  .orderBy(asc(bankCards.name));

  const myCardsRaw = await db.select({
    id: userCards.id,
    lastFour: userCards.lastFourDigits,
    cardName: bankCards.name,
    bankName: banks.name,
    bankLogo: banks.logo,
    bankWebsite: banks.website,
    initialBalance: userCards.initialBalance,
    accountType: userCards.accountType,
    creditLimit: userCards.creditLimit,
  })
  .from(userCards)
  .where(eq(userCards.userId, session.user.id!))
  .leftJoin(bankCards, eq(userCards.bankCardId, bankCards.id))
  .leftJoin(banks, eq(bankCards.bankId, banks.id));

  const cardSumStats = await db
    .select({
      cardId: transactions.userCardId,
      type: transactions.type,
      sumAmount: sql<number>`sum(${transactions.amount})`
    })
    .from(transactions)
    .where(eq(transactions.userId, session.user.id!))
    .groupBy(transactions.userCardId, transactions.type);

  const transferInStats = await db
    .select({
      toCardId: transactions.toUserCardId,
      sumAmount: sql<number>`sum(${transactions.amount})`
    })
    .from(transactions)
    .where(
      and(
        eq(transactions.userId, session.user.id!),
        eq(transactions.type, "transfer")
      )
    )
    .groupBy(transactions.toUserCardId);

  const cardBalances: Record<number, number> = {};
  myCardsRaw.forEach(c => {
    cardBalances[c.id] = Number(c.initialBalance) || 0;
  });

  cardSumStats.forEach(stat => {
    const cardId = stat.cardId;
    const amt = Number(stat.sumAmount) || 0;
    if (cardBalances[cardId] === undefined) return;
    
    if (stat.type === "income") {
      cardBalances[cardId] += amt;
    } else if (stat.type === "expense") {
      cardBalances[cardId] -= amt;
    } else if (stat.type === "transfer") {
      cardBalances[cardId] -= amt;
    }
  });

  transferInStats.forEach(stat => {
    const toCardId = stat.toCardId;
    if (toCardId === null || cardBalances[toCardId] === undefined) return;
    const amt = Number(stat.sumAmount) || 0;
    cardBalances[toCardId] += amt;
  });

  const myCards = myCardsRaw.map(c => ({
    id: c.id,
    lastFour: c.lastFour,
    cardName: c.cardName || "",
    bankName: c.bankName || "",
    bankLogo: c.bankLogo,
    bankWebsite: c.bankWebsite,
    balance: cardBalances[c.id] || 0,
    accountType: c.accountType,
    creditLimit: c.creditLimit,
  }));

  // Fetch unique loyalty programs user has cards for
  const myLoyaltyProgramsRaw = await db
    .selectDistinct({
      id: loyaltyPrograms.id,
      name: loyaltyPrograms.name,
      bankName: banks.name,
      bankLogo: banks.logo,
      bankWebsite: banks.website,
    })
    .from(userCards)
    .innerJoin(bankCards, eq(userCards.bankCardId, bankCards.id))
    .innerJoin(loyaltyPrograms, eq(bankCards.loyaltyProgramId, loyaltyPrograms.id))
    .innerJoin(banks, eq(loyaltyPrograms.bankId, banks.id))
    .where(eq(userCards.userId, session.user.id!));

  // Get current date range for the month
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];

  // Check which programs have rules for this month
  const programsWithRules = await db
    .select({ loyaltyProgramId: userCashbackRules.loyaltyProgramId })
    .from(userCashbackRules)
    .where(
      and(
        eq(userCashbackRules.userId, session.user.id!),
        gte(userCashbackRules.startDate, startOfMonth),
        lte(userCashbackRules.startDate, endOfMonth)
      )
    );

  const programsWithRulesIds = new Set(programsWithRules.map(r => r.loyaltyProgramId));

  const myLoyaltyPrograms = myLoyaltyProgramsRaw.map(p => ({
    ...p,
    hasRules: programsWithRulesIds.has(p.id)
  }));

  return (
    <div className={css({ minH: "100vh", bg: "var(--background)" })}>
      <div className={css({ 
        w: "full", 
        maxW: { base: "512px", lg: "1100px" }, 
        mx: "auto", 
        px: "20px", 
        py: "32px",
        pb: "calc(80px + env(safe-area-inset-bottom))"
      })}>
        <header className={flex({ justify: "space-between", align: "center", mb: "32px" })}>
          <div className={flex({ align: "center", gap: "12px" })}>
            <a href="/" className="sber-icon-button">
              <ArrowLeft size={20} />
            </a>
            <h1 className={css({ fontSize: "24px", fontWeight: "800", color: "var(--foreground)" })}>Мои карты</h1>
          </div>
          <AddCardModalWrapper banks={allBanks} cardTypes={availableCardTypes} />
        </header>

        <div className={stack({ gap: "40px" })}>
          {/* Список программ лояльности */}
          {myLoyaltyPrograms.length > 0 && (
            <section className={stack({ gap: "16px" })}>
              <h3 className="sber-label">ПРОГРАММЫ ЛОЯЛЬНОСТИ (КАТЕГОРИИ)</h3>
              <div className={css({ display: "grid", gridTemplateColumns: { base: "1fr", sm: "repeat(auto-fill, minmax(320px, 1fr))" }, gap: "12px" })}>
                {myLoyaltyPrograms.map(prog => {
                  const bankIcon = getIconUrl({ logo: prog.bankLogo, website: prog.bankWebsite, name: prog.bankName });
                  return (
                    <a key={prog.id} href={`/cards/loyalty-programs/${prog.id}`} className="sber-card" style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: '16px', textDecoration: 'none' }}>
                      <div className={css({ w: "48px", h: "48px", bg: "#f8fafc", borderRadius: "12px", display: "flex", alignItems: "center", justifyContent: "center", border: "1px solid", borderColor: "#f1f5f9", overflow: "hidden", flexShrink: 0 })}>
                        {bankIcon ? (
                          <img src={bankIcon} alt={prog.bankName} className={css({ w: "full", h: "full", objectFit: "contain", p: "4px" })} />
                        ) : (
                          <span style={{ fontSize: "20px" }}>🎁</span>
                        )}
                      </div>
                      <div className={stack({ gap: "2px", flex: "1", minW: 0 })}>
                        <p className={css({ fontWeight: "700", fontSize: "15px", color: "var(--foreground)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" })}>{prog.name}</p>
                        <p className={css({ fontSize: "12px", color: "var(--secondary-text)", fontWeight: "600" })}>{prog.bankName}</p>
                      </div>
                      {prog.hasRules ? (
                        <div className={flex({ align: "center", gap: "4px", bg: "rgba(33, 160, 56, 0.05)", px: "10px", py: "6px", borderRadius: "8px", color: "var(--sber-green)" })}>
                          <Check size={14} strokeWidth={3} />
                          <span className={css({ fontSize: "11px", fontWeight: "800", textTransform: "uppercase", letterSpacing: "0.5px" })}>Выбрано</span>
                        </div>
                      ) : (
                        <span className={css({ fontSize: "11px", fontWeight: "800", color: "var(--sber-green)", bg: "rgba(33, 160, 56, 0.1)", px: "10px", py: "6px", borderRadius: "8px", textTransform: "uppercase", letterSpacing: "0.5px" })}>
                          Выбрать категории
                        </span>
                      )}
                    </a>
                  );
                })}
              </div>
            </section>
          )}

          {/* Список карт */}
          <section className={stack({ gap: "16px" })}>
            <h3 className="sber-label">ВАШИ КАРТЫ</h3>
            <UserCardsList cards={myCards} />
          </section>
        </div>
      </div>
    </div>
  );
}
