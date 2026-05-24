"use client";

import { useState, useMemo, useEffect } from "react";
import { stack, flex } from "../../styled-system/patterns";
import { css } from "../../styled-system/css";
import { Filter, X } from "lucide-react";
import MultiSearchableSelect from "./MultiSearchableSelect";
import SearchableSelect from "./SearchableSelect";
import DatePicker from "./DatePicker";
import { useRouter, useSearchParams } from "next/navigation";

interface BankOption {
  value: string;
  label: string;
}

interface CardOption {
  value: string;
  label: string;
  bankId: number;
}

interface MerchantOption {
  value: string;
  label: string;
}

interface TransactionFiltersProps {
  bankOptions: BankOption[];
  allCards: CardOption[];
  merchantOptions: MerchantOption[];
  initialFilters: {
    startDate: string;
    endDate: string;
    bankIds: string[];
    cardIds: string[];
    merchantName: string;
  };
}

export default function TransactionFilters({ 
  bankOptions, 
  allCards, 
  merchantOptions,
  initialFilters 
}: TransactionFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [startDate, setStartDate] = useState(initialFilters.startDate);
  const [endDate, setEndDate] = useState(initialFilters.endDate);
  const [selectedBankIds, setSelectedBankIds] = useState<string[]>(initialFilters.bankIds);
  const [selectedCardIds, setSelectedCardIds] = useState<string[]>(initialFilters.cardIds);
  const [merchantName, setMerchantName] = useState(initialFilters.merchantName);

  // Filter cards based on selected banks
  const availableCards = useMemo(() => {
    if (selectedBankIds.length === 0) return allCards;
    const bankIdsNum = selectedBankIds.map(id => parseInt(id));
    return allCards.filter(c => bankIdsNum.includes(c.bankId));
  }, [allCards, selectedBankIds]);

  // Sync cards when banks change
  const [prevBankIds, setPrevBankIds] = useState<string[]>(initialFilters.bankIds);
  
  useEffect(() => {
    if (JSON.stringify(prevBankIds) !== JSON.stringify(selectedBankIds)) {
      // Find newly added banks
      const addedBanks = selectedBankIds.filter(id => !prevBankIds.includes(id));
      
      if (addedBanks.length > 0) {
        // Add all cards of newly added banks to the selection
        const addedBanksNum = addedBanks.map(id => parseInt(id));
        const newCards = allCards
          .filter(c => addedBanksNum.includes(c.bankId))
          .map(c => c.value);
        
        setSelectedCardIds(prev => Array.from(new Set([...prev, ...newCards])));
      } else {
        // Banks were removed, remove their cards
        const bankIdsNum = selectedBankIds.map(id => parseInt(id));
        setSelectedCardIds(prev => prev.filter(cardId => {
          const card = allCards.find(c => c.value === cardId);
          return !card || bankIdsNum.includes(card.bankId);
        }));
      }
      setPrevBankIds(selectedBankIds);
    }
  }, [selectedBankIds, prevBankIds, allCards]);

  const handleApply = (e?: React.FormEvent) => {
    e?.preventDefault();
    const params = new URLSearchParams();
    if (startDate) params.set("startDate", startDate);
    if (endDate) params.set("endDate", endDate);
    if (merchantName) params.set("merchantName", merchantName);
    
    selectedBankIds.forEach(id => params.append("bankId", id));
    selectedCardIds.forEach(id => params.append("cardId", id));

    router.push(`?${params.toString()}`);
  };

  const handleReset = () => {
    router.push("/transactions");
  };

  return (
    <section className="sber-card" style={{ marginBottom: "24px", padding: "16px" }}>
      <form onSubmit={handleApply} className={stack({ gap: "16px" })}>
        <div className={css({ display: "grid", gridTemplateColumns: { base: "1fr", md: "repeat(auto-fit, minmax(240px, 1fr))" }, gap: "16px" })}>
          {/* Dates */}
          <div className={flex({ gap: "10px" })}>
            <div className={stack({ gap: "4px", flex: "1" })}>
              <label className="sber-label">ОТ</label>
              <DatePicker name="startDate" defaultValue={startDate} />
            </div>
            <div className={stack({ gap: "4px", flex: "1" })}>
              <label className="sber-label">ДО</label>
              <DatePicker name="endDate" defaultValue={endDate} />
            </div>
          </div>

          {/* Banks and Cards */}
          <div className={flex({ gap: "10px" })}>
            <div className={stack({ gap: "4px", flex: "1" })}>
              <label className="sber-label">БАНКИ</label>
              <MultiSearchableSelect 
                name="bankId" 
                options={bankOptions}
                value={selectedBankIds}
                onChange={setSelectedBankIds}
                placeholder="Все банки"
              />
            </div>
            <div className={stack({ gap: "4px", flex: "1" })}>
              <label className="sber-label">КАРТЫ</label>
              <MultiSearchableSelect 
                name="cardId" 
                options={availableCards}
                value={selectedCardIds}
                onChange={setSelectedCardIds}
                placeholder="Все карты"
              />
            </div>
          </div>

          {/* Merchant */}
          <div className={stack({ gap: "4px" })}>
            <label className="sber-label">МАГАЗИН</label>
            <SearchableSelect 
              name="merchantName" 
              options={merchantOptions}
              defaultValue={merchantName}
              placeholder="Все магазины"
              onChange={setMerchantName}
            />
          </div>
        </div>

        <div className={flex({ gap: "8px", justify: "flex-end" })}>
          <button type="button" onClick={handleReset} className={css({ p: "12px", bg: "var(--input-bg)", borderRadius: "14px", color: "#64748b", display: "flex", alignItems: "center", justifyContent: "center", border: "none", cursor: "pointer", _hover: { bg: "var(--border-color)" } })}>
            <X size={18} />
          </button>
          <button type="submit" className="sber-button" style={{ width: "auto", padding: "12px 24px" }}>
            <Filter size={16} /> Применить
          </button>
        </div>
      </form>
    </section>
  );
}
