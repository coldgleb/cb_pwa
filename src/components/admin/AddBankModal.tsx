"use client";

import { useState } from "react";
import { css } from "../../../styled-system/css";
import { flex, stack } from "../../../styled-system/patterns";
import { Plus, X } from "lucide-react";
import AdminFormWrapper from "./AdminFormWrapper";
import { createBank } from "@/lib/actions/banks";
import FindWebsiteButtonWrapper from "./FindWebsiteButtonWrapper";

export default function AddBankModal() {
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
        <Plus size={16} strokeWidth={3} /> Добавить банк
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
              <h2 className={css({ fontSize: "20px", fontWeight: "800", color: "var(--foreground)" })}>Новый банк</h2>
            </div>
            
            <AdminFormWrapper 
              action={createBank} 
              successMessage="Банк успешно добавлен" 
              className={stack({ gap: "20px" })}
              onSuccess={() => setIsOpen(false)}
            >
              <div className={stack({ gap: "6px" })}>
                <label className="sber-label">НАЗВАНИЕ БАНКА</label>
                <input
                  id="bank-name-input-modal"
                  name="name"
                  type="text"
                  required
                  placeholder="Например, Сбер"
                  className="sber-input"
                />
              </div>
              
              <div className={stack({ gap: "6px" })}>
                <div className={flex({ justify: "space-between", align: "end" })}>
                  <label className="sber-label">САЙТ (ДЛЯ АВТО-ИКОНКИ)</label>
                  <FindWebsiteButtonWrapper targetInputId="bank-website-input-modal" nameInputId="bank-name-input-modal" />
                </div>
                <input
                  id="bank-website-input-modal"
                  name="website"
                  type="text"
                  placeholder="sberbank.ru"
                  className="sber-input"
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
                Сохранить банк
              </button>
            </AdminFormWrapper>
          </div>
        </div>
      )}
    </>
  );
}
