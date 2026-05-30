"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import { css } from "../../styled-system/css";
import { stack, flex } from "../../styled-system/patterns";
import { 
  ArrowUpDown, 
  ArrowUp, 
  ArrowDown, 
  Settings, 
  Eye, 
  EyeOff, 
  ChevronLeft, 
  ChevronRight 
} from "lucide-react";

export interface ColumnDef<T> {
  id: string;
  label: string;
  accessor: (item: T) => any;
  renderCell?: (item: T) => React.ReactNode;
  align?: "left" | "center" | "right";
  sortable?: boolean;
  filterable?: boolean;
  filterType?: "text" | "select";
  filterOptions?: string[];
}

interface UniversalTableProps<T> {
  data: T[];
  columns: ColumnDef<T>[];
  localStorageKey: string;
  rowKey: (item: T) => string | number;
}

export default function UniversalTable<T>({ 
  data, 
  columns, 
  localStorageKey,
  rowKey 
}: UniversalTableProps<T>) {
  const [mounted, setMounted] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const settingsRef = useRef<HTMLDivElement>(null);

  // States
  const [columnOrder, setColumnOrder] = useState<string[]>([]);
  const [visibleColumns, setVisibleColumns] = useState<Record<string, boolean>>({});
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: "asc" | "desc" | null }>({
    key: "",
    direction: null
  });
  const [filters, setFilters] = useState<Record<string, string>>({});

  // 1. Initialize from localStorage
  useEffect(() => {
    const savedOrder = localStorage.getItem(`${localStorageKey}_column_order`);
    const savedVisibility = localStorage.getItem(`${localStorageKey}_column_visibility`);
    const savedSort = localStorage.getItem(`${localStorageKey}_column_sort`);

    const defaultOrder = columns.map(c => c.id);
    const defaultVisibility: Record<string, boolean> = {};
    columns.forEach(c => {
      defaultVisibility[c.id] = true;
    });

    if (savedOrder) {
      try {
        const parsed = JSON.parse(savedOrder);
        // Clean out any IDs that no longer exist
        const filtered = parsed.filter((id: string) => defaultOrder.includes(id));
        // Add any new IDs that aren't in the saved order
        const merged = [...filtered, ...defaultOrder.filter(id => !filtered.includes(id))];
        setColumnOrder(merged);
      } catch (e) {
        setColumnOrder(defaultOrder);
      }
    } else {
      setColumnOrder(defaultOrder);
    }

    if (savedVisibility) {
      try {
        setVisibleColumns(JSON.parse(savedVisibility));
      } catch (e) {
        setVisibleColumns(defaultVisibility);
      }
    } else {
      setVisibleColumns(defaultVisibility);
    }

    if (savedSort) {
      try {
        setSortConfig(JSON.parse(savedSort));
      } catch (e) {}
    }

    setMounted(true);
  }, [columns, localStorageKey]);

  // Click outside listener for settings dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (settingsRef.current && !settingsRef.current.contains(event.target as Node)) {
        setIsSettingsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Save updates to localStorage
  const saveColumnOrder = (newOrder: string[]) => {
    setColumnOrder(newOrder);
    localStorage.setItem(`${localStorageKey}_column_order`, JSON.stringify(newOrder));
  };

  const saveVisibility = (newVisibility: Record<string, boolean>) => {
    setVisibleColumns(newVisibility);
    localStorage.setItem(`${localStorageKey}_column_visibility`, JSON.stringify(newVisibility));
  };

  const saveSort = (newSort: typeof sortConfig) => {
    setSortConfig(newSort);
    localStorage.setItem(`${localStorageKey}_column_sort`, JSON.stringify(newSort));
  };

  // Reordering helpers
  const moveColumn = (index: number, direction: "left" | "right") => {
    const newOrder = [...columnOrder];
    const targetIndex = direction === "left" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newOrder.length) return;

    // Swap
    const temp = newOrder[index];
    newOrder[index] = newOrder[targetIndex];
    newOrder[targetIndex] = temp;
    saveColumnOrder(newOrder);
  };

  const toggleVisibility = (colId: string) => {
    const newVisibility = {
      ...visibleColumns,
      [colId]: visibleColumns[colId] === false ? true : false
    };
    saveVisibility(newVisibility);
  };

  // Sort helper
  const handleSort = (colId: string, sortable?: boolean) => {
    if (sortable === false) return;

    let direction: "asc" | "desc" | null = "asc";
    if (sortConfig.key === colId) {
      if (sortConfig.direction === "asc") {
        direction = "desc";
      } else if (sortConfig.direction === "desc") {
        direction = null; // Reset sort
      }
    }

    saveSort({ key: colId, direction });
  };

  // Filter helper
  const handleFilterChange = (colId: string, val: string) => {
    setFilters(prev => ({
      ...prev,
      [colId]: val
    }));
  };

  // Map of column definitions for O(1) lookup
  const columnsMap = useMemo(() => {
    const map: Record<string, ColumnDef<T>> = {};
    columns.forEach(c => {
      map[c.id] = c;
    });
    return map;
  }, [columns]);

  // Generate options for dropdown filters
  const dropdownOptions = useMemo(() => {
    const options: Record<string, string[]> = {};
    columns.forEach(col => {
      if (col.filterType === "select") {
        if (col.filterOptions) {
          options[col.id] = col.filterOptions;
        } else {
          // Auto-detect from data
          const uniqueVals = Array.from(
            new Set(
              data
                .map(item => col.accessor(item))
                .filter(val => val !== null && val !== undefined && String(val).trim() !== "")
                .map(val => String(val))
            )
          ).sort((a, b) => a.localeCompare(b));
          options[col.id] = uniqueVals;
        }
      }
    });
    return options;
  }, [columns, data]);

  // Computed columns in active order
  const activeColumns = useMemo(() => {
    return columnOrder
      .map(id => columnsMap[id])
      .filter(col => col && visibleColumns[col.id] !== false);
  }, [columnOrder, columnsMap, visibleColumns]);

  // Filter & Sort Data
  const processedData = useMemo(() => {
    let result = [...data];

    // 1. Filtering
    Object.keys(filters).forEach(colId => {
      const text = filters[colId]?.trim();
      if (!text) return;

      const col = columnsMap[colId];
      if (!col) return;

      result = result.filter(item => {
        const val = col.accessor(item);
        if (val === null || val === undefined) return false;
        
        if (col.filterType === "select") {
          return String(val) === text;
        } else {
          return String(val).toLowerCase().includes(text.toLowerCase());
        }
      });
    });

    // 2. Sorting
    if (sortConfig.key && sortConfig.direction) {
      const col = columnsMap[sortConfig.key];
      if (col) {
        result.sort((a, b) => {
          let aVal = col.accessor(a);
          let bVal = col.accessor(b);

          if (aVal === null || aVal === undefined) return 1;
          if (bVal === null || bVal === undefined) return -1;

          // Numeric sort if possible
          const aNum = Number(aVal);
          const bNum = Number(bVal);
          if (!isNaN(aNum) && !isNaN(bNum)) {
            return sortConfig.direction === "asc" ? aNum - bNum : bNum - aNum;
          }

          // String sort
          const aStr = String(aVal).toLowerCase();
          const bStr = String(bVal).toLowerCase();
          if (aStr < bStr) return sortConfig.direction === "asc" ? -1 : 1;
          if (aStr > bStr) return sortConfig.direction === "asc" ? 1 : -1;
          return 0;
        });
      }
    }

    return result;
  }, [data, filters, sortConfig, columnsMap]);

  if (!mounted) {
    return <div className={css({ py: "40px", textAlign: "center", color: "var(--secondary-text)" })}>Загрузка таблицы...</div>;
  }

  return (
    <div className={stack({ gap: "12px", w: "full" })}>
      {/* Top Toolbar */}
      <div className={flex({ justify: "space-between", align: "center", px: "4px" })}>
        <span className={css({ fontSize: "12px", color: "var(--secondary-text)", fontWeight: "700" })}>
          Найдено строк: {processedData.length}
        </span>

        {/* Settings button */}
        <div ref={settingsRef} className={css({ position: "relative" })}>
          <button 
            type="button"
            onClick={() => setIsSettingsOpen(!isSettingsOpen)}
            className={css({ 
              p: "8px", 
              borderRadius: "10px", 
              border: "1px solid var(--border-color)", 
              bg: "var(--card-bg)", 
              color: "var(--secondary-text)", 
              cursor: "pointer", 
              display: "flex",
              alignItems: "center",
              gap: "6px",
              fontSize: "12px",
              fontWeight: "700",
              _hover: { bg: "var(--surface-secondary)", color: "var(--foreground)" }
            })}
          >
            <Settings size={14} /> Настройка колонок
          </button>

          {isSettingsOpen && (
            <div className={stack({ 
              position: "absolute",
              top: "calc(100% + 6px)",
              right: 0,
              bg: "var(--card-bg)",
              border: "1px solid var(--border-color)",
              borderRadius: "16px",
              p: "16px",
              boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)",
              zIndex: 110,
              minW: "240px",
              gap: "8px"
            })}>
              <p className={css({ fontSize: "11px", fontWeight: "800", color: "var(--secondary-text)", textTransform: "uppercase", pb: "4px", borderBottom: "1px solid var(--border-color)" })}>
                Порядок и видимость
              </p>
              
              <div className={stack({ gap: "4px", maxH: "280px", overflowY: "auto", pr: "4px" })}>
                {columnOrder.map((id, index) => {
                  const col = columnsMap[id];
                  if (!col) return null;
                  const isVisible = visibleColumns[id] !== false;

                  return (
                    <div key={id} className={flex({ align: "center", justify: "space-between", py: "4px", borderBottom: "1px dashed var(--separator)", _last: { borderBottom: "none" } })}>
                      <div className={flex({ align: "center", gap: "8px", minW: 0 })}>
                        <button 
                          type="button" 
                          onClick={() => toggleVisibility(id)}
                          className={css({ color: isVisible ? "var(--sber-green)" : "var(--secondary-text)", cursor: "pointer", p: "2px" })}
                        >
                          {isVisible ? <Eye size={16} /> : <EyeOff size={16} />}
                        </button>
                        <span className={css({ fontSize: "13px", fontWeight: "600", color: isVisible ? "var(--foreground)" : "var(--secondary-text)", textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" })}>
                          {col.label}
                        </span>
                      </div>
                      
                      <div className={flex({ gap: "2px" })}>
                        <button 
                          type="button" 
                          disabled={index === 0}
                          onClick={() => moveColumn(index, "left")}
                          className={css({ p: "4px", color: "var(--secondary-text)", cursor: index === 0 ? "not-allowed" : "pointer", opacity: index === 0 ? 0.3 : 1, _hover: { color: "var(--foreground)" } })}
                        >
                          <ChevronLeft size={16} />
                        </button>
                        <button 
                          type="button" 
                          disabled={index === columnOrder.length - 1}
                          onClick={() => moveColumn(index, "right")}
                          className={css({ p: "4px", color: "var(--secondary-text)", cursor: index === columnOrder.length - 1 ? "not-allowed" : "pointer", opacity: index === columnOrder.length - 1 ? 0.3 : 1, _hover: { color: "var(--foreground)" } })}
                        >
                          <ChevronRight size={16} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* The Table */}
      <div className={css({ overflowX: "auto", w: "full", borderRadius: "16px", border: "1px solid var(--border-color)", bg: "var(--card-bg)" })}>
        <table className={css({ w: "full", borderCollapse: "collapse", fontSize: "14px" })}>
          <thead className={css({ bg: "var(--surface-secondary)", borderBottom: "1px solid var(--border-color)" })}>
            <tr>
              {activeColumns.map(col => {
                const isSorted = sortConfig.key === col.id;
                const isSortAsc = sortConfig.direction === "asc";
                const canSort = col.sortable !== false;
                const canFilter = col.filterable !== false;

                return (
                  <th 
                    key={col.id} 
                    className={css({ 
                      p: "12px", 
                      fontWeight: "800", 
                      color: "var(--secondary-text)",
                      verticalAlign: "top"
                    })}
                  >
                    <div className={stack({ gap: "6px" })}>
                      <div 
                        onClick={() => handleSort(col.id, col.sortable)}
                        className={flex({ 
                          align: "center", 
                          justifyContent: col.align === "right" ? "flex-end" : (col.align === "center" ? "center" : "flex-start"), 
                          gap: "4px",
                          cursor: canSort ? "pointer" : "default",
                          userSelect: "none",
                          _hover: canSort ? { color: "var(--foreground)" } : {}
                        })}
                      >
                        <span>{col.label}</span>
                        {canSort && (
                          isSorted ? (
                            isSortAsc ? <ArrowUp size={12} className={css({ color: "var(--sber-green)" })} /> : <ArrowDown size={12} className={css({ color: "var(--sber-green)" })} />
                          ) : (
                            <ArrowUpDown size={12} className={css({ opacity: 0.3 })} />
                          )
                        )}
                      </div>

                      {canFilter && (
                        col.filterType === "select" ? (
                          <select 
                            value={filters[col.id] || ""}
                            onChange={(e) => handleFilterChange(col.id, e.target.value)}
                            className={css({ 
                              w: "full", 
                              p: "6px 8px", 
                              fontSize: "11px", 
                              fontWeight: "500",
                              borderRadius: "8px", 
                              border: "1px solid var(--border-color)", 
                              bg: "var(--card-bg)", 
                              color: "var(--foreground)",
                              outline: "none",
                              _focus: { borderColor: "var(--sber-green)" }
                            })}
                          >
                            <option value="">Все</option>
                            {dropdownOptions[col.id]?.map(opt => (
                              <option key={opt} value={opt}>
                                {opt}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <input 
                            type="text"
                            value={filters[col.id] || ""}
                            onChange={(e) => handleFilterChange(col.id, e.target.value)}
                            placeholder="Фильтр..."
                            className={css({ 
                              w: "full", 
                              p: "6px 8px", 
                              fontSize: "11px", 
                              fontWeight: "500",
                              borderRadius: "8px", 
                              border: "1px solid var(--border-color)", 
                              bg: "var(--card-bg)", 
                              color: "var(--foreground)",
                              outline: "none",
                              _focus: { borderColor: "var(--sber-green)" }
                            })}
                          />
                        )
                      )}
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {processedData.length === 0 ? (
              <tr>
                <td colSpan={activeColumns.length} className={css({ p: "32px", textAlign: "center", color: "var(--secondary-text)", fontWeight: "600" })}>
                  Нет подходящих строк
                </td>
              </tr>
            ) : (
              processedData.map(item => (
                <tr 
                  key={rowKey(item)} 
                  className={css({ 
                    borderBottom: "1px solid var(--separator)", 
                    _hover: { bg: "rgba(0,0,0,0.02)", ".dark &": { bg: "rgba(255,255,255,0.02)" } },
                    _last: { borderBottom: "none" }
                  })}
                >
                  {activeColumns.map(col => (
                    <td 
                      key={col.id} 
                      className={css({ 
                        p: "12px", 
                        verticalAlign: "middle",
                        textAlign: col.align || "left"
                      })}
                    >
                      {col.renderCell ? col.renderCell(item) : col.accessor(item)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
