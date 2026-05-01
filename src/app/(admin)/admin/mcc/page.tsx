import { db } from "@/db";
import { mccCodes } from "@/db/schema";
import { createMccCode, syncMccCodes } from "@/lib/actions/mcc";
import { css } from "../../../../../styled-system/css";
import { stack, flex, grid } from "../../../../../styled-system/patterns";
import { Hash, Plus, Tag, RefreshCw } from "lucide-react";
import { asc } from "drizzle-orm";

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
        <div className={grid({ columns: { base: 1, sm: 2, lg: 3 }, gap: "12px" })}>
          {allMcc.map((mcc) => (
            <div key={mcc.code} className="sber-card" style={{ padding: '14px', display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div className={css({ minW: "44px", h: "44px", bg: "#f8fafc", borderRadius: "10px", display: "flex", alignItems: "center", justifyContent: "center", border: "1px solid", borderColor: "#f1f5f9", color: "#21a038", fontWeight: "800", fontSize: "13px" })}>
                {mcc.code}
              </div>
              <div className={stack({ gap: "0", flex: "1", overflow: "hidden" })}>
                <p className={css({ fontWeight: "700", fontSize: "14px", color: "var(--foreground)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" })} title={mcc.description}>
                  {mcc.description}
                </p>
                <p className={css({ fontSize: "10px", color: "secondaryText", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" })} title={mcc.fullDescription}>
                  {mcc.fullDescription || "Нет описания"}
                </p>
              </div>
            </div>
          ))}
          {allMcc.length === 0 && (
            <div className={css({ gridColumn: "1/-1", py: "40px", textAlign: "center", color: "secondaryText", bg: "var(--card-bg)", borderRadius: "24px" })}>
              Справочник пуст
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
