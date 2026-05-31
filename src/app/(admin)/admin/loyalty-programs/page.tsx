import { db } from "@/db";
import { banks, loyaltyPrograms } from "@/db/schema";
import { createLoyaltyProgram } from "@/lib/actions/loyalty-programs";
import { css } from "../../../../../styled-system/css";
import { stack, flex } from "../../../../../styled-system/patterns";
import { eq, asc, sql } from "drizzle-orm";
import { Plus } from "lucide-react";
import SearchableSelect from "@/components/SearchableSelect";
import AdminLoyaltyProgramsList from "@/components/admin/AdminLoyaltyProgramsList";

export const dynamic = "force-dynamic";

export default async function LoyaltyProgramsPage() {
  try {
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
        <h1 className={css({ fontSize: "24px", fontWeight: "800", color: "var(--foreground)" })}>Программы лояльности</h1>

        {/* Форма добавления */}
        <section className="sber-card">
          <div className={flex({ align: "center", gap: "10px", mb: "24px" })}>
            <div className={css({ p: "6px", bg: "sberGreen", borderRadius: "8px", color: "white" })}>
              <Plus size={18} />
            </div>
            <h2 className={css({ fontSize: "17px", fontWeight: "700", color: "var(--foreground)" })}>Создать программу лояльности</h2>
          </div>

          <form action={createLoyaltyProgram} className={stack({ gap: "20px" })}>
            <div className={stack({ gap: "6px" })}>
              <label className="sber-label">БАНК</label>
              <SearchableSelect 
                name="bankId" 
                options={bankOptions}
                required
                placeholder="Выберите банк..."
              />
            </div>
            <div className={stack({ gap: "6px" })}>
              <label className="sber-label">НАЗВАНИЕ ПРОГРАММЫ</label>
              <input
                name="name"
                type="text"
                required
                placeholder="Например, Tinkoff Black Лояльность"
                className="sber-input"
              />
            </div>
            <div className={stack({ gap: "6px" })}>
              <label className="sber-label">ОПИСАНИЕ</label>
              <textarea
                name="description"
                placeholder="Краткое описание условий..."
                className="sber-input"
                style={{ minHeight: "80px", paddingTop: "8px" }}
              />
            </div>
            <button type="submit" className="sber-button">
              Сохранить программу
            </button>
          </form>
        </section>

        <section className={stack({ gap: "16px" })}>
          <h3 className="sber-label">СУЩЕСТВУЮЩИЕ ПРОГРАММЫ ЛОЯЛЬНОСТИ</h3>
          <AdminLoyaltyProgramsList programs={allPrograms} />
        </section>
      </div>
    );
  } catch (error: any) {
    console.error("Error loading LoyaltyProgramsPage:", error);
    let dbSchemaInfo = "";
    try {
      const result = await db.$client.execute("SELECT name, sql FROM sqlite_master WHERE type='table'");
      dbSchemaInfo = JSON.stringify(result.rows, null, 2);
    } catch (schemaErr: any) {
      dbSchemaInfo = "Failed to fetch schema: " + (schemaErr.message || String(schemaErr));
    }
    return (
      <div style={{ padding: "24px", color: "#b91c1c", background: "#fef2f2", border: "1px solid #fee2e2", borderRadius: "16px", margin: "20px 0", fontFamily: "monospace" }}>
        <h2 style={{ fontSize: "18px", fontWeight: "bold", marginBottom: "12px" }}>Ошибка сервера (500) при загрузке программ лояльности:</h2>
        <p style={{ fontSize: "14px", marginBottom: "8px", fontWeight: "bold" }}>{error?.message || String(error)}</p>
        {error?.stack && <pre style={{ fontSize: "12px", whiteSpace: "pre-wrap", background: "#fca5a5", padding: "12px", borderRadius: "8px", color: "#7f1d1d" }}>{error.stack}</pre>}
        <h3 style={{ fontSize: "14px", fontWeight: "bold", marginTop: "20px", marginBottom: "8px" }}>Текущая структура БД на сервере:</h3>
        <pre style={{ fontSize: "11px", whiteSpace: "pre-wrap", background: "#e2e8f0", padding: "12px", borderRadius: "8px", color: "#1e293b" }}>{dbSchemaInfo}</pre>
      </div>
    );
  }
}

