"use client";

import { useState } from "react";
import { css } from "../../../styled-system/css";
import { stack, flex } from "../../../styled-system/patterns";
import { Plus, Search, Loader2 } from "lucide-react";
import SearchableSelect from "@/components/SearchableSelect";
import AdminFormWrapper from "./AdminFormWrapper";
import FindWebsiteButtonWrapper from "./FindWebsiteButtonWrapper";
import { createMerchant, getMerchantMccSuggestions } from "@/lib/actions/merchants";

interface AddMerchantFormProps {
  mccOptions: { value: string; label: string }[];
  categoryOptions: { value: string; label: string }[];
  isModal?: boolean;
  onSuccess?: () => void;
}

export default function AddMerchantForm({ mccOptions, categoryOptions, isModal = false, onSuccess }: AddMerchantFormProps) {
  const [isSearching, setIsSearching] = useState(false);
  const [overrides, setOverrides] = useState<{ mainMcc?: string, additionalMccs?: string } | null>(null);

  const handleAutoSearch = async () => {
    const nameInput = document.getElementById(isModal ? "new-merch-name-modal" : "new-merch-name") as HTMLInputElement;
    const name = nameInput?.value;
    if (!name) return;

    setIsSearching(true);
    try {
      const result = await getMerchantMccSuggestions(name);
      if (result) {
        setOverrides({
          mainMcc: result.mainMcc,
          additionalMccs: result.additionalMccs
        });
      }
    } finally {
      setIsSearching(false);
    }
  };

  const formContent = (
    <AdminFormWrapper 
      action={async (formData) => {
          await createMerchant(formData);
          setOverrides(null);
          if (onSuccess) onSuccess();
      }} 
      successMessage="Мерчант успешно добавлен" 
      className={stack({ gap: "20px" })}
      id={isModal ? "add-merch-form-modal" : "add-merch-form"}
    >
      <div className={stack({ gap: "6px" })}>
        <label className="sber-label">НАЗВАНИЕ ТОРГОВОЙ ТОЧКИ</label>
        <div className={flex({ align: "center", gap: "10px" })}>
          <input
            id={isModal ? "new-merch-name-modal" : "new-merch-name"}
            name="name"
            type="text"
            required
            placeholder="Например, Ozon"
            className="sber-input"
          />
          <button
            type="button"
            onClick={handleAutoSearch}
            disabled={isSearching}
            className={css({ p: "12px", bg: "var(--card-bg)", borderRadius: "14px", border: "1px solid var(--border-color)", color: "var(--secondary-text)", cursor: "pointer", _hover: { color: "sberGreen", borderColor: "sberGreen" }, _disabled: { opacity: 0.5 } })}
            title="Автопоиск MCC"
          >
            {isSearching ? <Loader2 size={18} className={css({ animation: "spin 1s linear infinite" })} /> : <Search size={18} />}
          </button>
        </div>
      </div>

      <div className={stack({ gap: "6px" })}>
         <div className={flex({ justify: "space-between", align: "end" })}>
          <label className="sber-label">САЙТ (ДЛЯ АВТО-ИКОНКИ)</label>
          <FindWebsiteButtonWrapper targetInputId={isModal ? "new-merch-website-modal" : "new-merch-website"} nameInputId={isModal ? "new-merch-name-modal" : "new-merch-name"} />
        </div>
        <input
          id={isModal ? "new-merch-website-modal" : "new-merch-website"}
          name="website"
          type="text"
          placeholder="ozon.ru"
          className="sber-input"
        />
      </div>
      
      <div className={stack({ gap: "6px" })}>
        <label className="sber-label">ОСНОВНОЙ MCC</label>
        <SearchableSelect 
          name="mainMcc" 
          options={mccOptions}
          required 
          key={`new-main-${overrides?.mainMcc}`}
          defaultValue={overrides?.mainMcc}
          placeholder="Поиск MCC по коду или названию..."
        />
      </div>

      <div className={stack({ gap: "6px" })}>
        <label className="sber-label">КАТЕГОРИЯ (ГЛОБАЛЬНАЯ)</label>
        <SearchableSelect 
          name="spendingCategoryId" 
          options={categoryOptions}
          placeholder="Выберите категорию для статистики..."
        />
      </div>

      <div className={stack({ gap: "6px" })}>
        <label className="sber-label">ДОПОЛНИТЕЛЬНЫЕ MCC (ПРОИЗВОЛЬНЫЙ ТЕКСТ)</label>
        <textarea 
          name="additionalMccs" 
          key={`new-add-${overrides?.additionalMccs}`}
          defaultValue={overrides?.additionalMccs}
          placeholder="Введите MCC через запятую или пробел. Код 0000 будет добавлен автоматически." 
          className="sber-input"
          style={{ minHeight: "80px", paddingTop: "12px" }}
        />
      </div>

      <div className={stack({ gap: "6px" })}>
        <label className="sber-label">URL ЛОГОТИПА (РУЧНОЙ ВВОД)</label>
        <input
          name="logo"
          type="text"
          placeholder="https://example.com/logo.png"
          className="sber-input"
        />
      </div>

      <button type="submit" className="sber-button">
        Добавить мерчанта
      </button>
    </AdminFormWrapper>
  );

  if (isModal) return formContent;

  return (
    <section className="sber-card">
      <div className={flex({ align: "center", gap: "10px", mb: "24px" })}>
        <div className={css({ p: "6px", bg: "sberGreen", borderRadius: "8px", color: "white" })}>
          <Plus size={18} />
        </div>
        <h2 className={css({ fontSize: "17px", fontWeight: "700", color: "var(--foreground)" })}>Новый мерчант</h2>
      </div>
      {formContent}
    </section>
  );
}
