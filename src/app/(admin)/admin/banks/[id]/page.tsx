import { db } from "@/db";
import { banks } from "@/db/schema";
import { updateBank } from "@/lib/actions/banks";
import { css } from "../../../../../../styled-system/css";
import { stack, flex } from "../../../../../../styled-system/patterns";
import { eq } from "drizzle-orm";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";

export default async function EditBankPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const bankId = parseInt(id);

  if (isNaN(bankId)) notFound();

  const [bank] = await db.select().from(banks).where(eq(banks.id, bankId)).limit(1);

  if (!bank) notFound();

  const updateBankWithId = updateBank.bind(null, bankId);

  return (
    <div className={stack({ gap: "32px" })}>
      <header className={flex({ align: "center", gap: "16px" })}>
        <a href="/admin/banks" className={css({ w: "40px", h: "40px", bg: "var(--card-bg)", borderRadius: "full", shadow: "sm", display: "flex", alignItems: "center", justifyContent: "center", color: "secondaryText" })}>
          <ArrowLeft size={20} />
        </a>
        <h1 className={css({ fontSize: "22px", fontWeight: "800", color: "var(--foreground)" })}>Редактировать банк</h1>
      </header>

      <div className={stack({ gap: "24px" })}>
        <section className="sber-card">
          <h2 className="sber-label" style={{ marginBottom: "20px" }}>ОСНОВНАЯ ИНФОРМАЦИЯ</h2>
          <form action={async (formData) => {
            "use server";
            await updateBankWithId(formData);
            redirect("/admin/banks");
          }} className={stack({ gap: "24px" })}>
            <div className={stack({ gap: "6px" })}>
              <label className="sber-label">НАЗВАНИЕ БАНКА</label>
              <input
                name="name"
                type="text"
                defaultValue={bank.name}
                required
                className="sber-input"
              />
            </div>
            <div className={stack({ gap: "6px" })}>
              <label className="sber-label">URL ЛОГОТИПА</label>
              <input
                name="logo"
                type="text"
                defaultValue={bank.logo || ""}
                placeholder="https://..."
                className="sber-input"
              />
            </div>
            <button type="submit" className="sber-button">
              Обновить данные
            </button>
          </form>
        </section>
      </div>
    </div>
  );
}
