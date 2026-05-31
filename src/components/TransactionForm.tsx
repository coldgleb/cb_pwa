"use client";

import { useState, useMemo, useTransition, useEffect } from "react";
import { css } from "../../styled-system/css";
import { stack, flex } from "../../styled-system/patterns";
import { ShoppingBag, Users, Save, X, PlusCircle, Calendar, Clock, TrendingUp, ArrowRightLeft, Landmark, Percent } from "lucide-react";
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
  
  const [isSplit, setIsSplit] = useState(initialData ? (initialData.paidAmount !== null && initialData.paidAmount !== initialData.amount) : false);
  
  // paidAmount is the total bill (used for cashback)
  const [paidAmount, setPaidAmount] = useState<string>(initialData?.paidAmount?.toString() || initialData?.amount?.toString() || "");
  // othersShare is the part to deduct
  const [othersShare, setOthersShare] = useState<string>(
    (initialData?.paidAmount && initialData?.amount) 
      ? Math.max(0, initialData.paidAmount - initialData.amount).toFixed(2) 
      : ""
  );
  // amount is the net share (used for statistics)
  const [amount, setAmount] = useState<string>(initialData?.amount?.toString() || "");

  const [selectedMerchantName, setSelectedMerchantName] = useState(initialData?.merchantName || "");
  const [selectedMcc, setSelectedMcc] = useState(initialData?.mccCode || "");
  const [selectedSpendingCategoryId, setSelectedSpendingCategoryId] = useState(initialData?.spendingCategoryId?.toString() || "");
  const [splits, setSplits] = useState<{ categoryId: string; amount: string }[]>(
    initialSplits.length > 0 
      ? initialSplits.map(s => ({ categoryId: s.categoryId.toString(), amount: s.amount.toString() }))
      : [{ categoryId: initialData?.spendingCategoryId?.toString() || "", amount: initialData?.amount?.toString() || "" }]
  );
  const [selectedUserCardId, setSelectedUserCardId] = useState(initialData?.userCardId?.toString() || "");
  const [selectedToUserCardId, setSelectedToUserCardId] = useState(initialData?.toUserCardId?.toString() || "");
  
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
        return Math.max(0, Math.round(result * 100) / 100).toString();
      }
      return expr;
    } catch (e) {
      return expr;
    }
  };

  const handleAmountBlur = (e: React.FocusEvent<HTMLInputElement>, field: "paidAmount" | "othersShare" | "amount") => {
    const val = e.target.value.replace(/,/g, '.');
    const evaluated = evaluateExpression(val);
    
    if (field === "paidAmount") {
      setPaidAmount(evaluated);
      if (!isSplit) {
        setAmount(evaluated);
      } else {
        const total = parseFloat(evaluated) || 0;
        const others = parseFloat(othersShare) || 0;
        setAmount(Math.max(0, total - others).toFixed(2));
      }
    } else if (field === "othersShare") {
      setOthersShare(evaluated);
      const total = parseFloat(paidAmount) || 0;
      const others = parseFloat(evaluated) || 0;
      setAmount(Math.max(0, total - others).toFixed(2));
    } else {
      setAmount(evaluated);
    }
  };

  // Update amount when paidAmount or othersShare changes in split mode
  useEffect(() => {
    if (isSplit) {
      const total = parseFloat(paidAmount) || 0;
      const others = parseFloat(othersShare) || 0;
      setAmount(Math.max(0, total - others).toFixed(2));
    }
  }, [paidAmount, othersShare, isSplit]);

  const toggleSplit = (e: React.MouseEvent) => {
    e.preventDefault();
    if (isSplit) {
      setAmount(paidAmount);
      setOthersShare("");
    }
    setIsSplit(!isSplit);
  };

  const handleMerchantChange = async (name: string) => {
    setSelectedMerchantName(name);
    
    const m = merchants.find(merch => merch.name === name);
    if (m) {
      setIsNewMerchant(false);
      setSelectedMcc(m.mainMcc);
      const catId = m.spendingCategoryId?.toString() || "";
      setSelectedSpendingCategoryId(catId);
      
      setSplits(prev => {
        const next = [...prev];
        next[0] = { ...next[0], categoryId: catId };
        return next;
      });
      
      setSuggestedMccs([]);
    } else if (name) {
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
    setPaidAmount(template.amount.toString());
    setSelectedMerchantName(template.merchantName);
    setSelectedMcc(template.mccCode || "");
    
    const m = merchants.find(merch => merch.name === template.merchantName);
    const catId = m?.spendingCategoryId?.toString() || template.spendingCategoryId?.toString() || "";
    setSelectedSpendingCategoryId(catId);
    
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
    
    if (index > 0 && field === "amount") {
      const totalAmount = parseFloat(amount) || 0;
      const otherSplitsSum = newSplits.slice(1).reduce((sum, s) => sum + (parseFloat(s.amount) || 0), 0);
      newSplits[0].amount = Math.max(0, totalAmount - otherSplitsSum).toFixed(2);
    }
    
    setSplits(newSplits);
  };

  const handleSplitBlur = (index: number) => {
    const val = splits[index].amount.replace(/,/g, '.');
    const evaluated = evaluateExpression(val);
    updateSplit(index, "amount", evaluated);
  };

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

      const validSplits = splits.filter(s => s.categoryId && s.amount);
      if (validSplits.length > 0) {
        formData.append("splits", JSON.stringify(validSplits));
        formData.append("spendingCategoryId", validSplits[0].categoryId);
      } else {
        formData.append("splits", "[]");
        formData.append("spendingCategoryId", "");
      }
    } else {
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
          
          setAmount("");
          setPaidAmount("");
          setOthersShare("");
          setSelectedMerchantName("");
          setSelectedMcc("");
          setSelectedSpendingCategoryId("");
          setSplits([{ categoryId: "", amount: "" }]);
          setIsNewMerchant(false);
          setSuggestedMccs([]);
          setSaveAsTemplate(false);
          setTemplateName("");
          setSelectedTime(formatTimeForInput(new Date(), false));
        }
        router.refresh();
      } catch (error) {
        toast(error instanceof Error ? error.message : "Произошла ошибка", "error");
      }
    });
  }

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

      {!initialData && (
        <div className={flex({ gap: "4px", p: "4px", bg: "var(--surface-secondary)", borderRadius: "12px", mb: "24px" })}>
          <button
            type="button"
            onClick={() => { setType("expense"); setIsSplit(false); }}
            className={css({
              flex: 1, py: "8px", fontSize: "14px", fontWeight: "700", borderRadius: "8px", cursor: "pointer", transition: "all 0.2s",
              bg: type === "expense" ? "var(--card-bg)" : "transparent",
              color: type === "expense" ? "var(--foreground)" : "var(--secondary-text)",
              border: "none", boxShadow: type === "expense" ? "0 2px 8px rgba(0,0,0,0.05)" : "none"
            })}
          >
            Расход
          </button>
          <button
            type="button"
            onClick={() => { setType("income"); setIsSplit(false); }}
            className={css({
              flex: 1, py: "8px", fontSize: "14px", fontWeight: "700", borderRadius: "8px", cursor: "pointer", transition: "all 0.2s",
              bg: type === "income" ? "var(--card-bg)" : "transparent",
              color: type === "income" ? "var(--foreground)" : "var(--secondary-text)",
              border: "none", boxShadow: type === "income" ? "0 2px 8px rgba(0,0,0,0.05)" : "none"
            })}
          >
            Доход
          </button>
          <button
            type="button"
            onClick={() => { setType("transfer"); setIsSplit(false); }}
            className={css({
              flex: 1, py: "8px", fontSize: "14px", fontWeight: "700", borderRadius: "8px", cursor: "pointer", transition: "all 0.2s",
              bg: type === "transfer" ? "var(--card-bg)" : "transparent",
              color: type === "transfer" ? "var(--foreground)" : "var(--secondary-text)",
              border: "none", boxShadow: type === "transfer" ? "0 2px 8px rgba(0,0,0,0.05)" : "none"
            })}
          >
            Перевод
          </button>
        </div>
      )}

      {type === "expense" && !initialData && templates.length > 0 && (
        <div className={stack({ gap: "8px", mb: "24px" })}>
          <label className="sber-label">БЫСТРЫЙ ВВОД</label>
          <div className={flex({ gap: "8px", wrap: "wrap" })}>
            {templates.map(template => (
              <div 
                key={template.id}
                onClick={() => handleTemplateClick(template)}
                className={flex({ 
                  align: "center", gap: "6px", px: "12px", py: "8px", bg: "var(--surface-secondary)", border: "1px solid var(--border-color)", borderRadius: "20px", cursor: "pointer", transition: "all 0.2s", _hover: { bg: "var(--border-color)" }
                })}
              >
                <span className={css({ fontSize: "13px", fontWeight: "600" })}>{template.templateName}</span>
                <span className={css({ fontSize: "11px", color: "var(--secondary-text)" })}>{template.amount} ₽</span>
                <button onClick={(e) => handleDeleteTemplate(e, template.id)} className={css({ p: "2px", color: "var(--secondary-text)", _hover: { color: "red.500" } })}>
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <form action={action} className={stack({ gap: "24px" })}>
        
        {type === "expense" && (
          <div 
            role="button"
            tabIndex={0}
            onClick={toggleSplit}
            className={flex({ 
              align: "center", gap: "12px", p: "12px", bg: "var(--surface-secondary)", border: "1px solid", borderColor: "var(--border-color)", borderRadius: "14px", cursor: "pointer", userSelect: "none", WebkitTapHighlightColor: "transparent", wrap: "wrap" 
            })}
          >
            <div className={css({ w: "40px", h: "24px", bg: isSplit ? "sberGreen" : "#cbd5e1", borderRadius: "full", position: "relative", transition: "all 0.2s", flexShrink: 0 })}>
              <div className={css({ position: "absolute", top: "2px", left: isSplit ? "18px" : "2px", w: "20px", h: "20px", bg: "white", borderRadius: "full", shadow: "sm", transition: "all 0.2s" })} />
            </div>
            <div className={flex({ align: "center", gap: "8px", flex: 1, minW: "200px" })}>
              <Users size={16} className={css({ color: isSplit ? "sberGreen" : "#64748b" })} />
              <span className={css({ fontSize: "14px", fontWeight: "600", color: "var(--foreground)" })}>Оплачивал за других (разделить чек)</span>
            </div>
          </div>
        )}

        <div className={stack({ gap: "16px" })}>
          {type === "expense" && isSplit ? (
            <div className={stack({ gap: "12px" })}>
              <div className={stack({ gap: "6px" })}>
                <label className="sber-label">Общая сумма чека (для кешбэка)</label>
                <input 
                  name="paidAmount" type="text" inputMode="decimal" required value={paidAmount}
                  onChange={(e) => setPaidAmount(e.target.value)}
                  onBlur={(e) => handleAmountBlur(e, "paidAmount")}
                  placeholder="1000.00" className="sber-input" style={{ fontSize: "20px", fontWeight: "800" }}
                />
              </div>
              <div className={flex({ gap: "12px", align: "flex-end" })}>
                <div className={stack({ gap: "6px", flex: 1 })}>
                  <label className="sber-label">Из них за других (вычет)</label>
                  <div className={css({ position: "relative" })}>
                    <span className={css({ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)", fontWeight: "800", color: "#ef4444" })}>-</span>
                    <input 
                      name="othersShare" type="text" inputMode="decimal" value={othersShare}
                      onChange={(e) => setOthersShare(e.target.value)}
                      onBlur={(e) => handleAmountBlur(e, "othersShare")}
                      placeholder="0.00" className="sber-input" style={{ paddingLeft: "32px", fontSize: "18px", fontWeight: "700", color: "#ef4444" }}
                    />
                  </div>
                </div>
                <div className={stack({ gap: "6px", flex: 1 })}>
                  <label className="sber-label">Моя доля (в статистику)</label>
                  <div className={css({ p: "16px 18px", bg: "var(--surface-secondary)", borderRadius: "12px", border: "1px dashed var(--border-color)", minH: "56px", display: "flex", alignItems: "center" })}>
                    <span className={css({ fontSize: "20px", fontWeight: "900", color: "var(--foreground)" })}>{amount} ₽</span>
                  </div>
                  <input type="hidden" name="amount" value={amount} />
                </div>
              </div>
            </div>
          ) : (
            <div className={stack({ gap: "6px" })}>
              <label className="sber-label">Сумма (₽)</label>
              <input 
                name="amount" type="text" inputMode="decimal" required value={amount}
                onChange={(e) => setAmount(e.target.value)}
                onBlur={(e) => handleAmountBlur(e, "amount")}
                placeholder="0.00" className="sber-input" style={{ fontSize: "28px", fontWeight: "800", height: "64px" }}
              />
            </div>
          )}
        </div>

        <div className={stack({ gap: "6px" })}>
          <label className="sber-label">
            {type === "expense" && "КАРТА / СЧЕТ"}
            {type === "income" && "КАРТА / СЧЕТ ЗАЧИСЛЕНИЯ"}
            {type === "transfer" && "ОТКУДА (КАРТА / СЧЕТ СПИСАНИЯ)"}
          </label>
          <SearchableSelect 
            name="userCardId" required value={selectedUserCardId} onChange={setSelectedUserCardId}
            options={cards.map(card => ({ value: card.id.toString(), label: `${card.bankName} ${card.cardName} ${card.lastFour ? `• ${card.lastFour}` : ''}` }))}
            placeholder="Выберите карту/счет..."
          />
        </div>

        {type === "transfer" && (
          <div className={stack({ gap: "6px" })}>
            <label className="sber-label">КУДА (КАРТА / СЧЕТ ЗАЧИСЛЕНИЯ)</label>
            <SearchableSelect 
              name="toUserCardId" required value={selectedToUserCardId} onChange={setSelectedToUserCardId}
              options={cards.map(card => ({ value: card.id.toString(), label: `${card.bankName} ${card.cardName} ${card.lastFour ? `• ${card.lastFour}` : ''}` }))}
              placeholder="Выберите получателя..."
            />
          </div>
        )}

        {(type === "expense" || type === "income") && (
          <div className={stack({ gap: "6px" })}>
            <label className="sber-label">{type === "expense" ? "МАГАЗИН / МЕРЧАНТ" : "ОТПРАВИТЕЛЬ / ИСТОЧНИК (ОПЦИОНАЛЬНО)"}</label>
            <SearchableSelect 
              name="merchantName" options={merchantOptions} required={type === "expense"} allowCustom value={selectedMerchantName}
              placeholder={type === "expense" ? "Выберите торговую точку..." : "Например: Зарплата, Перевод от мамы..."}
              onChange={handleMerchantChange}
            />
          </div>
        )}

        {type === "expense" && (
          <div className={stack({ gap: "6px" })}>
            <label className="sber-label">КАТЕГОРИИ</label>
            <div className={stack({ gap: "12px" })}>
              {splits.map((split, index) => (
                <div key={index} className={flex({ gap: "8px", align: "flex-start" })}>
                  <div className={css({ flex: 1 })}>
                    <SearchableSelect 
                      name={`split_cat_${index}`} options={spendingCategories} value={split.categoryId}
                      onChange={(val) => updateSplit(index, "categoryId", val)} placeholder="Категория"
                    />
                  </div>
                  <div className={css({ w: "100px" })}>
                    <input 
                      type="text" inputMode="decimal" value={split.amount}
                      onChange={(e) => updateSplit(index, "amount", e.target.value)}
                      onBlur={() => handleSplitBlur(index)} placeholder="₽" readOnly={index === 0}
                      className="sber-input"
                      style={{ padding: "12px", fontSize: "14px", backgroundColor: index === 0 ? "var(--surface-secondary)" : undefined, cursor: index === 0 ? "not-allowed" : "text", opacity: index === 0 ? 0.8 : 1, borderStyle: index === 0 ? "dashed" : "solid" }}
                    />
                  </div>
                  {index > 0 ? (
                    <button type="button" onClick={() => removeSplit(index)} className={css({ p: "12px", color: "var(--secondary-text)", _hover: { color: "red.500" }, cursor: "pointer" })}>
                      <X size={20} />
                    </button>
                  ) : <div className={css({ w: "44px" })} />}
                </div>
              ))}
              <div className={flex({ justify: "space-between", align: "center" })}>
                <button type="button" onClick={addSplit} className={flex({ align: "center", gap: "6px", fontSize: "13px", fontWeight: "700", color: "sberGreen", cursor: "pointer", bg: "transparent", border: "none" })}>
                  <PlusCircle size={16} /> ЕЩЕ КАТЕГОРИЯ
                </button>
              </div>
            </div>
            <p className={css({ fontSize: "11px", color: "secondaryText", ml: "4px" })}>Это ваши личные категории для статистики. Помогают, когда банк ошибся.</p>
          </div>
        )}

        {type === "income" && (
          <div className={stack({ gap: "6px" })}>
            <label className="sber-label">КАТЕГОРИЯ ДОХОДА (ОПЦИОНАЛЬНО)</label>
            <SearchableSelect 
              name="spendingCategoryId" options={spendingCategories} value={selectedSpendingCategoryId}
              onChange={setSelectedSpendingCategoryId} placeholder="Выберите категорию дохода..."
            />
          </div>
        )}

        {type === "expense" && (
          <div className={stack({ gap: "6px" })}>
            <label className="sber-label">MCC-КОД</label>
            <SearchableSelect 
              name="mccCode" options={mccOptions} required 
              placeholder={isSearchingMcc ? "Ищем подходящие коды..." : (selectedMerchantName ? "Выберите MCC из списка магазина..." : "Сначала выберите магазин")}
              value={selectedMcc} onChange={setSelectedMcc} disabled={isSearchingMcc}
            />
          </div>
        )}

        <div className={flex({ gap: "12px" })}>
          <div className={stack({ gap: "6px", flex: 1 })}>
            <label className="sber-label">ДАТА</label>
            <DatePicker name="date" value={selectedDate} onChange={setSelectedDate} />
          </div>
          <div className={stack({ gap: "6px", flex: 1 })}>
            <label className="sber-label">ВРЕМЯ</label>
            <TimePicker name="time" value={selectedTime} onChange={setSelectedTime} />
          </div>
        </div>

        {type === "expense" && (
          <div className={stack({ gap: "6px" })}>
            <label className="sber-label">КОРРЕКТИРОВКА КЕШБЭКА (ОПЦИОНАЛЬНО)</label>
            <div className={flex({ align: "center", gap: "10px" })}>
              <input 
                name="manualAdjustment" type="number" step="0.01" defaultValue={initialData?.manualCashbackAdjustment || ""}
                placeholder="+50.00 или -20.00" className="sber-input" style={{ fontWeight: "700" }}
              />
              <span className={css({ fontSize: "14px", fontWeight: "800", color: "sberGreen" })}>₽</span>
            </div>
            <p className={css({ fontSize: "11px", color: "secondaryText", ml: "4px" })}>Добавьте бонусы за сторонние акции или скорректируйте расчет банка</p>
          </div>
        )}

        {type === "expense" && !initialData && (
          <div className={stack({ gap: "12px", p: "16px", bg: "var(--surface-secondary)", borderRadius: "14px", border: "1px dashed var(--border-color)" })}>
            <div onClick={() => setSaveAsTemplate(!saveAsTemplate)} className={flex({ align: "center", gap: "8px", cursor: "pointer" })}>
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
                <input type="text" value={templateName} onChange={(e) => setTemplateName(e.target.value)} placeholder="Например: Метро или Кофе" className="sber-input" />
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
