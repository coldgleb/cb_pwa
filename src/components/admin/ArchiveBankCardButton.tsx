"use client";

import { Eye, EyeOff } from "lucide-react";
import { css } from "../../../styled-system/css";
import { toggleBankCardArchive } from "@/lib/actions/bank-cards";
import { useToast } from "../Toast";

export default function ArchiveBankCardButton({ cardId, isArchived }: { cardId: number; isArchived: boolean }) {
  const { toast } = useToast();

  return (
    <button
      onClick={async (e) => {
        e.preventDefault();
        e.stopPropagation();
        try {
          await toggleBankCardArchive(cardId, !isArchived);
          toast(isArchived ? "Карта возвращена из архива" : "Карта перенесена в архив");
        } catch (error) {
          toast("Ошибка при изменении статуса", "error");
        }
      }}
      className={css({
        p: "10px",
        color: isArchived ? "#94a3b8" : "sberGreen",
        bg: "transparent",
        borderRadius: "12px",
        transition: "all 0.2s",
        "&:hover": {
          bg: "#f1f5f9",
          transform: "scale(1.1)",
        },
      })}
      title={isArchived ? "Восстановить" : "Архивировать"}
    >
      {isArchived ? <EyeOff size={20} /> : <Eye size={20} />}
    </button>
  );
}
