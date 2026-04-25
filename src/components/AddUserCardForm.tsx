"use client";

import { useState, useMemo } from "react";
import { stack } from "../../styled-system/patterns";
import SearchableSelect from "./SearchableSelect";
import { addUserCard } from "@/lib/actions/user-cards";

interface Bank {
  id: number;
  name: string;
}

interface CardType {
  id: number;
  bankId: number;
  name: string;
}

interface AddUserCardFormProps {
  banks: Bank[];
  cardTypes: CardType[];
}

export default function AddUserCardForm({ banks, cardTypes }: AddUserCardFormProps) {
  const [selectedBankId, setSelectedBankId] = useState<string>("");
  const [selectedCardId, setSelectedCardId] = useState<string>("");

  const bankOptions = useMemo(() => 
    banks.map(b => ({ value: b.id.toString(), label: b.name })),
    [banks]
  );

  const filteredCardOptions = useMemo(() => {
    if (!selectedBankId) return [];
    return cardTypes
      .filter(ct => ct.bankId === parseInt(selectedBankId))
      .map(ct => ({ value: ct.id.toString(), label: ct.name }));
  }, [cardTypes, selectedBankId]);

  const handleBankChange = (val: string) => {
    setSelectedBankId(val);
    setSelectedCardId(""); // Reset card selection when bank changes
  };

  return (
    <form action={addUserCard} className={stack({ gap: "20px" })}>
      <div className={stack({ gap: "6px" })}>
        <label className="sber-label">БАНК-ЭМИТЕНТ</label>
        <SearchableSelect 
          name="bankId" 
          options={bankOptions}
          value={selectedBankId}
          onChange={handleBankChange}
          placeholder="Выберите банк..."
          required
        />
      </div>

      <div className={stack({ gap: "6px" })}>
        <label className="sber-label">ТИП КАРТЫ</label>
        <SearchableSelect 
          name="bankCardId" 
          options={filteredCardOptions}
          value={selectedCardId}
          onChange={setSelectedCardId}
          placeholder={selectedBankId ? "Выберите карту..." : "Сначала выберите банк"}
          required
          disabled={!selectedBankId}
        />
      </div>

      <div className={stack({ gap: "6px" })}>
        <label className="sber-label">ПОСЛЕДНИЕ 4 ЦИФРЫ</label>
        <input 
          name="lastFourDigits" 
          type="text" 
          maxLength={4} 
          placeholder="0000" 
          className="sber-input" 
        />
      </div>

      <button 
        type="submit" 
        className="sber-button"
        disabled={!selectedCardId}
        style={{ opacity: !selectedCardId ? 0.6 : 1 }}
      >
        Добавить в кошелек
      </button>
    </form>
  );
}
