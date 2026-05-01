import { db } from "@/db";
import { banks } from "@/db/schema";
import { createBank } from "@/lib/actions/banks";
import { css } from "../../../../../styled-system/css";
import { stack, flex, grid } from "../../../../../styled-system/patterns";
import { Landmark, Plus, ChevronRight } from "lucide-react";
import { getIconUrl } from "@/lib/utils/icons";
import FindWebsiteButtonWrapper from "@/components/admin/FindWebsiteButtonWrapper";

export default async function BanksPage() {
  const allBanks = await db.select().from(banks);

  return (
    <div className={stack({ gap: "32px" })}>
      <h1 className={css({ fontSize: "24px", fontWeight: "800", color: "var(--foreground)" })}>Банки</h1>

      {/* Форма добавления */}
      <section className="sber-card">
        <div className={flex({ align: "center", gap: "10px", mb: "24px" })}>
          <div className={css({ p: "6px", bg: "sberGreen", borderRadius: "8px", color: "white" })}>
            <Plus size={18} />
          </div>
          <h2 className={css({ fontSize: "17px", fontWeight: "700", color: "var(--foreground)" })}>Добавить новый банк</h2>
        </div>

        <form action={createBank} className={stack({ gap: "20px" })}>
          <div className={stack({ gap: "6px" })}>
            <label className="sber-label">НАЗВАНИЕ БАНКА</label>
            <input
              id="bank-name-input"
              name="name"
              type="text"
              required
              placeholder="Например, Сбер"
              className="sber-input"
            />
          </div>
          
          <div className={stack({ gap: "6px" })}>
            <div className={flex({ justify: "space-between", align: "end" })}>
              <label className="sber-label">САЙТ (ДЛЯ АВТО-ИКОНКИ)</label>
              <FindWebsiteButtonWrapper targetInputId="bank-website-input" nameInputId="bank-name-input" />
            </div>
            <input
              id="bank-website-input"
              name="website"
              type="text"
              placeholder="sberbank.ru"
              className="sber-input"
            />
          </div>

          <div className={stack({ gap: "6px" })}>
            <label className="sber-label">URL ЛОГОТИПА (РУЧНОЙ ВВОД)</label>
            <input
              name="logo"
              type="text"
              placeholder="https://example.com/logo.png"
              className="sber-input"
            />
          </div>
          
          <button type="submit" className="sber-button">
            Сохранить банк
          </button>
        </form>
      </section>

      {/* Список банков */}
      <section className={stack({ gap: "16px" })}>
        <h3 className="sber-label">ЗАРЕГИСТРИРОВАННЫЕ БАНКИ</h3>
        <div className={grid({ columns: { base: 1, sm: 2, lg: 3 }, gap: "12px" })}>
          {allBanks.map((bank) => {
            const icon = getIconUrl(bank);
            return (
              <a key={bank.id} href={`/admin/banks/${bank.id}`} className="sber-card" style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div className={css({ w: "48px", h: "48px", bg: "#f8fafc", borderRadius: "12px", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", border: "1px solid", borderColor: "#f1f5f9", flexShrink: 0 })}>
                  {icon ? (
                    <img src={icon} alt={bank.name} className={css({ w: "full", h: "full", objectFit: "contain", p: "4px" })} />
                  ) : (
                    <Landmark size={20} color="#94a3b8" />
                  )}
                </div>
                <div className={stack({ gap: "0", flex: "1", overflow: "hidden" })}>
                  <p className={css({ fontWeight: "700", fontSize: "15px", color: "var(--foreground)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" })}>{bank.name}</p>
                  <p className={css({ fontSize: "12px", color: "secondaryText", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" })}>{bank.website || "Сайт не указан"}</p>
                </div>
                <ChevronRight size={18} color="#C7C7CC" className={css({ flexShrink: 0 })} />
              </a>
            );
          })}
          {allBanks.length === 0 && (
            <div className={css({ gridColumn: "1/-1", py: "40px", textAlign: "center", color: "secondaryText", bg: "var(--card-bg)", borderRadius: "24px", border: "1px dashed", borderColor: "#e2e8f0" })}>
              Список банков пуст
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
