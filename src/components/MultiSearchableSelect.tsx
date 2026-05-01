"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { css } from "../../styled-system/css";
import { stack, flex } from "../../styled-system/patterns";
import { Search, ChevronDown, Check } from "lucide-react";

interface Option {
  value: string;
  label: string;
}

interface MultiSearchableSelectProps {
  name: string;
  options: Option[];
  defaultValue?: string[]; // Array of values
  placeholder?: string;
  required?: boolean;
}

export default function MultiSearchableSelect({
  name,
  options,
  defaultValue = [],
  placeholder = "Выберите варианты...",
  required = false,
}: MultiSearchableSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const [selectedValues, setSelectedValues] = useState<Set<string>>(new Set(defaultValue));
  
  const containerRef = useRef<HTMLDivElement>(null);

  const filteredOptions = useMemo(() => options.filter(
    (opt) =>
      opt.label.toLowerCase().includes(searchValue.toLowerCase()) ||
      opt.value.toLowerCase().includes(searchValue.toLowerCase())
  ), [options, searchValue]);

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

  const toggleSelect = (value: string) => {
    const newSet = new Set(selectedValues);
    if (newSet.has(value)) {
      newSet.delete(value);
    } else {
      newSet.add(value);
    }
    setSelectedValues(newSet);
  };

  const getDisplayText = () => {
    if (selectedValues.size === 0) return placeholder;
    if (selectedValues.size === 1) {
      const selected = options.find(o => o.value === Array.from(selectedValues)[0]);
      return selected ? selected.label : placeholder;
    }
    return `Выбрано: ${selectedValues.size}`;
  };

  return (
    <div ref={containerRef} className={css({ position: "relative", w: "full", userSelect: "none" })}>
      <input type="hidden" name={name} value={JSON.stringify(Array.from(selectedValues))} required={required && selectedValues.size === 0} />
      
      {/* Trigger / Input */}
      <div 
        role="button"
        tabIndex={0}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        className={flex({ 
          align: "center", 
          gap: "10px", 
          px: "14px", 
          py: "12px", 
          bg: "var(--input-bg)", 
          border: "1px solid", 
          borderColor: isOpen ? "var(--sber-green)" : "var(--border-color)", 
          borderRadius: "14px", 
          cursor: "pointer",
          transition: "all 0.2s",
          WebkitTapHighlightColor: "transparent",
          _active: { bg: "var(--surface-secondary)" },
          w: "full"
        })}
      >
        <div className={css({ flex: 1, overflow: "hidden", minW: 0 })}>
          <p className={css({ 
            fontSize: "14px", 
            fontWeight: selectedValues.size > 0 ? "600" : "400", 
            color: selectedValues.size > 0 ? "var(--foreground)" : "var(--secondary-text)", 
            whiteSpace: "nowrap", 
            overflow: "hidden", 
            textOverflow: "ellipsis" 
          })}>
            {getDisplayText()}
          </p>
        </div>
        <ChevronDown size={18} className={css({ color: "var(--secondary-text)", transform: isOpen ? "rotate(180deg)" : "none", transition: "transform 0.2s" })} />
      </div>

      {/* Dropdown Panel */}
      {isOpen && (
        <div className={stack({ 
          position: "absolute", 
          top: "calc(100% + 4px)", 
          left: 0, 
          right: 0, 
          bg: "var(--card-bg)", 
          borderRadius: "18px", 
          shadow: "0 10px 25px -5px rgba(0, 0, 0, 0.15), 0 8px 10px -6px rgba(0, 0, 0, 0.1)", 
          border: "1px solid", 
          borderColor: "var(--border-color)", 
          zIndex: 9999, 
          p: "8px",
          gap: "4px",
          maxH: "260px",
          overflow: "visible"
        })}>
          {/* Search Input inside dropdown */}
          <div className={flex({ align: "center", gap: "10px", px: "12px", py: "10px", bg: "var(--surface-secondary)", borderRadius: "12px", mb: "4px" })}>
            <Search size={16} className={css({ color: "var(--secondary-text)" })} />
            <input 
              autoFocus
              placeholder="Поиск..."
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              className={css({ bg: "transparent", border: "none", outline: "none", fontSize: "16px", w: "full", color: "var(--foreground)" })}
            />
          </div>

          <div className={css({ overflowY: "auto", maxH: "180px", pr: "4px", WebkitOverflowScrolling: "touch" })}>
            {filteredOptions.length > 0 ? (
              filteredOptions.map((opt) => {
                const isSelected = selectedValues.has(opt.value);
                return (
                  <div 
                    key={opt.value}
                    onPointerDown={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      toggleSelect(opt.value);
                    }}
                    className={flex({ 
                      align: "center", 
                      justify: "space-between",
                      px: "12px", 
                      py: "10px", 
                      borderRadius: "10px", 
                      cursor: "pointer", 
                      WebkitTapHighlightColor: "transparent",
                      _hover: { bg: "var(--surface-secondary)" },
                      _active: { bg: "var(--border-color)" },
                      bg: isSelected ? "rgba(33, 160, 56, 0.1)" : "transparent"
                    })}
                  >
                    <div className={flex({ align: "center", gap: "12px" })}>
                      <div className={css({ 
                        w: "18px", h: "18px", borderRadius: "6px", border: "2px solid", 
                        borderColor: isSelected ? "var(--sber-green)" : "var(--border-color)",
                        bg: isSelected ? "var(--sber-green)" : "transparent",
                        display: "flex", alignItems: "center", justifyContent: "center"
                      })}>
                        {isSelected && <Check size={12} color="white" strokeWidth={3} />}
                      </div>
                      <span className={css({ 
                        fontSize: "13px", 
                        fontWeight: isSelected ? "700" : "500",
                        color: isSelected ? "var(--sber-green)" : "var(--foreground)" 
                      })}>
                        {opt.label}
                      </span>
                    </div>
                  </div>
                )
              })
            ) : (
              <div className={css({ py: "20px", textAlign: "center", color: "var(--secondary-text)", fontSize: "13px" })}>
                Ничего не найдено
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
