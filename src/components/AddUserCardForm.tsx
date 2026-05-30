"use client";

import { useState, useMemo, useTransition } from "react";
import { css } from "../../styled-system/css";
import { stack } from "../../styled-system/patterns";

import SearchableSelect from "./SearchableSelect";
import { addUserCard } from "@/lib/actions/user-cards";
import { useToast } from "./Toast";
import { useRouter } from "next/navigation";

interface Bank {
  id: number;
  name: string;
}

interface CardType {
  id: number;
  bankId: number;
  name: string;
  accountType: string;
}

interface AddUserCardFormProps {
  banks: Bank[];
  cardTypes: CardType[];
}

export default function AddUserCardForm({ banks, cardTypes }: AddUserCardFormProps) {
  const [selectedBankId, setSelectedBankId] = useState<string>("");
  const [selectedCardId, setSelectedCardId] = useState<string>("");
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();
  const router = useRouter();

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

  const selectedCardType = useMemo(() => 
    cardTypes.find(ct => ct.id === parseInt(selectedCardId)),
    [cardTypes, selectedCardId]
  );

  const isCredit = selectedCardType?.accountType === "credit";

  async function action(formData: FormData) {
    startTransition(async () => {
      try {
        await addUserCard(formData);
        toast("Карта успешно добавлена", "success");
        router.push("/cards");
      } catch (error) {
        toast(error instanceof Error ? error.message : "Ошибка при добавлении карты", "error");
      }
    });
  }

  return (
    <form action={action} className={stack({ gap: "20px" })}>
      <input type="hidden" name="accountType" value={selectedCardType?.accountType || "debit"} />

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

      {isCredit && (
        <div className={stack({ gap: "6px" })}>
          <label className="sber-label">КРЕДИТНЫЙ ЛИМИТ (₽)</label>
          <input 
            name="creditLimit" 
            type="number" 
            step="0.01" 
            placeholder="50000.00" 
            className="sber-input" 
            style={{ fontWeight: "700" }}
          />
        </div>
      )}

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

      <div className={stack({ gap: "6px" })}>
        <label className="sber-label">НАЧАЛЬНЫЙ БАЛАНС (₽)</label>
        <input 
          name="initialBalance" 
          type="number" 
          step="0.01" 
          placeholder={isCredit ? "-5000.00" : "0.00"} 
          className="sber-input" 
          style={{ fontWeight: "700" }}
        />
        {isCredit && (
          <span className={css({ fontSize: "11px", color: "var(--secondary-text)", fontWeight: "500" })}>
            Укажите отрицательный баланс, если по карте есть задолженность (например, -15000)
          </span>
        )}
      </div>


      <button 
        type="submit" 
        className="sber-button"
        disabled={!selectedCardId || isPending}
        style={{ opacity: !selectedCardId || isPending ? 0.6 : 1 }}
      >
        {isPending ? "Добавление..." : "Добавить в кошелек"}
      </button>
    </form>
  );
}
