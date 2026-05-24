import { db } from "@/db";
import { banks, bankCards, userCards } from "@/db/schema";
import { auth } from "@/auth";
import { css } from "../../../../styled-system/css";
import { stack, flex, grid } from "../../../../styled-system/patterns";
import { eq, asc } from "drizzle-orm";
import { redirect } from "next/navigation";
import { ArrowLeft, Plus, ChevronRight, Landmark } from "lucide-react";
import AddUserCardForm from "@/components/AddUserCardForm";
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
  })
  .from(bankCards)
  .where(eq(bankCards.isArchived, false))
  .orderBy(asc(bankCards.name));

  const myCards = await db.select({
    id: userCards.id,
    lastFour: userCards.lastFourDigits,
    cardName: bankCards.name,
    bankName: banks.name,
    bankLogo: banks.logo,
    bankWebsite: banks.website,
  })
  .from(userCards)
  .where(eq(userCards.userId, session.user.id!))
  .leftJoin(bankCards, eq(userCards.bankCardId, bankCards.id))
  .leftJoin(banks, eq(bankCards.bankId, banks.id));

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
        <header className={stack({ gap: "4px", mb: "32px" })}>
          <a href="/" className="sber-icon-button">
            <ArrowLeft size={20} />
          </a>
          <h1 className={css({ fontSize: "24px", fontWeight: "800", color: "var(--foreground)" })}>Мои карты</h1>
        </header>

        <div className={stack({ gap: "40px" })}>
          {/* Форма добавления */}
          <section className="sber-card">
            <div className={flex({ align: "center", gap: "10px", mb: "24px" })}>
              <div className={css({ p: "6px", bg: "sberGreen", borderRadius: "8px", color: "white" })}>
                <Plus size={18} />
              </div>
              <h2 className={css({ fontSize: "17px", fontWeight: "700", color: "var(--foreground)" })}>Добавить карту</h2>
            </div>
            
            <AddUserCardForm banks={allBanks} cardTypes={availableCardTypes} />
          </section>

          {/* Список карт */}
          <section className={stack({ gap: "16px" })}>
            <h3 className="sber-label">ВАШИ КАРТЫ</h3>
            <div className={grid({ columns: { base: 1, sm: 2, lg: 3 }, gap: "12px" })}>
              {myCards.length === 0 ? (
                <div className={css({ py: "40px", textAlign: "center", color: "secondaryText", bg: "var(--card-bg)", borderRadius: "24px", border: "1px dashed", borderColor: "#e2e8f0", fontSize: "14px", gridColumn: "1 / -1" })}>
                  Пока нет добавленных карт
                </div>
              ) : (
                myCards.map(card => {
                  const bankIcon = getIconUrl({ logo: card.bankLogo, website: card.bankWebsite, name: card.bankName || "" });
                  return (
                    <a key={card.id} href={`/cards/${card.id}`} className="sber-card" style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: '16px', textDecoration: 'none', transition: 'all 0.2s' }}>
                      <div className={css({ w: "52px", h: "34px", bg: "var(--surface-secondary)", borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center", border: "1px solid", borderColor: "var(--border-color)", overflow: "hidden" })}>
                        {bankIcon ? (
                          <img src={bankIcon} alt={card.bankName || ""} className={css({ w: "full", h: "full", objectFit: "contain", p: "2px" })} />
                        ) : (
                          <Landmark size={18} color="#94a3b8" />
                        )}
                      </div>
                      <div className={stack({ gap: "0", flex: "1" })}>
                        <p className={css({ fontWeight: "700", fontSize: "16px", color: "var(--foreground)" })}>{card.cardName}</p>
                        <p className={css({ fontSize: "13px", color: "secondaryText", fontWeight: "500" })}>
                          {card.bankName} {card.lastFour ? `• ${card.lastFour}` : ''}
                        </p>
                      </div>
                      <ChevronRight size={18} className={css({ color: "#cbd5e1" })} />
                    </a>
                  );
                })
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
