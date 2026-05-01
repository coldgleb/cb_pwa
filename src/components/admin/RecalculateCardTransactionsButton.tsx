"use client";

import { RefreshCw } from "lucide-react";
import { css } from "../../../styled-system/css";
import { recalculateTransactionsForBankCard } from "@/lib/actions/bank-cards";
import { useToast } from "../Toast";

export default function RecalculateCardTransactionsButton({ cardId }: { cardId: number }) {
  const { toast } = useToast();

  return (
    <form 
      action={async () => {
        try {
          await recalculateTransactionsForBankCard(cardId);
          toast("Пересчет запущен");
        } catch (error) {
          toast("Ошибка при запуске пересчета", "error");
        }
      }}
      onSubmit={(e) => {
        if (!confirm("Вы уверены, что хотите пересчитать ВСЕ транзакции по этой карте? Это может занять время.")) {
          e.preventDefault();
        }
      }}
    >
      <button 
        type="submit" 
        title="Пересчитать все транзакции по карте"
        className={css({ 
          p: "8px", 
          color: "var(--sber-green)", 
          cursor: "pointer", 
          borderRadius: "10px", 
          border: "1px solid var(--border-color)", 
          bg: "var(--card-bg)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          _hover: { bg: "rgba(33, 160, 56, 0.1)" } 
        })}
      >
        <RefreshCw size={18} />
      </button>
    </form>
  );
}
