import { db } from "@/db";
import { banks, bankCards, bankCardSettings, loyaltyPrograms } from "@/db/schema";
import { updateBankCard } from "@/lib/actions/bank-cards";
import { addBankCardSetting, deleteBankCardSetting } from "@/lib/actions/bank-card-settings";
import { css } from "../../../../../../styled-system/css";
import { stack, flex, grid } from "../../../../../../styled-system/patterns";
import { eq, desc, asc } from "drizzle-orm";
import { notFound } from "next/navigation";
import { ArrowLeft, History as HistoryIcon, Settings, Award } from "lucide-react";
import SearchableSelect from "@/components/SearchableSelect";
import RecalculateCardTransactionsButton from "@/components/admin/RecalculateCardTransactionsButton";
import DatePicker from "@/components/DatePicker";

export default async function EditBankCardPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const cardId = parseInt(id);

  if (isNaN(cardId)) notFound();

  const [card] = await db.select().from(bankCards).where(eq(bankCards.id, cardId)).limit(1);
  if (!card) notFound();

  const allBanks = await db.select().from(banks).orderBy(asc(banks.name));
  
  const allLoyaltyPrograms = await db
    .select({
      id: loyaltyPrograms.id,
      name: loyaltyPrograms.name,
      bankName: banks.name,
    })
    .from(loyaltyPrograms)
    .leftJoin(banks, eq(loyaltyPrograms.bankId, banks.id))
    .orderBy(asc(banks.name), asc(loyaltyPrograms.name));

  const loyaltyProgramOptions = allLoyaltyPrograms.map(lp => ({
    value: lp.id.toString(),
    label: `${lp.bankName || "Неизвестный банк"} - ${lp.name}`
  }));

  const updateCardWithId = updateBankCard.bind(null, cardId);

  const historicalSettings = await db
    .select()
    .from(bankCardSettings)
    .where(eq(bankCardSettings.bankCardId, cardId))
    .orderBy(desc(bankCardSettings.startDate));

  const today = new Date().toISOString().split('T')[0];
  const effectiveSetting = historicalSettings.find(s => s.startDate <= today) || { roundingType: card.roundingType };

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
        <div className={grid({ columns: { base: 1, md: 2 }, gap: "20px", alignItems: "start" })}>

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
              <form action={updateCardWithId} className={stack({ gap: "24px" })}>
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
                  <label className="sber-label">ПРОГРАММА ЛОЯЛЬНОСТИ</label>
                  <SearchableSelect 
                    name="loyaltyProgramId" 
                    defaultValue={card.loyaltyProgramId?.toString() || ""}
                    options={[{ value: "", label: "Без программы лояльности" }, ...loyaltyProgramOptions]}
                  />
                </div>

                {card.loyaltyProgramId && (
                  <a href={`/admin/loyalty-programs/${card.loyaltyProgramId}`} className={flex({ align: "center", gap: "8px", fontSize: "14px", fontWeight: "700", color: "var(--sber-green)", mt: "-8px" })}>
                    <Award size={16} /> Настроить категории этой программы
                  </a>
                )}

                <div className={stack({ gap: "8px" })}>
                  <label className="sber-label">ТИП СЧЕТА</label>
                  <SearchableSelect 
                    name="accountType" 
                    defaultValue={card.accountType}
                    options={[
                      { value: "debit", label: "Дебетовая карта" },
                      { value: "credit", label: "Кредитная карта" },
                      { value: "cardless", label: "Счет без карты" },
                      { value: "investments", label: "Инвестиции" },
                      { value: "bonus", label: "Бонусный счет" },
                    ]}
                    required
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
                    <DatePicker name="startDate" required />
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
                          <Trash2 size={14} className={css({ width: "14px", height: "14px" })} />
                        </button>
                      </form>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>

        </div>
      </div>
    </div>
  );
}

import { Trash2 } from "lucide-react";
