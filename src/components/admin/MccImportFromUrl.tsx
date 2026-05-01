"use client";

import { useState } from "react";
import { fetchMccCategoriesFromUrl, importMccsToCategory, importFullCardFromUrl, MccCategoryImport } from "@/lib/actions/mcc-import";
import { css } from "../../../styled-system/css";
import { stack, flex } from "../../../styled-system/patterns";
import { Globe, Loader2, CheckCircle2, ChevronDown, ChevronUp } from "lucide-react";

interface MccImportProps {
  categoryId?: number;
  bankCardId?: number;
}

export default function MccImportFromUrl({ categoryId, bankCardId }: MccImportProps) {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<MccCategoryImport[]>([]);
  const [selectedMccs, setSelectedMccs] = useState<Set<string>>(new Set()); // Only for single category mode
  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(new Set()); // Only for full card mode
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);

  const isCardMode = !!bankCardId && !categoryId;

  const handleFetch = async () => {
    if (!url) return;
    setLoading(true);
    setError(null);
    try {
      const data = await fetchMccCategoriesFromUrl(url);
      setCategories(data);
      // Automatically expand first few
      setExpanded(new Set(data.slice(0, 3).map(c => c.name)));
      
      if (isCardMode) {
        // In card mode, select all categories by default
        setSelectedCategories(new Set(data.map(c => c.name)));
      }
    } catch (e: any) {
      setError(e.message || "Failed to fetch data");
    } finally {
      setLoading(false);
    }
  };

  const toggleCategorySelection = (cat: MccCategoryImport) => {
    if (isCardMode) {
      const newSelected = new Set(selectedCategories);
      if (newSelected.has(cat.name)) newSelected.delete(cat.name);
      else newSelected.add(cat.name);
      setSelectedCategories(newSelected);
    } else {
      const newSelected = new Set(selectedMccs);
      const allInCatSelected = cat.mccs.every(mcc => selectedMccs.has(mcc));
      
      if (allInCatSelected) {
        cat.mccs.forEach(mcc => newSelected.delete(mcc));
      } else {
        cat.mccs.forEach(mcc => newSelected.add(mcc));
      }
      setSelectedMccs(newSelected);
    }
  };

  const toggleMcc = (mcc: string) => {
    if (isCardMode) return; // MCC selection not used in card mode
    const newSelected = new Set(selectedMccs);
    if (newSelected.has(mcc)) newSelected.delete(mcc);
    else newSelected.add(mcc);
    setSelectedMccs(newSelected);
  };

  const toggleExpand = (name: string) => {
    const newExpanded = new Set(expanded);
    if (newExpanded.has(name)) newExpanded.delete(name);
    else newExpanded.add(name);
    setExpanded(newExpanded);
  };

  const handleImport = async () => {
    if (!isCardMode && selectedMccs.size === 0) return;
    if (isCardMode && selectedCategories.size === 0) return;

    setLoading(true);
    try {
      if (isCardMode) {
        const toImport = categories.filter(c => selectedCategories.has(c.name));
        await importFullCardFromUrl(bankCardId!, url, toImport);
        alert(`Успешно создано ${toImport.length} категорий`);
      } else {
        await importMccsToCategory(categoryId!, Array.from(selectedMccs));
        alert(`Успешно добавлено ${selectedMccs.size} MCC-кодов`);
      }
      setCategories([]);
      setSelectedMccs(new Set());
      setSelectedCategories(new Set());
      setUrl("");
    } catch (e: any) {
      setError(e.message || "Failed to import");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'block', width: '100%', marginTop: '16px' }}>
      <div style={{ marginBottom: '16px' }}>
        <label className={css({ fontSize: "10px", fontWeight: "800", color: "secondaryText", textTransform: "uppercase", display: 'block', mb: '4px' })}>
          Импорт с mcc-codes.ru ({isCardMode ? "всю карту" : "в категорию"})
        </label>
        <div style={{ display: 'flex', gap: '8px' }}>
          <input 
            type="text" 
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://mcc-codes.ru/card/..."
            className="sber-input"
            style={{ flex: 1, minWidth: 0 }}
          />
          <button 
            onClick={handleFetch} 
            disabled={loading || !url}
            className="sber-button" 
            style={{ width: "auto", padding: "0 20px", flexShrink: 0 }}
          >
            {loading ? <Loader2 className={css({ animation: "spin 1s linear infinite" })} size={18} /> : <Globe size={18} />}
          </button>
        </div>
      </div>

      {error && (
        <div className={css({ color: "#ef4444", fontSize: "12px", fontWeight: "600", bg: "#fef2f2", p: "8px", borderRadius: "8px", mb: '16px' })}>
          {error}
        </div>
      )}

      {categories.length > 0 && (
        <div className="sber-card" style={{ padding: '16px', display: 'block', width: '100%' }}>
          <h3 className={css({ fontSize: "14px", fontWeight: "800", mb: '12px' })}>
            {isCardMode ? `Найдено категорий: ${categories.length}` : `Найдено MCC в ${categories.length} секциях`}
          </h3>
          
          <div style={{ maxHeight: '500px', overflowY: 'auto', marginBottom: '16px', paddingRight: '4px' }}>
            {categories.map((cat) => {
              let isSelected = false;
              let isPartial = false;

              if (isCardMode) {
                isSelected = selectedCategories.has(cat.name);
              } else {
                isSelected = cat.mccs.every(mcc => selectedMccs.has(mcc));
                isPartial = !isSelected && cat.mccs.some(mcc => selectedMccs.has(mcc));
              }

              const isExpanded = expanded.has(cat.name);

              return (
                <div key={cat.name} style={{ border: '1px solid #f0f0f0', borderRadius: '12px', marginBottom: '8px', overflow: 'hidden', minHeight: '44px' }}>
                  <div 
                    style={{ 
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', 
                      backgroundColor: (isSelected || isPartial) ? "rgba(33, 160, 56, 0.1)" : "var(--surface-secondary)",
                      cursor: 'pointer'
                    }}
                    onClick={() => toggleCategorySelection(cat)}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                       <div className={css({ 
                         w: "18px", h: "18px", borderRadius: "4px", border: "2px solid", 
                         borderColor: (isSelected || isPartial) ? "var(--sber-green)" : "var(--border-color)",
                         bg: isSelected ? "var(--sber-green)" : "transparent",
                         display: "flex", alignItems: "center", justifyContent: "center",
                         color: "white", flexShrink: 0
                       })}>
                         {isSelected && <CheckCircle2 size={12} />}
                         {isPartial && <div className={css({ w: "8px", h: "2px", bg: "var(--sber-green)" })} />}
                       </div>
                       <div style={{ display: 'block' }}>
                         <div className={css({ fontSize: "13px", fontWeight: "700", color: 'var(--foreground)' })}>{cat.name}</div>
                         {cat.minPercent !== undefined && (
                           <div className={css({ fontSize: "10px", color: "var(--sber-green)", fontWeight: "800" })}>{cat.minPercent}% кэшбэк</div>
                         )}
                       </div>
                    </div>
                    <div 
                      onClick={(e) => { e.stopPropagation(); toggleExpand(cat.name); }}
                      style={{ padding: '4px', color: 'var(--secondary-text)', display: 'flex' }}
                    >
                      {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </div>
                  </div>
                  
                  {isExpanded && (
                    <div style={{ padding: '10px', backgroundColor: 'var(--card-bg)', borderTop: '1px solid var(--border-color)' }}>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                        {cat.mccs.map(mcc => (
                          <div 
                            key={mcc}
                            onClick={() => !isCardMode && toggleMcc(mcc)}
                            style={{ 
                              padding: '4px 8px', fontSize: '11px', fontWeight: '700', borderRadius: '6px', textAlign: 'center', 
                              cursor: isCardMode ? 'default' : 'pointer',
                              backgroundColor: (isCardMode || selectedMccs.has(mcc)) ? 'var(--sber-green)' : 'var(--input-bg)',
                              color: (isCardMode || selectedMccs.has(mcc)) ? 'white' : 'var(--secondary-text)',
                              opacity: isCardMode && !isSelected ? 0.4 : 1,
                              minWidth: '45px'
                            }}
                          >
                            {mcc}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <button 
            onClick={handleImport} 
            disabled={loading || (isCardMode ? selectedCategories.size === 0 : selectedMccs.size === 0)}
            className="sber-button"
            style={{ width: '100%' }}
          >
            {loading ? <Loader2 className={css({ animation: "spin 1s linear infinite", display: 'inline', mr: '8px' })} size={18} /> : null}
            {isCardMode 
              ? `СОЗДАТЬ ${selectedCategories.size} КАТЕГОРИЙ` 
              : `ИМПОРТИРОВАТЬ ${selectedMccs.size} MCC`
            }
          </button>
        </div>
      )}
    </div>
  );
}
