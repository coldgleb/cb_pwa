"use client";

import { useState, useMemo, useTransition, useEffect } from "react";
import { css } from "../../styled-system/css";
import { stack, flex } from "../../styled-system/patterns";
import { ShoppingBag, Users, Save, X, PlusCircle, Calendar, Clock, TrendingUp, ArrowRightLeft } from "lucide-react";
import SearchableSelect from "./SearchableSelect";
import DatePicker from "./DatePicker";
import TimePicker from "./TimePicker";
import { createTransaction, updateTransaction } from "@/lib/actions/transactions";
import { getMerchantMccSuggestions } from "@/lib/actions/merchants";
import { createTransactionTemplate, deleteTransactionTemplate } from "@/lib/actions/transaction-templates";
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
  categoryName: string | null;
  spendingCategoryId: number | null;
}

interface MccCode {
  code: string;
  description: string;
}

interface TransactionTemplate {
  id: number;
  templateName: string;
  amount: number;
  merchantName: string;
  mccCode: string | null;
  userCardId: number | null;
  spendingCategoryId: number | null;
}

interface Option {
  value: string;
  label: string;
}

interface TransactionFormProps {
  cards: CardOption[];
  merchants: Merchant[];
  mccs: MccCode[];
  templates?: TransactionTemplate[];
  spendingCategories?: Option[];
  initialData?: {
    id: number;
    amount: number;
    paidAmount: number | null;
    merchantName: string | null;
    mccCode: string | null;
    userCardId: number;
    toUserCardId?: number | null;
    type?: string | null;
    transactionDate: Date;
    manualCashbackAdjustment: number;
    customCategoryName: string | null;
    spendingCategoryId: number | null;
  };
  initialSplits?: { categoryId: number; amount: number }[];
}

const formatDateForInput = (d: Date, isUTC: boolean) => {
  if (isUTC) return d.toISOString().substring(0, 10);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const formatTimeForInput = (d: Date, isUTC: boolean) => {
  if (isUTC) return d.toISOString().substring(11, 16);
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
};

export default function TransactionForm({ cards, merchants, mccs, templates = [], spendingCategories = [], initialData, initialSplits = [] }: TransactionFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [type, setType] = useState<"expense" | "income" | "transfer">(
    initialData?.type ? (initialData.type as any) : "expense"
  );
  const [selectedToUserCardId, setSelectedToUserCardId] = useState(
    initialData?.toUserCardId?.toString() || ""
  );
  const [isSplit, setIsSplit] = useState(initialData ? (initialData.paidAmount !== null && initialData.paidAmount !== initialData.amount) : false);
  
  // amount is the value for "Сумма" (simple mode) OR "Моя доля" (split mode)
  const [amount, setAmount] = useState<string>(initialData?.amount?.toString() || "");
  // paidAmount is the value for "Общий чек"
  const [paidAmount, setPaidAmount] = useState<string>(initialData?.paidAmount?.toString() || "");
  // storedShare remembers the "Моя доля" value when split is turned off
  const [storedShare, setStoredShare] = useState<string>(initialData?.paidAmount ? initialData.amount.toString() : "");

  const [selectedMerchantName, setSelectedMerchantName] = useState(initialData?.merchantName || "");
  const [selectedMcc, setSelectedMcc] = useState(initialData?.mccCode || "");
  const [selectedSpendingCategoryId, setSelectedSpendingCategoryId] = useState(initialData?.spendingCategoryId?.toString() || "");
  const [splits, setSplits] = useState<{ categoryId: string; amount: string }[]>(
    initialSplits.length > 0 
      ? initialSplits.map(s => ({ categoryId: s.categoryId.toString(), amount: s.amount.toString() }))
      : [{ categoryId: initialData?.spendingCategoryId?.toString() || "", amount: initialData?.amount?.toString() || "" }]
  );
  const [selectedUserCardId, setSelectedUserCardId] = useState(initialData?.userCardId?.toString() || "");
  const [suggestedMccs, setSuggestedMccs] = useState<string[]>([]);
  const [isSearchingMcc, setIsSearchingMcc] = useState(false);
  const [isNewMerchant, setIsNewMerchant] = useState(false);

  const [selectedDate, setSelectedDate] = useState(initialData?.transactionDate ? formatDateForInput(new Date(initialData.transactionDate), true) : formatDateForInput(new Date(), false));
  const [selectedTime, setSelectedTime] = useState(initialData?.transactionDate ? formatTimeForInput(new Date(initialData.transactionDate), true) : formatTimeForInput(new Date(), false));

  const [saveAsTemplate, setSaveAsTemplate] = useState(false);
  const [templateName, setTemplateName] = useState("");

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

  const evaluateExpression = (expr: string): string => {
    try {
      const cleanExpr = expr.replace(/,/g, '.').replace(/[^-+*/.0-9]/g, '');
      if (!cleanExpr) return "";
      // eslint-disable-next-line no-new-func
      const result = new Function(`return ${cleanExpr}`)();
      if (typeof result === 'number' && isFinite(result)) {
        return Math.max(0, result).toFixed(2);
      }
      return expr;
    } catch (e) {
      return expr;
    }
  };

  const handleAmountBlur = (e: React.FocusEvent<HTMLInputElement>, type: "amount" | "paidAmount") => {
    const val = e.target.value.replace(/,/g, '.');
    const hasOperators = val.includes("+") || val.includes("-") || val.includes("*") || val.includes("/");
    
    if (hasOperators) {
      const result = evaluateExpression(val);
      if (type === "amount") setAmount(result);
      else setPaidAmount(result);
    } else {
      // Just format to 2 decimals if it's a number
      const num = parseFloat(val);
      if (!isNaN(num)) {
        const formatted = num.toFixed(2);
        if (type === "amount") setAmount(formatted);
        else setPaidAmount(formatted);
      }
    }
  };

  const handleMerchantChange = async (name: string) => {
    setSelectedMerchantName(name);
    
    const m = merchants.find(merch => merch.name === name);
    if (m) {
      setIsNewMerchant(false);
      setSelectedMcc(m.mainMcc);
      const catId = m.spendingCategoryId?.toString() || "";
      setSelectedSpendingCategoryId(catId);
      
      // Update first split category
      setSplits(prev => {
        const next = [...prev];
        next[0] = { ...next[0], categoryId: catId };
        return next;
      });
      
      setSuggestedMccs([]);
    } else if (name) {
      // New merchant, try to find suggestions
      setIsNewMerchant(true);
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

  const handleTemplateClick = (template: TransactionTemplate) => {
    setAmount(template.amount.toString());
    if (isSplit) setPaidAmount(template.amount.toString());
    setSelectedMerchantName(template.merchantName);
    setSelectedMcc(template.mccCode || "");
    
    const m = merchants.find(merch => merch.name === template.merchantName);
    const catId = m?.spendingCategoryId?.toString() || template.spendingCategoryId?.toString() || "";
    setSelectedSpendingCategoryId(catId);
    
    // Update first split
    setSplits([{ categoryId: catId, amount: template.amount.toString() }]);
    
    if (template.userCardId) setSelectedUserCardId(template.userCardId.toString());
    toast(`Применен шаблон "${template.templateName}"`, "success");
  };

  const addSplit = () => {
    setSplits([...splits, { categoryId: "", amount: "" }]);
  };

  const removeSplit = (index: number) => {
    setSplits(splits.filter((_, i) => i !== index));
  };

  const updateSplit = (index: number, field: "categoryId" | "amount", value: string) => {
    const newSplits = [...splits];
    newSplits[index] = { ...newSplits[index], [field]: value };
    
    // Auto-calculate the first category amount if it's not the one being changed
    // or if we're changing any amount after the first one.
    // The logic is: splits[0].amount = totalAmount - sum(splits[1...n].amount)
    if (index > 0 && field === "amount") {
      const totalAmount = parseFloat(amount) || 0;
      const otherSplitsSum = newSplits.slice(1).reduce((sum, s) => sum + (parseFloat(s.amount) || 0), 0);
      newSplits[0].amount = Math.max(0, totalAmount - otherSplitsSum).toFixed(2);
    }
    
    setSplits(newSplits);
  };

  const handleSplitBlur = (index: number) => {
    const val = splits[index].amount.replace(/,/g, '.');
    const hasOperators = val.includes("+") || val.includes("-") || val.includes("*") || val.includes("/");
    
    if (hasOperators) {
      const result = evaluateExpression(val);
      updateSplit(index, "amount", result);
    } else {
      const num = parseFloat(val);
      if (!isNaN(num)) {
        updateSplit(index, "amount", num.toFixed(2));
      }
    }
  };

  // Re-calculate first split when total amount changes
  useEffect(() => {
    if (splits.length > 0) {
      const newSplits = [...splits];
      const totalAmount = parseFloat(amount) || 0;
      const otherSplitsSum = newSplits.slice(1).reduce((sum, s) => sum + (parseFloat(s.amount) || 0), 0);
      newSplits[0].amount = Math.max(0, totalAmount - otherSplitsSum).toFixed(2);
      setSplits(newSplits);
    }
  }, [amount]);

  const handleDeleteTemplate = async (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    if (!confirm("Удалить этот шаблон?")) return;
    
    startTransition(async () => {
      try {
        await deleteTransactionTemplate(id);
        toast("Шаблон удален", "success");
        router.refresh();
      } catch (error) {
        toast("Ошибка при удалении шаблона", "error");
      }
    });
  };

  async function action(formData: FormData) {
    const dateStr = formData.get("date") as string;
    const timeStr = formData.get("time") as string;
    if (dateStr && timeStr) {
      // Create date in absolute UTC time (floating time)
      const utcDate = new Date(`${dateStr}T${timeStr}Z`);
      formData.append("transactionDateIso", utcDate.toISOString());
    }

    formData.append("type", type);
    if (type === "transfer") {
      formData.append("toUserCardId", selectedToUserCardId);
    }

    if (type === "expense") {
      const totalSplitAmount = splits.reduce((sum, s) => sum + (parseFloat(s.amount) || 0), 0);
      const mainAmount = parseFloat(amount) || 0;
      
      if (Math.abs(totalSplitAmount - mainAmount) > 0.01) {
        toast(`Сумма категорий (${totalSplitAmount.toFixed(2)} ₽) не совпадает с суммой покупки (${mainAmount.toFixed(2)} ₽)`, "error");
        return;
      }

      // New logic: Optional categories with reminder, unless it's a new merchant
      const hasMainCategory = splits.length > 0 && splits[0].categoryId;
      if (!hasMainCategory) {
        if (isNewMerchant) {
          toast("Для нового магазина необходимо выбрать категорию, чтобы она сохранилась как основная", "error");
          return;
        }
        if (!confirm("Вы не выбрали категорию для статистики. Сохранить операцию без категории?")) {
          return;
        }
      }

      // Filter out splits with empty categories
      const validSplits = splits.filter(s => s.categoryId && s.amount);
      
      if (validSplits.length > 0) {
        formData.append("splits", JSON.stringify(validSplits));
        formData.append("spendingCategoryId", validSplits[0].categoryId);
      } else {
        formData.append("splits", "[]");
        formData.append("spendingCategoryId", "");
      }
    } else {
      // Income or transfer
      formData.append("splits", "[]");
      if (type === "income" && selectedSpendingCategoryId) {
        formData.append("spendingCategoryId", selectedSpendingCategoryId);
      } else {
        formData.append("spendingCategoryId", "");
      }
    }

    startTransition(async () => {
      try {
        if (initialData) {
          await updateTransaction(initialData.id, formData);
          toast("Операция успешно обновлена", "success");
          router.push("/transactions");
        } else {
          await createTransaction(formData);
          if (type === "expense" && saveAsTemplate && templateName) {
            const templateData = new FormData();
            templateData.append("templateName", templateName);
            templateData.append("amount", formData.get("amount") as string);
            templateData.append("merchantName", formData.get("merchantName") as string);
            templateData.append("mccCode", formData.get("mccCode") as string);
            templateData.append("userCardId", formData.get("userCardId") as string);
            templateData.append("spendingCategoryId", formData.get("spendingCategoryId") as string);
            await createTransactionTemplate(templateData);
          }
          toast("Операция успешно добавлена", "success");
          
          // Clear most fields, but KEEP card and DATE
          setAmount("");
          setPaidAmount("");
          setStoredShare("");
          setSelectedMerchantName("");
          setSelectedMcc("");
          setSelectedSpendingCategoryId("");
          setSplits([{ categoryId: "", amount: "" }]);
          setIsNewMerchant(false);
          setSuggestedMccs([]);
          setSaveAsTemplate(false);
          setTemplateName("");
          
          // Reset time to current, but keep date
          setSelectedTime(formatTimeForInput(new Date(), false));
          
          const form = document.querySelector('form') as HTMLFormElement;
          if (form) {
            const adjInput = form.querySelector('input[name="manualAdjustment"]') as HTMLInputElement;
            if (adjInput) adjInput.value = "";
          }
        }
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
      <div className={flex({ align: "center", justify: "space-between", mb: "24px" })}>
        <div className={flex({ align: "center", gap: "10px" })}>
          <div className={css({ 
            p: "6px", 
            bg: type === "expense" ? "#3b82f6" : type === "income" ? "sberGreen" : "#f59e0b", 
            borderRadius: "8px", 
            color: "white" 
          })}>
            {type === "expense" && <ShoppingBag size={18} />}
            {type === "income" && <TrendingUp size={18} />}
            {type === "transfer" && <ArrowRightLeft size={18} />}
          </div>
          <h2 className={css({ fontSize: "17px", fontWeight: "700", color: "var(--foreground)" })}>
            {initialData ? "Редактирование" : "Детали операции"}
          </h2>
        </div>
      </div>

      {/* Tabs for operation type */}
      {!initialData && (
        <div className={flex({ gap: "4px", p: "4px", bg: "var(--surface-secondary)", borderRadius: "12px", mb: "24px" })}>
          <button
            type="button"
            onClick={() => {
              setType("expense");
              setIsSplit(false);
            }}
            className={css({
              flex: 1,
              py: "8px",
              fontSize: "14px",
              fontWeight: "700",
              borderRadius: "8px",
              cursor: "pointer",
              transition: "all 0.2s",
              bg: type === "expense" ? "var(--card-bg)" : "transparent",
              color: type === "expense" ? "var(--foreground)" : "var(--secondary-text)",
              border: "none",
              boxShadow: type === "expense" ? "0 2px 8px rgba(0,0,0,0.05)" : "none"
            })}
          >
            Расход
          </button>
          <button
            type="button"
            onClick={() => {
              setType("income");
              setIsSplit(false);
            }}
            className={css({
              flex: 1,
              py: "8px",
              fontSize: "14px",
              fontWeight: "700",
              borderRadius: "8px",
              cursor: "pointer",
              transition: "all 0.2s",
              bg: type === "income" ? "var(--card-bg)" : "transparent",
              color: type === "income" ? "var(--foreground)" : "var(--secondary-text)",
              border: "none",
              boxShadow: type === "income" ? "0 2px 8px rgba(0,0,0,0.05)" : "none"
            })}
          >
            Доход
          </button>
          <button
            type="button"
            onClick={() => {
              setType("transfer");
              setIsSplit(false);
            }}
            className={css({
              flex: 1,
              py: "8px",
              fontSize: "14px",
              fontWeight: "700",
              borderRadius: "8px",
              cursor: "pointer",
              transition: "all 0.2s",
              bg: type === "transfer" ? "var(--card-bg)" : "transparent",
              color: type === "transfer" ? "var(--foreground)" : "var(--secondary-text)",
              border: "none",
              boxShadow: type === "transfer" ? "0 2px 8px rgba(0,0,0,0.05)" : "none"
            })}
          >
            Перевод
          </button>
        </div>
      )}

      {/* Templates Row (Only for Expense) */}
      {type === "expense" && !initialData && templates.length > 0 && (
        <div className={stack({ gap: "8px", mb: "24px" })}>
          <label className="sber-label">БЫСТРЫЙ ВВОД</label>
          <div className={flex({ gap: "8px", wrap: "wrap" })}>
            {templates.map(template => (
              <div 
                key={template.id}
                onClick={() => handleTemplateClick(template)}
                className={flex({ 
                  align: "center", 
                  gap: "6px", 
                  px: "12px", 
                  py: "8px", 
                  bg: "var(--surface-secondary)", 
                  border: "1px solid var(--border-color)", 
                  borderRadius: "20px",
                  cursor: "pointer",
                  transition: "all 0.2s",
                  _hover: { bg: "var(--border-color)" }
                })}
              >
                <span className={css({ fontSize: "13px", fontWeight: "600" })}>{template.templateName}</span>
                <span className={css({ fontSize: "11px", color: "var(--secondary-text)" })}>{template.amount} ₽</span>
                <button 
                  onClick={(e) => handleDeleteTemplate(e, template.id)}
                  className={css({ 
                    p: "2px", 
                    color: "var(--secondary-text)", 
                    _hover: { color: "red.500" } 
                  })}
                >
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <form action={action} className={stack({ gap: "24px" })}>
        
        {/* Split Check Toggle (Only for Expense) */}
        {type === "expense" && (
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
        )}

        {/* Amount input */}
        <div className={stack({ gap: "6px" })}>
          {type === "expense" && isSplit ? (
            <div className={flex({ gap: "12px", wrap: { base: "wrap", sm: "nowrap" } })}>
              <div className={stack({ gap: "6px", flex: 1, minW: "140px" })}>
                <label className="sber-label">ОБЩИЙ ЧЕК</label>
                <input 
                  name="paidAmount" 
                  type="text"
                  inputMode="decimal"
                  required 
                  value={paidAmount}
                  onChange={(e) => setPaidAmount(e.target.value)}
                  onBlur={(e) => handleAmountBlur(e, "paidAmount")}
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
                  type="text"
                  inputMode="decimal"
                  required 
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  onBlur={(e) => handleAmountBlur(e, "amount")}
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
                type="text"
                inputMode="decimal"
                required 
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                onBlur={(e) => handleAmountBlur(e, "amount")}
                placeholder="0.00"
                className="sber-input" 
                style={{ fontSize: "28px", fontWeight: "800", height: "64px" }}
              />
            </div>
          )}
        </div>

        {/* Card Source/Target Selector */}
        <div className={stack({ gap: "6px" })}>
          <label className="sber-label">
            {type === "expense" && "КАРТА / СЧЕТ"}
            {type === "income" && "КАРТА / СЧЕТ ЗАЧИСЛЕНИЯ"}
            {type === "transfer" && "ОТКУДА (КАРТА / СЧЕТ СПИСАНИЯ)"}
          </label>
          <SearchableSelect 
            name="userCardId" 
            required 
            value={selectedUserCardId}
            onChange={setSelectedUserCardId}
            options={cards.map(card => ({
              value: card.id.toString(),
              label: `${card.bankName} ${card.cardName} ${card.lastFour ? `• ${card.lastFour}` : ''}`
            }))}
            placeholder="Выберите карту/счет..."
          />
        </div>

        {/* Transfer Destination Card Selector */}
        {type === "transfer" && (
          <div className={stack({ gap: "6px" })}>
            <label className="sber-label">КУДА (КАРТА / СЧЕТ ЗАЧИСЛЕНИЯ)</label>
            <SearchableSelect 
              name="toUserCardId" 
              required 
              value={selectedToUserCardId}
              onChange={setSelectedToUserCardId}
              options={cards.map(card => ({
                value: card.id.toString(),
                label: `${card.bankName} ${card.cardName} ${card.lastFour ? `• ${card.lastFour}` : ''}`
              }))}
              placeholder="Выберите получателя..."
            />
          </div>
        )}

        {/* Merchant/Sender Field */}
        {(type === "expense" || type === "income") && (
          <div className={stack({ gap: "6px" })}>
            <label className="sber-label">
              {type === "expense" ? "МАГАЗИН / МЕРЧАНТ" : "ОТПРАВИТЕЛЬ / ИСТОЧНИК (ОПЦИОНАЛЬНО)"}
            </label>
            <SearchableSelect 
              name="merchantName"
              options={merchantOptions}
              required={type === "expense"}
              allowCustom
              value={selectedMerchantName}
              placeholder={type === "expense" ? "Выберите торговую точку..." : "Например: Зарплата, Перевод от мамы..."}
              onChange={handleMerchantChange}
            />
          </div>
        )}

        {/* Categories Field */}
        {type === "expense" && (
          <div className={stack({ gap: "6px" })}>
            <label className="sber-label">КАТЕГОРИИ</label>
            
            <div className={stack({ gap: "12px" })}>
              {splits.map((split, index) => (
                <div key={index} className={flex({ gap: "8px", align: "flex-start" })}>
                  <div className={css({ flex: 1 })}>
                    <SearchableSelect 
                      name={`split_cat_${index}`}
                      options={spendingCategories}
                      value={split.categoryId}
                      onChange={(val) => updateSplit(index, "categoryId", val)}
                      placeholder="Категория"
                    />
                  </div>
                  <div className={css({ w: "100px" })}>
                    <input 
                      type="text"
                      inputMode="decimal"
                      value={split.amount}
                      onChange={(e) => updateSplit(index, "amount", e.target.value)}
                      onBlur={() => handleSplitBlur(index)}
                      placeholder="₽"
                      readOnly={index === 0}
                      className="sber-input"
                      style={{ 
                        padding: "12px", 
                        fontSize: "14px",
                        backgroundColor: index === 0 ? "var(--surface-secondary)" : undefined,
                        cursor: index === 0 ? "not-allowed" : "text",
                        opacity: index === 0 ? 0.8 : 1,
                        borderStyle: index === 0 ? "dashed" : "solid"
                      }}
                    />
                  </div>
                  {index > 0 ? (
                    <button 
                      type="button" 
                      onClick={() => removeSplit(index)}
                      className={css({ p: "12px", color: "var(--secondary-text)", _hover: { color: "red.500" }, cursor: "pointer" })}
                    >
                      <X size={20} />
                    </button>
                  ) : (
                    <div className={css({ w: "44px" })} />
                  )}
                </div>
              ))}
              <div className={flex({ justify: "space-between", align: "center" })}>
                <button 
                  type="button" 
                  onClick={addSplit}
                  className={flex({ align: "center", gap: "6px", fontSize: "13px", fontWeight: "700", color: "sberGreen", cursor: "pointer", bg: "transparent", border: "none" })}
                >
                  <PlusCircle size={16} /> ЕЩЕ КАТЕГОРИЯ
                </button>
              </div>
            </div>
            
            <p className={css({ fontSize: "11px", color: "secondaryText", ml: "4px" })}>
              Это ваши личные категории для статистики. Помогают, когда банк ошибся.
            </p>
          </div>
        )}

        {type === "income" && (
          <div className={stack({ gap: "6px" })}>
            <label className="sber-label">КАТЕГОРИЯ ДОХОДА (ОПЦИОНАЛЬНО)</label>
            <SearchableSelect 
              name="spendingCategoryId"
              options={spendingCategories}
              value={selectedSpendingCategoryId}
              onChange={setSelectedSpendingCategoryId}
              placeholder="Выберите категорию дохода..."
            />
          </div>
        )}

        {/* MCC Code (Only for Expense) */}
        {type === "expense" && (
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
        )}

        {/* Date and Time */}
        <div className={flex({ gap: "12px" })}>
          <div className={stack({ gap: "6px", flex: 1 })}>
            <label className="sber-label">ДАТА</label>
            <DatePicker 
              name="date" 
              value={selectedDate}
              onChange={setSelectedDate}
            />
          </div>
          <div className={stack({ gap: "6px", flex: 1 })}>
            <label className="sber-label">ВРЕМЯ</label>
            <TimePicker 
              name="time" 
              value={selectedTime}
              onChange={setSelectedTime}
            />
          </div>
        </div>

        {/* Cashback Adjustment (Only for Expense) */}
        {type === "expense" && (
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
        )}

        {/* Save as Template (Only for Expense) */}
        {type === "expense" && !initialData && (
          <div className={stack({ gap: "12px", p: "16px", bg: "var(--surface-secondary)", borderRadius: "14px", border: "1px dashed var(--border-color)" })}>
            <div 
              onClick={() => setSaveAsTemplate(!saveAsTemplate)}
              className={flex({ align: "center", gap: "8px", cursor: "pointer" })}
            >
              <div className={css({ 
                w: "20px", h: "20px", border: "2px solid", borderColor: saveAsTemplate ? "sberGreen" : "var(--border-color)", 
                borderRadius: "4px", display: "flex", alignItems: "center", justifyContent: "center", bg: saveAsTemplate ? "sberGreen" : "transparent",
                transition: "all 0.2s"
              })}>
                {saveAsTemplate && <PlusCircle size={14} color="white" />}
              </div>
              <span className={css({ fontSize: "14px", fontWeight: "600" })}>Сохранить как шаблон</span>
            </div>
            
            {saveAsTemplate && (
              <div className={stack({ gap: "6px" })}>
                <label className="sber-label">НАЗВАНИЕ ШАБЛОНА</label>
                <input 
                  type="text" 
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                  placeholder="Например: Метро или Кофе" 
                  className="sber-input"
                />
              </div>
            )}
          </div>
        )}

        <button type="submit" className="sber-button" style={{ marginTop: "8px" }} disabled={isPending}>
          {isPending ? "Сохранение..." : (initialData ? <><Save size={18} /> Сохранить изменения</> : (
            type === "expense" ? "Записать расход" : type === "income" ? "Записать доход" : "Записать перевод"
          ))}
        </button>
      </form>
    </section>
  );
}
