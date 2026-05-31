"use client";

import { useState } from "react";
import { css } from "../../../styled-system/css";
import { flex, stack } from "../../../styled-system/patterns";
import { Plus, X } from "lucide-react";
import AdminFormWrapper from "./AdminFormWrapper";
import { createLoyaltyProgram } from "@/lib/actions/loyalty-programs";
import SearchableSelect from "@/components/SearchableSelect";

interface AddLoyaltyProgramModalProps {
  bankOptions: { value: string; label: string }[];
}

export default function AddLoyaltyProgramModal({ bankOptions }: AddLoyaltyProgramModalProps) {
  const [isOpen, setIsOpen] = useState(false);

  const roundingOptions = [
    { value: "no_rounding", label: "Без округлений" },
    { value: "amount_100_down", label: "Сумма до 100р вниз" },
    { value: "cashback_0_01_down", label: "Кешбэк до 0.01 вниз" },
    { value: "cashback_0_01_math", label: "Кешбэк до 0.01 по матем. правилам" },
    { value: "cashback_1_down", label: "Кешбэк до 1р вниз" },
    { value: "cashback_1_math", label: "Кешбэк до 1р по матем. правилам" },
    { value: "halva", label: "Халва (до 1р — 0.01, от 1р — 1р)" },
  ];

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
        <Plus size={16} strokeWidth={3} /> Создать программу
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
              <h2 className={css({ fontSize: "20px", fontWeight: "800", color: "var(--foreground)" })}>Новая программа</h2>
            </div>
            
            <AdminFormWrapper 
              action={createLoyaltyProgram} 
              successMessage="Программа успешно создана" 
              className={stack({ gap: "20px" })}
              onSuccess={() => setIsOpen(false)}
            >
              <div className={stack({ gap: "6px" })}>
                <label className="sber-label">БАНК</label>
                <SearchableSelect 
                  name="bankId" 
                  options={bankOptions}
                  required
                  placeholder="Выберите банк..."
                />
              </div>
              <div className={stack({ gap: "6px" })}>
                <label className="sber-label">НАЗВАНИЕ ПРОГРАММЫ</label>
                <input
                  name="name"
                  type="text"
                  required
                  placeholder="Например, Tinkoff Black Лояльность"
                  className="sber-input"
                />
              </div>
              <div className={stack({ gap: "6px" })}>
                <label className="sber-label">ОПИСАНИЕ</label>
                <textarea
                  name="description"
                  placeholder="Краткое описание условий..."
                  className="sber-input"
                  style={{ minHeight: "80px", paddingTop: "8px" }}
                />
              </div>
              <div className={stack({ gap: "6px" })}>
                <label className="sber-label">ОКРУГЛЕНИЕ ПО УМОЛЧАНИЮ</label>
                <SearchableSelect 
                  name="roundingType" 
                  options={roundingOptions}
                  defaultValue="no_rounding"
                />
              </div>
              <button type="submit" className="sber-button">
                Сохранить программу
              </button>
            </AdminFormWrapper>
          </div>
        </div>
      )}
    </>
  );
}
