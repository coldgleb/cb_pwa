"use client";

import { useToast } from "@/components/Toast";
import { Plus, Trash2 } from "lucide-react";
import { flex, stack } from "../../../styled-system/patterns";
import { css } from "../../../styled-system/css";
import SearchableSelect from "@/components/SearchableSelect";
import { addBankCardExclusion, removeBankCardExclusion } from "@/lib/actions/categories";

interface BankExclusionActionsProps {
  bankCardId: number;
  mccOptions: { value: string; label: string }[];
  exclusions: { code: string; description: string | null }[];
}

export default function BankExclusionActions({
  bankCardId,
  mccOptions,
  exclusions
}: BankExclusionActionsProps) {
  const { toast } = useToast();

  const handleAdd = async (formData: FormData) => {
    const code = formData.get("mccCode") as string;
    if (!code) return;

    try {
      await addBankCardExclusion(bankCardId, code);
      toast("MCC добавлен в исключения");
    } catch (e) {
      toast("Ошибка при добавлении", "error");
    }
  };

  const handleRemove = async (code: string) => {
    try {
      await removeBankCardExclusion(bankCardId, code);
      toast("Исключение удалено");
    } catch (e) {
      toast("Ошибка при удалении", "error");
    }
  };

  return (
    <div className="sber-card" style={{ padding: "16px" }}>
      <form action={handleAdd} className={stack({ gap: "12px", mb: "20px" })}>
        <div className={flex({ gap: "8px", align: "end" })}>
          <div className={stack({ gap: "4px", flex: 1 })}>
            <label className={css({ fontSize: "10px", fontWeight: "800", color: "secondaryText", textTransform: "uppercase" })}>Добавить исключение</label>
            <SearchableSelect 
              name="mccCode"
              options={mccOptions}
              placeholder="Выберите MCC..."
            />
          </div>
          <button type="submit" className="sber-button" style={{ width: "auto", padding: "12px 16px" }}>
            <Plus size={18} />
          </button>
        </div>
      </form>

      <div className={stack({ gap: "8px" })}>
        {exclusions.length === 0 ? (
          <p className={css({ fontSize: "13px", color: "secondaryText", textAlign: "center", py: "12px" })}>Исключений не добавлено</p>
        ) : (
          exclusions.map((ex) => (
            <div key={ex.code} className={flex({ align: "center", justify: "space-between", p: "12px", bg: "#f8fafc", borderRadius: "12px" })}>
              <div className={flex({ align: "center", gap: "12px" })}>
                <span className={css({ fontWeight: "800", color: "#ef4444", fontVariantNumeric: "tabular-nums" })}>{ex.code}</span>
                <span className={css({ fontSize: "13px", fontWeight: "600" })}>{ex.description || "Без названия"}</span>
              </div>
              <button 
                onClick={() => handleRemove(ex.code)}
                className={css({ color: "#94a3b8", cursor: "pointer", p: "4px", _hover: { color: "#ef4444" }, border: "none", bg: "transparent" })}
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
