"use client";

import { Trash2 } from "lucide-react";
import { css } from "../../../styled-system/css";
import { flex } from "../../../styled-system/patterns";
import { deleteBankCard } from "@/lib/actions/bank-cards";
import { useToast } from "../Toast";

export default function DeleteBankCardButton({ cardId }: { cardId: number }) {
  const { toast } = useToast();

  return (
    <form 
      action={async () => {
        try {
          await deleteBankCard(cardId);
          toast("Тип карты удален");
        } catch (error) {
          toast("Ошибка при удалении", "error");
        }
      }}
      onSubmit={(e) => {
        if (!confirm("Вы уверены, что хотите удалить этот тип карты?")) {
          e.preventDefault();
        }
      }}
      className={flex({ align: "center" })}
    >
      <button
        type="submit"
        className={css({ 
          p: "12px", 
          bg: "var(--card-bg)", 
          borderRadius: "16px", 
          color: "#ef4444", 
          border: "1px solid var(--border-color)", 
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          _hover: { bg: "rgba(239, 68, 68, 0.1)", borderColor: "#ef4444" }
        })}
      >
        <Trash2 size={20} />
      </button>
    </form>
  );
}
