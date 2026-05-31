"use client";

import { Trash2 } from "lucide-react";
import { css } from "../../../styled-system/css";
import { flex } from "../../../styled-system/patterns";
import { deleteBank } from "@/lib/actions/banks";
import { useToast } from "../Toast";

export default function DeleteBankButton({ bankId }: { bankId: number }) {
  const { toast } = useToast();

  return (
    <form 
      action={async () => {
        try {
          await deleteBank(bankId);
          toast("Банк удален");
        } catch (error) {
          toast("Ошибка при удалении", "error");
        }
      }}
      onSubmit={(e) => {
        if (!confirm("Вы уверены, что хотите удалить этот банк? Это может привести к ошибкам, если к банку привязаны карты.")) {
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
