"use client";

import { useState, useEffect, useMemo } from "react";
import { css } from "../../../styled-system/css";
import { stack, flex } from "../../../styled-system/patterns";
import ViewModeToggle, { HistoryViewMode } from "../ViewModeToggle";
import UniversalTable, { ColumnDef } from "../UniversalTable";

interface MccCode {
  code: string;
  description: string;
  fullDescription: string | null;
}

interface AdminMccListProps {
  mccCodesList: MccCode[];
}

export default function AdminMccList({ mccCodesList }: AdminMccListProps) {
  const [viewMode, setViewMode] = useState<HistoryViewMode>("cards");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("admin-mcc-view-mode") as HistoryViewMode;
    if (saved && (saved === "cards" || saved === "table")) {
      setViewMode(saved);
    }
    setMounted(true);
  }, []);

  const handleViewChange = (mode: HistoryViewMode) => {
    setViewMode(mode);
    localStorage.setItem("admin-mcc-view-mode", mode);
  };

  const columns = useMemo<ColumnDef<MccCode>[]>(() => [
    {
      id: "code",
      label: "КОД MCC",
      accessor: (mcc) => mcc.code,
      renderCell: (mcc) => <span className={css({ fontWeight: "800", color: "sberGreen" })}>{mcc.code}</span>
    },
    {
      id: "description",
      label: "НАЗВАНИЕ",
      accessor: (mcc) => mcc.description,
      renderCell: (mcc) => <span className={css({ fontWeight: "700" })}>{mcc.description}</span>
    },
    {
      id: "fullDescription",
      label: "ПОЛНОЕ ОПИСАНИЕ",
      accessor: (mcc) => mcc.fullDescription || "",
      renderCell: (mcc) => mcc.fullDescription || <span className={css({ color: "var(--secondary-text)" })}>—</span>
    }
  ], []);

  if (!mounted) {
    return <div className={css({ py: "40px", textAlign: "center", color: "var(--secondary-text)" })}>Загрузка...</div>;
  }

  if (mccCodesList.length === 0) {
    return (
      <div className={css({ py: "40px", textAlign: "center", color: "secondaryText", bg: "var(--card-bg)", borderRadius: "24px", border: "1px dashed", borderColor: "#e2e8f0" })}>
        Справочник пуст
      </div>
    );
  }

  return (
    <div className={stack({ gap: "24px" })}>
      <div className={flex({ justify: "flex-end" })}>
        <ViewModeToggle initialMode={viewMode} onViewChange={handleViewChange} />
      </div>

      {viewMode === "cards" ? (
        <div className={css({ display: "grid", gridTemplateColumns: { base: "1fr", sm: "repeat(auto-fill, minmax(280px, 1fr))" }, gap: "12px" })}>
          {mccCodesList.map((mcc) => (
            <div key={mcc.code} className="sber-card" style={{ padding: "14px", display: "flex", alignItems: "center", gap: "16px" }}>
              <div className={css({ minW: "44px", h: "44px", bg: "#f8fafc", borderRadius: "10px", display: "flex", alignItems: "center", justifyContent: "center", border: "1px solid", borderColor: "#f1f5f9", color: "#21a038", fontWeight: "800", fontSize: "13px", flexShrink: 0 })}>
                {mcc.code}
              </div>
              <div className={stack({ gap: "0", flex: "1", overflow: "hidden" })}>
                <p className={css({ fontWeight: "700", fontSize: "14px", color: "var(--foreground)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" })} title={mcc.description}>
                  {mcc.description}
                </p>
                <p className={css({ fontSize: "10px", color: "secondaryText", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" })} title={mcc.fullDescription || ""}>
                  {mcc.fullDescription || "Нет описания"}
                </p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <UniversalTable
          data={mccCodesList}
          columns={columns}
          localStorageKey="admin_mcc_table"
          rowKey={(mcc) => mcc.code}
        />
      )}
    </div>
  );
}
