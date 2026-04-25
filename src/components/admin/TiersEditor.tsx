"use client";

import { useState } from "react";
import { css } from "../../../styled-system/css";
import { stack, flex } from "../../../styled-system/patterns";
import { Plus, Trash2 } from "lucide-react";

export default function TiersEditor({ defaultValue }: { defaultValue: string }) {
  const [tiers, setTiers] = useState<{minAmount: number, percentage: number}[]>(() => {
    try {
      const parsed = JSON.parse(defaultValue || "[]");
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });

  const updateTier = (index: number, field: "minAmount" | "percentage", value: string) => {
    const num = parseFloat(value) || 0;
    const newTiers = [...tiers];
    newTiers[index] = { ...newTiers[index], [field]: num };
    setTiers(newTiers);
  };

  const removeTier = (index: number) => {
    setTiers(tiers.filter((_, i) => i !== index));
  };

  const addTier = () => {
    setTiers([...tiers, { minAmount: 0, percentage: 0 }]);
  };

  return (
    <div className={stack({ gap: "8px", w: "full" })}>
      <input type="hidden" name="tiers" value={JSON.stringify(tiers)} />
      {tiers.map((t, i) => (
        <div key={i} className={flex({ gap: "8px", align: "center", w: "full" })}>
          <div className={flex({ align: "center", gap: "6px", flex: 1, bg: "white", p: "4px 8px", borderRadius: "10px", border: "1px solid #e2e8f0" })}>
            <span className={css({ fontSize: "11px", fontWeight: "700", color: "secondaryText", whiteSpace: "nowrap" })}>СУММА ОТ</span>
            <input 
              type="number" 
              value={t.minAmount === 0 && t.percentage === 0 ? "" : t.minAmount}
              onChange={e => updateTier(i, "minAmount", e.target.value)} 
              className={css({ w: "full", fontSize: "13px", fontWeight: "700", outline: "none", color: "#000", bg: "transparent" })}
              placeholder="0"
            />
            <span className={css({ fontSize: "13px", fontWeight: "800", color: "sberGreen" })}>₽</span>
          </div>
          <div className={flex({ align: "center", gap: "6px", flex: 1, bg: "white", p: "4px 8px", borderRadius: "10px", border: "1px solid #e2e8f0" })}>
            <input 
              type="number" 
              step="0.25"
              value={t.minAmount === 0 && t.percentage === 0 ? "" : t.percentage}
              onChange={e => updateTier(i, "percentage", e.target.value)} 
              className={css({ w: "full", fontSize: "13px", fontWeight: "700", outline: "none", color: "#000", bg: "transparent", textAlign: "right" })}
              placeholder="0"
            />
            <span className={css({ fontSize: "13px", fontWeight: "800", color: "sberGreen" })}>%</span>
          </div>
          <button type="button" onClick={() => removeTier(i)} className={flex({ align: "center", justify: "center", p: "8px", color: "#ef4444", cursor: "pointer", borderRadius: "10px", bg: "white", border: "1px solid #e2e8f0", _hover: { bg: "#fef2f2", borderColor: "#ef4444" } })}>
            <Trash2 size={16} />
          </button>
        </div>
      ))}
      <button type="button" onClick={addTier} className={flex({ align: "center", justify: "center", gap: "6px", fontSize: "12px", fontWeight: "800", color: "sberGreen", cursor: "pointer", p: "10px", w: "full", borderRadius: "10px", border: "1px dashed sberGreen", bg: "#f0fdf4", _hover: { bg: "#dcfce7" } })}>
        <Plus size={16} /> ДОБАВИТЬ УРОВЕНЬ КЕШБЭКА
      </button>
    </div>
  );
}
