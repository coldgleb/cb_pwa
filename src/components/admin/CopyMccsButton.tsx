"use client";

import { useToast } from "../Toast";
import { Copy } from "lucide-react";
import { css } from "../../../styled-system/css";
import { flex } from "../../../styled-system/patterns";

export default function CopyMccsButton({ mccs }: { mccs: string }) {
  const { toast } = useToast();

  const handleCopy = async () => {
    if (!mccs) return;
    try {
      await navigator.clipboard.writeText(mccs);
      toast("Список MCC скопирован");
    } catch (err) {
      console.error("Failed to copy!", err);
      toast("Ошибка при копировании", "error");
    }
  };

  return (
    <button
      onClick={handleCopy}
      className={flex({ 
        align: "center", 
        gap: "6px", 
        px: "10px", 
        py: "6px", 
        bg: "white", 
        border: "1px solid", 
        borderColor: "#e2e8f0", 
        borderRadius: "10px",
        fontSize: "11px",
        fontWeight: "700",
        color: "#64748b",
        cursor: "pointer",
        transition: "all 0.2s",
        _hover: { bg: "#f8fafc", borderColor: "#cbd5e1" }
      })}
      title="Копировать список MCC через запятую"
    >
      <Copy size={14} />
      КОПИРОВАТЬ MCC
    </button>
  );
}
