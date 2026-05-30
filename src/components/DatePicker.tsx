"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { css } from "../../styled-system/css";
import { stack, flex } from "../../styled-system/patterns";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, X } from "lucide-react";

interface DatePickerProps {
  name: string;
  defaultValue?: string; // YYYY-MM-DD
  value?: string; // Controlled value
  onChange?: (value: string) => void;
  required?: boolean;
}

export default function DatePicker({ name, defaultValue, value: controlledValue, onChange, required }: DatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [internalSelectedDate, setInternalSelectedDate] = useState(
    (defaultValue !== undefined && defaultValue !== null)
      ? defaultValue
      : (required ? new Date().toISOString().split('T')[0] : "")
  );
  
  const selectedDate = controlledValue !== undefined ? controlledValue : internalSelectedDate;
  const [viewDate, setViewDate] = useState(new Date(selectedDate || new Date()));
  const [inputValue, setInputValue] = useState("");
  
  const containerRef = useRef<HTMLDivElement>(null);

  const updateSelectedDate = (dateStr: string) => {
    if (controlledValue === undefined) {
      setInternalSelectedDate(dateStr);
    }
    if (onChange) {
      onChange(dateStr);
    }
  };

  // Initialize input value based on selected date
  useEffect(() => {
    if (!selectedDate) {
      setInputValue("");
      return;
    }
    const d = new Date(selectedDate);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    setInputValue(`${day}.${month}.${year}`);
  }, [selectedDate]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/[^\d.]/g, "");
    
    // Segment-based validation during typing
    const parts = value.split(".");
    
    // Validate Day
    if (parts[0]) {
      if (parts[0].length > 2) parts[0] = parts[0].substring(0, 2);
      const day = parseInt(parts[0]);
      if (day > 31) parts[0] = "31";
      if (parts[0] === "00") parts[0] = "01";
    }
    
    // Validate Month
    if (parts[1]) {
      if (parts[1].length > 2) parts[1] = parts[1].substring(0, 2);
      const month = parseInt(parts[1]);
      if (month > 12) parts[1] = "12";
      if (parts[1] === "00") parts[1] = "01";
    }
    
    // Validate Year (only 4 digits)
    if (parts[2] && parts[2].length > 4) {
      parts[2] = parts[2].substring(0, 4);
    }

    // Reconstruct value
    value = parts.join(".");
    
    // Auto-format DD.MM.YYYY
    if (value.length === 2 && !value.includes(".")) value += ".";
    if (value.length === 5 && value.split(".").length === 2) value += ".";
    if (value.length > 10) value = value.substring(0, 10);
    
    setInputValue(value);

    // Try to parse valid date
    const finalParts = value.split(".");
    if (finalParts.length === 3 && finalParts[2].length === 4) {
      const day = parseInt(finalParts[0]);
      const month = parseInt(finalParts[1]) - 1;
      const year = parseInt(finalParts[2]);
      const d = new Date(year, month, day);
      if (!isNaN(d.getTime()) && d.getFullYear() === year && d.getMonth() === month && d.getDate() === day) {
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        const dateStr = `${yyyy}-${mm}-${dd}`;
        updateSelectedDate(dateStr);
        setViewDate(d);
      }
    }
  };

  const daysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

  const calendarDays = useMemo(() => {
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    const days = [];
    
    // Fill previous month days
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    const firstDay = firstDayOfMonth(year, month);
    // Adjust for Monday start (JS default is Sunday=0)
    const offset = firstDay === 0 ? 6 : firstDay - 1;
    
    for (let i = offset - 1; i >= 0; i--) {
      days.push({ day: prevMonthLastDay - i, currentMonth: false, date: new Date(year, month - 1, prevMonthLastDay - i) });
    }
    
    // Fill current month days
    const totalDays = daysInMonth(year, month);
    for (let i = 1; i <= totalDays; i++) {
      days.push({ day: i, currentMonth: true, date: new Date(year, month, i) });
    }
    
    // Fill next month days
    const remaining = 42 - days.length;
    for (let i = 1; i <= remaining; i++) {
      days.push({ day: i, currentMonth: false, date: new Date(year, month + 1, i) });
    }
    
    return days;
  }, [viewDate]);

  const monthNames = ["Январь", "Февраль", "Март", "Апрель", "Май", "Июнь", "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь"];

  const handleDateSelect = (date: Date) => {
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    const dateStr = `${yyyy}-${mm}-${dd}`;
    updateSelectedDate(dateStr);
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} className={css({ position: "relative", w: "full" })}>
      <input type="hidden" name={name} value={selectedDate} required={required} />
      
      <div 
        className={flex({ 
          align: "center", 
          gap: "10px", 
          px: "18px", 
          py: "16px", 
          bg: isOpen ? "var(--card-bg)" : "var(--input-bg)", 
          border: "1px solid", 
          borderColor: isOpen ? "var(--sber-green)" : "transparent", 
          borderRadius: "12px", 
          transition: "border-color 0.2s, background 0.2s"
        })}
      >
        <div onClick={() => setIsOpen(!isOpen)} className={css({ cursor: "pointer", display: "flex", alignItems: "center" })}>
          <CalendarIcon size={18} className={css({ color: "var(--sber-green)" })} />
        </div>
        <input
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onFocus={() => setIsOpen(true)}
          placeholder="ДД.ММ.ГГГГ"
          className={css({ 
            bg: "transparent", 
            border: "none", 
            outline: "none", 
            fontSize: "17px", 
            fontWeight: "600", 
            w: "full",
            color: "var(--foreground)",
            _placeholder: { color: "var(--secondary-text)" }
          })}
        />
      </div>

      {isOpen && (
        <div className={stack({ 
          position: { base: "fixed", md: "absolute" },
          bottom: { base: 0, md: "auto" },
          top: { base: "auto", md: "calc(100% + 4px)" },
          left: { base: 0, md: "-40px" }, 
          right: { base: 0, md: "-40px" }, 
          bg: "var(--card-bg)", 
          borderRadius: { base: "24px 24px 0 0", md: "18px" },
          shadow: "0 -10px 25px rgba(0, 0, 0, 0.2), 0 10px 25px -5px rgba(0, 0, 0, 0.2)", 
          border: "1px solid var(--border-color)", 
          zIndex: 10000, 
          p: "20px",
          gap: "16px",
          minW: { md: "320px" }
        })}>
          <div className={flex({ justify: "space-between", align: "center" })}>
            <button type="button" onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1))} className={css({ p: "8px", borderRadius: "10px", _hover: { bg: "var(--surface-secondary)" } })}>
              <ChevronLeft size={20} />
            </button>
            <span className={css({ fontSize: "16px", fontWeight: "800" })}>
              {monthNames[viewDate.getMonth()]} {viewDate.getFullYear()}
            </span>
            <button type="button" onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1))} className={css({ p: "8px", borderRadius: "10px", _hover: { bg: "var(--surface-secondary)" } })}>
              <ChevronRight size={20} />
            </button>
          </div>

          <div className={css({ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "4px", textAlign: "center" })}>
            {["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"].map(d => (
              <span key={d} className={css({ fontSize: "12px", fontWeight: "700", color: "var(--secondary-text)", pb: "8px" })}>{d}</span>
            ))}
            {calendarDays.map((d, i) => {
              const isSelected = selectedDate === `${d.date.getFullYear()}-${String(d.date.getMonth() + 1).padStart(2, '0')}-${String(d.date.getDate()).padStart(2, '0')}`;
              const isToday = new Date().toDateString() === d.date.toDateString();
              
              return (
                <div 
                  key={i}
                  onClick={() => handleDateSelect(d.date)}
                  className={css({ 
                    aspectRatio: "1",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    borderRadius: "12px",
                    fontSize: "14px",
                    fontWeight: isSelected ? "800" : "500",
                    cursor: "pointer",
                    bg: isSelected ? "var(--sber-green)" : (isToday ? "rgba(33, 160, 56, 0.1)" : "transparent"),
                    color: isSelected ? "white" : (isToday ? "var(--sber-green)" : (d.currentMonth ? "var(--foreground)" : "var(--secondary-text)")),
                    _hover: { bg: isSelected ? "var(--sber-green)" : "var(--surface-secondary)" }
                  })}
                >
                  {d.day}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
