"use client";

import { useState, useEffect, useMemo } from "react";
import { css } from "../../../styled-system/css";
import { stack, flex } from "../../../styled-system/patterns";
import { Landmark, ChevronRight, Edit2 } from "lucide-react";
import { getIconUrl } from "@/lib/utils/icons";
import ViewModeToggle, { HistoryViewMode } from "../ViewModeToggle";
import UniversalTable, { ColumnDef } from "../UniversalTable";

interface LoyaltyProgram {
  id: number;
  name: string;
  description: string | null;
  bankId: number | null;
  bankName: string | null;
  bankLogo: string | null;
  bankWebsite: string | null;
}

interface AdminLoyaltyProgramsListProps {
  programs: LoyaltyProgram[];
}

export default function AdminLoyaltyProgramsList({ programs }: AdminLoyaltyProgramsListProps) {
  const [viewMode, setViewMode] = useState<HistoryViewMode>("cards");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("admin-programs-view-mode") as HistoryViewMode;
    if (saved && (saved === "cards" || saved === "table")) {
      setViewMode(saved);
    }
    setMounted(true);
  }, []);

  const handleViewChange = (mode: HistoryViewMode) => {
    setViewMode(mode);
    localStorage.setItem("admin-programs-view-mode", mode);
  };

  const columns = useMemo<ColumnDef<LoyaltyProgram>[]>(() => [
    {
      id: "name",
      label: "ПРОГРАММА ЛОЯЛЬНОСТИ",
      accessor: (prog) => prog.name,
      renderCell: (prog) => {
        const bankIcon = getIconUrl({ logo: prog.bankLogo, website: prog.bankWebsite, name: prog.bankName || "" });
        return (
          <div className={flex({ align: "center", gap: "10px" })}>
            <div className={css({ w: "36px", h: "36px", bg: "#f8fafc", borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center", border: "1px solid #f1f5f9", overflow: "hidden", flexShrink: 0 })}>
              {bankIcon ? (
                <img src={bankIcon} className={css({ w: "full", h: "full", objectFit: "contain", p: "2px" })} alt={prog.name} />
              ) : (
                <Landmark size={14} color="#94a3b8" />
              )}
            </div>
            <span className={css({ fontWeight: "700", whiteSpace: "nowrap" })}>{prog.name}</span>
          </div>
        );
      }
    },
    {
      id: "bankName",
      label: "БАНК",
      accessor: (prog) => prog.bankName || "",
      filterType: "select",
    },
    {
      id: "description",
      label: "ОПИСАНИЕ",
      accessor: (prog) => prog.description || "",
      renderCell: (prog) => prog.description || <span className={css({ color: "var(--secondary-text)" })}>—</span>
    },
    {
      id: "actions",
      label: "ДЕЙСТВИЯ",
      accessor: (prog) => prog.id,
      sortable: false,
      filterable: false,
      align: "center",
      renderCell: (prog) => {
        return (
          <div className={flex({ justify: "center" })}>
            <a href={`/admin/loyalty-programs/${prog.id}`} className={css({ color: "#64748b", p: "6px", borderRadius: "8px", _hover: { color: "sberGreen", bg: "rgba(33, 160, 56, 0.05)" } })}>
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

  if (programs.length === 0) {
    return (
      <div className={css({ py: "40px", textAlign: "center", color: "secondaryText", bg: "var(--card-bg)", borderRadius: "24px", border: "1px dashed", borderColor: "#e2e8f0" })}>
        Программы лояльности еще не созданы
      </div>
    );
  }

  // Group by Bank Name for Cards View
  const groupedPrograms: Record<string, typeof programs> = {};
  programs.forEach(prog => {
    const bankName = prog.bankName || "Неизвестный банк";
    if (!groupedPrograms[bankName]) {
      groupedPrograms[bankName] = [];
    }
    groupedPrograms[bankName].push(prog);
  });

  return (
    <div className={stack({ gap: "24px" })}>
      <div className={flex({ justify: "flex-end" })}>
        <ViewModeToggle initialMode={viewMode} onViewChange={handleViewChange} />
      </div>

      {viewMode === "cards" ? (
        <div className={stack({ gap: "24px" })}>
          {Object.entries(groupedPrograms).map(([bankName, bankProgs]) => (
            <div key={bankName} className={stack({ gap: "12px" })}>
              <h4 className={css({ fontSize: "16px", fontWeight: "600", color: "var(--foreground)", pl: "4px" })}>{bankName}</h4>
              <div className={css({ display: "grid", gridTemplateColumns: { base: "1fr", sm: "repeat(auto-fill, minmax(320px, 1fr))" }, gap: "12px" })}>
                {bankProgs.map(prog => {
                  const bankIcon = getIconUrl({ logo: prog.bankLogo, website: prog.bankWebsite, name: prog.bankName || "" });
                  return (
                    <a key={prog.id} href={`/admin/loyalty-programs/${prog.id}`} className="sber-card" style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: '16px' }}>
                      <div className={css({ w: "48px", h: "48px", bg: "#f8fafc", borderRadius: "12px", display: "flex", alignItems: "center", justifyContent: "center", border: "1px solid", borderColor: "#f1f5f9", overflow: "hidden", flexShrink: 0 })}>
                        {bankIcon ? (
                          <img src={bankIcon} alt={prog.bankName || ""} className={css({ w: "full", h: "full", objectFit: "contain", p: "4px" })} />
                        ) : (
                          <Landmark size={20} color="#94a3b8" />
                        )}
                      </div>
                      <div className={stack({ gap: "0", flex: "1", minW: 0 })}>
                        <p className={css({ fontWeight: "700", fontSize: "15px", color: "var(--foreground)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" })} title={prog.name}>{prog.name}</p>
                        {prog.description && (
                          <p className={css({ fontSize: "11px", color: "secondaryText", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" })}>
                            {prog.description}
                          </p>
                        )}
                      </div>
                      <ChevronRight size={18} color="#C7C7CC" className={css({ flexShrink: 0 })} />
                    </a>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <UniversalTable
          data={programs}
          columns={columns}
          localStorageKey="admin_loyalty_programs_table"
          rowKey={(prog) => prog.id}
        />
      )}
    </div>
  );
}
