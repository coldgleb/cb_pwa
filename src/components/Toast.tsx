"use client";

import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import { css } from "../../styled-system/css";
import { flex, stack } from "../../styled-system/patterns";
import { X, CheckCircle, AlertCircle, Info } from "lucide-react";

type ToastType = "success" | "error" | "info";

interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextType {
  toast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = useCallback((message: string, type: ToastType = "success") => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className={css({
        position: "fixed",
        top: "20px",
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 10000,
        pointerEvents: "none",
        width: "100%",
        maxW: "400px",
        px: "20px"
      })}>
        <div className={stack({ gap: "10px", w: "full" })}>
          {toasts.map((t) => (
            <ToastItem key={t.id} toast={t} onRemove={removeToast} />
          ))}
        </div>
      </div>
    </ToastContext.Provider>
  );
}

function ToastItem({ toast, onRemove }: { toast: Toast; onRemove: (id: string) => void }) {
  useEffect(() => {
    const timer = setTimeout(() => onRemove(toast.id), 3000);
    return () => clearTimeout(timer);
  }, [toast.id, onRemove]);

  const bg = toast.type === "success" ? "#ecfdf5" : toast.type === "error" ? "#fef2f2" : "#eff6ff";
  const border = toast.type === "success" ? "#10b981" : toast.type === "error" ? "#ef4444" : "#3b82f6";
  const color = toast.type === "success" ? "#065f46" : toast.type === "error" ? "#991b1b" : "#1e40af";
  const Icon = toast.type === "success" ? CheckCircle : toast.type === "error" ? AlertCircle : Info;

  return (
    <div className={flex({
      align: "center",
      gap: "12px",
      p: "14px 16px",
      bg,
      border: "1px solid",
      borderColor: border,
      borderRadius: "16px",
      shadow: "lg",
      pointerEvents: "auto",
      animation: "slideIn 0.3s ease-out"
    })}>
      <Icon size={20} className={css({ color: border })} />
      <span className={css({ fontSize: "14px", fontWeight: "700", color, flex: 1 })}>{toast.message}</span>
      <button onClick={() => onRemove(toast.id)} className={css({ color: "#94a3b8", cursor: "pointer", p: "4px" })}>
        <X size={16} />
      </button>
      <style jsx global>{`
        @keyframes slideIn {
          from { transform: translateY(-20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error("useToast must be used within ToastProvider");
  return context;
}
