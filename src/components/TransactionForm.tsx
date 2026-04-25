"use client";

import { useState, useMemo, useEffect } from "react";
import { css } from "../../styled-system/css";
import { stack, flex } from "../../styled-system/patterns";
import { ShoppingBag, Users, Save } from "lucide-react";
import SearchableSelect from "./SearchableSelect";
import { createTransaction, updateTransaction } from "@/lib/actions/transactions";
import { useRouter } from "next/navigation";

interface CardOption {
  id: number;
  cardName: string;
  bankName: string;
  lastFour: string | null;
}

interface Merchant {
  id: number;
  name: string;
  mainMcc: string;
  additionalMccs: string;
}

interface MccCode {
  code: string;
  description: string;
}

interface TransactionFormProps {
  cards: CardOption[];
  merchants: Merchant[];
  mccs: MccCode[];
  initialData?: {
    id: number;
    amount: number;
    paidAmount: number | null;
    merchantName: string;
    mccCode: string | null;
    userCardId: number;
    transactionDate: Date;
    manualCashbackAdjustment: number;
  };
}

export default function TransactionForm({ cards, merchants, mccs, initialData }: TransactionFormProps) {
  const router = useRouter();
  const [isSplit, setIsSplit] = useState(initialData ? (initialData.paidAmount !== null && initialData.paidAmount !== initialData.amount) : false);
  const [selectedMerchantName, setSelectedMerchantName] = useState(initialData?.merchantName || "");
  const [selectedMcc, setSelectedMcc] = useState(initialData?.mccCode || "");

  const merchantOptions = useMemo(() => 
    merchants.map(m => ({ value: m.name, label: m.name })), 
    [merchants]
  );

  const selectedMerchant = useMemo(() => 
    merchants.find(m => m.name === selectedMerchantName),
    [merchants, selectedMerchantName]
  );

  const mccOptions = useMemo(() => {
    if (!selectedMerchant) {
      return mccs.map(m => ({ value: m.code, label: `${m.code} — ${m.description}` }));
    }

    const allowedCodes = new Set([
      selectedMerchant.mainMcc,
      ...selectedMerchant.additionalMccs.split(",").map(c => c.trim())
    ]);

    return mccs
      .filter(m => allowedCodes.has(m.code))
      .map(m => ({ value: m.code, label: `${m.code} — ${m.description}` }));
  }, [mccs, selectedMerchant]);

  const handleMerchantChange = (name: string) => {
    setSelectedMerchantName(name);
    const m = merchants.find(merch => merch.name === name);
    if (m) {
      setSelectedMcc(m.mainMcc);
    }
  };

  return (
    <section className="sber-card">
      <div className={flex({ align: "center", gap: "10px", mb: "24px" })}>
        <div className={css({ p: "6px", bg: "#3b82f6", borderRadius: "8px", color: "white" })}>
          <ShoppingBag size={18} />
        </div>
        <h2 className={css({ fontSize: "17px", fontWeight: "700", color: "#000" })}>
          {initialData ? "Редактирование" : "Детали операции"}
        </h2>
      </div>

      <form action={async (formData) => {
        if (initialData) {
          await updateTransaction(initialData.id, formData);
        } else {
          await createTransaction(formData);
        }
        router.push("/transactions");
        router.refresh();
      }} className={stack({ gap: "24px" })}>
        
        {/* Split Check Toggle */}
        <div 
          role="button"
          tabIndex={0}
          onClick={(e) => {
            e.preventDefault();
            setIsSplit(!isSplit);
          }}
          className={flex({ align: "center", gap: "12px", p: "12px", bg: "#f8fafc", borderRadius: "14px", cursor: "pointer", userSelect: "none", WebkitTapHighlightColor: "transparent" })}
        >
          <div className={css({ 
            w: "40px", h: "24px", bg: isSplit ? "sberGreen" : "#cbd5e1", borderRadius: "full", position: "relative", transition: "all 0.2s" 
          })}>
            <div className={css({ 
              position: "absolute", top: "2px", left: isSplit ? "18px" : "2px", w: "20px", h: "20px", bg: "white", borderRadius: "full", shadow: "sm", transition: "all 0.2s" 
            })} />
          </div>
          <div className={flex({ align: "center", gap: "8px" })}>
            <Users size={16} className={css({ color: isSplit ? "sberGreen" : "#64748b" })} />
            <span className={css({ fontSize: "14px", fontWeight: "600", color: "#000" })}>Оплачивал за других (разделить чек)</span>
          </div>
        </div>

        <div className={stack({ gap: "16px" })}>
          {isSplit ? (
            <div className={flex({ gap: "12px" })}>
              <div className={stack({ gap: "6px", flex: 1 })}>
                <label className="sber-label">ОБЩИЙ ЧЕК</label>
                <input 
                  name="paidAmount" 
                  type="number" 
                  step="0.01" 
                  required 
                  defaultValue={initialData?.paidAmount || initialData?.amount || ""}
                  placeholder="700.00"
                  className="sber-input" 
                  style={{ fontSize: "20px", fontWeight: "800" }}
                />
                <p className={css({ fontSize: "10px", color: "secondaryText", ml: "4px" })}>ДЛЯ РАСЧЕТА КЕШБЭКА</p>
              </div>
              <div className={stack({ gap: "6px", flex: 1 })}>
                <label className="sber-label">МОЯ ДОЛЯ</label>
                <input 
                  name="amount" 
                  type="number" 
                  step="0.01" 
                  required 
                  defaultValue={initialData?.amount || ""}
                  placeholder="350.00"
                  className="sber-input" 
                  style={{ fontSize: "20px", fontWeight: "800" }}
                />
                <p className={css({ fontSize: "10px", color: "secondaryText", ml: "4px" })}>ДЛЯ СТАТИСТИКИ ТРАТ</p>
              </div>
            </div>
          ) : (
            <div className={stack({ gap: "6px" })}>
              <label className="sber-label">СУММА (₽)</label>
              <input 
                name="amount" 
                type="number" 
                step="0.01" 
                required 
                defaultValue={initialData?.amount || ""}
                placeholder="0.00"
                className="sber-input" 
                style={{ fontSize: "28px", fontWeight: "800", height: "64px" }}
              />
            </div>
          )}
        </div>

        <div className={stack({ gap: "6px" })}>
          <label className="sber-label">КАРТА</label>
          <select name="userCardId" required defaultValue={initialData?.userCardId || ""} className="sber-select">
            <option value="">Выберите карту...</option>
            {cards.map(card => (
              <option key={card.id} value={card.id}>
                {card.bankName} {card.cardName} {card.lastFour ? `• ${card.lastFour}` : ''}
              </option>
            ))}
          </select>
        </div>

        <div className={stack({ gap: "6px" })}>
          <label className="sber-label">МАГАЗИН / МЕРЧАНТ</label>
          <SearchableSelect 
            name="merchantName"
            options={merchantOptions}
            required
            allowCustom
            defaultValue={initialData?.merchantName}
            placeholder="Выберите торговую точку..."
            onChange={handleMerchantChange}
          />
        </div>

        <div className={stack({ gap: "6px" })}>
          <label className="sber-label">MCC-КОД</label>
          <SearchableSelect 
            name="mccCode"
            options={mccOptions}
            required
            placeholder={selectedMerchantName ? "Выберите MCC из списка магазина..." : "Сначала выберите магазин"}
            value={selectedMcc}
            onChange={setSelectedMcc}
          />
        </div>

        <div className={stack({ gap: "6px" })}>
          <label className="sber-label">ДАТА</label>
          <input 
            name="date" 
            type="date" 
            defaultValue={(initialData?.transactionDate || new Date()).toISOString().split('T')[0]} 
            className="sber-input" 
          />
        </div>

        <div className={stack({ gap: "6px" })}>
          <label className="sber-label">КОРРЕКТИРОВКА КЕШБЭКА (ОПЦИОНАЛЬНО)</label>
          <div className={flex({ align: "center", gap: "10px" })}>
            <input 
              name="manualAdjustment" 
              type="number" 
              step="0.01" 
              defaultValue={initialData?.manualCashbackAdjustment || ""}
              placeholder="+50.00 или -20.00"
              className="sber-input"
              style={{ fontWeight: "700" }}
            />
            <span className={css({ fontSize: "14px", fontWeight: "800", color: "sberGreen" })}>₽</span>
          </div>
          <p className={css({ fontSize: "11px", color: "secondaryText", ml: "4px" })}>
            Добавьте бонусы за сторонние акции или скорректируйте расчет банка
          </p>
        </div>

        <button className="sber-button" style={{ marginTop: "8px" }}>
          {initialData ? <><Save size={18} /> Сохранить изменения</> : "Записать покупку"}
        </button>
      </form>
    </section>
  );
}
