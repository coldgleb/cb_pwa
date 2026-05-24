import { db } from "@/db";
import { merchants, mccCodes } from "@/db/schema";
import { createMerchant, updateMerchant, deleteMerchant } from "@/lib/actions/merchants";
import { getSpendingCategoryOptions } from "@/lib/actions/spending-categories";
import { css } from "../../../../../styled-system/css";
import { stack, flex, grid } from "../../../../../styled-system/patterns";
import { Plus, Store, Save } from "lucide-react";
import { asc } from "drizzle-orm";
import SearchableSelect from "@/components/SearchableSelect";
import { getIconUrl } from "@/lib/utils/icons";
import FindWebsiteButtonWrapper from "@/components/admin/FindWebsiteButtonWrapper";
import DeleteMerchantButton from "@/components/admin/DeleteMerchantButton";
import MerchantFormWrapper from "@/components/admin/MerchantFormWrapper";

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
        <div className={grid({ columns: { base: 1, xl: 2 }, gap: "12px" })}>
          {allMerchants.map((merchant) => {
            const icon = getIconUrl(merchant);
            return (
              <div key={merchant.id} className="sber-card" style={{ padding: '16px' }}>
                <MerchantFormWrapper action={updateMerchant.bind(null, merchant.id)} successMessage="Данные мерчанта обновлены" className={stack({ gap: "16px" })}>
                  <div className={flex({ justify: "space-between", align: "start", gap: "12px" })}>
                    <div className={flex({ align: "center", gap: "12px", flex: 1, minW: 0 })}>
                      <div className={css({ w: "48px", h: "48px", bg: "#f8fafc", borderRadius: "12px", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", border: "1px solid", borderColor: "#f1f5f9", flexShrink: 0 })}>
                        {icon ? (
                          <img src={icon} alt={merchant.name} className={css({ w: "full", h: "full", objectFit: "contain", p: "4px" })} />
                        ) : (
                          <Store size={20} color="#94a3b8" />
                        )}
                      </div>
                      <div className={stack({ gap: "4px", flex: 1, minW: 0 })}>
                        <input 
                          name="name" 
                          defaultValue={merchant.name} 
                          required 
                          className={css({ fontWeight: "700", fontSize: "16px", color: "var(--foreground)", border: "none", bg: "transparent", borderBottom: "1px dashed", borderColor: "#e2e8f0", w: "full", _focus: { borderColor: "sberGreen", outline: "none" } })}
                        />
                        <div className={grid({ columns: 2, gap: "8px", mt: "4px" })}>
                          <div className={stack({ gap: "2px" })}>
                            <label className={css({ fontSize: "9px", fontWeight: "800", color: "secondaryText" })}>MCC</label>
                            <SearchableSelect 
                              name="mainMcc" 
                              options={mccOptions}
                              required 
                              defaultValue={merchant.mainMcc}
                            />
                          </div>
                          <div className={stack({ gap: "2px" })}>
                            <label className={css({ fontSize: "9px", fontWeight: "800", color: "secondaryText" })}>КАТЕГОРИЯ</label>
                            <SearchableSelect 
                              name="spendingCategoryId" 
                              options={categoryOptions}
                              defaultValue={merchant.spendingCategoryId?.toString()}
                              placeholder="Категория"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className={css({ flexShrink: 0 })}>
                      <button type="submit" className={css({ p: "8px", color: "sberGreen", cursor: "pointer", _hover: { bg: "#f0fdf4", borderRadius: "full" }, WebkitTapHighlightColor: "transparent" })}>
                        <Save size={20} />
                      </button>
                    </div>
                  </div>

                  <div className={grid({ columns: 2, gap: "12px" })}>
                    <div className={stack({ gap: "4px" })}>
                      <label className="sber-label">САЙТ</label>
                      <input 
                        name="website" 
                        defaultValue={merchant.website || ""} 
                        className="sber-input" 
                        style={{ fontSize: "12px", padding: "8px" }}
                      />
                    </div>
                    <div className={stack({ gap: "4px" })}>
                      <label className="sber-label">ЛОГО (URL)</label>
                      <input 
                        name="logo" 
                        defaultValue={merchant.logo || ""} 
                        className="sber-input" 
                        style={{ fontSize: "12px", padding: "8px" }}
                      />
                    </div>
                  </div>

                  <div className={stack({ gap: "4px" })}>
                    <label className={css({ fontSize: "10px", fontWeight: "800", color: "secondaryText", textTransform: "uppercase" })}>Дополнительные MCC</label>
                    <input 
                      name="additionalMccs" 
                      defaultValue={merchant.additionalMccs} 
                      className={css({ fontSize: "12px", color: "var(--foreground)", bg: "var(--input-bg)", px: "8px", py: "4px", borderRadius: "8px", border: "none", width: "full", _focus: { outline: "none", ring: "1px solid gray" } })}
                    />
                  </div>
                </MerchantFormWrapper>
                
                <div className={flex({ justify: "flex-end", mt: "12px" })}>
                   <DeleteMerchantButton merchantId={merchant.id} merchantName={merchant.name} />
                </div>
              </div>
            );
          })}
          {allMerchants.length === 0 && (
            <div className={css({ gridColumn: "1/-1", py: "40px", textAlign: "center", color: "secondaryText", bg: "var(--card-bg)", borderRadius: "24px" })}>
              Список мерчантов пуст
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
