import { db } from "@/db";
import { merchants, mccCodes } from "@/db/schema";
import { createMerchant } from "@/lib/actions/merchants";
import { getSpendingCategoryOptions } from "@/lib/actions/spending-categories";
import { css } from "../../../../../styled-system/css";
import { stack, flex } from "../../../../../styled-system/patterns";
import { Plus } from "lucide-react";
import { asc } from "drizzle-orm";
import SearchableSelect from "@/components/SearchableSelect";
import FindWebsiteButtonWrapper from "@/components/admin/FindWebsiteButtonWrapper";
import MerchantFormWrapper from "@/components/admin/MerchantFormWrapper";
import AdminMerchantsList from "@/components/admin/AdminMerchantsList";

export const dynamic = "force-dynamic";

export default async function MerchantsPage() {
  const allMerchants = await db.select().from(merchants).orderBy(asc(merchants.name));
  const allMccs = await db.select({ code: mccCodes.code, name: mccCodes.description }).from(mccCodes).orderBy(asc(mccCodes.code));
  const categoryOptions = await getSpendingCategoryOptions();

  const mccOptions = allMccs.map(mcc => ({
    value: mcc.code,
    label: `${mcc.code} — ${mcc.name}`
  }));

  return (
    <div className={stack({ gap: "32px" })}>
      <h1 className={css({ fontSize: "24px", fontWeight: "800", color: "var(--foreground)" })}>Мерчанты</h1>

      {/* Global MCC Search List */}
      <datalist id="mcc-list">
        {allMccs.map(mcc => (
          <option key={mcc.code} value={`${mcc.code} — ${mcc.name}`} />
        ))}
      </datalist>

      {/* Форма добавления */}
      <section className="sber-card">
        <div className={flex({ align: "center", gap: "10px", mb: "24px" })}>
          <div className={css({ p: "6px", bg: "sberGreen", borderRadius: "8px", color: "white" })}>
            <Plus size={18} />
          </div>
          <h2 className={css({ fontSize: "17px", fontWeight: "700", color: "var(--foreground)" })}>Новый мерчант</h2>
        </div>

        <MerchantFormWrapper action={createMerchant} successMessage="Мерчант успешно добавлен" className={stack({ gap: "20px" })}>
          <div className={stack({ gap: "6px" })}>
            <label className="sber-label">НАЗВАНИЕ ТОРГОВОЙ ТОЧКИ</label>
            <input
              id="merch-name-input"
              name="name"
              type="text"
              required
              placeholder="Например, Ozon"
              className="sber-input"
            />
          </div>

          <div className={stack({ gap: "6px" })}>
             <div className={flex({ justify: "space-between", align: "end" })}>
              <label className="sber-label">САЙТ (ДЛЯ АВТО-ИКОНКИ)</label>
              <FindWebsiteButtonWrapper targetInputId="merch-website-input" nameInputId="merch-name-input" />
            </div>
            <input
              id="merch-website-input"
              name="website"
              type="text"
              placeholder="ozon.ru"
              className="sber-input"
            />
          </div>
          
          <div className={stack({ gap: "6px" })}>
            <label className="sber-label">ОСНОВНОЙ MCC</label>
            <SearchableSelect 
              name="mainMcc" 
              options={mccOptions}
              required 
              placeholder="Поиск MCC по коду или названию..."
            />
          </div>

          <div className={stack({ gap: "6px" })}>
            <label className="sber-label">КАТЕГОРИЯ (ГЛОБАЛЬНАЯ)</label>
            <SearchableSelect 
              name="spendingCategoryId" 
              options={categoryOptions}
              placeholder="Выберите категорию для статистики..."
            />
          </div>

          <div className={stack({ gap: "6px" })}>
            <label className="sber-label">ДОПОЛНИТЕЛЬНЫЕ MCC (ПРОИЗВОЛЬНЫЙ ТЕКСТ)</label>
            <textarea 
              name="additionalMccs" 
              placeholder="Введите MCC через запятую или пробел. Код 0000 будет добавлен автоматически." 
              className="sber-input"
              style={{ minHeight: "80px", paddingTop: "12px" }}
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
            Добавить мерчанта
          </button>
        </MerchantFormWrapper>
      </section>

      {/* Список мерчантов */}
      <section className={stack({ gap: "16px" })}>
        <h3 className="sber-label">СПИСОК ТОРГОВЫХ ТОЧЕК</h3>
        <AdminMerchantsList merchants={allMerchants} mccOptions={mccOptions} categoryOptions={categoryOptions} />
      </section>
    </div>
  );
}

