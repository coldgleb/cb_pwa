"use client";

import { useState, useMemo, useTransition } from "react";
import { css } from "../../styled-system/css";
import { stack, flex } from "../../styled-system/patterns";
import { ShoppingBag, Users, Save } from "lucide-react";
import SearchableSelect from "./SearchableSelect";
import { createTransaction, updateTransaction } from "@/lib/actions/transactions";
import { getMerchantMccSuggestions } from "@/lib/actions/merchants";
import { useRouter } from "next/navigation";
import { useToast } from "./Toast";

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
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [isSplit, setIsSplit] = useState(initialData ? (initialData.paidAmount !== null && initialData.paidAmount !== initialData.amount) : false);
  
  // amount is the value for "Сумма" (simple mode) OR "Моя доля" (split mode)
  const [amount, setAmount] = useState<string>(initialData?.amount?.toString() || "");
  // paidAmount is the value for "Общий чек"
  const [paidAmount, setPaidAmount] = useState<string>(initialData?.paidAmount?.toString() || "");
  // storedShare remembers the "Моя доля" value when split is turned off
  const [storedShare, setStoredShare] = useState<string>(initialData?.paidAmount ? initialData.amount.toString() : "");

  const [selectedMerchantName, setSelectedMerchantName] = useState(initialData?.merchantName || "");
  const [selectedMcc, setSelectedMcc] = useState(initialData?.mccCode || "");
  const [suggestedMccs, setSuggestedMccs] = useState<string[]>([]);
  const [isSearchingMcc, setIsSearchingMcc] = useState(false);

  const merchantOptions = useMemo(() => 
    merchants.map(m => ({ value: m.name, label: m.name })), 
    [merchants]
  );

  const selectedMerchant = useMemo(() => 
    merchants.find(m => m.name === selectedMerchantName),
    [merchants, selectedMerchantName]
  );

  const mccOptions = useMemo(() => {
    let allowedCodes: Set<string> | null = null;

    if (selectedMerchant) {
      allowedCodes = new Set([
        selectedMerchant.mainMcc,
        ...selectedMerchant.additionalMccs.split(",").map(c => c.trim())
      ]);
    } else if (suggestedMccs.length > 0) {
      allowedCodes = new Set(suggestedMccs);
    }

    if (!allowedCodes) {
      return mccs.map(m => ({ value: m.code, label: `${m.code} — ${m.description}` }));
    }

    return mccs
      .filter(m => allowedCodes!.has(m.code))
      .map(m => ({ value: m.code, label: `${m.code} — ${m.description}` }));
  }, [mccs, selectedMerchant, suggestedMccs]);

  const handleMerchantChange = async (name: string) => {
    setSelectedMerchantName(name);
    
    const m = merchants.find(merch => merch.name === name);
    if (m) {
      setSelectedMcc(m.mainMcc);
      setSuggestedMccs([]);
    } else if (name) {
      // New merchant, try to find suggestions
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
    }
  };

  async function action(formData: FormData) {
    startTransition(async () => {
      try {
        if (initialData) {
          await updateTransaction(initialData.id, formData);
          toast("Операция успешно обновлена", "success");
        } else {
          await createTransaction(formData);
          toast("Операция успешно добавлена", "success");
        }
        router.push("/transactions");
        router.refresh();
      } catch (error) {
        toast(error instanceof Error ? error.message : "Произошла ошибка", "error");
      }
    });
  }

  const toggleSplit = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!isSplit) {
      // Turning split ON
      // "Сумма" goes to "Общий чек"
      setPaidAmount(amount);
      // "Моя доля" gets stored value (empty or previous entry)
      setAmount(storedShare);
    } else {
      // Turning split OFF
      // Save current "Моя доля" for later
      setStoredShare(amount);
      // "Общий чек" becomes "Сумма"
      setAmount(paidAmount);
    }
    setIsSplit(!isSplit);
  };

  return (
    <section className="sber-card">
      <div className={flex({ align: "center", gap: "10px", mb: "24px" })}>
        <div className={css({ p: "6px", bg: "#3b82f6", borderRadius: "8px", color: "white" })}>
          <ShoppingBag size={18} />
        </div>
        <h2 className={css({ fontSize: "17px", fontWeight: "700", color: "var(--foreground)" })}>
          {initialData ? "Редактирование" : "Детали операции"}
        </h2>
      </div>

      <form action={action} className={stack({ gap: "24px" })}>
        
        {/* Split Check Toggle */}
        <div 
          role="button"
          tabIndex={0}
          onClick={toggleSplit}
          className={flex({ 
            align: "center", 
            gap: "12px", 
            p: "12px", 
            bg: "var(--surface-secondary)", 
            border: "1px solid",
            borderColor: "var(--border-color)",
            borderRadius: "14px", 
            cursor: "pointer", 
            userSelect: "none", 
            WebkitTapHighlightColor: "transparent",
            wrap: "wrap" 
          })}
        >
          <div className={css({ 
            w: "40px", h: "24px", bg: isSplit ? "sberGreen" : "#cbd5e1", borderRadius: "full", position: "relative", transition: "all 0.2s", flexShrink: 0
          })}>
            <div className={css({ 
              position: "absolute", top: "2px", left: isSplit ? "18px" : "2px", w: "20px", h: "20px", bg: "white", borderRadius: "full", shadow: "sm", transition: "all 0.2s" 
            })} />
          </div>
          <div className={flex({ align: "center", gap: "8px", flex: 1, minW: "200px" })}>
            <Users size={16} className={css({ color: isSplit ? "sberGreen" : "#64748b" })} />
            <span className={css({ fontSize: "14px", fontWeight: "600", color: "var(--foreground)" })}>Оплачивал за других (разделить чек)</span>
          </div>
        </div>

        <div className={stack({ gap: "16px" })}>
          {isSplit ? (
            <div className={flex({ gap: "12px", wrap: { base: "wrap", sm: "nowrap" } })}>
              <div className={stack({ gap: "6px", flex: 1, minW: "140px" })}>
                <label className="sber-label">ОБЩИЙ ЧЕК</label>
                <input 
                  name="paidAmount" 
                  type="number" 
                  step="0.01" 
                  required 
                  value={paidAmount}
                  onChange={(e) => setPaidAmount(e.target.value)}
                  placeholder="700.00"
                  className="sber-input" 
                  style={{ fontSize: "20px", fontWeight: "800" }}
                />
                <p className={css({ fontSize: "10px", color: "var(--secondary-text)", ml: "4px" })}>ДЛЯ РАСЧЕТА КЕШБЭКА</p>
              </div>
              <div className={stack({ gap: "6px", flex: 1, minW: "140px" })}>
                <label className="sber-label">МОЯ ДОЛЯ</label>
                <input 
                  name="amount" 
                  type="number" 
                  step="0.01" 
                  required 
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="350.00"
                  className="sber-input" 
                  style={{ fontSize: "20px", fontWeight: "800" }}
                />
                <p className={css({ fontSize: "10px", color: "var(--secondary-text)", ml: "4px" })}>ДЛЯ СТАТИСТИКИ ТРАТ</p>
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
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="sber-input" 
                style={{ fontSize: "28px", fontWeight: "800", height: "64px" }}
              />
            </div>
          )}
        </div>



        <div className={stack({ gap: "6px" })}>
          <label className="sber-label">КАРТА</label>
          <SearchableSelect 
            name="userCardId" 
            required 
            defaultValue={initialData?.userCardId?.toString() || ""} 
            options={cards.map(card => ({
              value: card.id.toString(),
              label: `${card.bankName} ${card.cardName} ${card.lastFour ? `• ${card.lastFour}` : ''}`
            }))}
            placeholder="Выберите карту..."
          />
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
            placeholder={isSearchingMcc ? "Ищем подходящие коды..." : (selectedMerchantName ? "Выберите MCC из списка магазина..." : "Сначала выберите магазин")}
            value={selectedMcc}
            onChange={setSelectedMcc}
            disabled={isSearchingMcc}
          />
        </div>

        <div className={flex({ gap: "12px" })}>
          <div className={stack({ gap: "6px", flex: 1 })}>
            <label className="sber-label">ДАТА</label>
            <input 
              name="date" 
              type="date" 
              defaultValue={(initialData?.transactionDate || new Date()).toISOString().split('T')[0]} 
              className="sber-input" 
            />
          </div>
          <div className={stack({ gap: "6px", flex: 1 })}>
            <label className="sber-label">ВРЕМЯ</label>
            <input 
              name="time" 
              type="time" 
              defaultValue={initialData?.transactionDate 
                ? new Date(initialData.transactionDate).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit', hour12: false })
                : new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit', hour12: false })
              } 
              className="sber-input" 
            />
          </div>
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

        <button type="submit" className="sber-button" style={{ marginTop: "8px" }} disabled={isPending}>
          {isPending ? "Сохранение..." : (initialData ? <><Save size={18} /> Сохранить изменения</> : "Записать покупку")}
        </button>
      </form>
    </section>
  );
}

