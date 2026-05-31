"use client";

import { useState, useRef, useEffect } from "react";
import { RefreshCw, CheckCircle, AlertCircle, Play, Loader2 } from "lucide-react";
import { css } from "../../../styled-system/css";
import { stack, flex } from "../../../styled-system/patterns";
import { getAllUserCards, recalculateTransactionsForUserCard } from "@/lib/actions/cashback-engine";

interface CardTask {
  id: number;
  userName: string | null;
  cardName: string;
  bankName: string;
  txCount: number;
}

interface LogEntry {
  id: string;
  message: string;
  type: "info" | "success" | "error";
  timestamp: Date;
}

export default function RecalculateProgress() {
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [totalTx, setTotalTx] = useState(0);
  const [processedTx, setProcessedTx] = useState(0);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const logEndRef = useRef<HTMLDivElement>(null);

  const addLog = (message: string, type: LogEntry["type"] = "info") => {
    setLogs(prev => [
      ...prev,
      { id: Math.random().toString(36).substr(2, 9), message, type, timestamp: new Date() }
    ]);
  };

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  const startRecalculation = async () => {
    setIsRunning(true);
    setProgress(0);
    setProcessedTx(0);
    setLogs([]);
    addLog("Загрузка списка карт и транзакций...");

    try {
      const allCardsRaw = await getAllUserCards();
      const allCards: CardTask[] = allCardsRaw.map(c => ({
        id: c.id,
        userName: c.userName || "Пользователь",
        cardName: c.cardName,
        bankName: c.bankName,
        txCount: c.txCount
      }));

      const total = allCards.reduce((sum: number, card: CardTask) => sum + (card.txCount || 0), 0);
      setTotalTx(total);
      
      addLog(`Найдено карт: ${allCards.length}. Всего операций: ${total}`);
      
      if (allCards.length === 0) {
        setIsRunning(false);
        return;
      }

      let currentProcessed = 0;

      for (let i = 0; i < allCards.length; i++) {
        const card = allCards[i];
        const cardDesc = `${card.userName} — ${card.bankName} ${card.cardName}`;
        
        addLog(`Обработка: ${cardDesc} (${card.txCount} транз.)...`);
        
        try {
          const count = await recalculateTransactionsForUserCard(card.id) || 0;
          currentProcessed += count;
          setProcessedTx(currentProcessed);
          addLog(`Успешно: ${cardDesc} (${count} транз.)`, "success");
        } catch (error) {
          addLog(`Ошибка при обработке ${cardDesc}: ${error instanceof Error ? error.message : "Неизвестная ошибка"}`, "error");
          currentProcessed += card.txCount;
          setProcessedTx(currentProcessed);
        }
        
        if (total > 0) {
          setProgress(Math.round((currentProcessed / total) * 100));
        } else {
          setProgress(Math.round(((i + 1) / allCards.length) * 100));
        }
      }

      setProgress(100);
      addLog("Глобальный пересчет завершен!", "success");
    } catch (error) {
      addLog(`Критическая ошибка: ${error instanceof Error ? error.message : "Неизвестная ошибка"}`, "error");
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className={stack({ gap: "24px" })}>
      <div className="sber-card">
        <div className={stack({ gap: "16px" })}>
          <div className={flex({ justify: "space-between", align: "center" })}>
            <div className={stack({ gap: "4px" })}>
              <h2 className={css({ fontSize: "18px", fontWeight: "800", color: "var(--foreground)" })}>Глобальный пересчет</h2>
              <p className={css({ fontSize: "13px", color: "secondaryText" })}>
                Пересчет всех транзакций всех пользователей системы по актуальным правилам.
              </p>
            </div>
            <button 
              onClick={startRecalculation} 
              disabled={isRunning}
              className="sber-button"
              style={{ width: "auto", padding: "12px 24px", display: "flex", alignItems: "center", gap: "8px" }}
            >
              {isRunning ? <Loader2 className={css({ animation: "spin 2s linear infinite" })} size={18} /> : <Play size={18} />}
              {isRunning ? "Выполняется..." : "Запустить пересчет"}
            </button>
          </div>

          {/* Progress Bar */}
          <div className={stack({ gap: "8px" })}>
            <div className={flex({ justify: "space-between", fontSize: "12px", fontWeight: "700" })}>
              <span className={css({ color: isRunning ? "var(--sber-green)" : "secondaryText" })}>
                {isRunning ? (totalTx > 0 ? `Обработано ${processedTx} из ${totalTx} операций` : "Подготовка...") : "Готов к запуску"}
              </span>
              <span className={css({ color: "var(--foreground)" })}>{progress}%</span>
            </div>
            <div className={css({ w: "full", h: "8px", bg: "var(--input-bg)", borderRadius: "full", overflow: "hidden" })}>
              <div 
                className={css({ h: "full", bg: "var(--sber-green)", transition: "width 0.3s ease" })} 
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Logs */}
      <div className="sber-card" style={{ padding: 0, overflow: "hidden" }}>
        <div className={css({ px: "16px", py: "12px", borderBottom: "1px solid", borderColor: "var(--border-color)", bg: "var(--surface-secondary)", display: "flex", alignItems: "center", gap: "8px" })}>
          <RefreshCw size={16} className={css({ color: isRunning ? "var(--sber-green)" : "secondaryText" })} />
          <span className={css({ fontSize: "13px", fontWeight: "800", textTransform: "uppercase", letterSpacing: "0.05em" })}>Лог выполнения</span>
        </div>
        <div className={css({ h: "300px", overflowY: "auto", p: "16px", display: "flex", flexDirection: "column", gap: "8px", fontFamily: "monospace", fontSize: "12px" })}>
          {logs.length === 0 && (
            <div className={css({ h: "full", display: "flex", alignItems: "center", justifyContent: "center", color: "secondaryText", fontStyle: "italic" })}>
              Логи появятся после запуска...
            </div>
          )}
          {logs.map(log => (
            <div key={log.id} className={flex({ gap: "8px", align: "flex-start" })}>
              <span className={css({ color: "#94a3b8", flexShrink: 0 })}>[{log.timestamp.toLocaleTimeString()}]</span>
              {log.type === "success" && <CheckCircle size={14} className={css({ color: "var(--sber-green)", mt: "2px", flexShrink: 0 })} />}
              {log.type === "error" && <AlertCircle size={14} className={css({ color: "#ef4444", mt: "2px", flexShrink: 0 })} />}
              <span className={css({ 
                color: log.type === "success" ? "var(--sber-green)" : log.type === "error" ? "#ef4444" : "var(--foreground)",
                wordBreak: "break-word"
              })}>
                {log.message}
              </span>
            </div>
          ))}
          <div ref={logEndRef} />
        </div>
      </div>
    </div>
  );
}
