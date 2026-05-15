import { db } from "@/db";
import { banks, bankCards, bankCategories, bankCategoryMcc, bankCardSettings, merchants, bankCategoryMerchant, mccCodes } from "@/db/schema";
import { updateBankCard, recalculateTransactionsForBankCard } from "@/lib/actions/bank-cards";
import { createBankCategory, updateBankCategory, duplicateBankCategory } from "@/lib/actions/categories";
import { addBankCardSetting, deleteBankCardSetting } from "@/lib/actions/bank-card-settings";
import { css } from "../../../../../../styled-system/css";
import { stack, flex, wrap, grid } from "../../../../../../styled-system/patterns";
import { eq, inArray, desc, asc, and, isNull } from "drizzle-orm";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, ShieldCheck, Ban, Tag, Plus, Save, Trash2, History as HistoryIcon, Archive, Store, Copy, Settings } from "lucide-react";
import TiersEditor from "@/components/admin/TiersEditor";
import MultiSearchableSelect from "@/components/MultiSearchableSelect";
import SearchableSelect from "@/components/SearchableSelect";
import { getIconUrl } from "@/lib/utils/icons";
import CategoryActions from "@/components/admin/CategoryActions";
import MccImportFromUrl from "@/components/admin/MccImportFromUrl";
import RecalculateCardTransactionsButton from "@/components/admin/RecalculateCardTransactionsButton";

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
      .where(and(inArray(bankCategoryMcc.categoryId, categoryIds), isNull(bankCategoryMcc.endDate)))
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
    { value: "cashback_1_math", label: "Кешбэк до 1р по матем. правилам" },
    { value: "halva", label: "Халва (до 1р — 0.01, от 1р — 1р)" },
  ];

  return (
    <div className="sber-container-admin">
      <div className={stack({ gap: "32px" })}>
        <header className={stack({ gap: "8px" })}>
          <a href="/admin/bank-cards" className={flex({ align: "center", gap: "8px", fontSize: "14px", fontWeight: "800", color: "var(--sber-green)" })}>
            <ArrowLeft size={16} /> НАЗАД К КАРТАМ
          </a>
          <h1 className={css({ fontSize: "32px", fontWeight: "800", color: "var(--foreground)" })}>Управление картой</h1>
        </header>

        {/* Top Control Grid */}
        <div className={grid({ columns: { base: 1, lg: 2, xl: 3 }, gap: "20px", alignItems: "start" })}>

          {/* Column 1: Edit Card */}
          <section className={stack({ gap: "16px" })}>
            <div className={flex({ justify: "space-between", align: "center", gap: "12px" })}>
              <div className={flex({ align: "center", gap: "12px" })}>
                <div className={css({ p: "8px", bg: "var(--sber-green)", borderRadius: "10px", color: "white" })}><Settings size={20} /></div>
                <h2 className={css({ fontSize: "20px", fontWeight: "800", color: "var(--foreground)" })}>Настройки</h2>
              </div>
              
              <RecalculateCardTransactionsButton cardId={cardId} />
            </div>
            <div className="sber-card">
              <form action={async (formData) => {
                "use server";
                await updateCardWithId(formData);
              }} className={stack({ gap: "24px" })}>
                <div className={stack({ gap: "8px" })}>
                  <label className="sber-label">БАНК</label>
                  <SearchableSelect 
                    name="bankId" 
                    defaultValue={card.bankId.toString()}
                    options={allBanks.map(bank => ({ value: bank.id.toString(), label: bank.name }))}
                    required
                  />
                </div>
                <div className={stack({ gap: "8px" })}>
                  <label className="sber-label">НАЗВАНИЕ КАРТЫ</label>
                  <input
                    name="name"
                    type="text"
                    defaultValue={card.name}
                    required
                    className="sber-input"
                  />
                </div>
                <div className={stack({ gap: "8px" })}>
                  <label className="sber-label">ОКРУГЛЕНИЕ ПО УМОЛЧАНИЮ</label>
                  <SearchableSelect 
                    name="roundingType" 
                    defaultValue={card.roundingType}
                    options={roundingOptions}
                    required
                  />
                </div>
                <div className={stack({ gap: "8px" })}>
                  <label className="sber-label">ЛИМИТ КЕШБЭКА В МЕСЯЦ</label>
                  <input
                    name="defaultCashbackLimit"
                    type="number"
                    defaultValue={card.defaultCashbackLimit || ""}
                    placeholder="Например, 5000"
                    className="sber-input"
                  />
                </div>
                <button type="submit" className="sber-button">
                  Обновить настройки
                </button>
              </form>
            </div>
          </section>

          {/* Column 2: Rounding Rules */}
          <section className={stack({ gap: "16px" })}>
            <div className={flex({ align: "center", gap: "12px" })}>
              <div className={css({ p: "8px", bg: "#6366f1", borderRadius: "10px", color: "white" })}><HistoryIcon size={20} /></div>
              <h2 className={css({ fontSize: "20px", fontWeight: "800", color: "var(--foreground)" })}>Округление</h2>
            </div>
            
            <div className={css({ p: "16px", bg: "var(--sber-green)", color: "white", borderRadius: "16px", shadow: "sm", fontWeight: "700", fontSize: "15px" })}>
              Активно: {roundingOptions.find(o => o.value === effectiveSetting.roundingType)?.label}
            </div>

            <div className="sber-card" style={{ padding: '20px' }}>
              <h3 className={css({ fontSize: "14px", fontWeight: "800", mb: "16px", color: "var(--secondary-text)", textTransform: "uppercase" })}>Добавить правило</h3>
              <form action={addBankCardSetting} className={stack({ gap: "24px" })}>
                <input type="hidden" name="bankCardId" value={cardId} />
                <div className={stack({ gap: "16px" })}>
                  <div className={stack({ gap: "8px" })}>
                    <label className="sber-label">ТИП ОКРУГЛЕНИЯ</label>
                    <SearchableSelect name="roundingType" required options={roundingOptions} />
                  </div>
                  <div className={stack({ gap: "8px" })}>
                    <label className="sber-label">ДЕЙСТВУЕТ С ДАТЫ</label>
                    <input name="startDate" type="date" required className="sber-input" />
                  </div>
                </div>
                <button type="submit" className="sber-button" style={{ backgroundColor: "#6366f1" }}>
                  Сохранить правило
                </button>
              </form>
            </div>

            {historicalSettings.length > 0 && (
              <div className="sber-card" style={{ padding: '20px' }}>
                <h3 className={css({ fontSize: "14px", fontWeight: "800", mb: "16px", color: "var(--secondary-text)", textTransform: "uppercase" })}>История</h3>
                <div className={stack({ gap: "12px" })}>
                  {historicalSettings.map(s => (
                    <div key={s.id} className={flex({ justify: "space-between", align: "center", gap: "8px", pb: "12px", borderBottom: "1px dashed var(--border-color)", _last: { borderBottom: "none", pb: 0 } })}>
                      <div className={stack({ gap: "2px" })}>
                        <p className={css({ fontWeight: "700", fontSize: "14px", color: "var(--foreground)" })}>
                          {roundingOptions.find(o => o.value === s.roundingType)?.label}
                        </p>
                        <p className={css({ fontSize: "11px", color: "var(--secondary-text)" })}>
                          С {s.startDate.split('-').reverse().join('.')}
                        </p>
                      </div>
                      <form action={deleteBankCardSetting.bind(null, s.id, cardId)}>
                        <button type="submit" className={css({ p: "6px", color: "#ef4444", cursor: "pointer", _hover: { bg: "rgba(239, 68, 68, 0.1)", borderRadius: "8px" } })}>
                          <Trash2 size={14} />
                        </button>
                      </form>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>

          {/* Column 3: New Category */}
          <section className={stack({ gap: "16px" })}>
            <div className={flex({ align: "center", gap: "12px" })}>
              <div className={css({ p: "8px", bg: "#eab308", borderRadius: "10px", color: "white" })}><Plus size={20} /></div>
              <h2 className={css({ fontSize: "20px", fontWeight: "800", color: "var(--foreground)" })}>Новая категория</h2>
            </div>

            <div className="sber-card" style={{ padding: '20px' }}>
              <form action={createBankCategory} className={stack({ gap: "20px" })}>
                <input type="hidden" name="bankCardId" value={cardId} />
                
                <div className={stack({ gap: "6px" })}>
                  <label className="sber-label">НАЗВАНИЕ</label>
                  <input name="name" type="text" required placeholder="Например, Супермаркеты" className="sber-input" />
                </div>

                <div className={flex({ gap: "12px", wrap: "wrap" })}>
                  <div className={stack({ gap: "6px", flex: 1, minW: "140px" })}>
                    <label className="sber-label">Действует С</label>
                    <input name="startDate" type="date" defaultValue={today} required className="sber-input" />
                  </div>
                  <div className={stack({ gap: "6px", flex: 1, minW: "140px" })}>
                    <label className="sber-label">Действует ПО</label>
                    <input name="endDate" type="date" className="sber-input" />
                  </div>
                </div>
                
                <div className={flex({ gap: "12px", wrap: "wrap" })}>
                  <div className={stack({ gap: "6px", flex: 1, minW: "140px" })}>
                    <label className="sber-label">ПРОЦЕНТ (%)</label>
                    <input name="defaultPercentage" type="number" step="0.25" required placeholder="1.5" className="sber-input" />
                  </div>
                  <div className={stack({ gap: "6px", flex: 1, minW: "140px" })}>
                    <label className="sber-label">ЛИМИТ (₽)</label>
                    <input name="cashbackLimit" type="number" placeholder="1000" className="sber-input" />
                  </div>
                </div>

                <div className={stack({ gap: "6px" })}>
                  <label className="sber-label">ОКРУГЛЕНИЕ</label>
                  <SearchableSelect 
                    name="roundingType" 
                    options={[{ value: "inherit", label: "Наследовать" }, ...roundingOptions]} 
                    defaultValue="inherit"
                  />
                </div>

                <div className={stack({ gap: "6px" })}>
                  <label className="sber-label">МЕРЧАНТЫ</label>
                  <MultiSearchableSelect 
                    name="merchantIds"
                    options={merchantOptions}
                    placeholder="Выберите..."
                  />
                </div>

                <div className={stack({ gap: "6px" })}>
                  <label className="sber-label">MCC-КОДЫ</label>
                  <textarea 
                    name="mccText" 
                    placeholder="5411, 5812..." 
                    className="sber-input"
                    style={{ minHeight: "80px" }}
                  />
                </div>

                <div className={stack({ gap: "6px" })}>
                  <label className="sber-label">ТИРЫ КЕШБЭКА</label>
                  <TiersEditor defaultValue="[]" />
                </div>

                <button type="submit" className="sber-button">
                  Создать категорию
                </button>
              </form>

              <hr className={css({ borderColor: "var(--border-color)", my: "20px" })} />
              <MccImportFromUrl bankCardId={cardId} />
            </div>
          </section>
        </div>

        <hr className={css({ borderColor: "var(--border-color)", my: "8px" })} />

        <div className={stack({ gap: "24px" })}>
          <h2 className={css({ fontSize: "24px", fontWeight: "800", color: "var(--foreground)" })}>Существующие категории</h2>

          {/* Список существующих категорий */}
          <div className={grid({ columns: { base: 1, md: 2, lg: 3 }, gap: "16px" })}>
            {sortedCategories.map(cat => {
              const isNoCashback = cat.name === "Без кешбэка";
              const isAllPurchases = cat.name === "Остальные покупки";
              const isSystem = isNoCashback || isAllPurchases;
              const isArchived = cat.endDate && cat.endDate < today;
              const mccs = mccsByCategory[cat.id] || [];
              const catsMerchants = merchantsByCategory[cat.id] || [];

              return (
                <div key={cat.id} className="sber-card" style={{ padding: '24px', border: isSystem ? '1px solid var(--border-color)' : (isArchived ? '1px dashed var(--secondary-text)' : '1px solid var(--border-color)'), background: isSystem ? 'var(--surface-secondary)' : (isArchived ? 'var(--background)' : 'var(--card-bg)'), opacity: isArchived ? 0.7 : 1, display: 'flex', flexDirection: 'column' }}>
                  <form action={updateBankCategory.bind(null, cat.id)} className={stack({ gap: "20px", flex: 1 })}>
                    <input type="hidden" name="bankCardId" value={cardId} />
                    
                    <div className={flex({ justify: "space-between", align: "start", gap: "12px", wrap: "wrap" })}>
                      <div className={stack({ gap: "4px", flex: "1", minW: "160px" })}>
                        <div className={flex({ align: "center", gap: "8px", w: "full" })}>
                          {isAllPurchases && <ShieldCheck size={18} className={css({ color: "var(--sber-green)", flexShrink: 0 })} />}
                          {isNoCashback && <Ban size={18} className={css({ color: "var(--secondary-text)", flexShrink: 0 })} />}
                          <input 
                            name="name" 
                            defaultValue={cat.name} 
                            required 
                            readOnly={isSystem}
                            className={css({ 
                              fontWeight: "700", 
                              fontSize: "18px", 
                              color: isArchived ? "var(--secondary-text)" : "var(--foreground)",
                              border: "none",
                              bg: "transparent",
                              borderBottom: isSystem ? "none" : "1px dashed",
                              borderColor: "var(--border-color)",
                              w: "full",
                              minW: 0,
                              _focus: { borderColor: "var(--sber-green)", outline: "none" },
                              cursor: isSystem ? "default" : "text"
                            })}
                          />
                          {isArchived && <span className={css({ fontSize: "11px", fontWeight: "800", color: "var(--secondary-text)", flexShrink: 0 })}>(АРХИВ)</span>}
                        </div>
                        <p className={css({ fontSize: "12px", color: "var(--secondary-text)", fontWeight: "600" })}>
                          {cat.startDate.split('-').reverse().join('.')} • {cat.endDate ? cat.endDate.split('-').reverse().join('.') : '...'}
                        </p>
                      </div>
                      
                      <div className={flex({ align: "center", gap: "10px", flexShrink: 0 })}>
                        <div className={flex({ align: "center", gap: "6px" })}>
                          <div className={stack({ gap: "6px", align: "end" })}>
                             <div className={flex({ align: "center", gap: "6px" })}>
                              <input 
                                name="defaultPercentage" 
                                type="number" 
                                step="0.25" 
                                defaultValue={isNoCashback ? 0 : cat.defaultPercentage}
                                readOnly={isNoCashback}
                                className={css({ w: "65px", p: "6px 8px", borderRadius: "8px", border: "1px solid var(--border-color)", fontSize: "16px", fontWeight: "800", textAlign: "right", opacity: isNoCashback ? 0.6 : 1, bg: "var(--input-bg)", color: "var(--foreground)" })}
                              />
                              <span className={css({ fontSize: "16px", fontWeight: "800", color: "var(--secondary-text)" })}>%</span>
                             </div>
                             {!isNoCashback && (
                               <div className={flex({ align: "center", gap: "6px" })}>
                                 <span className={css({ fontSize: "11px", fontWeight: "800", color: "var(--secondary-text)" })}>ЛИМИТ</span>
                                 <input 
                                   name="cashbackLimit" 
                                   type="number" 
                                   defaultValue={cat.cashbackLimit || ""}
                                   placeholder="0"
                                   className={css({ w: "65px", p: "4px 6px", borderRadius: "6px", border: "1px solid var(--border-color)", fontSize: "12px", fontWeight: "700", textAlign: "right", bg: "var(--input-bg)", color: "var(--foreground)" })}
                                 />
                                 <span className={css({ fontSize: "12px", fontWeight: "700", color: "var(--secondary-text)" })}>₽</span>
                               </div>
                             )}
                          </div>
                        </div>
                        <button type="submit" className={css({ p: "8px", bg: "var(--sber-green)", color: "white", borderRadius: "10px", cursor: "pointer", _hover: { opacity: 0.9 } })}>
                          <Save size={18} />
                        </button>
                      </div>
                    </div>

                    <div className={flex({ gap: "12px", wrap: "wrap" })}>
                      <div className={stack({ gap: "4px", flex: 1, minW: "120px" })}>
                        <label className="sber-label" style={{ fontSize: "10px" }}>Действует С</label>
                        <input name="startDate" type="date" defaultValue={cat.startDate} className={css({ p: "8px", borderRadius: "10px", border: "1px solid var(--border-color)", fontSize: "14px", w: "full", bg: "var(--input-bg)", color: "var(--foreground)" })} />
                      </div>
                      <div className={stack({ gap: "4px", flex: 1, minW: "120px" })}>
                        <label className="sber-label" style={{ fontSize: "10px" }}>Действует ПО</label>
                        <input name="endDate" type="date" defaultValue={cat.endDate || ""} className={css({ p: "8px", borderRadius: "10px", border: "1px solid var(--border-color)", fontSize: "14px", w: "full", bg: "var(--input-bg)", color: "var(--foreground)" })} />
                      </div>
                    </div>

                    <div className={flex({ gap: "12px", align: "center", mt: "8px" })}>
                       <div className={stack({ gap: "4px", flex: 1 })}>
                          <label className={css({ fontSize: "10px", fontWeight: "800", color: "var(--secondary-text)", textTransform: "uppercase" })}>ОКРУГЛЕНИЕ</label>
                          <SearchableSelect 
                            name="roundingType" 
                            defaultValue={cat.roundingType}
                            options={[{ value: "inherit", label: "Наследовать (карта)" }, ...roundingOptions]}
                          />
                       </div>
                    </div>

                    <div className={stack({ gap: "6px", mt: "8px" })}>
                      <label className={css({ fontSize: "10px", fontWeight: "800", color: "var(--secondary-text)", textTransform: "uppercase" })}>УРОВНИ (ТИРЫ) КЕШБЭКА</label>
                      <TiersEditor defaultValue={cat.tiers || "[]"} />
                    </div>

                    {!isAllPurchases && (
                      <>
                        <input type="checkbox" id={`edit-mcc-${cat.id}`} hidden />
                        <style dangerouslySetInnerHTML={{ __html: `
                          #edit-mcc-${cat.id}:checked ~ .mcc-wrapper .mcc-display { display: none !important; }
                          #edit-mcc-${cat.id}:checked ~ .mcc-wrapper .mcc-editor { display: flex !important; }
                        ` }} />
                      </>
                    )}

                    {(mccs.length > 0 || catsMerchants.length > 0 || !isAllPurchases) && (
                      <div className={`mcc-wrapper ${stack({ gap: "10px", mt: "12px", p: "12px", bg: "var(--surface-secondary)", borderRadius: "16px", border: "1px solid", borderColor: "var(--border-color)" })}`}>
                        <p className={css({ fontSize: "10px", fontWeight: "800", color: "var(--secondary-text)", textTransform: "uppercase" })}>Состав категории</p>
                        
                        <div className={`mcc-display ${stack({ gap: "10px" })}`}>
                          {mccs.length > 0 ? (
                            <div className={wrap({ gap: "6px" })}>
                              {mccs.map(mcc => (
                                <span key={mcc} className={css({ px: "8px", py: "3px", bg: "rgba(33, 160, 56, 0.1)", color: "var(--sber-green)", borderRadius: "6px", fontSize: "11px", fontWeight: "700", border: "1px solid", borderColor: "rgba(33, 160, 56, 0.2)" })}>
                                  {mcc}
                                </span>
                              ))}
                            </div>
                          ) : (
                            !isAllPurchases && (
                              <div className={css({ fontSize: "12px", color: "var(--secondary-text)" })}>MCC-коды не заданы</div>
                            )
                          )}
                        </div>

                        {!isAllPurchases && (
                          <div className={`mcc-editor ${stack({ gap: "6px" })}`} style={{ display: 'none' }}>
                            <label className={css({ fontSize: "10px", fontWeight: "700", color: "var(--secondary-text)", textTransform: "uppercase" })}>Редактирование MCC-кодов</label>
                            <textarea 
                              name="mccText" 
                              defaultValue={mccs.join(", ")}
                              placeholder="Например: 5411, 5812"
                              className={css({ 
                                p: "8px", 
                                borderRadius: "10px", 
                                border: "1px solid var(--border-color)", 
                                fontSize: "13px", 
                                bg: "var(--input-bg)", 
                                color: "var(--foreground)",
                                minHeight: "60px",
                                fontFamily: "monospace"
                              })}
                            />
                            <p className={css({fontSize: "11px", color: "var(--secondary-text)"})}>Отредактируйте список и нажмите зеленую иконку <Save size={10} style={{display: 'inline'}} /> вверху карточки.</p>
                          </div>
                        )}

                        {catsMerchants.length > 0 && (
                          <div className={stack({ gap: "6px", mt: "4px" })}>
                            <label className={css({ fontSize: "10px", fontWeight: "700", color: "var(--secondary-text)" })}>МЕРЧАНТЫ</label>
                            <div className={wrap({ gap: "6px" })}>
                              {catsMerchants.map(m => (
                                <span key={m} className={flex({ align: "center", gap: "4px", px: "8px", py: "3px", bg: "rgba(33, 160, 56, 0.1)", color: "var(--sber-green)", borderRadius: "6px", fontSize: "11px", fontWeight: "700", border: "1px solid", borderColor: "rgba(33, 160, 56, 0.2)" })}>
                                  <Store size={10} /> {m}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
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
  );
}
