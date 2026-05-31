import { db } from "@/db";
import { mccCodes } from "@/db/schema";
import { createMccCode, syncMccCodes } from "@/lib/actions/mcc";
import { css } from "../../../../../styled-system/css";
import { stack, flex, grid } from "../../../../../styled-system/patterns";
import { Plus, Tag, RefreshCw } from "lucide-react";
import { asc } from "drizzle-orm";
import AdminMccList from "@/components/admin/AdminMccList";

export const dynamic = "force-dynamic";

export default async function MccPage() {
  const allMcc = await db.select().from(mccCodes).orderBy(asc(mccCodes.code));

  return (
    <div className={stack({ gap: "32px" })}>
      <div className={flex({ justify: "space-between", align: "center" })}>
        <h1 className={css({ fontSize: "24px", fontWeight: "800", color: "var(--foreground)" })}>MCC коды</h1>
        
        <form action={syncMccCodes}>
          <button type="submit" className={flex({ align: "center", gap: "8px", px: "16px", py: "10px", bg: "var(--card-bg)", border: "1px solid", borderColor: "#e2e8f0", borderRadius: "12px", fontSize: "13px", fontWeight: "700", color: "#64748b", cursor: "pointer", transition: "all 0.2s", _hover: { bg: "#f8fafc", borderColor: "sberGreen", color: "sberGreen" } })}>
            <RefreshCw size={14} /> СИНХРОНИЗИРОВАТЬ
          </button>
        </form>
      </div>

      <div className={grid({ columns: { base: 1, md: 2 }, gap: "24px" })}>
        {/* Форма добавления */}
        <section className="sber-card" style={{ height: "fit-content" }}>
          <div className={flex({ align: "center", gap: "10px", mb: "24px" })}>
            <div className={css({ p: "6px", bg: "sberGreen", borderRadius: "8px", color: "white" })}>
              <Plus size={18} />
            </div>
            <h2 className={css({ fontSize: "17px", fontWeight: "700", color: "var(--foreground)" })}>Новый MCC код</h2>
          </div>

          <form action={createMccCode} className={stack({ gap: "20px" })}>
            <div className={stack({ gap: "6px" })}>
              <label className="sber-label">КОД (4 ЦИФРЫ)</label>
              <input
                name="code"
                type="text"
                pattern="\d{4}"
                required
                placeholder="5411"
                className="sber-input"
              />
            </div>
            <div className={stack({ gap: "6px" })}>
              <label className="sber-label">НАЗВАНИЕ</label>
              <input
                name="description"
                type="text"
                required
                placeholder="Например, Супермаркеты"
                className="sber-input"
              />
            </div>
            <div className={stack({ gap: "6px" })}>
              <label className="sber-label">ПОЛНОЕ ОПИСАНИЕ</label>
              <textarea
                name="fullDescription"
                placeholder="Подробное описание MCC кода..."
                className="sber-input"
                style={{ minHeight: "80px", paddingTop: "12px" }}
              />
            </div>
            <button type="submit" className="sber-button">
              Добавить код
            </button>
          </form>
        </section>

        {/* Статистика/Инфо */}
        <section className="sber-card" style={{ height: "fit-content", background: "var(--surface-secondary)" }}>
           <div className={flex({ align: "center", gap: "10px", mb: "16px" })}>
            <Tag size={18} className={css({ color: "sberGreen" })} />
            <h2 className={css({ fontSize: "17px", fontWeight: "700", color: "var(--foreground)" })}>Информация</h2>
          </div>
          <p className={css({ fontSize: "14px", color: "#475569", lineHeight: "1.6" })}>
            Всего в базе: <strong>{allMcc.length}</strong> кодов.
          </p>
          <p className={css({ fontSize: "13px", color: "#64748b", mt: "12px" })}>
            Синхронизация загружает актуальные данные из справочника mcc-codes.ru. Существующие коды будут обновлены.
          </p>
        </section>
      </div>

      {/* Список кодов */}
      <section className={stack({ gap: "16px" })}>
        <h3 className="sber-label">БАЗА КОДОВ</h3>
        <AdminMccList mccCodesList={allMcc} />
      </section>
    </div>
  );
}

