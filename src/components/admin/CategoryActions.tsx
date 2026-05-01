"use client";

import { useToast } from "@/components/Toast";
import { Tag, Copy, Trash2, Edit2 } from "lucide-react";
import { flex, stack } from "../../../styled-system/patterns";
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
    <div className={stack({ gap: "12px", mt: "16px" })}>
      <div className={flex({ gap: "8px", wrap: "wrap", align: "center" })}>
        {!isAllPurchases && (
          <a 
            href={`/admin/categories/${categoryId}/composition`}
            className={flex({ align: "center", gap: "8px", flex: "1 1 200px", justify: "center", py: "10px", bg: "var(--card-bg)", borderRadius: "12px", fontSize: "12px", fontWeight: "700", color: "var(--secondary-text)", border: "1px solid", borderColor: "var(--border-color)", _hover: { bg: "var(--surface-secondary)" } })}
          >
            <Tag size={14} /> УПРАВЛЯТЬ СОСТАВОМ
          </a>
        )}
        
        <div className={flex({ gap: "8px", flexShrink: 0, ml: isAllPurchases ? "auto" : undefined })}>
          {!isAllPurchases && (
            <label 
              htmlFor={`edit-mcc-${categoryId}`}
              title="Редактировать MCC"
              className={flex({ align: "center", justify: "center", w: "42px", h: "42px", bg: "var(--card-bg)", borderRadius: "12px", color: "var(--secondary-text)", border: "1px solid", borderColor: "var(--border-color)", cursor: "pointer", _hover: { bg: "var(--surface-secondary)" } })}
            >
              <Edit2 size={18} />
            </label>
          )}

          {!isSystem && (
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
                title="Дублировать категорию"
                className={flex({ align: "center", justify: "center", w: "42px", h: "42px", bg: "var(--card-bg)", borderRadius: "12px", color: "var(--secondary-text)", border: "1px solid", borderColor: "var(--border-color)", cursor: "pointer", _hover: { bg: "var(--surface-secondary)" } })}
              >
                <Copy size={18} />
              </button>
            </form>
          )}

          {!isAllPurchases && (
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
                className={flex({ align: "center", justify: "center", w: "42px", h: "42px", bg: "var(--card-bg)", borderRadius: "12px", color: "#ef4444", border: "1px solid", borderColor: "var(--border-color)", cursor: "pointer", _hover: { bg: "rgba(239, 68, 68, 0.1)", borderColor: "#ef4444" } })}
              >
                <Trash2 size={18} color="#ef4444" />
              </button>
            </form>
          )}
        </div>
      </div>
      
      {isAllPurchases && (
        <div className={flex({ textAlign: "center", py: "4px", flex: 1, fontSize: "11px", fontWeight: "600", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em", justify: "center" })}>
          Действует на всё
        </div>
      )}
    </div>
  );
}
