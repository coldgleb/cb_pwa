"use client";

import { useState, useEffect, useMemo } from "react";
import { css } from "../../../styled-system/css";
import { stack, flex } from "../../../styled-system/patterns";
import { Landmark, ChevronRight, Edit2 } from "lucide-react";
import { getIconUrl } from "@/lib/utils/icons";
import ViewModeToggle, { HistoryViewMode } from "../ViewModeToggle";
import ArchiveBankCardButton from "./ArchiveBankCardButton";
import UniversalTable, { ColumnDef } from "../UniversalTable";

interface BankCard {
  id: number;
  name: string;
  isArchived: boolean | null;
  bankName: string | null;
  bankLogo: string | null;
  bankWebsite: string | null;
  loyaltyProgramName: string | null;
  accountType: string;
}

interface AdminBankCardsListProps {
  cards: BankCard[];
}

const getAccountTypeLabel = (type: string) => {
  switch (type) {
    case "credit": return "Кредит";
    case "cardless": return "Счет";
    case "investments": return "Инвест";
    case "bonus": return "Бонусы";
    default: return "Дебет";
  }
};

const getAccountTypeBg = (type: string) => {
  switch (type) {
    case "credit": return "rgba(249, 115, 22, 0.1)";
    case "cardless": return "rgba(59, 130, 246, 0.1)";
    case "investments": return "rgba(168, 85, 247, 0.1)";
    case "bonus": return "rgba(234, 179, 8, 0.1)";
    default: return "rgba(33, 160, 56, 0.1)";
  }
};

const getAccountTypeColor = (type: string) => {
  switch (type) {
    case "credit": return "#f97316";
    case "cardless": return "#3b82f6";
    case "investments": return "#a855f7";
    case "bonus": return "#eab308";
    default: return "var(--sber-green)";
  }
};

export default function AdminBankCardsList({ cards }: AdminBankCardsListProps) {
  const [viewMode, setViewMode] = useState<HistoryViewMode>("cards");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("admin-cards-view-mode") as HistoryViewMode;
    if (saved && (saved === "cards" || saved === "table")) {
      setViewMode(saved);
    }
    setMounted(true);
  }, []);

  const handleViewChange = (mode: HistoryViewMode) => {
    setViewMode(mode);
    localStorage.setItem("admin-cards-view-mode", mode);
  };

  const columns = useMemo<ColumnDef<BankCard>[]>(() => [
    {
      id: "name",
      label: "НАЗВАНИЕ КАРТЫ",
      accessor: (card) => card.name,
      renderCell: (card) => {
        const bankIcon = getIconUrl({ logo: card.bankLogo, website: card.bankWebsite, name: card.bankName || "" });
        return (
          <div className={flex({ align: "center", gap: "10px" })}>
            <div className={css({ w: "36px", h: "36px", bg: "#f8fafc", borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center", border: "1px solid #f1f5f9", overflow: "hidden", flexShrink: 0 })}>
              {bankIcon ? (
                <img src={bankIcon} className={css({ w: "full", h: "full", objectFit: "contain", p: "2px" })} alt={card.name} />
              ) : (
                <Landmark size={14} color="#94a3b8" />
              )}
            </div>
            <span className={css({ fontWeight: "700", whiteSpace: "nowrap" })}>{card.name}</span>
          </div>
        );
      }
    },
    {
      id: "bankName",
      label: "БАНК",
      accessor: (card) => card.bankName || "",
      filterType: "select",
    },
    {
      id: "loyaltyProgramName",
      label: "ПРОГРАММА ЛОЯЛЬНОСТИ",
      accessor: (card) => card.loyaltyProgramName || "",
      filterType: "select",
      renderCell: (card) => {
        return card.loyaltyProgramName ? (
          <span className={css({ color: "var(--sber-green)" })}>🎁 {card.loyaltyProgramName}</span>
        ) : (
          <span className={css({ color: "var(--secondary-text)" })}>—</span>
        );
      }
    },
    {
      id: "accountType",
      label: "ТИП СЧЕТА",
      accessor: (card) => getAccountTypeLabel(card.accountType),
      filterType: "select",
      renderCell: (card) => {
        return (
          <span className={css({ 
            fontSize: "11px", 
            fontWeight: "700", 
            px: "8px", 
            py: "3px", 
            borderRadius: "6px",
            bg: getAccountTypeBg(card.accountType),
            color: getAccountTypeColor(card.accountType)
          })}>
            {getAccountTypeLabel(card.accountType)}
          </span>
        );
      }
    },
    {
      id: "status",
      label: "СТАТУС",
      accessor: (card) => card.isArchived ? "Архив" : "Актив",
      filterType: "select",
      align: "center",
      renderCell: (card) => {
        return card.isArchived ? (
          <span className={css({ fontSize: "11px", px: "6px", py: "2px", bg: "rgba(239, 68, 68, 0.1)", color: "#ef4444", borderRadius: "6px", fontWeight: "700" })}>Архив</span>
        ) : (
          <span className={css({ fontSize: "11px", px: "6px", py: "2px", bg: "rgba(33, 160, 56, 0.1)", color: "var(--sber-green)", borderRadius: "6px", fontWeight: "700" })}>Актив</span>
        );
      }
    },
    {
      id: "actions",
      label: "ДЕЙСТВИЯ",
      accessor: (card) => card.id,
      sortable: false,
      filterable: false,
      align: "center",
      renderCell: (card) => {
        return (
          <div className={flex({ justify: "center", gap: "8px", align: "center" })}>
            <a href={`/admin/bank-cards/${card.id}`} className={css({ color: "#64748b", p: "6px", borderRadius: "8px", _hover: { color: "sberGreen", bg: "rgba(33, 160, 56, 0.05)" } })}>
              <Edit2 size={16} />
            </a>
            <ArchiveBankCardButton cardId={card.id} isArchived={!!card.isArchived} />
          </div>
        );
      }
    }
  ], []);

  if (!mounted) {
    return <div className={css({ py: "40px", textAlign: "center", color: "var(--secondary-text)" })}>Загрузка...</div>;
  }

  // Group by Bank Name for Cards View
  const groupedCards: Record<string, typeof cards> = {};
  cards.forEach(card => {
    const bankName = card.bankName || "Неизвестный банк";
    if (!groupedCards[bankName]) {
      groupedCards[bankName] = [];
    }
    groupedCards[bankName].push(card);
  });

  return (
    <div className={stack({ gap: "24px" })}>
      <div className={flex({ justify: "flex-end" })}>
        <ViewModeToggle initialMode={viewMode} onViewChange={handleViewChange} />
      </div>

      {viewMode === "cards" ? (
        <div className={stack({ gap: "24px" })}>
          {Object.entries(groupedCards).map(([bankName, bankCards]) => (
            <div key={bankName} className={stack({ gap: "12px" })}>
              <h4 className={css({ fontSize: "16px", fontWeight: "600", color: "var(--foreground)", pl: "4px" })}>{bankName}</h4>
              <div className={css({ display: "grid", gridTemplateColumns: { base: "1fr", sm: "repeat(auto-fill, minmax(320px, 1fr))" }, gap: "12px" })}>
                {bankCards.map(card => {
                  const bankIcon = getIconUrl({ logo: card.bankLogo, website: card.bankWebsite, name: card.bankName || "" });
                  return (
                    <div key={card.id} className={flex({ gap: "8px", align: "stretch", opacity: card.isArchived ? 0.5 : 1 })}>
                      <a href={`/admin/bank-cards/${card.id}`} className="sber-card" style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: '16px', flex: 1 }}>
                        <div className={css({ w: "48px", h: "48px", bg: "#f8fafc", borderRadius: "12px", display: "flex", alignItems: "center", justifyContent: "center", border: "1px solid", borderColor: "#f1f5f9", overflow: "hidden", flexShrink: 0 })}>
                          {bankIcon ? (
                            <img src={bankIcon} alt={card.bankName || ""} className={css({ w: "full", h: "full", objectFit: "contain", p: "4px" })} />
                          ) : (
                            <Landmark size={20} color="#94a3b8" />
                          )}
                        </div>
                        <div className={stack({ gap: "0", flex: "1", minW: 0 })}>
                          <p className={css({ fontWeight: "700", fontSize: "15px", color: "var(--foreground)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" })} title={card.name}>{card.name}{card.isArchived && " (архив)"}</p>
                          <p className={css({ fontSize: "11px", color: "var(--secondary-text)", fontWeight: "600" })}>
                            Тип: {getAccountTypeLabel(card.accountType)}
                          </p>
                          {card.loyaltyProgramName && (
                            <p className={css({ fontSize: "11px", color: "var(--sber-green)", fontWeight: "600", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" })} title={card.loyaltyProgramName}>
                              🎁 {card.loyaltyProgramName}
                            </p>
                          )}
                        </div>
                        <ChevronRight size={18} color="#C7C7CC" className={css({ flexShrink: 0 })} />
                      </a>
                      <ArchiveBankCardButton cardId={card.id} isArchived={!!card.isArchived} />
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <UniversalTable
          data={cards}
          columns={columns}
          localStorageKey="admin_bank_cards_table"
          rowKey={(card) => card.id}
        />
      )}
    </div>
  );
}
