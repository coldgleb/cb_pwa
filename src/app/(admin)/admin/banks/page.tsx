import { db } from "@/db";
import { banks } from "@/db/schema";
import { createBank } from "@/lib/actions/banks";
import { css } from "../../../../../styled-system/css";
import { stack, flex } from "../../../../../styled-system/patterns";
import { Plus } from "lucide-react";
import FindWebsiteButtonWrapper from "@/components/admin/FindWebsiteButtonWrapper";
import AdminBanksList from "@/components/admin/AdminBanksList";

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
        <AdminBanksList banks={allBanks} />
      </section>
    </div>
  );
}
