import { db } from "@/db";
import { banks, bankCards, loyaltyPrograms } from "@/db/schema";
import { css } from "../../../../../styled-system/css";
import { stack, flex } from "../../../../../styled-system/patterns";
import { eq, asc } from "drizzle-orm";
import AdminBankCardsList from "@/components/admin/AdminBankCardsList";
import AddBankCardModal from "@/components/admin/AddBankCardModal";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

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
      <header className={flex({ justify: "space-between", align: "center", gap: "16px" })}>
        <div className={flex({ align: "center", gap: "16px" })}>
            <Link href="/profile" className="sber-icon-button">
                <ArrowLeft size={20} />
            </Link>
            <h1 className={css({ fontSize: "24px", fontWeight: "800", color: "var(--foreground)" })}>Виды карт</h1>
        </div>
        <AddBankCardModal 
          bankOptions={bankOptions} 
          loyaltyProgramOptions={loyaltyProgramOptions} 
        />
      </header>

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
