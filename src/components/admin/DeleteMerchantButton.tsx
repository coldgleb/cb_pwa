"use client";

import { useToast } from "@/components/Toast";
import { Trash2 } from "lucide-react";
import { deleteMerchant } from "@/lib/actions/merchants";
import { flex } from "../../../styled-system/patterns";

export default function DeleteMerchantButton({ merchantId, merchantName }: { merchantId: number; merchantName: string }) {
  const { toast } = useToast();

  const handleDelete = async () => {
    if (confirm(`Вы уверены, что хотите удалить мерчанта "${merchantName}"? Это может повлиять на расчет кешбэка в истории.`)) {
      try {
        await deleteMerchant(merchantId);
        toast("Мерчант удален");
      } catch (e) {
        toast("Ошибка при удалении", "error");
      }
    }
  };

  return (
    <button 
      onClick={handleDelete}
      className={flex({ align: "center", gap: "6px", fontSize: "11px", fontWeight: "700", color: "#ef4444", cursor: "pointer", opacity: 0.7, _hover: { opacity: 1 }, border: "none", bg: "transparent" })}
    >
      <Trash2 size={12} /> УДАЛИТЬ МЕРЧАНТА
    </button>
  );
}
