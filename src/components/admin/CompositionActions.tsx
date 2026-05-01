"use client";

import { useToast } from "@/components/Toast";
import { Plus, Trash2 } from "lucide-react";
import { flex, stack } from "../../../styled-system/patterns";
import { css } from "../../../styled-system/css";
import SearchableSelect from "@/components/SearchableSelect";

interface CompositionActionsProps {
  categoryId: number;
  type: "mcc" | "merchant";
  options: { value: string; label: string }[];
  linkAction: (categoryId: number, value: any) => Promise<void>;
  unlinkAction: (categoryId: number, value: any) => Promise<void>;
  linkMultipleAction?: (categoryId: number, text: string) => Promise<void>;
  linkedItems: { id: string | number; label: string; sublabel?: string }[];
}

export default function CompositionActions({
  categoryId,
  type,
  options,
  linkAction,
  unlinkAction,
  linkMultipleAction,
  linkedItems
}: CompositionActionsProps) {
  const { toast } = useToast();

  const handleLink = async (formData: FormData) => {
    const value = formData.get(type === "mcc" ? "mccCode" : "merchantId") as string;
    const text = formData.get("mccText") as string;

    try {
      if (value) {
        await linkAction(categoryId, type === "mcc" ? value : parseInt(value));
        toast(type === "mcc" ? "MCC привязан" : "Магазин привязан");
      }
      if (text && linkMultipleAction) {
        await linkMultipleAction(categoryId, text);
        toast("MCC коды добавлены");
      }
    } catch (e) {
      toast("Ошибка при добавлении", "error");
    }
  };

  const handleUnlink = async (value: string | number) => {
    try {
      await unlinkAction(categoryId, value);
      toast(type === "mcc" ? "MCC отвязан" : "Магазин отвязан");
    } catch (e) {
      toast("Ошибка при удалении", "error");
    }
  };

  return (
    <div className="sber-card" style={{ padding: "16px" }}>
      <form action={handleLink} className={stack({ gap: "16px", mb: "24px" })}>
        <div className={stack({ gap: "12px" })}>
          <div className={flex({ gap: "8px", align: "end", w: "full" })}>
            <div className={stack({ gap: "4px", flex: 1, minW: 0 })}>
              <label className={css({ fontSize: "10px", fontWeight: "800", color: "secondaryText", textTransform: "uppercase" })}>
                {type === "mcc" ? "Добавить код (выбор из списка)" : "Добавить магазин"}
              </label>
              <SearchableSelect 
                name={type === "mcc" ? "mccCode" : "merchantId"}
                options={options}
                placeholder={type === "mcc" ? "Выберите MCC..." : "Выберите мерчанта..."}
              />
            </div>
          </div>

          {type === "mcc" && linkMultipleAction && (
            <div className={stack({ gap: "4px" })}>
              <label className={css({ fontSize: "10px", fontWeight: "800", color: "secondaryText", textTransform: "uppercase" })}>Или вставьте список кодов (текстом)</label>
              <textarea 
                name="mccText"
                placeholder="Например: 5411, 5812. Любой текст с 4-значными кодами будет распознан автоматически."
                className="sber-input"
                style={{ minHeight: "60px", paddingTop: "8px", fontSize: "13px" }}
              />
            </div>
          )}
          
          <button type="submit" className="sber-button">
            <Plus size={18} style={{ marginRight: "8px" }} /> {type === "mcc" ? "ДОБАВИТЬ MCC" : "ДОБАВИТЬ МАГАЗИН"}
          </button>
        </div>
      </form>

      <div className={stack({ gap: "8px" })}>
        {linkedItems.length === 0 ? (
          <div className={css({ p: "24px", textAlign: "center", bg: "#f8fafc", borderRadius: "16px", color: "secondaryText", fontSize: "13px" })}>
            {type === "mcc" ? "MCC-коды не привязаны" : "Отдельные магазины не привязаны"}
          </div>
        ) : (
          linkedItems.map(item => (
            <div key={item.id} className={flex({ align: "center", justify: "space-between", p: "12px", bg: "#f8fafc", borderRadius: "14px" })}>
              <div className={flex({ align: "center", gap: "12px" })}>
                {item.sublabel ? (
                   <>
                    <div className={css({ fontWeight: "800", color: "sberGreen", fontSize: "14px", fontVariantNumeric: "tabular-nums" })}>{item.id}</div>
                    <span className={css({ fontSize: "13px", color: "var(--foreground)", fontWeight: "600" })}>{item.label}</span>
                   </>
                ) : (
                   <span className={css({ fontSize: "14px", color: "var(--foreground)", fontWeight: "700" })}>{item.label}</span>
                )}
              </div>
              <form action={() => handleUnlink(item.id)}>
                <button type="submit" className={css({ p: "8px", color: "#ef4444", cursor: "pointer", _hover: { bg: "#fef2f2", borderRadius: "full" } })}>
                  <Trash2 size={16} />
                </button>
              </form>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
