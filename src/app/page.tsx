import { db } from "@/db";
import { userCards, transactions, banks, bankCards, users, creditPayments } from "@/db/schema";
import { auth } from "@/auth";
import { loginUser, logoutUser } from "@/lib/actions/auth";
import { css } from "../../styled-system/css";
import { stack, flex } from "../../styled-system/patterns";
import { eq, sql, and, asc } from "drizzle-orm";
import { LogOut, ShieldCheck, ChevronRight, Landmark, Calendar, TrendingUp, AlertCircle } from "lucide-react";
import { getIconUrl } from "@/lib/utils/icons";
import ThemeIconButton from "@/components/ThemeIconButton";
import PaymentCalendar from "@/components/PaymentCalendar";

const getAccountTypeLabel = (type: string) => {
  switch (type) {
    case "credit": return "Кредитная карта";
    case "cardless": return "Счет без карты";
    case "investments": return "Инвестиции";
    case "bonus": return "Бонусный счет";
    default: return "Дебетовая карта";
  }
};

export const dynamic = "force-dynamic";

export default async function Home() {
  const session = await auth();
  
  let userCardsWithBalances: any[] = [];
  let stats = { totalBalance: 0, debt: 0 };
  let allPayments: any[] = [];

  if (session?.user?.id) {
    try {
      // 1. Fetch payments for the calendar
      allPayments = await db
        .select({
          id: creditPayments.id,
          userCardId: creditPayments.userCardId,
          amount: creditPayments.amount,
          dueDate: creditPayments.dueDate,
          paymentType: creditPayments.paymentType,
          isPaid: creditPayments.isPaid,
          cardName: bankCards.name,
          bankName: banks.name,
        })
        .from(creditPayments)
        .innerJoin(userCards, eq(creditPayments.userCardId, userCards.id))
        .innerJoin(bankCards, eq(userCards.bankCardId, bankCards.id))
        .innerJoin(banks, eq(bankCards.bankId, banks.id))
        .where(eq(creditPayments.userId, session.user.id));

      // 2. Card balances calculations
      const myCards = await db
        .select({
          id: userCards.id,
          lastFour: userCards.lastFourDigits,
          cardName: bankCards.name,
          bankName: banks.name,
          bankLogo: banks.logo,
          bankWebsite: banks.website,
          initialBalance: userCards.initialBalance,
          accountType: userCards.accountType,
          creditLimit: userCards.creditLimit,
          statementDay: userCards.statementDay,
          paymentDay: userCards.paymentDay,
        })
        .from(userCards)
        .where(eq(userCards.userId, session.user.id))
        .leftJoin(bankCards, eq(userCards.bankCardId, bankCards.id))
        .leftJoin(banks, eq(bankCards.bankId, banks.id));

      const cardSumStats = await db
        .select({
          cardId: transactions.userCardId,
          type: transactions.type,
          sumAmount: sql<number>`sum(${transactions.amount})`
        })
        .from(transactions)
        .where(eq(transactions.userId, session.user.id))
        .groupBy(transactions.userCardId, transactions.type);

      const transferInStats = await db
        .select({
          toCardId: transactions.toUserCardId,
          sumAmount: sql<number>`sum(${transactions.amount})`
        })
        .from(transactions)
        .where(
          and(
            eq(transactions.userId, session.user.id),
            eq(transactions.type, "transfer")
          )
        )
        .groupBy(transactions.toUserCardId);

      const cardBalances: Record<number, number> = {};
      myCards.forEach(c => {
        cardBalances[c.id] = Number(c.initialBalance) || 0;
      });

      cardSumStats.forEach(stat => {
        const cardId = stat.cardId;
        const amt = Number(stat.sumAmount) || 0;
        if (cardBalances[cardId] === undefined) return;
        
        if (stat.type === "income") {
          cardBalances[cardId] += amt;
        } else if (stat.type === "expense" || stat.type === "transfer") {
          cardBalances[cardId] -= amt;
        }
      });

      transferInStats.forEach(stat => {
        const toCardId = stat.toCardId;
        if (toCardId === null || cardBalances[toCardId] === undefined) return;
        const amt = Number(stat.sumAmount) || 0;
        cardBalances[toCardId] += amt;
      });

      let totalDebt = 0;
      let totalWealth = 0;
      userCardsWithBalances = myCards.map(c => {
        const balance = cardBalances[c.id] || 0;
        totalWealth += balance;
        if (balance < 0) totalDebt += Math.abs(balance);
        return {
          id: c.id,
          lastFour: c.lastFour,
          cardName: c.cardName || "",
          bankName: c.bankName || "",
          bankLogo: c.bankLogo,
          bankWebsite: c.bankWebsite,
          balance: balance,
          accountType: c.accountType,
          creditLimit: c.creditLimit,
          statementDay: c.statementDay,
          paymentDay: c.paymentDay,
        };
      });

      stats = {
        totalBalance: totalWealth,
        debt: totalDebt
      };

    } catch (e) {
      console.error("Dashboard query error:", e);
    }
  }

  let userName = session?.user?.name || session?.user?.email || 'Гость';
  
  if (session?.user?.id) {
    const [dbUser] = await db.select({ name: users.name }).from(users).where(eq(users.id, session.user.id)).limit(1);
    if (dbUser?.name) {
      userName = dbUser.name;
    }
  }

  const shortName = (userName as string).split(' ')[0] || 'Гость';
  const creditCards = userCardsWithBalances.filter(c => c.accountType === "credit");

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
        
        {/* Header */}
        <header className={flex({ justify: "space-between", align: "center", mb: "40px" })}>
          {session ? (
            <>
              <div className={flex({ align: "center", gap: "14px" })}>
                <a href="/profile" className={css({ w: "52px", h: "52px", borderRadius: "18px", bg: "var(--card-bg)", display: "flex", alignItems: "center", justifyContent: "center", shadow: "0 4px 12px rgba(0,0,0,0.05)", fontSize: "24px", border: "1px solid", borderColor: "var(--border-color)", cursor: "pointer", transition: "all 0.2s", _hover: { transform: "scale(1.05)" } })}>
                  👤
                </a>
                <div className={stack({ gap: "0" })}>
                  <p className={css({ fontSize: "14px", color: "var(--secondary-text)", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.02em" })}>Добрый день,</p>
                  <p className={css({ fontSize: "20px", fontWeight: "800", color: "var(--foreground)" })}>{shortName}</p>
                </div>
              </div>
              <div className={flex({ align: "center", gap: "10px" })}>
                <ThemeIconButton />
                <form action={logoutUser}>
                  <button className={css({ p: "12px", color: "var(--secondary-text)", bg: "var(--card-bg)", borderRadius: "14px", cursor: "pointer", shadow: "sm", border: "1px solid", borderColor: "var(--border-color)", _hover: { color: "#ef4444" } })}>
                    <LogOut size={22} />
                  </button>
                </form>
              </div>
            </>
          ) : (
            <>
              <div className={flex({ align: "center", gap: "8px" })}>
                <div className={css({ w: "32px", h: "32px", bg: "sberGreen", borderRadius: "10px", display: "flex", alignItems: "center", justifyContent: "center", color: "white" })}>
                  <ShieldCheck size={18} />
                </div>
                <span className={css({ fontSize: "18px", fontWeight: "800", color: "var(--foreground)" })}>Кешбэк Трекер</span>
              </div>
              <ThemeIconButton />
            </>
          )}
        </header>

        <main>
          {session ? (
            <div className={stack({ gap: "32px" })}>
              {/* Financial Summary */}
              <section className={stack({ gap: "16px" })}>
                <h2 className={css({ fontSize: "18px", fontWeight: "800", color: "var(--foreground)", px: "4px" })}>Сводка</h2>
                <div className={css({ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" })}>
                  <div className="sber-card" style={{ padding: "16px", border: "none", background: "var(--sber-green)", color: "white" }}>
                    <div className={flex({ align: "center", gap: "8px", mb: "8px", color: "white" })}>
                      <Landmark size={16} />
                      <span className={css({ fontSize: "11px", fontWeight: "800", textTransform: "uppercase", opacity: 0.9 })}>Всего средств</span>
                    </div>
                    <p className={css({ fontSize: "20px", fontWeight: "900" })}>
                      {stats.totalBalance.toLocaleString("ru-RU")} ₽
                    </p>
                  </div>
                  <div className="sber-card" style={{ padding: "16px", border: "none", background: "rgba(239, 68, 68, 0.1)" }}>
                    <div className={flex({ align: "center", gap: "8px", mb: "8px", color: "#ef4444" })}>
                      <AlertCircle size={16} />
                      <span className={css({ fontSize: "11px", fontWeight: "800", textTransform: "uppercase" })}>Общий долг</span>
                    </div>
                    <p className={css({ fontSize: "20px", fontWeight: "900", color: "#ef4444" })}>
                      {stats.debt.toLocaleString("ru-RU")} ₽
                    </p>
                  </div>
                </div>
              </section>

              {/* Payment Calendar */}
              {creditCards.length > 0 && (
                <PaymentCalendar 
                  payments={allPayments} 
                  creditCards={userCardsWithBalances
                    .filter(c => c.accountType === "credit")
                    .map(c => ({ id: c.id, name: c.cardName, bankName: c.bankName, lastFour: c.lastFour }))} 
                />
              )}

              {/* Cards and Accounts */}
              <section className={stack({ gap: "16px" })}>
                <div className={flex({ justify: "space-between", align: "center", px: "4px" })}>
                  <h2 className={css({ fontSize: "18px", fontWeight: "800", color: "var(--foreground)" })}>Карты и счета</h2>
                  <a href="/cards" className={css({ fontSize: "14px", fontWeight: "800", color: "sberGreen", textDecoration: "none", display: "flex", alignItems: "center", gap: "2px", _hover: { textDecoration: "underline" } })}>
                    Управлять <ChevronRight size={16} />
                  </a>
                </div>

                {userCardsWithBalances.length === 0 ? (
                  <div className={css({ py: "32px", textAlign: "center", color: "secondaryText", bg: "var(--card-bg)", borderRadius: "24px", border: "1px dashed #cbd5e1", fontSize: "14px" })}>
                    У вас пока нет добавленных карт. Добавьте в разделе "Управлять".
                  </div>
                ) : (
                  <div className="sber-card" style={{ padding: "8px 16px" }}>
                    <div className={stack({ gap: "0" })}>
                      {userCardsWithBalances.map((card, idx) => {
                        const bankIcon = getIconUrl({ logo: card.bankLogo, website: card.bankWebsite, name: card.bankName });
                        const isNegative = card.balance < 0;
                        return (
                          <a 
                            key={card.id} 
                            href={`/cards/${card.id}`} 
                            className={flex({ 
                              justify: "space-between", 
                              align: "center", 
                              py: "12px", 
                              textDecoration: "none", 
                              color: "inherit",
                              borderBottom: idx === userCardsWithBalances.length - 1 ? "none" : "1px solid var(--separator)",
                              _hover: { opacity: 0.8 } 
                            })}
                          >
                            <div className={flex({ align: "center", gap: "10px", minW: 0 })}>
                              <div className={css({ 
                                w: "28px", 
                                h: "28px", 
                                borderRadius: "8px", 
                                bg: "var(--surface-secondary)", 
                                border: "1px solid var(--border-color)", 
                                overflow: "hidden", 
                                display: "flex", 
                                alignItems: "center", 
                                justifyContent: "center",
                                flexShrink: 0 
                              })}>
                                {bankIcon ? (
                                  <img src={bankIcon} className={css({ w: "full", h: "full", objectFit: "contain", p: "2px" })} alt={card.bankName} />
                                ) : (
                                  <Landmark size={14} color="var(--secondary-text)" />
                                )}
                              </div>
                              <div className={stack({ gap: "0", minW: 0 })}>
                                <span className={css({ fontWeight: "700", fontSize: "14px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", color: "var(--foreground)" })}>
                                  {card.bankName} {card.cardName}
                                </span>
                                <span className={css({ fontSize: "11px", color: "var(--secondary-text)", fontWeight: "600" })}>
                                  {getAccountTypeLabel(card.accountType)} {card.lastFour ? `• ${card.lastFour}` : ''}
                                </span>
                              </div>
                            </div>
                            <div className={stack({ align: "end", gap: "0", flexShrink: 0 })}>
                              <span className={css({ fontWeight: "900", fontSize: "15px", color: isNegative ? "#ef4444" : "var(--foreground)" })}>
                                {card.balance.toLocaleString("ru-RU")} ₽
                              </span>
                              {card.accountType === "credit" && card.creditLimit !== null && (
                                <span className={css({ fontSize: "10px", color: "#f97316", fontWeight: "700" })}>
                                  Лимит: {card.creditLimit.toLocaleString("ru-RU")} ₽
                                </span>
                              )}
                            </div>
                          </a>
                        );
                      })}
                    </div>
                  </div>
                )}
              </section>
            </div>
          ) : (
            <div className={stack({ align: "center", py: "40px", gap: "40px" })}>
              <div className={stack({ gap: "12px", textAlign: "center" })}>
                <div className={css({ w: "88px", h: "88px", bg: "sberGreen", borderRadius: "32px", mx: "auto", display: "flex", alignItems: "center", justifyContent: "center", color: "white", shadow: "0 15px 30px rgba(33,160,56,0.3)", mb: "12px" })}>
                  <ShieldCheck size={48} />
                </div>
                <h2 className={css({ fontSize: "32px", fontWeight: "900", letterSpacing: "-0.5px", color: "var(--foreground)" })}>Вход в систему</h2>
                <p className={css({ color: "secondaryText", fontSize: "15px", maxWidth: "260px", mx: "auto", fontWeight: "500" })}>
                  Пожалуйста, авторизуйтесь для доступа к вашим данным
                </p>
              </div>

              <div className={stack({ gap: "24px", w: "full", maxWidth: "340px" })}>
                <form action={loginUser} className={stack({ gap: "16px" })}>
                  <div className={stack({ gap: "8px" })}>
                    <label className="sber-label">EMAIL</label>
                    <input
                      name="email"
                      type="email"
                      placeholder="example@mail.ru"
                      required
                      className="sber-input"
                    />
                  </div>
                  <div className={stack({ gap: "8px" })}>
                    <label className="sber-label">ПАРОЛЬ</label>
                    <input
                      name="password"
                      type="password"
                      placeholder="••••••••"
                      required
                      className="sber-input"
                    />
                  </div>
                  <button className="sber-button" style={{ marginTop: '16px' }}>
                    Войти в аккаунт
                  </button>
                </form>
                <div className={stack({ align: "center", gap: "6px", mt: "8px" })}>
                  <p className={css({ fontSize: "14px", color: "secondaryText", fontWeight: "500" })}>Нет профиля?</p>
                  <a href="/register" className={css({ fontSize: "14px", fontWeight: "800", color: "sberGreen", textDecoration: "underline", textUnderlineOffset: "4px" })}>
                    Зарегистрироваться
                  </a>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
