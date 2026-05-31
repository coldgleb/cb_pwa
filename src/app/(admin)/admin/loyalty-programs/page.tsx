import { db } from "@/db";
import { banks, loyaltyPrograms } from "@/db/schema";
import { css } from "../../../../../styled-system/css";
import { stack, flex } from "../../../../../styled-system/patterns";
import { eq, asc } from "drizzle-orm";
import AdminLoyaltyProgramsList from "@/components/admin/AdminLoyaltyProgramsList";
import AddLoyaltyProgramModal from "@/components/admin/AddLoyaltyProgramModal";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function LoyaltyProgramsPage() {
  const allBanks = await db.select().from(banks).orderBy(asc(banks.name));
  const allPrograms = await db.select({
    id: loyaltyPrograms.id,
    name: loyaltyPrograms.name,
    description: loyaltyPrograms.description,
    bankId: loyaltyPrograms.bankId,
    bankName: banks.name,
    bankLogo: banks.logo,
    bankWebsite: banks.website,
  }).from(loyaltyPrograms)
    .leftJoin(banks, eq(loyaltyPrograms.bankId, banks.id))
    .orderBy(asc(banks.name), asc(loyaltyPrograms.name));

  const bankOptions = allBanks.map(bank => ({
    value: bank.id.toString(),
    label: bank.name
  }));

  return (
    <div className={stack({ gap: "32px" })}>
      <header className={flex({ justify: "space-between", align: "center", gap: "16px" })}>
        <div className={flex({ align: "center", gap: "16px" })}>
            <Link href="/profile" className="sber-icon-button">
                <ArrowLeft size={20} />
            </Link>
            <h1 className={css({ fontSize: "24px", fontWeight: "800", color: "var(--foreground)" })}>Программы лояльности</h1>
        </div>
        <AddLoyaltyProgramModal bankOptions={bankOptions} />
      </header>

      <section className={stack({ gap: "16px" })}>
        <h3 className="sber-label">СУЩЕСТВУЮЩИЕ ПРОГРАММЫ</h3>
        <AdminLoyaltyProgramsList programs={allPrograms} />
      </section>
    </div>
  );
}
