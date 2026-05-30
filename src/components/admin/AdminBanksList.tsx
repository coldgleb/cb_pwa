"use client";

import { useState, useEffect, useMemo } from "react";
import { css } from "../../../styled-system/css";
import { stack, flex } from "../../../styled-system/patterns";
import { Landmark, ChevronRight, Edit2 } from "lucide-react";
import { getIconUrl } from "@/lib/utils/icons";
import ViewModeToggle, { HistoryViewMode } from "../ViewModeToggle";
import UniversalTable, { ColumnDef } from "../UniversalTable";

interface Bank {
  id: number;
  name: string;
  logo: string | null;
  website: string | null;
}

interface AdminBanksListProps {
  banks: Bank[];
}

export default function AdminBanksList({ banks }: AdminBanksListProps) {
  const [viewMode, setViewMode] = useState<HistoryViewMode>("cards");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("admin-banks-view-mode") as HistoryViewMode;
    if (saved && (saved === "cards" || saved === "table")) {
      setViewMode(saved);
    }
    setMounted(true);
  }, []);

  const handleViewChange = (mode: HistoryViewMode) => {
    setViewMode(mode);
    localStorage.setItem("admin-banks-view-mode", mode);
  };

  const columns = useMemo<ColumnDef<Bank>[]>(() => [
    {
      id: "name",
      label: "БАНК",
      accessor: (bank) => bank.name,
      renderCell: (bank) => {
        const icon = getIconUrl(bank);
        return (
          <div className={flex({ align: "center", gap: "10px" })}>
            <div className={css({ w: "36px", h: "36px", bg: "#f8fafc", borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center", border: "1px solid #f1f5f9", overflow: "hidden", flexShrink: 0 })}>
              {icon ? (
                <img src={icon} className={css({ w: "full", h: "full", objectFit: "contain", p: "2px" })} alt={bank.name} />
              ) : (
                <Landmark size={14} color="#94a3b8" />
              )}
            </div>
            <span className={css({ fontWeight: "700", whiteSpace: "nowrap" })}>{bank.name}</span>
          </div>
        );
      }
    },
    {
      id: "website",
      label: "САЙТ",
      accessor: (bank) => bank.website || "",
      renderCell: (bank) => {
        return bank.website ? (
          <a href={`https://${bank.website}`} target="_blank" rel="noopener noreferrer" className={css({ color: "var(--sber-green)", textDecoration: "underline" })}>{bank.website}</a>
        ) : (
          <span className={css({ color: "var(--secondary-text)" })}>—</span>
        );
      }
    },
    {
      id: "actions",
      label: "ДЕЙСТВИЯ",
      accessor: (bank) => bank.id,
      sortable: false,
      filterable: false,
      align: "center",
      renderCell: (bank) => {
        return (
          <div className={flex({ justify: "center" })}>
            <a href={`/admin/banks/${bank.id}`} className={css({ color: "#64748b", p: "6px", borderRadius: "8px", _hover: { color: "sberGreen", bg: "rgba(33, 160, 56, 0.05)" } })}>
              <Edit2 size={16} />
            </a>
          </div>
        );
      }
    }
  ], []);

  if (!mounted) {
    return <div className={css({ py: "40px", textAlign: "center", color: "var(--secondary-text)" })}>Загрузка...</div>;
  }

  if (banks.length === 0) {
    return (
      <div className={css({ py: "40px", textAlign: "center", color: "secondaryText", bg: "var(--card-bg)", borderRadius: "24px", border: "1px dashed", borderColor: "#e2e8f0" })}>
        Список банков пуст
      </div>
    );
  }

  return (
    <div className={stack({ gap: "24px" })}>
      <div className={flex({ justify: "flex-end" })}>
        <ViewModeToggle initialMode={viewMode} onViewChange={handleViewChange} />
      </div>

      {viewMode === "cards" ? (
        <div className={css({ display: "grid", gridTemplateColumns: { base: "1fr", sm: "repeat(auto-fill, minmax(320px, 1fr))" }, gap: "12px" })}>
          {banks.map((bank) => {
            const icon = getIconUrl(bank);
            return (
              <a key={bank.id} href={`/admin/banks/${bank.id}`} className="sber-card" style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div className={css({ w: "48px", h: "48px", bg: "#f8fafc", borderRadius: "12px", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", border: "1px solid", borderColor: "#f1f5f9", flexShrink: 0 })}>
                  {icon ? (
                    <img src={icon} alt={bank.name} className={css({ w: "full", h: "full", objectFit: "contain", p: "4px" })} />
                  ) : (
                    <Landmark size={20} color="#94a3b8" />
                  )}
                </div>
                <div className={stack({ gap: "0", flex: "1", minW: 0 })}>
                  <p className={css({ fontWeight: "700", fontSize: "15px", color: "var(--foreground)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" })}>{bank.name}</p>
                  <p className={css({ fontSize: "12px", color: "secondaryText", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" })}>{bank.website || "Сайт не указан"}</p>
                </div>
                <ChevronRight size={18} color="#C7C7CC" className={css({ flexShrink: 0 })} />
              </a>
            );
          })}
        </div>
      ) : (
        <UniversalTable
          data={banks}
          columns={columns}
          localStorageKey="admin_banks_table"
          rowKey={(bank) => bank.id}
        />
      )}
    </div>
  );
}
