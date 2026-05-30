"use client";

import { useState, useMemo, useEffect, useTransition } from "react";
import { css } from "../../styled-system/css";
import { stack, flex } from "../../styled-system/patterns";
import { Star, Copy, Save, Loader2, Plus, Trash2 } from "lucide-react";
import { saveMonthlyRules, copyRulesFromPreviousMonth } from "@/lib/actions/rules";
import { useRouter, usePathname } from "next/navigation";
import SearchableSelect from "./SearchableSelect";
import { useToast } from "./Toast";

interface Card {
  id: number;
  name: string | null;
  bankName: string | null;
  bankCardId: number;
  loyaltyProgramId: number | null;
}

interface Category {
  id: number;
  name: string;
  loyaltyProgramId: number;
  defaultPercentage: number;
  startDate: string;
  endDate: string | null;
  cashbackLimit: number | null;
}

interface ActiveRule {
  categoryId: number;
  percentage: number;
  cashbackLimit?: number | null;
}

interface MonthlyRulesFormProps {
  loyaltyProgramId: number;
  loyaltyProgramName: string;
  bankName: string;
  allCategories: Category[];
  initialMonth: string;
  activeRules: ActiveRule[];
}

interface FormRow {
  id: string;
  categoryId: number | null;
  percentage: number | string;
  limit: number | string;
}

export default function MonthlyRulesForm({ 
  loyaltyProgramId,
  loyaltyProgramName,
  bankName,
  allCategories,
  initialMonth,
  activeRules 
}: MonthlyRulesFormProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  
  const [selectedMonth, setSelectedMonth] = useState(initialMonth);
  const [isCopying, setIsCopying] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const cardCategories = useMemo(() => {
    if (!loyaltyProgramId || !selectedMonth) return [];
    
    const [year, month] = selectedMonth.split("-").map(Number);
    const monthStart = `${selectedMonth}-01`;
    const lastDay = new Date(year, month, 0).getDate();
    const monthEnd = `${selectedMonth}-${String(lastDay).padStart(2, "0")}`;

    return allCategories
      .filter(cat => 
        cat.loyaltyProgramId === loyaltyProgramId &&
        cat.startDate <= monthEnd &&
        (!cat.endDate || cat.endDate >= monthStart)
      )
      .sort((a, b) => {
        if (a.name === "Без кешбэка") return -1;
        if (b.name === "Без кешбэка") return 1;
        if (a.name === "Остальные покупки") return -1;
        if (b.name === "Остальные покупки") return 1;
        return a.name.localeCompare(b.name, 'ru');
      });
  }, [loyaltyProgramId, allCategories, selectedMonth]);

  const selectOptions = useMemo(() => 
    cardCategories
      .filter(c => c.name !== "Без кешбэка")
      .map(c => ({ label: c.name, value: String(c.id) })),
    [cardCategories]
  );
  
  const [rows, setRows] = useState<FormRow[]>(() => {
    const initialRows: FormRow[] = activeRules.map((r, idx) => ({
      id: `saved-${idx}`,
      categoryId: r.categoryId,
      percentage: r.percentage,
      limit: r.cashbackLimit ?? ""
    }));

    // Check for "Без кешбэка" in the initial available categories
    const [year, month] = initialMonth.split("-").map(Number);
    const monthStart = `${initialMonth}-01`;
    const lastDay = new Date(year, month, 0).getDate();
    const monthEnd = `${initialMonth}-${String(lastDay).padStart(2, "0")}`;

    const initialCardCategories = allCategories.filter(cat => 
      cat.loyaltyProgramId === loyaltyProgramId &&
      cat.startDate <= monthEnd &&
      (!cat.endDate || cat.endDate >= monthStart)
    );

    const noCashbackCat = initialCardCategories.find(c => c.name === "Без кешбэка");
    if (noCashbackCat && !initialRows.find(r => r.categoryId === noCashbackCat.id)) {
      initialRows.unshift({
        id: "no-cashback",
        categoryId: noCashbackCat.id,
        percentage: 0,
        limit: ""
      });
    }
    return initialRows;
  });

  // Sync rows with activeRules when they change (e.g. after copying)
  useEffect(() => {
    const updatedRows: FormRow[] = activeRules.map((r, idx) => ({
      id: `synced-${idx}-${Date.now()}`,
      categoryId: r.categoryId,
      percentage: r.percentage,
      limit: r.cashbackLimit ?? ""
    }));

    // Always ensure "Без кешбэка" is present
    const noCashbackCat = cardCategories.find(c => c.name === "Без кешбэка");
    if (noCashbackCat && !updatedRows.find(r => r.categoryId === noCashbackCat.id)) {
      updatedRows.unshift({
        id: "no-cashback-synced",
        categoryId: noCashbackCat.id,
        percentage: 0,
        limit: ""
      });
    }

    setRows(updatedRows);
  }, [activeRules, cardCategories]);

  const duplicateIds = useMemo(() => {
    const ids = rows.map(r => r.categoryId).filter(id => id !== null);
    const seen = new Set<number>();
    const duplicates = new Set<number>();
    for (const id of ids) {
      if (seen.has(id!)) duplicates.add(id!);
      seen.add(id!);
    }
    return duplicates;
  }, [rows]);

  const hasDuplicates = duplicateIds.size > 0;

  const addRow = () => {
    setRows([...rows, { id: Math.random().toString(36).substr(2, 9), categoryId: null, percentage: "", limit: "" }]);
  };

  const removeRow = (id: string) => {
    setRows(rows.filter(r => r.id !== id));
  };

  const updateRow = (id: string, updates: Partial<FormRow>) => {
    setRows(rows.map(r => {
      if (r.id !== id) return r;
      const updated = { ...r, ...updates };
      
      // Auto-fill percentage when category changes
      if (updates.categoryId !== undefined && updates.categoryId !== null) {
        const cat = cardCategories.find(c => c.id === updates.categoryId);
        if (cat) {
          updated.percentage = cat.defaultPercentage;
          updated.limit = cat.cashbackLimit ?? "";
        }
      }
      
      return updated;
    }));
  };

  const handleMonthChange = (newMonth: string) => {
    if (isSaving || isCopying) return;
    setSelectedMonth(newMonth);
    router.push(`${pathname}?month=${newMonth}`);
  };

  const handleCopy = async () => {
    if (!loyaltyProgramId || !selectedMonth || isSaving || isCopying) return;
    setIsCopying(true);
    try {
      await copyRulesFromPreviousMonth(loyaltyProgramId, selectedMonth);
      toast("Правила успешно скопированы", "success");
    } catch (e) {
      toast("Не удалось скопировать: " + (e as Error).message, "error");
    } finally {
      setIsCopying(false);
    }
  };

  const isFormDisabled = isSaving || isCopying || isPending;

  async function action(formData: FormData) {
    setIsSaving(true);
    startTransition(async () => {
      try {
        await saveMonthlyRules(formData);
        toast("Правила успешно сохранены", "success");
        router.refresh();
      } catch (error) {
        toast(error instanceof Error ? error.message : "Произошла ошибка", "error");
      } finally {
        setIsSaving(false);
      }
    });
  }

  return (
    <section className="sber-card" style={{ position: "relative" }}>
      {isFormDisabled && (
        <div className={css({
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          bg: "rgba(255, 255, 255, 0.7)",
          zIndex: 10,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: "24px",
          backdropFilter: "blur(2px)"
        })}>
          <div className={stack({ align: "center", gap: "12px" })}>
            <Loader2 className={css({ animation: "spin 1s linear infinite", color: "sberGreen" })} size={32} />
            <p className={css({ fontWeight: "700", color: "sberGreen", fontSize: "14px" })}>Пересчитываем кешбэк...</p>
          </div>
        </div>
      )}

      <div className={flex({ align: "center", gap: "10px", mb: "24px" })}>
        <div className={css({ p: "6px", bg: "#f59e0b", borderRadius: "8px", color: "white" })}>
          <Star size={18} />
        </div>
        <h2 className={css({ fontSize: "17px", fontWeight: "700", color: "var(--foreground)" })}>Настройка на месяц</h2>
      </div>

      <form action={action} className={stack({ gap: "24px" })}>
        <div className={flex({ gap: "12px" })}>
          <div className={stack({ gap: "6px", flex: 1 })}>
            <label className="sber-label">ПРОГРАММА ЛОЯЛЬНОСТИ</label>
            <div className={css({ px: "16px", py: "14px", bg: "var(--input-bg)", borderRadius: "14px", border: "1px solid var(--border-color)" })}>
              <input type="hidden" name="loyaltyProgramId" value={loyaltyProgramId} />
              <p className={css({ fontSize: "15px", fontWeight: "700", color: "var(--foreground)" })}>
                {bankName} — {loyaltyProgramName}
              </p>
            </div>
          </div>
          <div className={stack({ gap: "6px", w: "140px" })}>
            <label className="sber-label">МЕСЯЦ</label>
            <input 
              type="month" 
              name="month" 
              required 
              value={selectedMonth}
              disabled={isFormDisabled}
              onChange={(e) => handleMonthChange(e.target.value)}
              className="sber-input"
              style={{ fontSize: "14px" }}
            />
          </div>
        </div>

        <div className={stack({ gap: "16px" })}>
          <div className={flex({ justify: "space-between", align: "center", wrap: "wrap", gap: "12px" })}>
            <p className={css({ fontSize: "13px", fontWeight: "800", color: "var(--secondary-text)", textTransform: "uppercase" })}>Категории кешбэка</p>
            <button 
              type="button" 
              onClick={handleCopy}
              disabled={isFormDisabled}
              className={flex({ align: "center", gap: "6px", color: "var(--sber-green)", fontSize: "12px", fontWeight: "700", cursor: "pointer", _disabled: { opacity: 0.5 } })}
            >
              {isCopying ? <Loader2 size={14} className={css({ animation: "spin 1s linear infinite" })} /> : <Copy size={14} />}
              СКОПИРОВАТЬ ИЗ ПРОШЛОГО МЕСЯЦА
            </button>
          </div>

          <div className={stack({ gap: "10px" })}>
            {rows.map((row, index) => {
              const selectedCat = cardCategories.find(c => c.id === row.categoryId);
              const isNoCashback = selectedCat?.name === "Без кешбэка";
              const isDuplicate = row.categoryId !== null && duplicateIds.has(row.categoryId);

              return (
                <div 
                  key={row.id} 
                  className={css({ 
                    display: "grid", 
                    gridTemplateColumns: "1fr 40px", 
                    gap: "8px", 
                    w: "full", 
                    alignItems: "center" 
                  })}
                  style={{ zIndex: rows.length - index, position: "relative" }}
                >
                  <div className={css({ 
                    display: "grid",
                    gridTemplateColumns: { base: "1fr 85px", sm: "1fr 155px" },
                    alignItems: "center",
                    gap: "12px",
                    p: "10px 12px", 
                    bg: isNoCashback ? "var(--input-bg)" : (isDuplicate ? "rgba(239, 68, 68, 0.1)" : "rgba(33, 160, 56, 0.1)"), 
                    borderRadius: "14px", 
                    border: "1px solid", 
                    borderColor: isNoCashback ? "var(--border-color)" : (isDuplicate ? "#ef4444" : "var(--sber-green)"),
                    transition: "all 0.2s",
                    minH: "64px",
                    position: "relative",
                    w: "full",
                    boxSizing: "border-box"
                  })}>
                    <div className={css({ minW: 0 })}>
                      {isNoCashback ? (
                        <div className={css({ px: "14px", py: "12px", bg: "var(--input-bg)", borderRadius: "14px", border: "1px solid var(--border-color)" })}>
                          <p className={css({ fontSize: "14px", fontWeight: "700", color: "var(--secondary-text)" })}>Без кешбэка</p>
                          <input type="hidden" name={`cat_${row.categoryId}`} value="0" />
                        </div>
                      ) : (
                        <SearchableSelect
                          name={`temp_cat_id_${row.id}`}
                          placeholder="Категория..."
                          options={selectOptions}
                          value={row.categoryId ? String(row.categoryId) : ""}
                          disabled={isFormDisabled}
                          onChange={(val) => updateRow(row.id, { categoryId: parseInt(val) })}
                        />
                      )}
                      
                      {/* Hidden inputs for existing backend compatibility */}
                      {!isNoCashback && row.categoryId && (
                        <>
                          <input type="hidden" name={`cat_${row.categoryId}`} value={row.percentage} />
                          <input type="hidden" name={`limit_${row.categoryId}`} value={row.limit} />
                        </>
                      )}
                    </div>
                    
                    <div className={flex({ 
                      align: "center", 
                      gap: { base: "8px", sm: "12px" }, 
                      flexShrink: 0, 
                      w: { base: "75px", sm: "155px" }, 
                      justify: "flex-end" 
                    })}>
                      {/* Limit Field */}
                      {!isNoCashback && row.categoryId && (
                        <div className={flex({ align: "center", gap: "4px" })}>
                          <span className={css({ fontSize: "8px", fontWeight: "700", color: "var(--secondary-text)", display: { base: "none", sm: "block" }, opacity: 0.8 })}>ЛИМИТ</span>
                          <input 
                            type="number"
                            disabled={isFormDisabled}
                            value={row.limit}
                            onChange={(e) => updateRow(row.id, { limit: e.target.value })}
                            placeholder="0"
                            className={css({ w: "55px", p: "6px", borderRadius: "8px", border: "1px solid var(--border-color)", textAlign: "right", fontSize: "13px", fontWeight: "700", bg: "var(--input-bg)", color: "var(--foreground)", _disabled: { bg: "var(--background)", opacity: 0.6 } })}
                          />
                        </div>
                      )}

                      <div className={flex({ align: "center", gap: "4px" })}>
                        <input 
                          type="number" 
                          step="0.25" 
                          value={row.percentage}
                          onChange={(e) => updateRow(row.id, { percentage: e.target.value })}
                          disabled={isNoCashback || !row.categoryId || isFormDisabled}
                          className={css({ w: "45px", p: "8px", borderRadius: "10px", border: "1px solid var(--border-color)", textAlign: "right", fontWeight: "800", fontSize: "15px", bg: !isNoCashback && row.categoryId && !isFormDisabled ? "var(--input-bg)" : "var(--background)", outline: "none", color: "var(--foreground)", _disabled: { opacity: 0.6 } })}
                        />
                        <span className={css({ fontSize: "14px", fontWeight: "800", color: !isNoCashback && row.categoryId ? (isDuplicate ? "#ef4444" : "var(--sber-green)") : "var(--secondary-text)" })}>%</span>
                      </div>
                    </div>
                  </div>
                  
                  {!isNoCashback ? (
                    <button 
                      type="button"
                      disabled={isFormDisabled}
                      onClick={() => removeRow(row.id)}
                      className={css({ 
                        w: "40px",
                        h: "40px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "#ef4444", 
                        bg: "rgba(239, 68, 68, 0.1)", 
                        borderRadius: "12px", 
                        cursor: "pointer", 
                        transition: "all 0.2s", 
                        _hover: { bg: "rgba(239, 68, 68, 0.2)" }, 
                        _active: { transform: "scale(0.95)" }, 
                        border: "none",
                        outline: "none",
                        p: 0,
                        _disabled: { opacity: 0.5, cursor: "not-allowed" } 
                      })}
                    >
                      <Trash2 size={20} />
                    </button>
                  ) : (
                    <div className={css({ w: "40px", h: "40px" })} />
                  )}
                </div>
              );
            })}

            <button
              type="button"
              onClick={addRow}
              disabled={isFormDisabled}
              className={flex({ 
                align: "center", 
                justify: "center", 
                gap: "8px", 
                w: "full", 
                p: "14px", 
                border: "2px dashed var(--border-color)", 
                borderRadius: "14px", 
                color: "var(--secondary-text)", 
                fontSize: "14px", 
                fontWeight: "700", 
                cursor: "pointer", 
                transition: "all 0.2s",
                _hover: { bg: "var(--input-bg)", borderColor: "var(--sber-green)", color: "var(--foreground)" },
                _active: { bg: "var(--background)" },
                _disabled: { opacity: 0.5, cursor: "not-allowed" }
              })}
            >
              <Plus size={18} />
              ДОБАВИТЬ КАТЕГОРИЮ
            </button>

            {rows.length === 0 && (
              <p className={css({ fontSize: "13px", color: "var(--secondary-text)", textAlign: "center", py: "20px" })}>
                Нажмите &quot;+&quot;, чтобы добавить категорию
              </p>
            )}

          </div>
        </div>

        {hasDuplicates && (
          <p className={css({ color: "#ef4444", fontSize: "13px", fontWeight: "700", textAlign: "center" })}>
            У вас есть дублирующиеся категории! Удалите повторы для сохранения.
          </p>
        )}

        <button 
          type="submit" 
          disabled={rows.filter(r => r.categoryId).length === 0 || isFormDisabled || hasDuplicates} 
          className="sber-button" 
          style={{ opacity: rows.filter(r => r.categoryId).length === 0 || isFormDisabled || hasDuplicates ? 0.5 : 1 }}
        >
          {isSaving ? <Loader2 size={18} className={css({ animation: "spin 1s linear infinite" })} /> : <Save size={18} />}
          {isSaving ? "Сохраняем..." : `Сохранить (${rows.filter(r => r.categoryId).length})`}
        </button>
      </form>
    </section>
  );
}

