"use client";

import { useState, useTransition, useMemo } from "react";
import { findBestCardForPurchase, SearchResult } from "@/lib/actions/search";
import { getMerchantMccSuggestions } from "@/lib/actions/merchants";
import { css } from "../../styled-system/css";
import { stack, flex } from "../../styled-system/patterns";
import { Search, Info, Landmark, Save, Store } from "lucide-react";
import SearchableSelect from "./SearchableSelect";
import { useToast } from "./Toast";
import { getIconUrl } from "@/lib/utils/icons";

interface Merchant {
  name: string;
}

interface MccCode {
  code: string;
  description: string;
}

export default function SearchBestCard({ merchants, mccs }: { merchants: Merchant[], mccs: MccCode[] }) {
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [selectedMerchantName, setSelectedMerchantName] = useState("");
  const [selectedMcc, setSelectedMcc] = useState("");
  const [amount, setAmount] = useState("1000");
  const [results, setResults] = useState<SearchResult[] | null>(null);
  const [suggestedMccs, setSuggestedMccs] = useState<string[]>([]);
  const [isSearchingMcc, setIsSearchingMcc] = useState(false);

  const merchantOptions = useMemo(() => 
    merchants.map(m => ({ value: m.name, label: m.name })),
    [merchants]
  );

  const mccOptions = useMemo(() => {
    let allowedCodes: Set<string> | null = null;
    if (suggestedMccs.length > 0) {
      allowedCodes = new Set(suggestedMccs);
    }

    if (!allowedCodes) {
      return mccs.map(m => ({ value: m.code, label: `${m.code} — ${m.description}` }));
    }

    return mccs
      .filter(m => allowedCodes!.has(m.code))
      .map(m => ({ value: m.code, label: `${m.code} — ${m.description}` }));
  }, [mccs, suggestedMccs]);

  const handleMerchantChange = async (name: string) => {
    setSelectedMerchantName(name);
    
    if (name) {
      setIsSearchingMcc(true);
      try {
        const suggestions = await getMerchantMccSuggestions(name);
        if (suggestions) {
          const codes = [suggestions.mainMcc, ...suggestions.additionalMccs.split(",").map(c => c.trim())];
          setSuggestedMccs(codes);
          setSelectedMcc(suggestions.mainMcc);
        }
      } finally {
        setIsSearchingMcc(false);
      }
    } else {
      setSuggestedMccs([]);
      setSelectedMcc("");
    }
  };

  const handleSearch = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!selectedMerchantName && !selectedMcc) {
      toast("Выберите магазин или укажите MCC", "error");
      return;
    }

    startTransition(async () => {
      try {
        const data = await findBestCardForPurchase(
          selectedMerchantName, 
          selectedMcc || "0000", 
          parseFloat(amount) || 0
        );
        setResults(data);
      } catch (error) {
        toast(error instanceof Error ? error.message : "Ошибка при поиске", "error");
      }
    });
  };

  return (
    <div className={stack({ gap: "24px" })}>
      <section className="sber-card">
        <div className={flex({ align: "center", gap: "10px", mb: "24px" })}>
          <div className={css({ p: "6px", bg: "sberGreen", borderRadius: "8px", color: "white" })}>
            <Search size={18} />
          </div>
          <h2 className={css({ fontSize: "17px", fontWeight: "700", color: "var(--foreground)" })}>Поиск выгодной карты</h2>
        </div>

        <form onSubmit={handleSearch} className={stack({ gap: "20px" })}>
          <div className={stack({ gap: "6px" })}>
            <label className="sber-label">МАГАЗИН / МЕРЧАНТ</label>
            <SearchableSelect 
              name="merchantName"
              options={merchantOptions}
              value={selectedMerchantName}
              onChange={handleMerchantChange}
              allowCustom
              placeholder="Напр: Ozon, Пятерочка..."
            />
          </div>

          <div className={stack({ gap: "6px" })}>
            <label className="sber-label">MCC-КОД</label>
            <SearchableSelect 
              name="mccCode"
              options={mccOptions}
              value={selectedMcc}
              onChange={setSelectedMcc}
              placeholder={isSearchingMcc ? "Ищем подходящие коды..." : (selectedMerchantName ? "Выберите MCC из списка магазина..." : "Укажите MCC")}
              disabled={isSearchingMcc}
            />
          </div>

          <div className={stack({ gap: "6px" })}>
            <label className="sber-label">СУММА ПОКУПКИ (₽)</label>
            <div className={flex({ align: "center", gap: "12px" })}>
               <input 
                 type="number" 
                 value={amount}
                 onChange={(e) => setAmount(e.target.value)}
                 className="sber-input"
                 style={{ fontSize: "20px", fontWeight: "800", flex: 1 }}
               />
               <button 
                 type="submit" 
                 disabled={isPending || isSearchingMcc}
                 className={css({ 
                   h: "56px", 
                   px: "24px", 
                   bg: "sberGreen", 
                   color: "white", 
                   borderRadius: "16px", 
                   fontWeight: "700", 
                   cursor: "pointer",
                   _hover: { opacity: 0.9 },
                   _disabled: { opacity: 0.5, cursor: "not-allowed" }
                 })}
               >
                 {isPending ? "..." : "НАЙТИ"}
               </button>
            </div>
          </div>
        </form>
      </section>

      {results && (
        <div className={stack({ gap: "16px" })}>
          <h3 className={css({ fontSize: "14px", fontWeight: "800", color: "var(--secondary-text)", textTransform: "uppercase", letterSpacing: "0.05em", px: "4px" })}>
            Результаты ({results.length})
          </h3>
          
          <div className={grid({ columns: { base: 1, sm: 2, lg: 3 }, gap: "12px" })}>
            {results.map((card, idx) => {
              const iconUrl = getIconUrl({ logo: card.bankLogo, website: card.bankWebsite, name: card.bankName });
              
              return (
                <div 
                  key={card.id} 
                  className="sber-card" 
                  style={{ 
                    padding: "16px", 
                    border: idx === 0 ? "2px solid var(--sber-green)" : "1px solid var(--border-color)",
                    position: "relative",
                    overflow: "hidden"
                  }}
                >
                  {idx === 0 && (
                    <div className={css({ position: "absolute", top: 0, right: 0, bg: "sberGreen", color: "white", px: "10px", py: "4px", borderBottomLeftRadius: "12px", fontSize: "10px", fontWeight: "900" })}>
                      ЛУЧШИЙ ВЫБОР
                    </div>
                  )}
                  
                  <div className={flex({ justify: "space-between", align: "center" })}>
                    <div className={flex({ align: "center", gap: "14px" })}>
                      <div className={css({ w: "48px", h: "48px", bg: "var(--surface-secondary)", borderRadius: "12px", display: "flex", alignItems: "center", justifyContent: "center", border: "1px solid", borderColor: "var(--border-color)", overflow: "hidden" })}>
                        {iconUrl ? (
                          <img src={iconUrl} alt={card.bankName} className={css({ w: "32px", h: "32px", objectFit: "contain" })} />
                        ) : (
                          <Landmark size={20} color="var(--secondary-text)" />
                        )}
                      </div>
                      <div className={stack({ gap: "2px" })}>
                        <p className={css({ fontWeight: "800", fontSize: "16px", color: "var(--foreground)" })}>
                          {card.bankName} {card.cardName}
                        </p>
                        <div className={flex({ align: "center", gap: "6px" })}>
                          <p className={css({ fontSize: "12px", color: "var(--secondary-text)", fontWeight: "600" })}>
                            {card.lastFour ? `•••• ${card.lastFour}` : "Основная"}
                          </p>
                          <span className={css({ w: "3px", h: "3px", bg: "#cbd5e1", borderRadius: "full" })} />
                          <p className={css({ fontSize: "12px", color: "sberGreen", fontWeight: "700" })}>
                            {card.categoryName}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className={stack({ align: "flex-end", gap: "2px" })}>
                      <p className={css({ fontSize: "20px", fontWeight: "900", color: "var(--foreground)" })}>
                        {card.percentage}%
                      </p>
                      <p className={css({ fontSize: "13px", fontWeight: "700", color: "sberGreen" })}>
                        +{card.cashback.toLocaleString('ru-RU')} ₽
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}

            {results.length === 0 && (
              <div className={css({ py: "40px", textAlign: "center", color: "var(--secondary-text)", bg: "var(--card-bg)", borderRadius: "24px", border: "1px dashed", borderColor: "var(--border-color)" })}>
                У вас еще нет добавленных карт
              </div>
            )}
          </div>
        </div>
      )}

      {!results && !isPending && (
        <div className={stack({ align: "center", py: "60px", gap: "16px", opacity: 0.5 })}>
          <div className={css({ w: "64px", h: "64px", borderRadius: "24px", border: "2px dashed var(--border-color)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--secondary-text)" })}>
            <Info size={32} />
          </div>
          <p className={css({ fontSize: "14px", color: "var(--secondary-text)", textAlign: "center", maxWidth: "240px", fontWeight: "500" })}>
            Выберите магазин, чтобы узнать, какой картой выгоднее платить сегодня
          </p>
        </div>
      )}
    </div>
  );
}
