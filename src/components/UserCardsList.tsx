"use client";

import { useState, useEffect } from "react";
import { css } from "../../styled-system/css";
import { stack, flex } from "../../styled-system/patterns";
import { Landmark, ChevronRight, Edit2 } from "lucide-react";
import { getIconUrl } from "@/lib/utils/icons";
import ViewModeToggle, { HistoryViewMode } from "./ViewModeToggle";
import UniversalTable, { ColumnDef } from "./UniversalTable";

interface UserCard {
  id: number;
  lastFour: string | null;
  cardName: string | null;
  bankName: string | null;
  bankLogo: string | null;
  bankWebsite: string | null;
  accountType: string;
  creditLimit: number | null;
  balance: number;
}


interface UserCardsListProps {
  cards: UserCard[];
}

const getAccountTypeLabel = (type: string) => {
  switch (type) {
    case "credit": return "Кредитная";
    case "cardless": return "Счет";
    case "investments": return "Инвестиции";
    case "bonus": return "Бонусы";
    default: return "Дебетовая";
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

export default function UserCardsList({ cards }: UserCardsListProps) {
  const [viewMode, setViewMode] = useState<HistoryViewMode>("cards");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("cards-view-mode") as HistoryViewMode;
    if (saved && (saved === "cards" || saved === "table")) {
      setViewMode(saved);
    }
    setMounted(true);
  }, []);

  const handleViewChange = (mode: HistoryViewMode) => {
    setViewMode(mode);
    localStorage.setItem("cards-view-mode", mode);
  };

  const columns: ColumnDef<UserCard>[] = [
    {
      id: "cardName",
      label: "КАРТА",
      accessor: (card) => card.cardName || "",
      renderCell: (card) => {
        const bankIcon = getIconUrl({ logo: card.bankLogo, website: card.bankWebsite, name: card.bankName || "" });
        return (
          <div className={flex({ align: "center", gap: "10px" })}>
            <div className={css({ w: "36px", h: "24px", bg: "var(--surface-secondary)", borderRadius: "6px", display: "flex", alignItems: "center", justifyContent: "center", border: "1px solid var(--border-color)", overflow: "hidden", flexShrink: 0 })}>
              {bankIcon ? (
                <img src={bankIcon} className={css({ w: "full", h: "full", objectFit: "contain", p: "2px" })} />
              ) : (
                <Landmark size={14} color="#94a3b8" />
              )}
            </div>
            <span className={css({ fontWeight: "700", whiteSpace: "nowrap" })}>{card.cardName || "Карта"}</span>
          </div>
        );
      }
    },
    {
      id: "bankName",
      label: "БАНК",
      accessor: (card) => card.bankName || "Неизвестный банк",
      filterType: "select"
    },
    {
      id: "accountType",
      label: "ТИП СЧЕТА",
      accessor: (card) => getAccountTypeLabel(card.accountType),
      filterType: "select",
      renderCell: (card) => (
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
      )
    },
    {
      id: "lastFour",
      label: "ПОСЛЕДНИЕ 4 ЦИФРЫ",
      accessor: (card) => card.lastFour || "",
      align: "center",
      renderCell: (card) => card.lastFour ? `•••• ${card.lastFour}` : '—'
    },
    {
      id: "balance",
      label: "ФАКТИЧЕСКИЙ БАЛАНС",
      accessor: (card) => card.balance,
      align: "right",
      renderCell: (card) => (
        <span className={css({ fontWeight: "800", color: card.balance >= 0 ? "var(--foreground)" : "#ef4444" })}>
          {card.balance.toLocaleString("ru-RU")} ₽
        </span>
      )
    },
    {
      id: "balanceWithLimit",
      label: "С УЧЕТОМ ЛИМИТА",
      accessor: (card) => (card.accountType === "credit" ? card.creditLimit || 0 : 0) + card.balance,
      align: "right",
      renderCell: (card) => {
        const bal = (card.accountType === "credit" ? card.creditLimit || 0 : 0) + card.balance;
        return (
          <span className={css({ fontWeight: "800", color: bal >= 0 ? "var(--foreground)" : "#ef4444" })}>
            {card.accountType === "credit" && card.creditLimit !== null 
              ? `${bal.toLocaleString("ru-RU")} ₽`
              : `${card.balance.toLocaleString("ru-RU")} ₽`}
          </span>
        );
      }
    },
    {
      id: "creditLimit",
      label: "КРЕДИТНЫЙ ЛИМИТ",
      accessor: (card) => card.creditLimit || 0,
      align: "right",
      renderCell: (card) => (
        <span className={css({ fontWeight: "800", color: card.accountType === "credit" ? "#f97316" : "var(--secondary-text)" })}>
          {card.accountType === "credit" && card.creditLimit !== null ? `${card.creditLimit.toLocaleString("ru-RU")} ₽` : '—'}
        </span>
      )
    },
    {
      id: "actions",
      label: "ДЕЙСТВИЯ",
      accessor: () => "",
      align: "center",
      sortable: false,
      filterable: false,
      renderCell: (card) => (
        <div className={flex({ justify: "center" })}>
          <a href={`/cards/${card.id}`} className={css({ color: "#64748b", p: "6px", borderRadius: "8px", _hover: { color: "sberGreen", bg: "rgba(33, 160, 56, 0.05)" } })}>
            <Edit2 size={16} />
          </a>
        </div>
      )
    }
  ];

  if (!mounted) {
    return <div className={css({ py: "40px", textAlign: "center", color: "var(--secondary-text)" })}>Загрузка...</div>;
  }

  if (cards.length === 0) {
    return (
      <div className={css({ py: "40px", textAlign: "center", color: "secondaryText", bg: "var(--card-bg)", borderRadius: "24px", border: "1px dashed", borderColor: "#e2e8f0", fontSize: "14px" })}>
        Пока нет добавленных карт
      </div>
    );
  }

  return (
    <div className={stack({ gap: "20px" })}>
      <div className={flex({ justify: "flex-end" })}>
        <ViewModeToggle initialMode={viewMode} onViewChange={handleViewChange} />
      </div>

      {viewMode === "cards" ? (
        <div className={css({ display: "grid", gridTemplateColumns: { base: "1fr", sm: "repeat(auto-fill, minmax(320px, 1fr))" }, gap: "12px" })}>
          {cards.map(card => {
            const bankIcon = getIconUrl({ logo: card.bankLogo, website: card.bankWebsite, name: card.bankName || "" });
            return (
              <a key={card.id} href={`/cards/${card.id}`} className="sber-card" style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: '16px', textDecoration: 'none', transition: 'all 0.2s' }}>
                <div className={css({ w: "52px", h: "34px", bg: "var(--surface-secondary)", borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center", border: "1px solid", borderColor: "var(--border-color)", overflow: "hidden", flexShrink: 0 })}>
                  {bankIcon ? (
                    <img src={bankIcon} alt={card.bankName || ""} className={css({ w: "full", h: "full", objectFit: "contain", p: "2px" })} />
                  ) : (
                    <Landmark size={18} color="#94a3b8" />
                  )}
                </div>
                <div className={stack({ gap: "2px", flex: "1", minW: 0 })}>
                  <div className={flex({ align: "center", gap: "8px", wrap: "wrap" })}>
                    <p className={css({ fontWeight: "700", fontSize: "16px", color: "var(--foreground)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" })}>{card.cardName || "Карта"}</p>
                    <span className={css({ 
                      fontSize: "10px", 
                      fontWeight: "700", 
                      px: "6px", 
                      py: "1px", 
                      borderRadius: "6px",
                      bg: getAccountTypeBg(card.accountType),
                      color: getAccountTypeColor(card.accountType)
                    })}>
                      {getAccountTypeLabel(card.accountType)}
                    </span>
                  </div>
                  <p className={css({ fontSize: "13px", color: "secondaryText", fontWeight: "500", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" })}>
                    {card.bankName || "Неизвестный банк"} {card.lastFour ? `• ${card.lastFour}` : ''}
                    {card.accountType === "credit" && card.creditLimit !== null && (
                      <span className={css({ ml: "8px", color: "#f97316", fontWeight: "700" })}>
                        Лимит: {card.creditLimit.toLocaleString("ru-RU")} ₽
                      </span>
                    )}
                  </p>
                </div>
                <div className={css({ textAlign: "right", flexShrink: 0, mr: "4px" })}>
                  <p className={css({ fontWeight: "900", fontSize: "16px", color: card.balance >= 0 ? "var(--foreground)" : "#ef4444" })}>
                    {card.balance.toLocaleString('ru-RU')} ₽
                  </p>
                  {card.accountType === "credit" && card.creditLimit !== null && (
                    <p className={css({ fontSize: "11px", color: "var(--secondary-text)", fontWeight: "600", mt: "2px" })}>
                      Доступно: {((card.creditLimit || 0) + card.balance).toLocaleString('ru-RU')} ₽
                    </p>
                  )}
                </div>
                <ChevronRight size={18} className={css({ color: "#cbd5e1", flexShrink: 0 })} />
              </a>
            );
          })}
        </div>
      ) : (
        <UniversalTable 
          data={cards}
          columns={columns}
          localStorageKey="user_cards_table"
          rowKey={(c) => c.id}
        />
      )}
    </div>
  );
}
