import { db } from "@/db";
import { banks, bankCards } from "@/db/schema";
import { createBankCard } from "@/lib/actions/bank-cards";
import { css } from "../../../../../styled-system/css";
import { stack, flex, grid } from "../../../../../styled-system/patterns";
import { eq, asc } from "drizzle-orm";
import { CreditCard, Plus, ChevronRight, Landmark } from "lucide-react";
import SearchableSelect from "@/components/SearchableSelect";
import { getIconUrl } from "@/lib/utils/icons";

export default async function AdminBankCardsPage() {
  const allBanks = await db.select().from(banks).orderBy(asc(banks.name));
  const allBankCards = await db.select({
    id: bankCards.id,
    name: bankCards.name,
    bankName: banks.name,
    bankLogo: banks.logo,
    bankWebsite: banks.website,
  }).from(bankCards).leftJoin(banks, eq(bankCards.bankId, banks.id)).orderBy(asc(banks.name));

  const bankOptions = allBanks.map(bank => ({
    value: bank.id.toString(),
    label: bank.name
  }));

  return (
    <div className={stack({ gap: "32px" })}>
      <h1 className={css({ fontSize: "24px", fontWeight: "800", color: "var(--foreground)" })}>Типы карт</h1>

      {/* Форма добавления */}
      <section className="sber-card">
        <div className={flex({ align: "center", gap: "10px", mb: "24px" })}>
          <div className={css({ p: "6px", bg: "sberGreen", borderRadius: "8px", color: "white" })}>
            <Plus size={18} />
          </div>
          <h2 className={css({ fontSize: "17px", fontWeight: "700", color: "var(--foreground)" })}>Добавить тип карты</h2>
        </div>

        <form action={createBankCard} className={stack({ gap: "20px" })}>
          <div className={stack({ gap: "6px" })}>
            <label className="sber-label">БАНК-ЭМИТЕНТ</label>
            <SearchableSelect 
              name="bankId" 
              options={bankOptions}
              required
              placeholder="Выберите банк..."
            />
          </div>
          <div className={stack({ gap: "6px" })}>
            <label className="sber-label">НАЗВАНИЕ КАРТЫ</label>
            <input
              name="name"
              type="text"
              required
              placeholder="Например, Tinkoff Black"
              className="sber-input"
            />
          </div>
          <div className={stack({ gap: "6px" })}>
            <label className="sber-label">ЛИМИТ КЕШБЭКА В МЕСЯЦ (ПО УМОЛЧАНИЮ)</label>
            <input
              name="defaultCashbackLimit"
              type="number"
              placeholder="Например, 5000"
              className="sber-input"
            />
          </div>
          <button type="submit" className="sber-button">
            Сохранить тип карты
          </button>
        </form>
      </section>

      {/* Список типов карт */}
      <section className={stack({ gap: "16px" })}>
        <h3 className="sber-label">ДОСТУПНЫЕ ТИПЫ КАРТ</h3>
        <div className={grid({ columns: { base: 1, sm: 2, lg: 3 }, gap: "12px" })}>
          {allBankCards.map(card => {
            const bankIcon = getIconUrl({ logo: card.bankLogo, website: card.bankWebsite, name: card.bankName || "" });
            return (
              <a key={card.id} href={`/admin/bank-cards/${card.id}`} className="sber-card" style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div className={css({ w: "48px", h: "48px", bg: "#f8fafc", borderRadius: "12px", display: "flex", alignItems: "center", justifyContent: "center", border: "1px solid", borderColor: "#f1f5f9", overflow: "hidden", flexShrink: 0 })}>
                  {bankIcon ? (
                    <img src={bankIcon} alt={card.bankName || ""} className={css({ w: "full", h: "full", objectFit: "contain", p: "4px" })} />
                  ) : (
                    <Landmark size={20} color="#94a3b8" />
                  )}
                </div>
                <div className={stack({ gap: "0", flex: "1", overflow: "hidden" })}>
                  <p className={css({ fontWeight: "700", fontSize: "15px", color: "var(--foreground)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" })} title={card.name}>{card.name}</p>
                  <p className={css({ fontSize: "12px", color: "secondaryText", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" })} title={card.bankName || ""}>{card.bankName}</p>
                </div>
                <ChevronRight size={18} color="#C7C7CC" className={css({ flexShrink: 0 })} />
              </a>
            );
          })}
          {allBankCards.length === 0 && (
            <div className={css({ gridColumn: "1/-1", py: "40px", textAlign: "center", color: "secondaryText", bg: "var(--card-bg)", borderRadius: "24px", border: "1px dashed", borderColor: "#e2e8f0" })}>
              Типы карт еще не созданы
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
