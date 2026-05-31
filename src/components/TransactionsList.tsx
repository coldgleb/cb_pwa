"use client";

import { useState, useEffect, useMemo } from "react";
import { css } from "../../styled-system/css";
import { stack, flex } from "../../styled-system/patterns";
import { 
  Edit2, 
  Trash2, 
  ShoppingCart, 
  Utensils, 
  Car, 
  Coffee, 
  Smartphone, 
  Globe, 
  Gift, 
  HelpCircle, 
  X, 
  ChevronRight, 
  ArrowUpDown, 
  ArrowUp,
  History,
  Plus,
  Percent,
  TrendingUp,
  ArrowRightLeft,
  Landmark
} from "lucide-react";
import Link from "next/link";
import { deleteTransaction } from "@/lib/actions/transactions";
import { getIconUrl } from "@/lib/utils/icons";
import ViewModeToggle, { HistoryViewMode } from "./ViewModeToggle";
import UniversalTable, { ColumnDef } from "./UniversalTable";

interface TransactionItem {
  id: number;
  amount: number;
  paidAmount: number | null;
  cashback: number | null;
  cashbackPercentage: number | null;
  manualAdjustment: number;
  merchantName: string | null;
  date: Date;
  cardName: string | null;
  bankName: string | null;
  categoryName: string | null;
  spendingCategoryName: string | null;
  merchantLogo: string | null;
  merchantWebsite: string | null;
  type: string | null;
  toUserCardId: number | null;
  toCardName: string | null;
  toBankName: string | null;
}

interface TransactionsListProps {
  initialHistory: TransactionItem[];
  splitsMap: Record<number, any[]>;
}

export default function TransactionsList({ initialHistory, splitsMap }: TransactionsListProps) {
  const [viewMode, setViewMode] = useState<HistoryViewMode>("cards");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("transactions-view-mode") as HistoryViewMode;
    if (saved && (saved === "cards" || saved === "table")) {
      setViewMode(saved);
    }
    setMounted(true);
  }, []);

  const handleViewChange = (mode: HistoryViewMode) => {
    setViewMode(mode);
    localStorage.setItem("transactions-view-mode", mode);
  };

  const getCategoryIcon = (categoryName: string | null) => {
    const name = categoryName?.toLowerCase() || "";
    if (name.includes("супермаркет") || name.includes("продукты")) return <ShoppingCart size={18} />;
    if (name.includes("ресторан") || name.includes("кафе") || name.includes("фастфуд")) return <Utensils size={18} />;
    if (name.includes("транспорт") || name.includes("такси")) return <Car size={18} />;
    if (name.includes("кофе") || name.includes("пекарн")) return <Coffee size={18} />;
    if (name.includes("связь") || name.includes("интернет")) return <Smartphone size={18} />;
    if (name.includes("дом") || name.includes("ремонт")) return <Globe size={18} />;
    if (name.includes("подарки") || name.includes("хобби")) return <Gift size={18} />;
    return <HelpCircle size={18} />;
  };

  const columns: ColumnDef<TransactionItem>[] = [
    {
      id: "merchant",
      label: "ТОРГОВАЯ ТОЧКА",
      accessor: (item) => item.merchantName || "—",
      renderCell: (item) => {
        const logo = getIconUrl({ logo: item.merchantLogo, website: item.merchantWebsite, name: item.merchantName || "" });
        return (
          <div className={flex({ align: "center", gap: "10px" })}>
            <div className={css({ w: "32px", h: "32px", bg: "var(--surface-secondary)", borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center", border: "1px solid var(--border-color)", overflow: "hidden", flexShrink: 0 })}>
              {logo ? (
                <img src={logo} className={css({ w: "full", h: "full", objectFit: "contain", p: "2px" })} />
              ) : (
                getCategoryIcon(item.categoryName)
              )}
            </div>
            <span className={css({ fontWeight: "700", whiteSpace: "nowrap" })}>{item.merchantName || "Без названия"}</span>
          </div>
        );
      }
    },
    {
      id: "type",
      label: "ТИП",
      accessor: (item) => item.type || "expense",
      filterType: "select",
      renderCell: (item) => (
        <span className={css({ 
          fontSize: "11px", 
          fontWeight: "700", 
          px: "8px", 
          py: "3px", 
          borderRadius: "6px",
          bg: item.type === "income" ? "rgba(33, 160, 56, 0.1)" : item.type === "transfer" ? "rgba(245, 158, 11, 0.1)" : "rgba(59, 130, 246, 0.1)",
          color: item.type === "income" ? "sberGreen" : item.type === "transfer" ? "#f59e0b" : "#3b82f6"
        })}>
          {item.type === "income" ? "ДОХОД" : item.type === "transfer" ? "ПЕРЕВОД" : "РАСХОД"}
        </span>
      )
    },
    {
      id: "amount",
      label: "СУММА",
      accessor: (item) => item.amount,
      align: "right",
      renderCell: (item) => (
        <span className={css({ fontWeight: "800", color: item.type === "income" ? "sberGreen" : "var(--foreground)" })}>
          {item.type === "income" ? "+" : ""}{item.amount.toLocaleString("ru-RU")} ₽
        </span>
      )
    },
    {
      id: "card",
      label: "КАРТА",
      accessor: (item) => `${item.bankName} ${item.cardName}`,
      filterType: "select"
    },
    {
      id: "category",
      label: "КАТЕГОРИЯ",
      accessor: (item) => item.spendingCategoryName || item.categoryName || "—",
      filterType: "select"
    },
    {
        id: "cashback",
        label: "КЕШБЭК",
        accessor: (item) => item.cashback || 0,
        align: "right",
        renderCell: (item) => (
          item.cashback !== null ? (
            <div className={stack({ gap: "0", align: "flex-end" })}>
              <span className={css({ fontWeight: "800", color: "sberGreen" })}>+{item.cashback.toLocaleString("ru-RU")} ₽</span>
              {item.cashbackPercentage !== null && (
                <span className={css({ fontSize: "10px", color: "var(--secondary-text)", fontWeight: "600" })}>{item.cashbackPercentage}%</span>
              )}
            </div>
          ) : "—"
        )
    },
    {
      id: "date",
      label: "ДАТА",
      accessor: (item) => new Date(item.date).getTime(),
      renderCell: (item) => new Date(item.date).toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit", year: "2-digit" })
    },
    {
      id: "actions",
      label: "ДЕЙСТВИЯ",
      accessor: () => "",
      align: "center",
      sortable: false,
      filterable: false,
      renderCell: (item) => (
        <div className={flex({ justify: "center", gap: "8px" })}>
          <a href={`/transactions/${item.id}/edit`} className={css({ color: "#64748b", p: "6px", borderRadius: "8px", _hover: { color: "sberGreen", bg: "rgba(33, 160, 56, 0.05)" } })}>
            <Edit2 size={16} />
          </a>
          <button 
            onClick={async () => {
              if (confirm("Удалить операцию?")) {
                await deleteTransaction(item.id);
                window.location.reload();
              }
            }}
            className={css({ color: "#ef4444", p: "6px", borderRadius: "8px", bg: "transparent", border: "none", cursor: "pointer", _hover: { bg: "rgba(239, 68, 68, 0.05)" } })}
          >
            <Trash2 size={16} />
          </button>
        </div>
      )
    }
  ];

  if (!mounted) {
    return <div className={css({ py: "40px", textAlign: "center", color: "var(--secondary-text)" })}>Загрузка...</div>;
  }

  if (initialHistory.length === 0) {
    return (
      <div className={stack({ 
        py: "64px", 
        px: "24px",
        textAlign: "center", 
        bg: "var(--card-bg)", 
        borderRadius: "28px", 
        border: "2px dashed var(--border-color)",
        gap: "20px",
        align: "center"
      })}>
        <div className={css({ w: "64px", h: "64px", bg: "var(--surface-secondary)", borderRadius: "22px", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--secondary-text)" })}>
          <History size={32} strokeWidth={1.5} />
        </div>
        <div className={stack({ gap: "4px" })}>
          <p className={css({ fontSize: "17px", fontWeight: "800", color: "var(--foreground)" })}>История пуста</p>
          <p className={css({ fontSize: "14px", color: "var(--secondary-text)", fontWeight: "500", maxWidth: "240px" })}>
            Вы еще не записывали операции. Начните сейчас, чтобы видеть статистику
          </p>
        </div>
        <Link href="/transactions/new" className="sber-button" style={{ width: "auto", padding: "12px 24px", fontSize: "15px", borderRadius: "14px" }}>
           <Plus size={18} /> Записать операцию
        </Link>
      </div>
    );
  }

  return (
    <div className={stack({ gap: "20px" })}>
      <div className={flex({ justify: "flex-end" })}>
        <ViewModeToggle initialMode={viewMode} onViewChange={handleViewChange} />
      </div>

      {viewMode === "cards" ? (
        <div className={stack({ gap: "12px" })}>
          {initialHistory.map((item) => {
            const logo = getIconUrl({ logo: item.merchantLogo, website: item.merchantWebsite, name: item.merchantName || "" });
            const splits = splitsMap[item.id] || [];
            
            return (
              <div key={item.id} className="sber-card" style={{ padding: '16px' }}>
                <div className={flex({ justify: "space-between", align: "flex-start", mb: "12px" })}>
                  <div className={flex({ align: "center", gap: "12px" })}>
                    <div className={css({ w: "48px", h: "48px", bg: "var(--surface-secondary)", borderRadius: "14px", display: "flex", alignItems: "center", justifyContent: "center", border: "1px solid var(--border-color)", overflow: "hidden", flexShrink: 0 })}>
                      {logo ? (
                        <img src={logo} className={css({ w: "full", h: "full", objectFit: "contain", p: "4px" })} />
                      ) : (
                        getCategoryIcon(item.categoryName)
                      )}
                    </div>
                    <div className={stack({ gap: "2px" })}>
                      <p className={css({ fontWeight: "800", fontSize: "16px" })}>{item.merchantName || "Без названия"}</p>
                      <div className={flex({ align: "center", gap: "6px" })}>
                        <span className={css({ 
                          fontSize: "10px", 
                          fontWeight: "700", 
                          px: "6px", 
                          py: "1px", 
                          borderRadius: "4px",
                          bg: item.type === "income" ? "rgba(33, 160, 56, 0.1)" : item.type === "transfer" ? "rgba(245, 158, 11, 0.1)" : "rgba(59, 130, 246, 0.1)",
                          color: item.type === "income" ? "sberGreen" : item.type === "transfer" ? "#f59e0b" : "#3b82f6"
                        })}>
                          {item.type === "income" ? "ДОХОД" : item.type === "transfer" ? "ПЕРЕВОД" : "РАСХОД"}
                        </span>
                        <span className={css({ fontSize: "12px", color: "var(--secondary-text)", fontWeight: "500" })}>
                          {new Date(item.date).toLocaleDateString("ru-RU", { day: "2-digit", month: "short" })}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className={stack({ align: "flex-end", gap: "2px" })}>
                    <p className={css({ fontWeight: "900", fontSize: "18px", color: item.type === "income" ? "sberGreen" : "var(--foreground)" })}>
                      {item.type === "income" ? "+" : ""}{item.amount.toLocaleString("ru-RU")} ₽
                    </p>
                    {item.cashback && item.cashback > 0 && (
                      <div className={flex({ align: "center", gap: "4px", bg: "rgba(33, 160, 56, 0.1)", px: "6px", py: "2px", borderRadius: "6px" })}>
                         <Percent size={10} color="var(--sber-green)" strokeWidth={3} />
                         <span className={css({ fontSize: "12px", fontWeight: "800", color: "sberGreen" })}>
                           {item.cashback.toLocaleString("ru-RU")}
                         </span>
                      </div>
                    )}
                  </div>
                </div>

                <div className={flex({ justify: "space-between", align: "center", pt: "12px", borderTop: "1px solid var(--separator)" })}>
                   <div className={flex({ align: "center", gap: "6px", color: "var(--secondary-text)" })}>
                      <Landmark size={14} />
                      <span className={css({ fontSize: "12px", fontWeight: "600" })}>
                        {item.bankName} {item.cardName}
                        {item.type === "transfer" && item.toCardName && ` → ${item.toBankName} ${item.toCardName}`}
                      </span>
                   </div>
                   <div className={flex({ gap: "4px" })}>
                      <Link href={`/transactions/${item.id}/edit`} className={css({ p: "8px", color: "var(--secondary-text)", borderRadius: "10px", _hover: { bg: "var(--surface-secondary)", color: "var(--foreground)" } })}>
                        <Edit2 size={16} />
                      </Link>
                      <button 
                        onClick={async () => {
                          if (confirm("Удалить операцию?")) {
                            await deleteTransaction(item.id);
                            window.location.reload();
                          }
                        }}
                        className={css({ p: "8px", color: "#ef4444", bg: "transparent", border: "none", cursor: "pointer", borderRadius: "10px", _hover: { bg: "rgba(239, 68, 68, 0.05)" } })}
                      >
                        <Trash2 size={16} />
                      </button>
                   </div>
                </div>

                {splits.length > 1 && (
                  <div className={stack({ gap: "6px", mt: "12px", p: "10px", bg: "var(--surface-secondary)", borderRadius: "12px" })}>
                    <p className={css({ fontSize: "11px", fontWeight: "800", color: "var(--secondary-text)", textTransform: "uppercase" })}>Разделение по категориям</p>
                    {splits.map((s: any, idx: number) => (
                      <div key={idx} className={flex({ justify: "space-between", fontSize: "13px" })}>
                        <span className={css({ fontWeight: "600", color: "var(--secondary-text)" })}>{s.categoryName}</span>
                        <span className={css({ fontWeight: "700" })}>{s.amount.toLocaleString("ru-RU")} ₽</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <UniversalTable
          data={initialHistory}
          columns={columns}
          localStorageKey="transactions_table"
          rowKey={(item) => item.id}
        />
      )}
    </div>
  );
}
