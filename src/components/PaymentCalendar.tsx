"use client";

import { useState } from "react";
import { css } from "../../styled-system/css";
import { stack, flex } from "../../styled-system/patterns";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Plus, Check, Trash2, X, Info } from "lucide-react";
import { createCreditPayment, toggleCreditPaymentStatus, deleteCreditPayment } from "@/lib/actions/credit-payments";
import { useToast } from "./Toast";

interface Payment {
  id: number;
  userCardId: number;
  cardName: string;
  bankName: string;
  amount: number;
  dueDate: Date;
  isPaid: boolean;
  paymentType: "minimal" | "full";
}

interface CardOption {
  id: number;
  name: string;
  bankName: string;
  lastFour: string | null;
}

interface PaymentCalendarProps {
  payments: Payment[];
  creditCards: CardOption[];
}

export default function PaymentCalendar({ payments, creditCards }: PaymentCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [showAddForm, setShowAddForm] = useState(false);
  const [newPaymentType, setNewPaymentType] = useState<"minimal" | "full">("minimal");
  const { toast } = useToast();

  const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay();
  // Adjust for Monday start (0: Sun -> 6, 1: Mon -> 0 ...)
  const startingDay = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1;

  const monthNames = ["Январь", "Февраль", "Март", "Апрель", "Май", "Июнь", "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь"];

  const prevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));

  const getPaymentsForDay = (day: number) => {
    return payments.filter(p => 
      p.dueDate.getDate() === day && 
      p.dueDate.getMonth() === currentDate.getMonth() && 
      p.dueDate.getFullYear() === currentDate.getFullYear()
    );
  };

  const totalToPay = payments
    .filter(p => !p.isPaid && p.dueDate.getMonth() === currentDate.getMonth() && p.dueDate.getFullYear() === currentDate.getFullYear())
    .reduce((sum, p) => sum + p.amount, 0);

  return (
    <section className={stack({ gap: "16px" })}>
      <div className={flex({ justify: "space-between", alignItems: "center", px: "4px" })}>
        <h2 className={css({ fontSize: "18px", fontWeight: "800", color: "var(--foreground)" })}>Календарь платежей</h2>
        <button 
          onClick={() => setShowAddForm(true)}
          className={css({ fontSize: "14px", fontWeight: "800", color: "sberGreen", bg: "transparent", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: "4px" })}
        >
          <Plus size={16} /> Добавить
        </button>
      </div>

      <div className="sber-card" style={{ padding: "16px" }}>
        {/* Calendar Header */}
        <div className={flex({ justify: "space-between", alignItems: "center", mb: "20px" })}>
          <div className={stack({ gap: "2px" })}>
            <p className={css({ fontSize: "15px", fontWeight: "800" })}>{monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}</p>
            <p className={css({ fontSize: "12px", color: "var(--secondary-text)", fontWeight: "600" })}>Осталось оплатить: {totalToPay.toLocaleString("ru-RU")} ₽</p>
          </div>
          <div className={flex({ gap: "8px" })}>
            <button onClick={prevMonth} className={css({ p: "6px", borderRadius: "8px", border: "1px solid var(--border-color)", bg: "var(--card-bg)", cursor: "pointer" })}><ChevronLeft size={16} /></button>
            <button onClick={nextMonth} className={css({ p: "6px", borderRadius: "8px", border: "1px solid var(--border-color)", bg: "var(--card-bg)", cursor: "pointer" })}><ChevronRight size={16} /></button>
          </div>
        </div>

        {/* Calendar Grid */}
        <div className={css({ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "4px", mb: "20px" })}>
          {["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"].map(d => (
            <div key={d} className={css({ textAlign: "center", fontSize: "10px", fontWeight: "800", color: "var(--secondary-text)", pb: "4px" })}>{d}</div>
          ))}
          {Array.from({ length: startingDay }).map((_, i) => <div key={`empty-${i}`} />)}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1;
            const dayPayments = getPaymentsForDay(day);
            const unpaid = dayPayments.filter(p => !p.isPaid);
            const hasFullUnpaid = unpaid.some(p => p.paymentType === "full");
            const hasMinUnpaid = unpaid.some(p => p.paymentType === "minimal");
            const hasOnlyPaid = dayPayments.length > 0 && dayPayments.every(p => p.isPaid);
            
            const isToday = new Date().getDate() === day && new Date().getMonth() === currentDate.getMonth() && new Date().getFullYear() === currentDate.getFullYear();

            let dotColor = "transparent";
            if (hasFullUnpaid) dotColor = "#ef4444"; // Red for full unpaid
            else if (hasMinUnpaid) dotColor = "#f97316"; // Orange for min unpaid
            else if (hasOnlyPaid) dotColor = "sberGreen"; // Green if all paid

            return (
              <div 
                key={day} 
                className={css({ 
                  minH: "70px",
                  display: "flex", 
                  flexDirection: "column",
                  p: "6px",
                  borderRadius: "10px",
                  position: "relative",
                  bg: isToday ? "rgba(33, 160, 56, 0.05)" : "var(--surface-secondary)",
                  border: isToday ? "1px solid rgba(33, 160, 56, 0.3)" : "1px solid var(--border-color)",
                  overflow: "hidden"
                })}
              >
                <div className={css({ fontSize: "14px", fontWeight: "900", color: isToday ? "sberGreen" : "var(--secondary-text)", textAlign: "right", mb: "6px" })}>
                  {day}
                </div>
                <div className={stack({ gap: "3px" })}>
                  {dayPayments.map(p => {
                    const textColor = p.isPaid ? "var(--secondary-text)" : (p.paymentType === "full" ? "#ef4444" : "#f97316");
                    
                    // Format compactly: 15000 -> 15к, 1500 -> 1.5к
                    const displayAmount = p.amount >= 1000 ? `${(p.amount / 1000).toFixed(p.amount % 1000 === 0 ? 0 : 1)}к` : p.amount.toString();
                    
                    return (
                      <div 
                        key={p.id} 
                        className={css({ 
                          fontSize: "11px", 
                          fontWeight: "900", 
                          color: textColor, 
                          textAlign: "center", 
                          bg: "var(--card-bg)", 
                          borderRadius: "5px", 
                          py: "3px",
                          textDecoration: p.isPaid ? "line-through" : "none",
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          shadow: "sm"
                        })}
                        title={`${p.amount.toLocaleString("ru-RU")} ₽ - ${p.bankName}`}
                      >
                        {displayAmount}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* Payments List for Month */}
        <div className={stack({ gap: "10px" })}>
          {payments
            .filter(p => p.dueDate.getMonth() === currentDate.getMonth() && p.dueDate.getFullYear() === currentDate.getFullYear())
            .sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime())
            .map(p => {
              const typeColor = p.isPaid ? "var(--secondary-text)" : (p.paymentType === "full" ? "#ef4444" : "#f97316");
              const typeLabel = p.paymentType === "full" ? "Полное погашение" : "Минимальный платеж";
              
              return (
                <div key={p.id} className={flex({ justify: "space-between", alignItems: "center", p: "10px", bg: "var(--surface-secondary)", borderRadius: "12px", border: "1px solid var(--border-color)" })}>
                  <div className={flex({ alignItems: "center", gap: "10px" })}>
                    <button 
                       onClick={() => toggleCreditPaymentStatus(p.id, !p.isPaid)}
                       className={css({ 
                         w: "24px", h: "24px", borderRadius: "6px", border: "2px solid", 
                         borderColor: p.isPaid ? "sberGreen" : "var(--border-color)",
                         bg: p.isPaid ? "sberGreen" : "transparent",
                         display: "flex", alignItems: "center", justifyContent: "center", color: "white", cursor: "pointer"
                       })}
                    >
                      {p.isPaid && <Check size={14} strokeWidth={4} />}
                    </button>
                    <div className={stack({ gap: "0" })}>
                      <p className={css({ fontSize: "13px", fontWeight: "900", textDecoration: p.isPaid ? "line-through" : "none", opacity: p.isPaid ? 0.6 : 1, color: typeColor })}>
                        {p.dueDate.getDate()} {monthNames[p.dueDate.getMonth()].slice(0, 3)} — {p.amount.toLocaleString("ru-RU")} ₽
                      </p>
                      <p className={css({ fontSize: "11px", color: "var(--secondary-text)", fontWeight: "600" })}>
                        {p.bankName} {p.cardName} • <span style={{ color: typeColor, fontWeight: "700" }}>{typeLabel.toLowerCase()}</span>
                      </p>
                    </div>
                  </div>
                  <button 
                    onClick={() => {
                      if(confirm("Удалить платеж?")) deleteCreditPayment(p.id);
                    }}
                    className={css({ p: "6px", color: "var(--secondary-text)", bg: "transparent", border: "none", cursor: "pointer", _hover: { color: "#ef4444" } })}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              );
            })}
          {payments.filter(p => p.dueDate.getMonth() === currentDate.getMonth() && p.dueDate.getFullYear() === currentDate.getFullYear()).length === 0 && (
             <p className={css({ textAlign: "center", fontSize: "12px", color: "var(--secondary-text)", py: "10px", fontStyle: "italic" })}>Нет запланированных платежей</p>
          )}
        </div>
      </div>

      {/* Add Payment Modal */}
      {showAddForm && (
        <div className={css({ position: "fixed", inset: 0, bg: "rgba(0,0,0,0.5)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", p: "20px", backdropFilter: "blur(4px)" })}>
          <div className={css({ bg: "var(--card-bg)", w: "full", maxW: "400px", borderRadius: "24px", p: "24px", shadow: "xl", position: "relative" })}>
            <button onClick={() => setShowAddForm(false)} className={css({ position: "absolute", top: "16px", right: "16px", p: "4px", color: "var(--secondary-text)", cursor: "pointer" })}><X size={20} /></button>
            <h3 className={css({ fontSize: "18px", fontWeight: "800", mb: "20px" })}>Добавить платеж</h3>
            
            <form action={async (fd) => {
               try {
                 await createCreditPayment(fd);
                 setShowAddForm(false);
                 toast("Платеж добавлен");
               } catch (e) {
                 toast("Ошибка при сохранении", "error");
               }
            }} className={stack({ gap: "16px" })}>
              <div className={stack({ gap: "6px" })}>
                <label className="sber-label">КАРТА ДЛЯ ОПЛАТЫ</label>
                <select name="userCardId" required className="sber-input" style={{ appearance: "none" }}>
                  <option value="">Выберите карту...</option>
                  {creditCards.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.bankName} {c.name} {c.lastFour ? `(• ${c.lastFour})` : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div className={stack({ gap: "6px" })}>
                <label className="sber-label">ТИП ПЛАТЕЖА</label>
                <div className={css({ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" })}>
                   <label className={css({ 
                     display: "flex", 
                     alignItems: "center", 
                     gap: "8px", 
                     p: "10px", 
                     borderRadius: "12px", 
                     border: "1px solid",
                     borderColor: newPaymentType === "minimal" ? "#f97316" : "var(--border-color)", 
                     cursor: "pointer", 
                     bg: newPaymentType === "minimal" ? "rgba(249, 115, 22, 0.05)" : "var(--surface-secondary)"
                   })}>
                      <input 
                        type="radio" 
                        name="paymentType" 
                        value="minimal" 
                        checked={newPaymentType === "minimal"} 
                        onChange={() => setNewPaymentType("minimal")}
                        className={css({ accentColor: "#f97316" })} 
                      />
                      <span className={css({ fontSize: "12px", fontWeight: "700", color: "#f97316" })}>Минимальный</span>
                   </label>
                   <label className={css({ 
                     display: "flex", 
                     alignItems: "center", 
                     gap: "8px", 
                     p: "10px", 
                     borderRadius: "12px", 
                     border: "1px solid",
                     borderColor: newPaymentType === "full" ? "#ef4444" : "var(--border-color)", 
                     cursor: "pointer", 
                     bg: newPaymentType === "full" ? "rgba(239, 68, 68, 0.05)" : "var(--surface-secondary)"
                   })}>
                      <input 
                        type="radio" 
                        name="paymentType" 
                        value="full" 
                        checked={newPaymentType === "full"} 
                        onChange={() => setNewPaymentType("full")}
                        className={css({ accentColor: "#ef4444" })} 
                      />
                      <span className={css({ fontSize: "12px", fontWeight: "700", color: "#ef4444" })}>Полное</span>
                   </label>
                </div>
              </div>

              <div className={stack({ gap: "6px" })}>
                <label className="sber-label">СУММА (₽)</label>
                <input name="amount" type="number" step="0.01" required placeholder="0.00" className="sber-input" />
              </div>
              <div className={stack({ gap: "6px" })}>
                <label className="sber-label">ДАТА ПЛАТЕЖА</label>
                <input name="dueDate" type="date" required defaultValue={new Date().toISOString().split('T')[0]} className="sber-input" />
              </div>
              <div className={stack({ gap: "6px" })}>
                <label className="sber-label">ЗАМЕТКА</label>
                <input name="note" type="text" placeholder="Минимальный платеж..." className="sber-input" />
              </div>
              <button type="submit" className="sber-button" style={{ marginTop: "8px" }}>Сохранить платеж</button>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}
