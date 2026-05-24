"use client";

import { useState } from "react";
import { updateSpendingCategory } from "@/lib/actions/spending-categories";
import { css } from "../../../styled-system/css";
import { flex, stack } from "../../../styled-system/patterns";
import { Edit2, X, Check } from "lucide-react";

interface CategoryEditFormProps {
  id: number;
  initialName: string;
  level: number;
}

export default function CategoryEditForm({ id, initialName, level }: CategoryEditFormProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(initialName);

  if (!isEditing) {
    return (
      <div className={flex({ align: "center", gap: "8px" })}>
        <span className={css({ 
          fontWeight: level === 0 ? "800" : "500", 
          fontSize: level === 0 ? "15px" : "14px",
          color: "var(--foreground)",
          textTransform: level === 0 ? "uppercase" : "none",
          letterSpacing: level === 0 ? "0.5px" : "normal"
        })}>
          {name}
        </span>
        <button 
          onClick={() => setIsEditing(true)}
          className={css({ 
            p: "4px", 
            color: "var(--secondary-text)", 
            borderRadius: "6px",
            _hover: { bg: "var(--input-bg)", color: "var(--foreground)" }, 
            cursor: "pointer",
            opacity: 0,
            ".group:hover &": { opacity: 1 }
          })}
          title="Редактировать название"
        >
          <Edit2 size={12} />
        </button>
      </div>
    );
  }

  return (
    <form 
      action={async (formData) => {
        await updateSpendingCategory(id, formData);
        setIsEditing(false);
      }}
      className={flex({ align: "center", gap: "4px" })}
    >
      <input 
        name="name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        autoFocus
        className={css({
          fontSize: level === 0 ? "14px" : "13px",
          fontWeight: "700",
          p: "4px 8px",
          borderRadius: "8px",
          border: "1px solid var(--sber-green)",
          bg: "var(--card-bg)",
          color: "var(--foreground)",
          outline: "none",
          minW: "150px"
        })}
      />
      <button 
        type="submit"
        className={css({ 
          p: "6px", 
          bg: "var(--sber-green)", 
          color: "white", 
          borderRadius: "8px",
          cursor: "pointer",
          _hover: { opacity: 0.9 }
        })}
      >
        <Check size={14} />
      </button>
      <button 
        type="button"
        onClick={() => {
          setIsEditing(false);
          setName(initialName);
        }}
        className={css({ 
          p: "6px", 
          bg: "var(--input-bg)", 
          color: "var(--secondary-text)", 
          borderRadius: "8px",
          cursor: "pointer",
          _hover: { color: "#ef4444" }
        })}
      >
        <X size={14} />
      </button>
    </form>
  );
}
