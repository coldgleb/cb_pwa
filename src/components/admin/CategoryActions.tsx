"use client";

import { useToast } from "@/components/Toast";
import { Tag, Copy, Trash2 } from "lucide-react";
import { flex } from "../../../styled-system/patterns";
import { duplicateBankCategory, deleteBankCategory } from "@/lib/actions/categories";

export default function CategoryActions({ 
  categoryId, 
  isSystem, 
  isAllPurchases 
}: { 
  categoryId: number; 
  isSystem: boolean; 
  isAllPurchases: boolean;
}) {
  const { toast } = useToast();

  return (
    <div className={flex({ gap: "8px", mt: "12px" })}>
      {!isAllPurchases && (
        <div className={flex({ gap: "8px", flex: 1 })}>
          <a 
            href={`/admin/categories/${categoryId}/composition`}
            className={flex({ align: "center", gap: "8px", flex: 1, justify: "center", py: "10px", bg: "white", borderRadius: "12px", fontSize: "12px", fontWeight: "700", color: "#64748b", border: "1px solid", borderColor: "#f1f5f9", _hover: { bg: "#f1f5f9" } })}
          >
            <Tag size={14} /> УПРАВЛЯТЬ СОСТАВОМ
          </a>
          {!isSystem && (
            <div className={flex({ gap: "8px" })}>
              <form action={async () => {
                try {
                  await duplicateBankCategory(categoryId);
                  toast("Категория дублирована");
                } catch (e) {
                  toast("Ошибка при дублировании", "error");
                }
              }}>
                <button 
                  type="submit"
                  title="Дублировать категорию (как новую с сегодня)"
                  className={flex({ align: "center", justify: "center", w: "40px", h: "40px", bg: "white", borderRadius: "12px", color: "#64748b", border: "1px solid", borderColor: "#f1f5f9", cursor: "pointer", _hover: { bg: "#f1f5f9" } })}
                >
                  <Copy size={16} />
                </button>
              </form>

              <form action={async () => {
                if (confirm("Вы уверены, что хотите удалить эту категорию?")) {
                  try {
                    await deleteBankCategory(categoryId);
                    toast("Категория удалена");
                  } catch (e) {
                    toast("Ошибка при удалении", "error");
                  }
                }
              }}>
                <button 
                  type="submit"
                  title="Удалить категорию"
                  className={flex({ align: "center", justify: "center", w: "40px", h: "40px", bg: "white", borderRadius: "12px", color: "#ef4444", border: "1px solid", borderColor: "#fee2e2", cursor: "pointer", _hover: { bg: "#fef2f2" } })}
                >
                  <Trash2 size={16} />
                </button>
              </form>
            </div>
          )}
        </div>
      )}
      
      {isAllPurchases && (
        <div className={flex({ textAlign: "center", py: "8px", flex: 1, fontSize: "11px", fontWeight: "600", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em", justify: "center" })}>
          Действует на всё
        </div>
      )}
    </div>
  );
}
