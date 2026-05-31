import { db } from "@/db";
import { merchants, mccCodes } from "@/db/schema";
import { getSpendingCategoryOptions } from "@/lib/actions/spending-categories";
import { css } from "../../../../../styled-system/css";
import { stack } from "../../../../../styled-system/patterns";
import { asc } from "drizzle-orm";
import AdminMerchantsList from "@/components/admin/AdminMerchantsList";
import AddMerchantForm from "@/components/admin/AddMerchantForm";

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
      <AddMerchantForm mccOptions={mccOptions} categoryOptions={categoryOptions} />

      {/* Список мерчантов */}
      <section className={stack({ gap: "16px" })}>
        <h3 className="sber-label">СПИСОК ТОРГОВЫХ ТОЧЕК</h3>
        <AdminMerchantsList merchants={allMerchants} mccOptions={mccOptions} categoryOptions={categoryOptions} />
      </section>
    </div>
  );
}
