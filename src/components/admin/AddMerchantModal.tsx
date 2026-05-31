"use client";

import { useState } from "react";
import { css } from "../../../styled-system/css";
import { flex, stack } from "../../../styled-system/patterns";
import { Plus, X, Store } from "lucide-react";
import AddMerchantForm from "./AddMerchantForm";

interface AddMerchantModalProps {
  mccOptions: { value: string; label: string }[];
  categoryOptions: { value: string; label: string }[];
}

export default function AddMerchantModal({ mccOptions, categoryOptions }: AddMerchantModalProps) {
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
        <Plus size={16} strokeWidth={3} /> Добавить мерчанта
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
            
            {/* The AddMerchantForm already has its own internal card-styled header, 
                so we might want to adjust it to fit better inside a modal or 
                just use it as is if it looks okay. 
                Actually, AddMerchantForm has its own <section className="sber-card">.
                I will update AddMerchantForm to be more "modal-friendly" or 
                just extract its content.
            */}
            
            <AddMerchantForm 
                mccOptions={mccOptions} 
                categoryOptions={categoryOptions} 
                isModal={true}
                onSuccess={() => setIsOpen(false)}
            />
          </div>
        </div>
      )}
    </>
  );
}
