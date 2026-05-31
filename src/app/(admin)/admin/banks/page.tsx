import { db } from "@/db";
import { banks } from "@/db/schema";
import { css } from "../../../../../styled-system/css";
import { stack, flex } from "../../../../../styled-system/patterns";
import AdminBanksList from "@/components/admin/AdminBanksList";
import AddBankModal from "@/components/admin/AddBankModal";
import { asc } from "drizzle-orm";

export const dynamic = "force-dynamic";

export default async function BanksPage() {
  const allBanks = await db.select().from(banks).orderBy(asc(banks.name));

  return (
    <div className={stack({ gap: "32px" })}>
      <header className={flex({ justify: "space-between", align: "center" })}>
        <h1 className={css({ fontSize: "24px", fontWeight: "800", color: "var(--foreground)" })}>Банки</h1>
        <AddBankModal />
      </header>

      {/* Список банков */}
      <section className={stack({ gap: "16px" })}>
        <h3 className="sber-label">ЗАРЕГИСТРИРОВАННЫЕ БАНКИ</h3>
        <AdminBanksList banks={allBanks} />
      </section>
    </div>
  );
}
