"use client";

import { useState, useMemo, useEffect } from "react";
import { css } from "../../styled-system/css";
import { stack, flex } from "../../styled-system/patterns";
import { Star, Copy, Save, Loader2 } from "lucide-react";
import { saveMonthlyRules, copyRulesFromPreviousMonth } from "@/lib/actions/rules";
import { useRouter, usePathname } from "next/navigation";

interface Card {
  id: number;
  name: string | null;
  bankName: string | null;
  bankCardId: number;
}

interface Category {
  id: number;
  name: string;
  bankCardId: number;
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
  userCards: Card[];
  allCategories: Category[];
  initialMonth: string;
  activeRules: ActiveRule[];
}

export default function MonthlyRulesForm({ 
  userCards, 
  allCategories, 
  initialMonth, 
  activeRules 
}: MonthlyRulesFormProps) {
  const router = useRouter();
  const pathname = usePathname();
  
  const [selectedMonth, setSelectedMonth] = useState(initialMonth);
  const [isCopying, setIsCopying] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const selectedCard = userCards[0]; // In this context we always have at least one card
  
  const cardCategories = useMemo(() => {
    if (!selectedCard || !selectedMonth) return [];
    
    const [year, month] = selectedMonth.split("-").map(Number);
    const monthStart = `${selectedMonth}-01`;
    const lastDay = new Date(year, month, 0).getDate();
    const monthEnd = `${selectedMonth}-${String(lastDay).padStart(2, "0")}`;

    return allCategories
      .filter(cat => 
        cat.bankCardId === selectedCard.bankCardId &&
        cat.startDate <= monthEnd &&
        (!cat.endDate || cat.endDate >= monthStart)
      )
      .sort((a, b) => {
        // Special Sort: 1. Без кешбэка, 2. Остальные покупки, 3. Alphabetical
        if (a.name === "Без кешбэка") return -1;
        if (b.name === "Без кешбэка") return 1;
        if (a.name === "Остальные покупки") return -1;
        if (b.name === "Остальные покупки") return 1;
        return a.name.localeCompare(b.name, 'ru');
      });
  }, [selectedCard, allCategories, selectedMonth]);
  
  // Initialize active categories from server-side activeRules
  const initialActiveSet = useMemo(() => {
    const set = new Set(activeRules.map(r => r.categoryId));
    // Always include "Без кешбэка" if it exists in the card's categories for this month
    const noCashbackCat = cardCategories.find(c => c.name === "Без кешбэка");
    if (noCashbackCat) set.add(noCashbackCat.id);
    return set;
  }, [activeRules, cardCategories]);

  const [activeCats, setActiveCats] = useState<Set<number>>(initialActiveSet);

  const toggleCat = (id: number, name: string) => {
    if (name === "Без кешбэка" || isSaving || isCopying) return; // Cannot toggle this
    const newSet = new Set(activeCats);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setActiveCats(newSet);
  };

  const handleMonthChange = (newMonth: string) => {
    if (isSaving || isCopying) return;
    setSelectedMonth(newMonth);
    router.push(`${pathname}?month=${newMonth}`);
  };

  const handleCopy = async () => {
    if (!selectedCard || !selectedMonth || isSaving || isCopying) return;
    setIsCopying(true);
    try {
      await copyRulesFromPreviousMonth(selectedCard.id, selectedMonth);
    } catch (e) {
      alert("Не удалось скопировать: " + (e as Error).message);
    } finally {
      setIsCopying(false);
    }
  };

  const isPending = isSaving || isCopying;

  return (
    <section className="sber-card" style={{ position: "relative" }}>
      {isPending && (
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
        <h2 className={css({ fontSize: "17px", fontWeight: "700", color: "#000" })}>Настройка на месяц</h2>
      </div>

      <form action={async (formData) => {
        setIsSaving(true);
        try {
          await saveMonthlyRules(formData);
        } finally {
          setIsSaving(false);
        }
      }} className={stack({ gap: "24px" })}>
        <div className={flex({ gap: "12px" })}>
          <div className={stack({ gap: "6px", flex: 1 })}>
            <label className="sber-label">КАРТА</label>
            <div className={css({ px: "16px", py: "14px", bg: "#f1f5f9", borderRadius: "14px", border: "1px solid #e2e8f0" })}>
              <input type="hidden" name="userCardId" value={selectedCard.id} />
              <p className={css({ fontSize: "15px", fontWeight: "700", color: "#000" })}>
                {selectedCard.bankName} — {selectedCard.name}
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
              disabled={isPending}
              onChange={(e) => handleMonthChange(e.target.value)}
              className="sber-input"
              style={{ fontSize: "14px" }}
            />
          </div>
        </div>

        <div className={stack({ gap: "16px" })}>
          <div className={flex({ justify: "space-between", align: "center", wrap: "wrap", gap: "12px" })}>
            <p className={css({ fontSize: "13px", fontWeight: "800", color: "secondaryText", textTransform: "uppercase" })}>Выберите категории</p>
            <button 
              type="button" 
              onClick={handleCopy}
              disabled={isPending}
              className={flex({ align: "center", gap: "6px", color: "sberGreen", fontSize: "12px", fontWeight: "700", cursor: "pointer", _disabled: { opacity: 0.5 } })}
            >
              {isCopying ? <Loader2 size={14} className={css({ animation: "spin 1s linear infinite" })} /> : <Copy size={14} />}
              СКОПИРОВАТЬ ИЗ ПРОШЛОГО МЕСЯЦА
            </button>
          </div>

          <div className={stack({ gap: "10px" })}>
            {cardCategories.map(cat => {
              const isNoCashback = cat.name === "Без кешбэка";
              const isActive = isNoCashback || activeCats.has(cat.id);
              const savedRule = activeRules.find(r => r.categoryId === cat.id);

              return (
                <div key={cat.id} className={flex({ justify: "space-between", align: "center", p: "12px", bg: isActive ? (isNoCashback ? "#f8fafc" : "#f0fdf4") : "#f8fafc", borderRadius: "14px", border: "1px solid", borderColor: isActive && !isNoCashback ? "sberGreen" : "transparent", transition: "all 0.2s" })}>
                  <label className={flex({ align: "center", gap: "12px", cursor: isNoCashback || isPending ? "default" : "pointer", flex: 1 })}>
                    <input 
                      type="checkbox" 
                      checked={isActive}
                      disabled={isNoCashback || isPending}
                      onChange={() => toggleCat(cat.id, cat.name)}
                      className={css({ w: "20px", h: "20px", accentColor: "#21a038", cursor: isNoCashback || isPending ? "default" : "pointer", opacity: isNoCashback || isPending ? 0.5 : 1 })}
                    />
                    <div className={stack({ gap: "2px" })}>
                      <span className={css({ fontSize: "15px", fontWeight: isActive ? "700" : "500", color: isNoCashback ? "secondaryText" : "#000" })}>
                        {cat.name}
                      </span>
                    </div>
                  </label>
                  
                  <div className={flex({ align: "center", gap: "12px" })}>
                    {/* Limit Field */}
                    {!isNoCashback && isActive && (
                      <div className={flex({ align: "center", gap: "4px" })}>
                        <span className={css({ fontSize: "9px", fontWeight: "800", color: "secondaryText" })}>ЛИМИТ</span>
                        <input 
                          name={`limit_${cat.id}`}
                          type="number"
                          disabled={isPending}
                          defaultValue={savedRule?.cashbackLimit ?? cat.cashbackLimit ?? ""}
                          placeholder="0"
                          className={css({ w: "60px", p: "6px", borderRadius: "8px", border: "1px solid #e2e8f0", textAlign: "right", fontSize: "13px", fontWeight: "700", bg: "white", _disabled: { bg: "#f1f5f9" } })}
                        />
                      </div>
                    )}

                    <div className={flex({ align: "center", gap: "6px", opacity: isActive ? 1 : 0.4, transition: "opacity 0.2s" })}>
                      {isNoCashback && isActive && (
                        <input type="hidden" name={`cat_${cat.id}`} value="0" />
                      )}
                      <input 
                        name={isNoCashback ? undefined : `cat_${cat.id}`} 
                        type="number" 
                        step="0.25" 
                        defaultValue={savedRule ? savedRule.percentage : cat.defaultPercentage}
                        disabled={!isActive || isNoCashback || isPending}
                        className={css({ w: "60px", p: "8px", borderRadius: "10px", border: "1px solid #e2e8f0", textAlign: "right", fontWeight: "800", fontSize: "15px", bg: isActive && !isNoCashback && !isPending ? "white" : "#f1f5f9", outline: "none", color: "#000" })}
                      />
                      <span className={css({ fontSize: "14px", fontWeight: "800", color: isActive && !isNoCashback ? "sberGreen" : "secondaryText" })}>%</span>
                    </div>
                  </div>
                </div>
              );
            })}
            {cardCategories.length === 0 && (
              <p className={css({ fontSize: "13px", color: "secondaryText", textAlign: "center", py: "20px" })}>
                Для этой карты нет доступных категорий в справочнике
              </p>
            )}
          </div>
        </div>

        <button type="submit" disabled={activeCats.size === 0 || isPending} className="sber-button" style={{ opacity: activeCats.size === 0 || isPending ? 0.5 : 1 }}>
          {isSaving ? <Loader2 size={18} className={css({ animation: "spin 1s linear infinite" })} /> : <Save size={18} />}
          {isSaving ? "Сохраняем..." : `Сохранить ${activeCats.size > 0 ? `(${activeCats.size})` : ""}`}
        </button>
      </form>
    </section>
  );
}
