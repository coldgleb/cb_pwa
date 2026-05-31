"use client";

import { useState } from "react";
import { css } from "../../styled-system/css";
import { flex } from "../../styled-system/patterns";
import { Plus, X } from "lucide-react";
import AddUserCardForm from "./AddUserCardForm";

interface AddCardModalWrapperProps {
  banks: any[];
  cardTypes: any[];
}

export default function AddCardModalWrapper({ banks, cardTypes }: AddCardModalWrapperProps) {
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
        <Plus size={16} strokeWidth={3} /> Добавить
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
          backdropFilter: "blur(6px)",
          animation: "fadeIn 0.2s ease-out"
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
            overflowY: "auto",
            animation: "slideUp 0.3s ease-out"
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
              <h2 className={css({ fontSize: "20px", fontWeight: "800", color: "var(--foreground)" })}>Добавить карту</h2>
            </div>
            
            <AddUserCardForm 
              banks={banks} 
              cardTypes={cardTypes} 
              onSuccess={() => setIsOpen(false)} 
            />
          </div>
        </div>
      )}

      <style jsx global>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideUp {
          from { transform: translateY(20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}</style>
    </>
  );
}
