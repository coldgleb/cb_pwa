"use client";

import { useState, useEffect } from "react";
import { LayoutGrid, List } from "lucide-react";
import { css } from "../../styled-system/css";
import { flex } from "../../styled-system/patterns";

export type HistoryViewMode = "cards" | "table";

interface ViewModeToggleProps {
  onViewChange: (mode: HistoryViewMode) => void;
  initialMode?: HistoryViewMode;
}

export default function ViewModeToggle({ onViewChange, initialMode = "cards" }: ViewModeToggleProps) {
  const [viewMode, setViewMode] = useState<HistoryViewMode>(initialMode);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("transaction-view-mode") as HistoryViewMode;
    if (saved && (saved === "cards" || saved === "table")) {
      setViewMode(saved);
      onViewChange(saved);
    }
    setMounted(true);
  }, [onViewChange]);

  const toggleMode = (mode: HistoryViewMode) => {
    setViewMode(mode);
    localStorage.setItem("transaction-view-mode", mode);
    onViewChange(mode);
  };

  if (!mounted) return <div className={css({ w: "80px", h: "40px" })} />;

  return (
    <div className={flex({ 
      bg: "var(--surface-secondary)", 
      p: "4px", 
      borderRadius: "12px", 
      border: "1px solid var(--border-color)",
      gap: "4px"
    })}>
      <button
        onClick={() => toggleMode("cards")}
        className={css({
          p: "8px",
          borderRadius: "8px",
          cursor: "pointer",
          transition: "all 0.2s",
          bg: viewMode === "cards" ? "sberGreen" : "transparent",
          color: viewMode === "cards" ? "white" : "var(--secondary-text)",
          _hover: { color: viewMode === "cards" ? "white" : "var(--foreground)" }
        })}
        title="Карточки"
      >
        <LayoutGrid size={18} />
      </button>
      <button
        onClick={() => toggleMode("table")}
        className={css({
          p: "8px",
          borderRadius: "8px",
          cursor: "pointer",
          transition: "all 0.2s",
          bg: viewMode === "table" ? "sberGreen" : "transparent",
          color: viewMode === "table" ? "white" : "var(--secondary-text)",
          _hover: { color: viewMode === "table" ? "white" : "var(--foreground)" }
        })}
        title="Таблица"
      >
        <List size={18} />
      </button>
    </div>
  );
}
