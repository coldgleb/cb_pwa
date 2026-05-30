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
  ArrowDown,
  Percent,
  TrendingUp,
  ArrowRightLeft
} from "lucide-react";
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
  date: Date | null;
  cardName: string | null;
  bankName: string | null;
  categoryName: string | null;
  spendingCategoryName: string | null;
  merchantLogo: string | null;
  merchantWebsite: string | null;
  type?: string | null;
  toUserCardId?: number | null;
  toCardName?: string | null;
  toBankName?: string | null;
}

interface TransactionsListProps {
  initialHistory: TransactionItem[];
  splitsMap: Record<number, any[]>;
}

const formatUTCDate = (d: Date) => {
  const day = String(d.getUTCDate()).padStart(2, '0');
  const month = String(d.getUTCMonth() + 1).padStart(2, '0');
  const year = d.getUTCFullYear();
  return `${day}.${month}.${year}`;
};

const formatUTCTime = (d: Date) => {
  return d.toISOString().substring(11, 16);
};

const getCategoryIcon = (category: string | null) => {
  const name = category?.toLowerCase() || "";
  if (name.includes("супер") || name.includes("продукт")) return <ShoppingCart size={20} />;
  if (name.includes("ресторан") || name.includes("еда") || name.includes("пицц")) return <Utensils size={20} />;
  if (name.includes("такси") || name.includes("авто") || name.includes("транспорт")) return <Car size={20} />;
  if (name.includes("кафе") || name.includes("кофе")) return <Coffee size={20} />;
  if (name.includes("связь") || name.includes("телефон")) return <Smartphone size={20} />;
  if (name.includes("развлеч") || name.includes("кино") || name.includes("театр")) return <Globe size={20} />;
  if (name.includes("подар") || name.includes("цвет")) return <Gift size={20} />;
  return <HelpCircle size={20} />;
};

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

  const groupedHistory = initialHistory.reduce((groups, item) => {
    const dateStr = item.date ? formatUTCDate(new Date(item.date)) : 'Неизвестно';
    if (!groups[dateStr]) {
      groups[dateStr] = [];
    }
    groups[dateStr].push(item);
    return groups;
  }, {} as Record<string, typeof initialHistory>);

  const getMainCategoryInfo = (itemId: number, spendingCategoryName: string | null, categoryName: string | null) => {
    const splits = splitsMap[itemId];
    if (splits && splits.length > 0) {
      // Find the split with the largest amount
      const mainSplit = splits.reduce((prev, current) => (parseFloat(prev.amount) > parseFloat(current.amount)) ? prev : current);
      return { name: mainSplit.categoryName, isInherited: false, isSplit: true };
    }
    if (spendingCategoryName) {
      return { name: spendingCategoryName, isInherited: false, isSplit: false };
    }
    if (categoryName) {
      return { name: categoryName, isInherited: true, isSplit: false };
    }
    return { name: "Другое", isInherited: false, isSplit: false };
  };

  const columns: ColumnDef<TransactionItem>[] = [
    {
      id: "date",
      label: "ДАТА",
      accessor: (item) => item.date ? new Date(item.date).getTime() : 0,
      renderCell: (item) => item.date ? `${formatUTCDate(new Date(item.date))} ${formatUTCTime(new Date(item.date))}` : "-"
    },
    {
      id: "merchantName",
      label: "МАГАЗИН",
      accessor: (item) => item.merchantName || "",
      renderCell: (item) => {
        const merchantIcon = getIconUrl({ logo: item.merchantLogo, website: item.merchantWebsite, name: item.merchantName || "" });
        return (
          <div className={flex({ align: "center", gap: "10px" })}>
            <div className={css({ 
              w: "24px", 
              h: "24px", 
              borderRadius: "6px", 
              bg: item.type === "income" ? "rgba(33, 160, 56, 0.1)" : item.type === "transfer" ? "rgba(245, 158, 11, 0.1)" : "var(--surface-secondary)", 
              display: "flex", 
              alignItems: "center", 
              justifyContent: "center", 
              overflow: "hidden", 
              border: "1px solid var(--border-color)", 
              flexShrink: 0,
              color: item.type === "income" ? "var(--sber-green)" : item.type === "transfer" ? "#f59e0b" : "#64748b"
            })}>
              {item.type === "income" ? (
                <TrendingUp size={14} />
              ) : item.type === "transfer" ? (
                <ArrowRightLeft size={14} />
              ) : merchantIcon ? (
                <img src={merchantIcon} className={css({ w: "full", h: "full", objectFit: "contain", p: "2px" })} alt={item.merchantName || ""} />
              ) : (
                "🏪"
              )}
            </div>
            <span className={css({ fontWeight: "700", whiteSpace: "nowrap" })}>
              {item.type === "transfer" ? (
                `Перевод на ${[item.toBankName, item.toCardName].filter(Boolean).join(" ")}`
              ) : (
                item.merchantName
              )}
            </span>
          </div>
        );
      }
    },
    {
      id: "bankName",
      label: "БАНК",
      accessor: (item) => `${item.bankName || ""} ${item.cardName || ""}`,
      filterType: "select",
      renderCell: (item) => (
        <div className={stack({ gap: "0" })}>
          <span className={css({ fontSize: "13px", fontWeight: "700", whiteSpace: "nowrap" })}>{item.bankName}</span>
          <span className={css({ fontSize: "11px", color: "var(--secondary-text)", whiteSpace: "nowrap" })}>{item.cardName}</span>
        </div>
      )
    },
    {
      id: "categoryName",
      label: "КАТЕГОРИЯ",
      accessor: (item) => item.type === "transfer" ? "Перевод" : (item.type === "income" ? item.spendingCategoryName || "Доход" : getMainCategoryInfo(item.id, item.spendingCategoryName, item.categoryName).name || ""),
      filterType: "select",
      renderCell: (item) => {
        if (item.type === "transfer") {
          return <span className={css({ fontSize: "12px", fontWeight: "700", color: "#f59e0b" })}>Перевод</span>;
        }
        if (item.type === "income") {
          return (
            <span className={css({ fontSize: "12px", fontWeight: "700", color: "var(--sber-green)" })}>
              {item.spendingCategoryName || "Доход"}
            </span>
          );
        }
        const info = getMainCategoryInfo(item.id, item.spendingCategoryName, item.categoryName);
        return (
          <div className={flex({ align: "center", gap: "6px" })}>
            <span className={css({ 
              fontSize: "12px", 
              fontWeight: "600", 
              color: info.isInherited ? "var(--secondary-text)" : "var(--foreground)",
              borderBottom: info.isInherited ? "1px dashed var(--border-color)" : "none"
            })}>
              {info.name}
            </span>
            {info.isInherited && <div className={css({ px: "4px", py: "1px", bg: "var(--surface-secondary)", border: "1px solid var(--border-color)", borderRadius: "4px", fontSize: "9px", fontWeight: "800", color: "var(--secondary-text)" })}>БОНУС</div>}
          </div>
        );
      }
    },
    {
      id: "amount",
      label: "СУММА",
      accessor: (item) => item.amount,
      align: "right",
      renderCell: (item) => (
        <span className={css({ fontWeight: "800", color: item.type === "income" ? "var(--sber-green)" : "var(--foreground)" })}>
          {item.type === "income" ? "+" : ""}{item.amount.toFixed(2)}₽
        </span>
      )
    },
    {
      id: "percentage",
      label: "%",
      accessor: (item) => item.cashbackPercentage || 0,
      align: "right",
      renderCell: (item) => item.type === "expense" && item.cashbackPercentage !== null ? (
        <span className={css({ fontSize: "13px", fontWeight: "700", color: "var(--secondary-text)" })}>{item.cashbackPercentage}%</span>
      ) : (
        <span className={css({ color: "var(--border-color)" })}>-</span>
      )
    },
    {
      id: "cashback",
      label: "КЕШБЭК",
      accessor: (item) => (item.cashback || 0) + (item.manualAdjustment || 0),
      align: "right",
      renderCell: (item) => {
        const totalCashback = (item.cashback || 0) + (item.manualAdjustment || 0);
        return item.type === "expense" ? (
          <span className={css({ 
            fontWeight: "900", 
            fontSize: "15px",
            color: totalCashback > 0 ? "sberGreen" : (totalCashback < 0 ? "#ef4444" : "var(--foreground)") 
          })}>
            {totalCashback !== 0 ? `${totalCashback > 0 ? '+' : ''}${totalCashback.toFixed(2)}₽` : "—"}
          </span>
        ) : (
          <span className={css({ color: "var(--border-color)" })}>-</span>
        );
      }
    },
    {
      id: "actions",
      label: "ДЕЙСТВИЯ",
      accessor: () => "",
      align: "center",
      sortable: false,
      filterable: false,
      renderCell: (item) => (
        <div className={flex({ gap: "4px", justify: "center" })}>
          <a href={`/transactions/${item.id}/edit`} className={css({ color: "#64748b", p: "6px", borderRadius: "8px", _hover: { color: "sberGreen", bg: "rgba(33, 160, 56, 0.05)" } })}>
            <Edit2 size={14} />
          </a>
          <form action={deleteTransaction.bind(null, item.id)}>
            <button type="submit" className={css({ color: "#64748b", p: "6px", cursor: "pointer", borderRadius: "8px", _hover: { color: "#ef4444", bg: "rgba(239, 68, 68, 0.05)" } })}>
              <Trash2 size={14} />
            </button>
          </form>
        </div>
      )
    }
  ];

  if (!mounted) return null;

  return (
    <div className={stack({ gap: "20px" })}>
      <div className={flex({ justify: "flex-end" })}>
        <ViewModeToggle initialMode={viewMode} onViewChange={handleViewChange} />
      </div>

      {viewMode === "cards" ? (
        <div className={stack({ gap: "24px" })}>
          {Object.keys(groupedHistory).map(dateStr => (
            <div key={dateStr} className={stack({ gap: "12px" })}>
              <h3 className={css({ 
                fontSize: "12px", 
                fontWeight: "800", 
                color: "var(--secondary-text)", 
                textTransform: "uppercase", 
                letterSpacing: "0.5px",
                px: "4px"
              })}>
                {dateStr}
              </h3>
              <div className={stack({ gap: "10px" })}>
                {groupedHistory[dateStr].map(item => {
                  const totalCashback = (item.cashback || 0) + (item.manualAdjustment || 0);
                  const merchantIcon = getIconUrl({ logo: item.merchantLogo, website: item.merchantWebsite, name: item.merchantName || "" });
                  
                  return (
                    <div 
                      key={item.id} 
                      className="sber-card group" 
                      style={{ 
                        padding: "14px 18px", 
                        display: "flex", 
                        alignItems: "center", 
                        justifyContent: "space-between", 
                        gap: "16px",
                        position: "relative"
                      }}
                    >
                      <div className={flex({ align: "center", gap: "14px", minW: 0, flex: 1 })}>
                        <div className={css({ 
                          w: "40px", 
                          h: "40px", 
                          borderRadius: "10px", 
                          bg: item.type === "income" ? "rgba(33, 160, 56, 0.1)" : item.type === "transfer" ? "rgba(245, 158, 11, 0.1)" : "var(--surface-secondary)", 
                          display: "flex", 
                          alignItems: "center", 
                          justifyContent: "center", 
                          overflow: "hidden", 
                          border: "1px solid var(--border-color)", 
                          flexShrink: 0,
                          color: item.type === "income" ? "var(--sber-green)" : item.type === "transfer" ? "#f59e0b" : "#64748b"
                        })}>
                          {item.type === "income" ? (
                            <TrendingUp size={20} />
                          ) : item.type === "transfer" ? (
                            <ArrowRightLeft size={20} />
                          ) : merchantIcon ? (
                            <img src={merchantIcon} alt={item.merchantName || ""} className={css({ w: "full", h: "full", objectFit: "contain", p: "4px" })} />
                          ) : (
                            "🏪"
                          )}
                        </div>
                        
                        <div className={stack({ gap: "2px", minW: 0 })}>
                          <p className={css({ 
                            fontWeight: "700", 
                            fontSize: "15px", 
                            color: "var(--foreground)", 
                            whiteSpace: "nowrap", 
                            overflow: "hidden", 
                            textOverflow: "ellipsis" 
                          })}>
                            {item.type === "transfer" ? (
                              `Перевод на ${[item.toBankName, item.toCardName].filter(Boolean).join(" ")}`
                            ) : (
                              item.merchantName
                            )}
                          </p>
                          <p className={css({ 
                            fontSize: "12px", 
                            color: "var(--secondary-text)", 
                            fontWeight: "600",
                            display: "flex",
                            alignItems: "center",
                            gap: "8px",
                            flexWrap: "wrap"
                          })}>
                            <span>{item.bankName} {item.cardName}</span>
                            <span>•</span>
                            {item.type === "transfer" ? (
                              <span className={css({ color: "#f59e0b", fontWeight: "700" })}>Перевод</span>
                            ) : item.type === "income" ? (
                              <span className={css({ color: "var(--sber-green)", fontWeight: "700" })}>{item.spendingCategoryName || "Доход"}</span>
                            ) : (
                              (() => {
                                const info = getMainCategoryInfo(item.id, item.spendingCategoryName, item.categoryName);
                                return (
                                  <span className={css({ 
                                    color: info.isInherited ? "var(--secondary-text)" : "var(--foreground)",
                                    borderBottom: info.isInherited ? "1px dashed var(--border-color)" : "none",
                                    fontWeight: "700"
                                  })}>
                                    {info.name}
                                  </span>
                                );
                              })()
                            )}
                          </p>
                        </div>
                      </div>

                      {/* Right Amount/Cashback */}
                      <div className={flex({ align: "center", gap: "16px", flexShrink: 0 })}>
                        <div className={stack({ gap: "2px", align: "end" })}>
                          <p className={css({ 
                            fontWeight: "800", 
                            fontSize: "16px", 
                            color: item.type === "income" ? "var(--sber-green)" : "var(--foreground)" 
                          })}>
                            {item.type === "income" ? "+" : ""}{item.amount.toFixed(2)}₽
                          </p>
                          {item.type === "expense" && (
                            <p className={css({ fontSize: "11px", fontWeight: "800", color: "var(--secondary-text)" })}>
                              {item.cashbackPercentage !== null && `${item.cashbackPercentage}%`}
                              {totalCashback !== 0 && (
                                <span className={css({ 
                                  ml: "6px", 
                                  color: totalCashback > 0 ? "var(--sber-green)" : "#ef4444", 
                                  fontWeight: "800" 
                                })}>
                                  {totalCashback > 0 ? "+" : ""}{totalCashback.toFixed(2)}₽
                                </span>
                              )}
                            </p>
                          )}
                        </div>
                        
                        <div className={flex({ 
                          gap: "4px", 
                          opacity: 0, 
                          ".group:hover &": { opacity: 1 }, 
                          transition: "opacity 0.2s",
                          bg: "var(--card-bg)",
                          pl: "8px"
                        })}>
                          <a href={`/transactions/${item.id}/edit`} className={css({ color: "#64748b", p: "6px", borderRadius: "8px", _hover: { color: "sberGreen", bg: "rgba(33, 160, 56, 0.05)" } })}>
                            <Edit2 size={14} />
                          </a>
                          <form action={deleteTransaction.bind(null, item.id)}>
                            <button type="submit" className={css({ color: "#64748b", p: "6px", cursor: "pointer", borderRadius: "8px", _hover: { color: "#ef4444", bg: "rgba(239, 68, 68, 0.05)" } })}>
                              <Trash2 size={14} />
                            </button>
                          </form>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
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
