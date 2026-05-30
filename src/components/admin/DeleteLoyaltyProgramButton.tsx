"use client";

import { useTransition } from "react";
import { deleteLoyaltyProgram } from "@/lib/actions/loyalty-programs";
import { useToast } from "@/components/Toast";
import { useRouter } from "next/navigation";

interface DeleteLoyaltyProgramButtonProps {
  programId: number;
}

export default function DeleteLoyaltyProgramButton({ programId }: DeleteLoyaltyProgramButtonProps) {
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();
  const router = useRouter();

  const handleDelete = () => {
    if (confirm("Вы уверены, что хотите удалить эту программу лояльности? Все категории будут удалены, а привязанные карты отвязаны.")) {
      startTransition(async () => {
        try {
          await deleteLoyaltyProgram(programId);
          toast("Программа лояльности удалена", "success");
          router.push("/admin/loyalty-programs");
        } catch (e) {
          toast(e instanceof Error ? e.message : "Ошибка при удалении", "error");
        }
      });
    }
  };

  return (
    <button 
      type="button"
      onClick={handleDelete}
      disabled={isPending}
      className="sber-button" 
      style={{ backgroundColor: "#ef4444", cursor: isPending ? "not-allowed" : "pointer" }}
    >
      {isPending ? "Удаление..." : "Удалить программу лояльности"}
    </button>
  );
}
