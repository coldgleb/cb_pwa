import { db } from "@/db";
import { banks, bankCards, bankCategories, bankCategoryMcc, bankCardSettings, merchants, bankCategoryMerchant, mccCodes } from "@/db/schema";
import { updateBankCard } from "@/lib/actions/bank-cards";
import { createBankCategory, updateBankCategory, duplicateBankCategory } from "@/lib/actions/categories";
import { addBankCardSetting, deleteBankCardSetting } from "@/lib/actions/bank-card-settings";
import { css } from "../../../../../../styled-system/css";
import { stack, flex, wrap } from "../../../../../../styled-system/patterns";
import { eq, inArray, desc, asc, and, isNull } from "drizzle-orm";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, ShieldCheck, Ban, Tag, Plus, Save, Trash2, History as HistoryIcon, Archive, Store, Copy } from "lucide-react";
import TiersEditor from "@/components/admin/TiersEditor";
import MultiSearchableSelect from "@/components/MultiSearchableSelect";
import { getIconUrl } from "@/lib/utils/icons";
import CategoryActions from "@/components/admin/CategoryActions";

export default async function EditBankCardPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const cardId = parseInt(id);

  if (isNaN(cardId)) notFound();

  const [card] = await db.select().from(bankCards).where(eq(bankCards.id, cardId)).limit(1);
  if (!card) notFound();

  const allBanks = await db.select().from(banks);
  const allMerchants = await db.select().from(merchants).orderBy(asc(merchants.name));
  
  const merchantOptions = allMerchants.map(m => ({
    value: m.id.toString(),
    label: m.name
  }));

  const updateCardWithId = updateBankCard.bind(null, cardId);

  const historicalSettings = await db
    .select()
    .from(bankCardSettings)
    .where(eq(bankCardSettings.bankCardId, cardId))
    .orderBy(desc(bankCardSettings.startDate));

  const today = new Date().toISOString().split('T')[0];
  const effectiveSetting = historicalSettings.find(s => s.startDate <= today) || { roundingType: card.roundingType };

  const rawCategories = await db.select({
    id: bankCategories.id,
    name: bankCategories.name,
    defaultPercentage: bankCategories.defaultPercentage,
    roundingType: bankCategories.roundingType,
    tiers: bankCategories.tiers,
    startDate: bankCategories.startDate,
    endDate: bankCategories.endDate,
    cashbackLimit: bankCategories.cashbackLimit,
  })
  .from(bankCategories)
  .where(eq(bankCategories.bankCardId, cardId));

  // 1-2-Alphabetical Sort
  const sortedCategories = [...rawCategories].sort((a, b) => {
    if (a.name === "Без кешбэка") return -1;
    if (b.name === "Без кешбэка") return 1;
    if (a.name === "Остальные покупки") return -1;
    if (b.name === "Остальные покупки") return 1;
    return a.name.localeCompare(b.name, 'ru');
  });

  const categoryIds = sortedCategories.map(c => c.id);
  const linkedMccs = categoryIds.length > 0 
    ? await db.select({
        categoryId: bankCategoryMcc.categoryId,
        mccCode: bankCategoryMcc.mccCode,
      })
      .from(bankCategoryMcc)
      .where(inArray(bankCategoryMcc.categoryId, categoryIds))
    : [];

  const mccsByCategory = linkedMccs.reduce((acc, curr) => {
    if (!acc[curr.categoryId]) acc[curr.categoryId] = [];
    acc[curr.categoryId].push(curr.mccCode);
    return acc;
  }, {} as Record<number, string[]>);

  const linkedMerchants = categoryIds.length > 0 
    ? await db.select({
        categoryId: bankCategoryMerchant.categoryId,
        merchantName: merchants.name,
      })
      .from(bankCategoryMerchant)
      .innerJoin(merchants, eq(bankCategoryMerchant.merchantId, merchants.id))
      .where(and(inArray(bankCategoryMerchant.categoryId, categoryIds), isNull(bankCategoryMerchant.endDate)))
    : [];

  const merchantsByCategory = linkedMerchants.reduce((acc, curr) => {
    if (!acc[curr.categoryId]) acc[curr.categoryId] = [];
    acc[curr.categoryId].push(curr.merchantName);
    return acc;
  }, {} as Record<number, string[]>);

  const roundingOptions = [
    { value: "no_rounding", label: "Без округлений" },
    { value: "amount_100_down", label: "Сумма до 100р вниз" },
    { value: "cashback_0_01_down", label: "Кешбэк до 0.01 вниз" },
    { value: "cashback_0_01_math", label: "Кешбэк до 0.01 по матем. правилам" },
    { value: "cashback_1_down", label: "Кешбэк до 1р вниз" },
    { value: "halva", label: "Халва (до 1р — 0.01, от 1р — 1р)" },
  ];

  return (
    <div className={css({ minH: "100vh", bg: "#f4f4f4" })}>
      <div className="sber-container">
        <div className={stack({ gap: "40px" })}>
          <header className={stack({ gap: "4px" })}>
            <a href="/admin/bank-cards" className={flex({ align: "center", gap: "8px", fontSize: "12px", fontWeight: "800", color: "sberGreen" })}>
              <ArrowLeft size={14} /> НАЗАД К КАРТАМ
            </a>
            <h1 className={css({ fontSize: "22px", fontWeight: "800", color: "#000" })}>Редактировать тип карты</h1>
          </header>

          <section className="sber-card">
            <form action={async (formData) => {
              "use server";
              await updateCardWithId(formData);
              redirect("/admin/bank-cards");
            }} className={stack({ gap: "24px" })}>
              <div className={stack({ gap: "6px" })}>
                <label className="sber-label">БАНК</label>
                <select 
                  name="bankId" 
                  defaultValue={card.bankId}
                  required
                  className="sber-select"
                >
                  {allBanks.map(bank => (
                    <option key={bank.id} value={bank.id}>{bank.name}</option>
                  ))}
                </select>
              </div>
              <div className={stack({ gap: "6px" })}>
                <label className="sber-label">НАЗВАНИЕ КАРТЫ</label>
                <input
                  name="name"
                  type="text"
                  defaultValue={card.name}
                  required
                  className="sber-input"
                />
              </div>
              <div className={stack({ gap: "6px" })}>
                <label className="sber-label">ОКРУГЛЕНИЕ ПО УМОЛЧАНИЮ (ЕСЛИ НЕТ ИСТОРИИ)</label>
                <select 
                  name="roundingType" 
                  defaultValue={card.roundingType}
                  required
                  className="sber-select"
                >
                  {roundingOptions.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
              <div className={stack({ gap: "6px" })}>
                <label className="sber-label">ЛИМИТ КЕШБЭКА В МЕСЯЦ (ПО УМОЛЧАНИЮ)</label>
                <input
                  name="defaultCashbackLimit"
                  type="number"
                  defaultValue={card.defaultCashbackLimit || ""}
                  placeholder="Например, 5000"
                  className="sber-input"
                />
              </div>
              <button type="submit" className="sber-button">
                Обновить тип карты
              </button>
            </form>
          </section>

          <section className={stack({ gap: "12px" })}>
            <p className="sber-label">ТЕКУЩЕЕ ДЕЙСТВУЮЩЕЕ ОКРУГЛЕНИЕ</p>
            <div className={css({ px: "20px", py: "16px", bg: "sberGreen", color: "white", borderRadius: "18px", shadow: "md", fontWeight: "800", fontSize: "16px" })}>
              {roundingOptions.find(o => o.value === effectiveSetting.roundingType)?.label}
            </div>
          </section>

          <hr className={css({ borderColor: "#e2e8f0" })} />

          {/* Historical Rounding Rules */}
          <section className={stack({ gap: "24px" })}>
            <div className={flex({ align: "center", gap: "10px" })}>
              <div className={css({ p: "6px", bg: "#6366f1", borderRadius: "8px", color: "white" })}>
                <HistoryIcon size={18} />
              </div>
              <h2 className={css({ fontSize: "20px", fontWeight: "800", color: "#000" })}>История правил округления</h2>
            </div>

            <section className="sber-card">
              <h3 className={css({ fontSize: "14px", fontWeight: "700", mb: "16px", color: "secondaryText" })}>НОВОЕ ПРАВИЛО</h3>
              <form action={addBankCardSetting} className={stack({ gap: "20px" })}>
                <input type="hidden" name="bankCardId" value={cardId} />
                <div className={flex({ gap: "12px", wrap: "wrap" })}>
                  <div className={stack({ gap: "6px", flex: 1, minW: "200px" })}>
                    <label className="sber-label">ТИП ОКРУГЛЕНИЯ</label>
                    <select name="roundingType" required className="sber-select">
                      {roundingOptions.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </div>
                  <div className={stack({ gap: "6px", flex: 1, minW: "200px" })}>
                    <label className="sber-label">ДЕЙСТВУЕТ С ДАТЫ</label>
                    <input name="startDate" type="date" required className="sber-input" />
                  </div>
                </div>
                <button type="submit" className="sber-button" style={{ backgroundColor: "#6366f1" }}>
                  Добавить в историю
                </button>
              </form>
            </section>

            <div className={stack({ gap: "12px" })}>
              {historicalSettings.map(s => (
                <div key={s.id} className="sber-card" style={{ padding: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div className={stack({ gap: "2px" })}>
                    <p className={css({ fontWeight: "700", fontSize: "15px", color: "#000" })}>
                      {roundingOptions.find(o => o.value === s.roundingType)?.label}
                    </p>
                    <p className={css({ fontSize: "12px", color: "secondaryText" })}>
                      Действует с: <strong>{s.startDate.split('-').reverse().join('.')}</strong>
                    </p>
                  </div>
                  <form action={deleteBankCardSetting.bind(null, s.id, cardId)}>
                    <button type="submit" className={css({ p: "8px", color: "#ef4444", cursor: "pointer", _hover: { bg: "#fef2f2", borderRadius: "full" } })}>
                      <Trash2 size={16} />
                    </button>
                  </form>
                </div>
              ))}
              {historicalSettings.length === 0 && (
                <div className={css({ py: "20px", textAlign: "center", color: "secondaryText", bg: "white", borderRadius: "20px", border: "1px dashed", borderColor: "#e2e8f0", fontSize: "13px" })}>
                  Нет исторических правил. Используется округление по умолчанию.
                </div>
              )}
            </div>
          </section>

          <hr className={css({ borderColor: "#e2e8f0" })} />

          <div className={stack({ gap: "32px" })}>
            <h2 className={css({ fontSize: "20px", fontWeight: "800", color: "#000" })}>Категории кешбэка</h2>

            {/* Форма добавления категории */}
            <section className="sber-card">
              <div className={flex({ align: "center", gap: "10px", mb: "24px" })}>
                <div className={css({ p: "6px", bg: "sberGreen", borderRadius: "8px", color: "white" })}>
                  <Plus size={18} />
                </div>
                <h3 className={css({ fontSize: "17px", fontWeight: "700", color: "#000" })}>Новая категория</h3>
              </div>

              <form action={createBankCategory} className={stack({ gap: "20px" })}>
                <input type="hidden" name="bankCardId" value={cardId} />
                
                <div className={stack({ gap: "6px" })}>
                  <label className="sber-label">НАЗВАНИЕ КАТЕГОРИИ</label>
                  <input name="name" type="text" required placeholder="Например, Супермаркеты" className="sber-input" />
                </div>

                <div className={flex({ gap: "12px", wrap: "wrap" })}>
                  <div className={stack({ gap: "6px", flex: 1, minW: "180px" })}>
                    <label className="sber-label">Действует С</label>
                    <input name="startDate" type="date" defaultValue={today} required className="sber-input" />
                  </div>
                  <div className={stack({ gap: "6px", flex: 1, minW: "180px" })}>
                    <label className="sber-label">Действует ПО (Архив)</label>
                    <input name="endDate" type="date" className="sber-input" />
                  </div>
                </div>
                
                <div className={stack({ gap: "6px" })}>
                  <label className="sber-label">БАЗОВЫЙ ПРОЦЕНТ (%)</label>
                  <input name="defaultPercentage" type="number" step="0.25" required placeholder="1.5" className="sber-input" />
                </div>

                <div className={stack({ gap: "6px" })}>
                  <label className="sber-label">ЛИМИТ КЕШБЭКА В МЕСЯЦ (₽)</label>
                  <input name="cashbackLimit" type="number" placeholder="Например, 1000" className="sber-input" />
                </div>

                <div className={stack({ gap: "6px" })}>
                  <label className="sber-label">ОКРУГЛЕНИЕ</label>
                  <select name="roundingType" className="sber-select">
                    <option value="inherit">Наследовать от карты</option>
                    {roundingOptions.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>

                <div className={stack({ gap: "6px" })}>
                  <label className="sber-label">МЕРЧАНТЫ (ТОЛЬКО ДЛЯ ЭТИХ МАГАЗИНОВ)</label>
                  <MultiSearchableSelect 
                    name="merchantIds"
                    options={merchantOptions}
                    placeholder="Выберите мерчантов (опционально)..."
                  />
                </div>

                <div className={stack({ gap: "6px" })}>
                  <label className="sber-label">MCC-КОДЫ (ПРОИЗВОЛЬНЫЙ ТЕКСТ)</label>
                  <textarea 
                    name="mccText" 
                    placeholder="Вставьте текст с MCC-кодами. Например: 5411, 5812. Коды будут привязаны автоматически." 
                    className="sber-input"
                    style={{ minHeight: "80px", paddingTop: "12px" }}
                  />
                </div>

                <div className={stack({ gap: "6px" })}>
                  <label className="sber-label">УРОВНИ (ТИРЫ) КЕШБЭКА ОТ СУММЫ ЧЕКА</label>
                  <TiersEditor defaultValue="[]" />
                </div>

                <button type="submit" className="sber-button">
                  Создать категорию
                </button>
              </form>
            </section>

            {/* Список существующих категорий */}
            <div className={stack({ gap: "12px" })}>
              {sortedCategories.map(cat => {
                const isNoCashback = cat.name === "Без кешбэка";
                const isAllPurchases = cat.name === "Остальные покупки";
                const isSystem = isNoCashback || isAllPurchases;
                const isArchived = cat.endDate && cat.endDate < today;
                const mccs = mccsByCategory[cat.id] || [];
                const catsMerchants = merchantsByCategory[cat.id] || [];

                return (
                  <div key={cat.id} className="sber-card" style={{ padding: '16px', border: isSystem ? '1px solid #e2e8f0' : (isArchived ? '1px dashed #cbd5e1' : undefined), background: isSystem ? '#f8fafc' : (isArchived ? '#f1f5f9' : 'white'), opacity: isArchived ? 0.7 : 1 }}>
                    <form action={updateBankCategory.bind(null, cat.id)} className={stack({ gap: "16px" })}>
                      <input type="hidden" name="bankCardId" value={cardId} />
                      
                      <div className={flex({ justify: "space-between", align: "start" })}>
                        <div className={stack({ gap: "2px" })}>
                          <div className={flex({ align: "center", gap: "6px" })}>
                            {isAllPurchases && <ShieldCheck size={14} className={css({ color: "sberGreen" })} />}
                            {isNoCashback && <Ban size={14} className={css({ color: "#64748b" })} />}
                            <p className={css({ fontWeight: "700", fontSize: "15px", color: isArchived ? "secondaryText" : "#000" })}>
                              {cat.name} {isArchived && "(АРХИВ)"}
                            </p>
                          </div>
                          <p className={css({ fontSize: "10px", color: "secondaryText", fontWeight: "600" })}>
                            {cat.startDate.split('-').reverse().join('.')} • {cat.endDate ? cat.endDate.split('-').reverse().join('.') : '...'}
                          </p>
                        </div>
                        
                        <div className={flex({ align: "center", gap: "8px" })}>
                          <div className={flex({ align: "center", gap: "4px" })}>
                            <div className={stack({ gap: "4px", align: "end" })}>
                               <div className={flex({ align: "center", gap: "4px" })}>
                                <input 
                                  name="defaultPercentage" 
                                  type="number" 
                                  step="0.25" 
                                  defaultValue={isNoCashback ? 0 : cat.defaultPercentage}
                                  readOnly={isNoCashback}
                                  className={css({ w: "60px", p: "4px 8px", borderRadius: "8px", border: "1px solid #e2e8f0", fontSize: "14px", fontWeight: "800", textAlign: "right", opacity: isNoCashback ? 0.6 : 1 })}
                                />
                                <span className={css({ fontSize: "14px", fontWeight: "800", color: "#64748b" })}>%</span>
                               </div>
                               {!isNoCashback && (
                                 <div className={flex({ align: "center", gap: "4px" })}>
                                   <span className={css({ fontSize: "9px", fontWeight: "800", color: "secondaryText" })}>ЛИМИТ</span>
                                   <input 
                                     name="cashbackLimit" 
                                     type="number" 
                                     defaultValue={cat.cashbackLimit || ""}
                                     placeholder="0"
                                     className={css({ w: "60px", p: "2px 6px", borderRadius: "6px", border: "1px solid #e2e8f0", fontSize: "11px", fontWeight: "700", textAlign: "right" })}
                                   />
                                   <span className={css({ fontSize: "11px", fontWeight: "700", color: "secondaryText" })}>₽</span>
                                 </div>
                               )}
                            </div>
                          </div>
                          <button type="submit" className={css({ p: "6px", bg: "sberGreen", color: "white", borderRadius: "8px", cursor: "pointer", _hover: { opacity: 0.9 } })}>
                            <Save size={14} />
                          </button>
                        </div>
                      </div>

                      <div className={flex({ gap: "12px", wrap: "wrap" })}>
                        <div className={stack({ gap: "2px", flex: 1, minW: "140px" })}>
                          <label className="sber-label" style={{ fontSize: "9px" }}>Действует С</label>
                          <input name="startDate" type="date" defaultValue={cat.startDate} className={css({ p: "6px", borderRadius: "10px", border: "1px solid #e2e8f0", fontSize: "12px" })} />
                        </div>
                        <div className={stack({ gap: "2px", flex: 1, minW: "140px" })}>
                          <label className="sber-label" style={{ fontSize: "9px" }}>Действует ПО</label>
                          <input name="endDate" type="date" defaultValue={cat.endDate || ""} className={css({ p: "6px", borderRadius: "10px", border: "1px solid #e2e8f0", fontSize: "12px" })} />
                        </div>
                      </div>

                      <div className={flex({ gap: "12px", align: "center", mt: "4px" })}>
                         <div className={stack({ gap: "2px", flex: 1 })}>
                            <label className={css({ fontSize: "10px", fontWeight: "800", color: "secondaryText", textTransform: "uppercase" })}>ОКРУГЛЕНИЕ</label>
                            <select 
                              name="roundingType" 
                              defaultValue={cat.roundingType}
                              className={css({ w: "full", p: "6px", borderRadius: "10px", border: "1px solid #e2e8f0", fontSize: "12px", bg: "white" })}
                            >
                              <option value="inherit">Наследовать (карта)</option>
                              {roundingOptions.map(opt => (
                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                              ))}
                            </select>
                         </div>
                      </div>

                      <div className={stack({ gap: "4px", mt: "4px" })}>
                        <label className={css({ fontSize: "10px", fontWeight: "800", color: "secondaryText", textTransform: "uppercase" })}>УРОВНИ (ТИРЫ) КЕШБЭКА</label>
                        <TiersEditor defaultValue={cat.tiers || "[]"} />
                      </div>

                      {(mccs.length > 0 || catsMerchants.length > 0) && (
                        <div className={stack({ gap: "8px", mt: "12px", p: "12px", bg: "#f8fafc", borderRadius: "16px", border: "1px solid", borderColor: "#f1f5f9" })}>
                          <p className={css({ fontSize: "9px", fontWeight: "800", color: "secondaryText", textTransform: "uppercase" })}>Состав категории</p>
                          <div className={wrap({ gap: "4px" })}>
                            {mccs.map(mcc => (
                              <span key={mcc} className={css({ px: "6px", py: "2px", bg: "#eff6ff", color: "#1e40af", borderRadius: "4px", fontSize: "10px", fontWeight: "700", border: "1px solid", borderColor: "#dbeafe" })}>
                                {mcc}
                              </span>
                            ))}
                            {catsMerchants.map(m => (
                              <span key={m} className={flex({ align: "center", gap: "4px", px: "6px", py: "2px", bg: "#f0fdf4", color: "#166534", borderRadius: "4px", fontSize: "10px", fontWeight: "700", border: "1px solid", borderColor: "#dcfce7" })}>
                                <Store size={10} /> {m}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {!isSystem && mccs.length === 0 && catsMerchants.length === 0 && (
                        <div className={css({ mt: "8px", py: "10px", textAlign: "center", border: "1px dashed", borderColor: "#e2e8f0", borderRadius: "12px", fontSize: "11px", color: "secondaryText", fontWeight: "600" })}>
                          Состав не настроен
                        </div>
                      )}

                    </form>

                    <CategoryActions 
                      categoryId={cat.id} 
                      isSystem={isSystem} 
                      isAllPurchases={isAllPurchases} 
                    />
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
