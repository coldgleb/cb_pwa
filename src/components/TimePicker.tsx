"use client";

import { useState, useRef, useEffect } from "react";
import { css } from "../../styled-system/css";
import { stack, flex } from "../../styled-system/patterns";
import { Clock } from "lucide-react";

interface TimePickerProps {
  name: string;
  defaultValue?: string; // HH:mm
  required?: boolean;
}

export default function TimePicker({ name, defaultValue, required }: TimePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedTime, setSelectedTime] = useState(defaultValue || "12:00");
  const [inputValue, setInputValue] = useState(selectedTime);
  
  const [hours, setHours] = useState(selectedTime.split(':')[0]);
  const [minutes, setMinutes] = useState(selectedTime.split(':')[1]);
  
  const containerRef = useRef<HTMLDivElement>(null);

  // Sync hours/minutes with selectedTime
  useEffect(() => {
    const [h, m] = selectedTime.split(':');
    setHours(h);
    setMinutes(m);
    setInputValue(selectedTime);
  }, [selectedTime]);

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
    let value = e.target.value.replace(/[^\d:]/g, "");
    
    // Auto-format HH:mm
    if (value.length === 2 && !value.includes(":")) value += ":";
    if (value.length > 5) value = value.substring(0, 5);
    
    setInputValue(value);

    // Try to parse valid time
    const parts = value.split(":");
    if (parts.length === 2 && parts[0].length === 2 && parts[1].length === 2) {
      const h = parseInt(parts[0]);
      const m = parseInt(parts[1]);
      if (h >= 0 && h <= 23 && m >= 0 && m <= 59) {
        setSelectedTime(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
      }
    }
  };

  const handleSave = () => {
    setSelectedTime(`${hours}:${minutes}`);
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} className={css({ position: "relative", w: "full" })}>
      <input type="hidden" name={name} value={selectedTime} required={required} />
      
      <div 
        className={flex({ 
          align: "center", 
          gap: "10px", 
          px: "14px", 
          py: "12px", 
          bg: "var(--input-bg)", 
          border: "1px solid", 
          borderColor: isOpen ? "var(--sber-green)" : "transparent", 
          borderRadius: "14px", 
          transition: "all 0.2s"
        })}
      >
        <div onClick={() => setIsOpen(!isOpen)} className={css({ cursor: "pointer", display: "flex", alignItems: "center" })}>
          <Clock size={18} className={css({ color: "var(--sber-green)" })} />
        </div>
        <input
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onFocus={() => setIsOpen(true)}
          placeholder="ЧЧ:ММ"
          className={css({ 
            bg: "transparent", 
            border: "none", 
            outline: "none", 
            fontSize: "14px", 
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
          left: 0, 
          right: 0, 
          bg: "var(--card-bg)", 
          borderRadius: { base: "24px 24px 0 0", md: "18px" },
          shadow: "0 -10px 25px rgba(0, 0, 0, 0.2), 0 10px 25px -5px rgba(0, 0, 0, 0.2)", 
          border: "1px solid var(--border-color)", 
          zIndex: 10000, 
          p: "24px",
          gap: "20px"
        })}>
          <div className={flex({ justify: "center", align: "center", gap: "12px" })}>
            <div className={stack({ align: "center", gap: "8px" })}>
              <span className={css({ fontSize: "11px", fontWeight: "800", color: "var(--secondary-text)" })}>ЧАСЫ</span>
              <select 
                value={hours} 
                onChange={(e) => setHours(e.target.value)}
                className={css({ fontSize: "28px", fontWeight: "800", p: "12px", borderRadius: "14px", bg: "var(--surface-secondary)", border: "none", outline: "none", appearance: "none", textAlign: "center", w: "70px" })}
              >
                {Array.from({ length: 24 }).map((_, i) => (
                  <option key={i} value={String(i).padStart(2, '0')}>{String(i).padStart(2, '0')}</option>
                ))}
              </select>
            </div>
            <span className={css({ fontSize: "28px", fontWeight: "800", pt: "20px" })}>:</span>
            <div className={stack({ align: "center", gap: "8px" })}>
              <span className={css({ fontSize: "11px", fontWeight: "800", color: "var(--secondary-text)" })}>МИНУТЫ</span>
              <select 
                value={minutes} 
                onChange={(e) => setMinutes(e.target.value)}
                className={css({ fontSize: "28px", fontWeight: "800", p: "12px", borderRadius: "14px", bg: "var(--surface-secondary)", border: "none", outline: "none", appearance: "none", textAlign: "center", w: "70px" })}
              >
                {Array.from({ length: 60 }).map((_, i) => (
                  <option key={i} value={String(i).padStart(2, '0')}>{String(i).padStart(2, '0')}</option>
                ))}
              </select>
            </div>
          </div>

          <button 
            type="button" 
            onClick={handleSave}
            className="sber-button"
            style={{ padding: "14px" }}
          >
            Готово
          </button>
        </div>
      )}
    </div>
  );
}
