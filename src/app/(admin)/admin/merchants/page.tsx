import { db } from "@/db";
import { merchants, mccCodes } from "@/db/schema";
import { createMerchant, updateMerchant, deleteMerchant } from "@/lib/actions/merchants";
import { css } from "../../../../../styled-system/css";
import { stack, flex, wrap, grid } from "../../../../../styled-system/patterns";
import { Plus, Store, Trash2, Tag, Hash, Save, Globe } from "lucide-react";
import { asc } from "drizzle-orm";
import SearchableSelect from "@/components/SearchableSelect";
import { getIconUrl } from "@/lib/utils/icons";
import FindWebsiteButtonWrapper from "@/components/admin/FindWebsiteButtonWrapper";
import DeleteMerchantButton from "@/components/admin/DeleteMerchantButton";

export default async function MerchantsPage() {
  const allMerchants = await db.select().from(merchants).orderBy(asc(merchants.name));
  const allMccs = await db.select({ code: mccCodes.code, name: mccCodes.description }).from(mccCodes).orderBy(asc(mccCodes.code));

  const mccOptions = allMccs.map(mcc => ({
    value: mcc.code,
    label: `${mcc.code} — ${mcc.name}`
  }));

  return (
    <div className={stack({ gap: "32px" })}>
      <h1 className={css({ fontSize: "24px", fontWeight: "800", color: "#000" })}>Мерчанты</h1>

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
          <h2 className={css({ fontSize: "17px", fontWeight: "700", color: "#000" })}>Новый мерчант</h2>
        </div>

        <form action={createMerchant} className={stack({ gap: "20px" })}>
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
        </form>
      </section>

      {/* Список мерчантов */}
      <section className={stack({ gap: "16px" })}>
        <h3 className="sber-label">СПИСОК ТОРГОВЫХ ТОЧЕК</h3>
        <div className={stack({ gap: "12px" })}>
          {allMerchants.map((merchant) => {
            const icon = getIconUrl(merchant);
            return (
              <div key={merchant.id} className="sber-card" style={{ padding: '16px' }}>
                <form action={updateMerchant.bind(null, merchant.id)} className={stack({ gap: "16px" })}>
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
                          className={css({ fontWeight: "700", fontSize: "16px", color: "#000", border: "none", bg: "transparent", borderBottom: "1px dashed", borderColor: "#e2e8f0", w: "full", _focus: { borderColor: "sberGreen", outline: "none" } })}
                        />
                        <div className={stack({ gap: "2px", mt: "4px", w: "full", maxW: { base: "200px", sm: "300px" } })}>
                          <label className={css({ fontSize: "9px", fontWeight: "800", color: "secondaryText" })}>ОСНОВНОЙ MCC</label>
                          <SearchableSelect 
                            name="mainMcc" 
                            options={mccOptions}
                            required 
                            defaultValue={merchant.mainMcc}
                          />
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
                      className={css({ fontSize: "12px", color: "#475569", bg: "#f1f5f9", px: "8px", py: "4px", borderRadius: "8px", border: "none", width: "full", _focus: { outline: "none", ring: "1px solid gray" } })}
                    />
                  </div>
                </form>
                
                <div className={flex({ justify: "flex-end", mt: "12px" })}>
                   <DeleteMerchantButton merchantId={merchant.id} merchantName={merchant.name} />
                </div>
              </div>
            );
          })}
          {allMerchants.length === 0 && (
            <div className={css({ py: "40px", textAlign: "center", color: "secondaryText", bg: "white", borderRadius: "24px" })}>
              Список мерчантов пуст
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
