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
  Percent 
} from "lucide-react";
import { deleteTransaction } from "@/lib/actions/transactions";
import { getIconUrl } from "@/lib/utils/icons";
import ViewModeToggle, { HistoryViewMode } from "./ViewModeToggle";

interface TransactionItem {
  id: number;
  amount: number;
  paidAmount: number | null;
  cashback: number | null;
  cashbackPercentage: number | null;
  manualAdjustment: number;
  merchantName: string;
  date: Date | null;
  cardName: string | null;
  bankName: string | null;
  categoryName: string | null;
  spendingCategoryName: string | null;
  merchantLogo: string | null;
  merchantWebsite: string | null;
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
  const [sortConfig, setSortConfig] = useState<{ key: keyof TransactionItem | 'totalCashback'; direction: 'asc' | 'desc' }>({
    key: 'date',
    direction: 'desc'
  });

  useEffect(() => {
    setMounted(true);
  }, []);

  const sortedHistory = useMemo(() => {
    const items = [...initialHistory];
    items.sort((a, b) => {
      let aValue: any = a[sortConfig.key as keyof TransactionItem];
      let bValue: any = b[sortConfig.key as keyof TransactionItem];

      if (sortConfig.key === 'totalCashback') {
        aValue = (a.cashback || 0) + (a.manualAdjustment || 0);
        bValue = (b.cashback || 0) + (b.manualAdjustment || 0);
      }

      if (aValue === null || aValue === undefined) return 1;
      if (bValue === null || bValue === undefined) return -1;

      if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
    return items;
  }, [initialHistory, sortConfig]);

  const requestSort = (key: keyof TransactionItem | 'totalCashback') => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const getSortIcon = (key: keyof TransactionItem | 'totalCashback') => {
    if (sortConfig.key !== key) return <ArrowUpDown size={14} className={css({ ml: "4px", opacity: 0.3 })} />;
    return sortConfig.direction === 'asc' 
      ? <ArrowUp size={14} className={css({ ml: "4px", color: "sberGreen" })} /> 
      : <ArrowDown size={14} className={css({ ml: "4px", color: "sberGreen" })} />;
  };

  const groupedHistory = sortedHistory.reduce((groups, item) => {
    const dateStr = item.date ? formatUTCDate(new Date(item.date)) : 'Неизвестно';
    if (!groups[dateStr]) {
      groups[dateStr] = [];
    }
    groups[dateStr].push(item);
    return groups;
  }, {} as Record<string, typeof initialHistory>);

  if (!mounted) return null;

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
    return { name: 'Без категории', isInherited: false, isSplit: false };
  };

  return (
    <div className={stack({ gap: "24px", mb: "60px" })}>
      <div className={flex({ justify: "flex-end" })}>
        <ViewModeToggle onViewChange={setViewMode} />
      </div>

      {initialHistory.length === 0 ? (
        <div className={css({ py: "80px", textAlign: "center", color: "secondaryText", bg: "var(--card-bg)", borderRadius: "24px", border: "1px dashed", borderColor: "#e2e8f0" })}>
          <p className={css({ fontSize: "15px", fontWeight: "600" })}>Покупки не найдены</p>
        </div>
      ) : viewMode === "cards" ? (
        <div className={stack({ gap: "32px" })}>
          {Object.entries(groupedHistory).map(([date, items]) => (
            <div key={date} className={stack({ gap: "12px" })}>
              <h3 className={css({ fontSize: "14px", fontWeight: "800", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em", ml: "8px" })}>{date}</h3>
              <div className={css({ display: "grid", gridTemplateColumns: { base: "1fr", md: "repeat(auto-fill, minmax(320px, 1fr))" }, gap: "12px" })}>
                {items.map(item => {
                  const isSplit = item.paidAmount && item.paidAmount !== item.amount;
                  const merchantIcon = getIconUrl({ logo: item.merchantLogo, website: item.merchantWebsite, name: item.merchantName });
                  const totalCashback = (item.cashback || 0) + (item.manualAdjustment || 0);

                  return (
                    <div key={item.id} className="sber-card" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px', justifyContent: 'space-between' }}>
                      <div className={flex({ justify: "space-between", align: "center", gap: "12px" })}>
                        <div className={flex({ align: "center", gap: "10px", flex: 1, minW: 0 })}>
                          <div className={css({ w: "40px", h: "40px", borderRadius: "12px", bg: "var(--surface-secondary)", display: "flex", alignItems: "center", justifyContent: "center", border: "1px solid", borderColor: "var(--border-color)", overflow: "hidden", flexShrink: 0 })}>
                            {merchantIcon ? (
                              <img src={merchantIcon} alt={item.merchantName} className={css({ w: "full", h: "full", objectFit: "contain", p: "4px" })} />
                            ) : (
                              <div className={css({ color: "#64748b" })}>
                                {getCategoryIcon(item.categoryName)}
                              </div>
                            )}
                          </div>
                          
                          <div className={stack({ gap: "0", flex: 1, minW: 0 })}>
                            <div className={flex({ align: "center", gap: "6px" })}>
                              <span className={css({ fontSize: "12px", fontWeight: "800", color: "sberGreen", flexShrink: 0 })}>
                                {item.date ? formatUTCTime(new Date(item.date)) : ''}
                              </span>
                              <p className={css({ fontWeight: "800", fontSize: "14px", color: "var(--foreground)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" })} title={item.merchantName}>
                                {item.merchantName}
                              </p>
                            </div>
                            <p className={css({ fontSize: "11px", color: "secondaryText", fontWeight: "500", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" })}>
                              {item.bankName} {item.cardName}
                            </p>
                          </div>
                        </div>

                        <div className={css({ 
                          fontSize: "15px", 
                          fontWeight: "900", 
                          color: totalCashback > 0 ? "var(--sber-green)" : (totalCashback < 0 ? "#ef4444" : "var(--foreground)"),
                          textAlign: "right",
                          flexShrink: 0
                        })}>
                          {totalCashback !== 0 ? `${totalCashback.toFixed(2)}₽` : '—'}
                        </div>
                      </div>

                      <div className={flex({ justify: "space-between", align: "center", gap: "12px" })}>
                        <div className={flex({ align: "center", gap: "6px", flexShrink: 0 })}>
                          {item.manualAdjustment !== 0 && (
                            <div className={css({ 
                              px: "6px", 
                              py: "1px", 
                              bg: item.manualAdjustment > 0 ? "rgba(234, 179, 8, 0.1)" : "rgba(239, 68, 68, 0.1)", 
                              color: item.manualAdjustment > 0 ? "#eab308" : "#ef4444", 
                              borderRadius: "6px", 
                              fontSize: "11px", 
                              fontWeight: "900" 
                            })}>
                              {item.manualAdjustment > 0 ? `+${item.manualAdjustment.toFixed(2)}` : item.manualAdjustment.toFixed(2)}
                            </div>
                          )}

                          {item.cashback !== null && item.cashback > 0 && (
                            <div className={flex({ align: "center", gap: "4px" })}>
                              <span className={css({ fontSize: "10px", fontWeight: "800", color: "#94a3b8" })}>
                                {item.cashbackPercentage !== null ? item.cashbackPercentage : (item.amount > 0 ? ((item.cashback || 0) / item.amount * 100).toFixed(0) : 0)}%
                              </span>
                              <div className={css({ px: "6px", py: "1px", bg: "rgba(33, 160, 56, 0.1)", color: "var(--sber-green)", borderRadius: "6px", fontSize: "11px", fontWeight: "900" })}>
                                +{item.cashback.toFixed(2)}
                              </div>
                            </div>
                          )}
                        </div>

                        <div className={css({ 
                          fontSize: "10px", 
                          fontWeight: "800", 
                          color: "#94a3b8", 
                          textTransform: "uppercase", 
                          whiteSpace: "nowrap", 
                          overflow: "hidden", 
                          textOverflow: "ellipsis", 
                          flex: 1,
                          textAlign: "center"
                        })}>
                          {(() => {
                            const info = getMainCategoryInfo(item.id, item.spendingCategoryName, item.categoryName);
                            return (
                              <div className={flex({ align: "center", justify: "center", gap: "4px" })}>
                                <span className={css({ 
                                  color: info.isInherited ? "var(--secondary-text)" : "sberGreen",
                                  borderBottom: info.isInherited ? "1px dashed var(--secondary-text)" : "none",
                                  opacity: info.isInherited ? 0.8 : 1
                                })}>
                                  {info.name}
                                </span>
                                {info.isInherited && <Percent size={10} className={css({ color: "var(--secondary-text)" })} title="Унаследовано от бонусов банка" />}
                              </div>
                            );
                          })()}
                        </div>

                        <div className={stack({ align: "flex-end", gap: "0", flexShrink: 0 })}>
                          <p className={css({ fontWeight: "900", fontSize: "17px", color: "var(--foreground)" })}>
                            {item.amount.toFixed(2)}₽
                          </p>
                          {isSplit && (
                            <p className={css({ fontSize: "9px", color: "secondaryText", fontWeight: "700", textTransform: "uppercase" })}>
                              ЧЕК: {item.paidAmount?.toFixed(2)}₽
                            </p>
                          )}
                        </div>
                      </div>

                      <div className={flex({ justify: "flex-end", gap: "4px", pt: "8px", borderTop: "1px solid", borderColor: "var(--separator)" })}>
                        <a href={`/transactions/${item.id}/edit`} className={css({ color: "#64748b", p: "6px", borderRadius: "8px", _hover: { color: "var(--sber-green)", bg: "rgba(33, 160, 56, 0.05)" } })}>
                          <Edit2 size={16} />
                        </a>
                        <form action={deleteTransaction.bind(null, item.id)}>
                          <button type="submit" className={css({ color: "#64748b", p: "6px", cursor: "pointer", borderRadius: "8px", _hover: { color: "#ef4444", bg: "rgba(239, 68, 68, 0.05)" } })}>
                            <Trash2 size={16} />
                          </button>
                        </form>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="sber-card" style={{ padding: 0 }}>
          <div className={css({ overflowX: "auto", pb: "12px" })}>
            <table className={css({ w: "full", borderCollapse: "collapse", fontSize: "14px" })}>
              <thead className={css({ bg: "var(--surface-secondary)", borderBottom: "1px solid var(--border-color)" })}>
                <tr>
                  <th onClick={() => requestSort('date')} className={css({ textAlign: "left", p: "12px", fontWeight: "800", color: "var(--secondary-text)", cursor: "pointer", _hover: { color: "var(--foreground)" } })}>
                    <div className={flex({ align: "center" })}>ДАТА {getSortIcon('date')}</div>
                  </th>
                  <th onClick={() => requestSort('merchantName')} className={css({ textAlign: "left", p: "12px", fontWeight: "800", color: "var(--secondary-text)", cursor: "pointer", _hover: { color: "var(--foreground)" } })}>
                    <div className={flex({ align: "center" })}>МАГАЗИН {getSortIcon('merchantName')}</div>
                  </th>
                  <th className={css({ textAlign: "left", p: "12px", fontWeight: "800", color: "var(--secondary-text)" })}>БАНК</th>
                  <th className={css({ textAlign: "left", p: "12px", fontWeight: "800", color: "var(--secondary-text)" })}>КАТЕГОРИЯ</th>
                  <th onClick={() => requestSort('amount')} className={css({ textAlign: "right", p: "12px", fontWeight: "800", color: "var(--secondary-text)", cursor: "pointer", _hover: { color: "var(--foreground)" } })}>
                    <div className={flex({ align: "center", justify: "flex-end" })}>СУММА {getSortIcon('amount')}</div>
                  </th>
                  <th onClick={() => requestSort('cashbackPercentage')} className={css({ textAlign: "right", p: "12px", fontWeight: "800", color: "var(--secondary-text)", cursor: "pointer", _hover: { color: "var(--foreground)" } })}>
                    <div className={flex({ align: "center", justify: "flex-end" })}>% {getSortIcon('cashbackPercentage')}</div>
                  </th>
                  <th onClick={() => requestSort('totalCashback')} className={css({ textAlign: "right", p: "12px", fontWeight: "800", color: "var(--secondary-text)", cursor: "pointer", _hover: { color: "var(--foreground)" } })}>
                    <div className={flex({ align: "center", justify: "flex-end" })}>КЕШБЭК {getSortIcon('totalCashback')}</div>
                  </th>
                  <th className={css({ textAlign: "center", p: "12px", fontWeight: "800", color: "var(--secondary-text)" })}>ДЕЙСТВИЯ</th>
                </tr>
              </thead>
              <tbody>
                {sortedHistory.map((item, idx) => {
                  const totalCashback = (item.cashback || 0) + (item.manualAdjustment || 0);
                  const merchantIcon = getIconUrl({ logo: item.merchantLogo, website: item.merchantWebsite, name: item.merchantName });
                  return (
                    <tr key={item.id} className={css({ 
                      borderBottom: "1px solid var(--separator)", 
                      _hover: { bg: "rgba(0,0,0,0.02)", ".dark &": { bg: "rgba(255,255,255,0.02)" } }
                    })}>
                      <td className={css({ p: "12px", verticalAlign: "middle", whiteSpace: "nowrap" })}>
                        <span className={css({ fontWeight: "700", color: "var(--foreground)" })}>
                          {item.date ? `${formatUTCDate(new Date(item.date))} ${formatUTCTime(new Date(item.date))}` : "-"}
                        </span>
                      </td>
                      <td className={css({ p: "12px", verticalAlign: "middle" })}>
                        <div className={flex({ align: "center", gap: "10px" })}>
                          <div className={css({ w: "24px", h: "24px", borderRadius: "6px", bg: "var(--surface-secondary)", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", border: "1px solid var(--border-color)", flexShrink: 0 })}>
                            {merchantIcon ? <img src={merchantIcon} className={css({ w: "full", h: "full", objectFit: "contain", p: "2px" })} /> : "🏪"}
                          </div>
                          <span className={css({ fontWeight: "700", whiteSpace: "nowrap" })}>{item.merchantName}</span>
                        </div>
                      </td>
                      <td className={css({ p: "12px", verticalAlign: "middle" })}>
                        <div className={stack({ gap: "0" })}>
                          <span className={css({ fontSize: "13px", fontWeight: "700", whiteSpace: "nowrap" })}>{item.bankName}</span>
                          <span className={css({ fontSize: "11px", color: "var(--secondary-text)", whiteSpace: "nowrap" })}>{item.cardName}</span>
                        </div>
                      </td>
                      <td className={css({ p: "12px", verticalAlign: "middle" })}>
                        {(() => {
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
                        })()}
                      </td>
                      <td className={css({ p: "12px", textAlign: "right", verticalAlign: "middle", fontWeight: "800", whiteSpace: "nowrap" })}>
                        {item.amount.toFixed(2)}₽
                      </td>
                      <td className={css({ p: "12px", textAlign: "right", verticalAlign: "middle", whiteSpace: "nowrap" })}>
                        {item.cashbackPercentage !== null ? (
                          <span className={css({ fontSize: "13px", fontWeight: "700", color: "var(--secondary-text)" })}>{item.cashbackPercentage}%</span>
                        ) : (
                          <span className={css({ color: "var(--border-color)" })}>-</span>
                        )}
                      </td>
                      <td className={css({ p: "12px", textAlign: "right", verticalAlign: "middle", whiteSpace: "nowrap" })}>
                        <span className={css({ 
                          fontWeight: "900", 
                          fontSize: "15px",
                          color: totalCashback > 0 ? "sberGreen" : (totalCashback < 0 ? "#ef4444" : "var(--foreground)") 
                        })}>
                          {totalCashback !== 0 ? `${totalCashback > 0 ? '+' : ''}${totalCashback.toFixed(2)}₽` : "—"}
                        </span>
                      </td>
                      <td className={css({ p: "12px", verticalAlign: "middle" })}>
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
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
