"use client";

import { useState } from "react";
import { css } from "../../../styled-system/css";
import { flex, stack } from "../../../styled-system/patterns";
import { Plus, X } from "lucide-react";
import AdminFormWrapper from "./AdminFormWrapper";
import { createBankCard } from "@/lib/actions/bank-cards";
import SearchableSelect from "@/components/SearchableSelect";

interface AddBankCardModalProps {
  bankOptions: { value: string; label: string }[];
  loyaltyProgramOptions: { value: string; label: string }[];
}

export default function AddBankCardModal({ bankOptions, loyaltyProgramOptions }: AddBankCardModalProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button 
        onClick={() => setIsOpen(true)}
        className={css({ 
          fontSize: "14px", 
          fontWeight: "800", 
          color: "sberGreen", 
          bg: "rgba(33, 160, 56, 0.1)", 
          border: "none", 
          cursor: "pointer", 
          display: "flex", 
          alignItems: "center", 
          gap: "4px",
          px: "12px",
          py: "8px",
          borderRadius: "12px",
          transition: "all 0.2s",
          _hover: { bg: "rgba(33, 160, 56, 0.15)", transform: "translateY(-1px)" },
          _active: { transform: "translateY(0)" }
        })}
      >
        <Plus size={16} strokeWidth={3} /> Добавить тип карты
      </button>

      {isOpen && (
        <div className={css({ 
          position: "fixed", 
          inset: 0, 
          bg: "rgba(0,0,0,0.6)", 
          zIndex: 1000, 
          display: "flex", 
          alignItems: "center", 
          justifyContent: "center", 
          p: "20px", 
          backdropFilter: "blur(6px)"
        })}>
          <div className={css({ 
            bg: "var(--background)", 
            w: "full", 
            maxW: "500px", 
            borderRadius: "28px", 
            p: "28px", 
            shadow: "0 20px 50px rgba(0,0,0,0.3)", 
            position: "relative", 
            maxH: "90vh", 
            overflowY: "auto"
          })}>
            <button 
              onClick={() => setIsOpen(false)} 
              className={css({ 
                position: "absolute", 
                top: "20px", 
                right: "20px", 
                p: "8px", 
                color: "var(--secondary-text)", 
                cursor: "pointer",
                borderRadius: "full",
                _hover: { bg: "var(--surface-secondary)", color: "var(--foreground)" }
              })}
            >
              <X size={20} />
            </button>
            
            <div className={flex({ align: "center", gap: "12px", mb: "28px" })}>
              <div className={css({ p: "8px", bg: "sberGreen", borderRadius: "10px", color: "white" })}>
                <Plus size={20} strokeWidth={3} />
              </div>
              <h2 className={css({ fontSize: "20px", fontWeight: "800", color: "var(--foreground)" })}>Новый тип карты</h2>
            </div>
            
            <AdminFormWrapper 
              action={createBankCard} 
              successMessage="Тип карты успешно добавлен" 
              className={stack({ gap: "20px" })}
              onSuccess={() => setIsOpen(false)}
            >
              <div className={stack({ gap: "6px" })}>
                <label className="sber-label">БАНК-ЭМИТЕНТ</label>
                <SearchableSelect 
                  name="bankId" 
                  options={bankOptions}
                  required
                  placeholder="Выберите банк..."
                />
              </div>
              <div className={stack({ gap: "6px" })}>
                <label className="sber-label">НАЗВАНИЕ КАРТЫ</label>
                <input
                  name="name"
                  type="text"
                  required
                  placeholder="Например, Tinkoff Black"
                  className="sber-input"
                />
              </div>
              <div className={stack({ gap: "6px" })}>
                <label className="sber-label">ПРОГРАММА ЛОЯЛЬНОСТИ</label>
                <SearchableSelect 
                  name="loyaltyProgramId" 
                  options={[{ value: "", label: "Без программы лояльности" }, ...loyaltyProgramOptions]}
                  placeholder="Выберите программу лояльности..."
                />
              </div>
              <div className={stack({ gap: "6px" })}>
                <label className="sber-label">ТИП СЧЕТА</label>
                <SearchableSelect 
                  name="accountType" 
                  options={[
                    { value: "debit", label: "Дебетовая карта" },
                    { value: "credit", label: "Кредитная карта" },
                    { value: "cardless", label: "Счет без карты" },
                    { value: "investments", label: "Инвестиции" },
                    { value: "bonus", label: "Бонусный счет" },
                  ]}
                  required
                  defaultValue="debit"
                  placeholder="Выберите тип счета..."
                />
              </div>
              <div className={stack({ gap: "6px" })}>
                <label className="sber-label">ЛИМИТ КЕШБЭКА В МЕСЯЦ (ПО УМОЛЧАНИЮ)</label>
                <input
                  name="defaultCashbackLimit"
                  type="number"
                  placeholder="Например, 5000"
                  className="sber-input"
                />
              </div>
              <button type="submit" className="sber-button">
                Сохранить тип карты
              </button>
            </AdminFormWrapper>
          </div>
        </div>
      )}
    </>
  );
}
