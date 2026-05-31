"use client";

import { Trash2 } from "lucide-react";
import { css } from "../../styled-system/css";
import { flex } from "../../styled-system/patterns";
import { deleteUserCard } from "@/lib/actions/user-cards";
import { useToast } from "./Toast";
import { useRouter } from "next/navigation";

export default function DeleteUserCardButton({ cardId }: { cardId: number }) {
  const { toast } = useToast();
  const router = useRouter();

  return (
    <form 
      action={async () => {
        try {
          await deleteUserCard(cardId);
          toast("Карта удалена");
          router.push("/cards");
        } catch (error) {
          toast("Ошибка при удалении", "error");
        }
      }}
      onSubmit={(e) => {
        if (!confirm("Вы уверены, что хотите удалить эту карту? Все связанные транзакции также будут удалены.")) {
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
