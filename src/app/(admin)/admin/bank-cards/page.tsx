import { db } from "@/db";
import { banks, bankCards, loyaltyPrograms } from "@/db/schema";
import { createBankCard } from "@/lib/actions/bank-cards";
import { css } from "../../../../../styled-system/css";
import { stack, flex } from "../../../../../styled-system/patterns";
import { eq, asc } from "drizzle-orm";
import { Plus, Landmark } from "lucide-react";
import SearchableSelect from "@/components/SearchableSelect";
import AdminBankCardsList from "@/components/admin/AdminBankCardsList";

export const dynamic = "force-dynamic";

export default async function AdminBankCardsPage() {
  const allBanks = await db.select().from(banks).orderBy(asc(banks.name));
  const allLoyaltyPrograms = await db.select({
    id: loyaltyPrograms.id,
    name: loyaltyPrograms.name,
    bankName: banks.name,
  }).from(loyaltyPrograms)
    .leftJoin(banks, eq(loyaltyPrograms.bankId, banks.id))
    .orderBy(asc(banks.name), asc(loyaltyPrograms.name));

  const allBankCards = await db.select({
    id: bankCards.id,
    name: bankCards.name,
    isArchived: bankCards.isArchived,
    bankName: banks.name,
    bankLogo: banks.logo,
    bankWebsite: banks.website,
    loyaltyProgramName: loyaltyPrograms.name,
    accountType: bankCards.accountType,
  }).from(bankCards)
    .leftJoin(banks, eq(bankCards.bankId, banks.id))
    .leftJoin(loyaltyPrograms, eq(bankCards.loyaltyProgramId, loyaltyPrograms.id))
    .orderBy(asc(banks.name), asc(bankCards.isArchived), asc(bankCards.name));

  const bankOptions = allBanks.map(bank => ({
    value: bank.id.toString(),
    label: bank.name
  }));

  const loyaltyProgramOptions = allLoyaltyPrograms.map(lp => ({
    value: lp.id.toString(),
    label: `${lp.bankName || "Неизвестный банк"} - ${lp.name}`
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
            <label className="sber-label">ПРОГРАММА ЛОЯЛЬНОСТИ</label>
            <SearchableSelect 
              name="loyaltyProgramId" 
              options={[{ value: "", label: "Без программы лояльности" }, ...loyaltyProgramOptions]}
              placeholder="Выберите программу лояльности..."
            />
          </div>
          <div className={stack({ gap: "6px" })}>
            <label className="sber-label">ТИП СЧЕТА</label>
            <SearchableSelect 
              name="accountType" 
              options={[
                { value: "debit", label: "Дебетовая карта" },
                { value: "credit", label: "Кредитная карта" },
                { value: "cardless", label: "Счет без карты" },
                { value: "investments", label: "Инвестиции" },
                { value: "bonus", label: "Бонусный счет" },
              ]}
              required
              defaultValue="debit"
              placeholder="Выберите тип счета..."
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
        
        {allBankCards.length === 0 ? (
          <div className={css({ py: "40px", textAlign: "center", color: "secondaryText", bg: "var(--card-bg)", borderRadius: "24px", border: "1px dashed", borderColor: "#e2e8f0" })}>
            Типы карт еще не созданы
          </div>
        ) : (
          <AdminBankCardsList cards={allBankCards} />
        )}
      </section>
    </div>
  );
}
