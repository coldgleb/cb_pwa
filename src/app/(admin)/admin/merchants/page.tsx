import { db } from "@/db";
import { merchants, mccCodes } from "@/db/schema";
import { getSpendingCategoryOptions } from "@/lib/actions/spending-categories";
import { css } from "../../../../../styled-system/css";
import { stack, flex } from "../../../../../styled-system/patterns";
import { asc, eq, and } from "drizzle-orm";
import AdminMerchantsList from "@/components/admin/AdminMerchantsList";
import AddMerchantModal from "@/components/admin/AddMerchantModal";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

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
      <header className={flex({ justify: "space-between", align: "center", gap: "16px" })}>
        <div className={flex({ align: "center", gap: "16px" })}>
            <Link href="/profile" className="sber-icon-button">
                <ArrowLeft size={20} />
            </Link>
            <h1 className={css({ fontSize: "24px", fontWeight: "800", color: "var(--foreground)" })}>Мерчанты</h1>
        </div>
        <AddMerchantModal mccOptions={mccOptions} categoryOptions={categoryOptions} />
      </header>

      {/* Global MCC Search List */}
      <datalist id="mcc-list">
        {allMccs.map(mcc => (
          <option key={mcc.code} value={`${mcc.code} — ${mcc.name}`} />
        ))}
      </datalist>

      {/* Список мерчантов */}
      <section className={stack({ gap: "16px" })}>
        <h3 className="sber-label">СПИСОК ТОРГОВЫХ ТОЧЕК</h3>
        <AdminMerchantsList merchants={allMerchants} mccOptions={mccOptions} categoryOptions={categoryOptions} />
      </section>
    </div>
  );
}
