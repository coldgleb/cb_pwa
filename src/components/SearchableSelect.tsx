"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { css } from "../../styled-system/css";
import { stack, flex } from "../../styled-system/patterns";
import { Search, ChevronDown, Check, Plus } from "lucide-react";

interface Option {
  value: string;
  label: string;
  disabled?: boolean;
}

interface SearchableSelectProps {
  name: string;
  options: Option[];
  defaultValue?: string;
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  allowCustom?: boolean;
  disabled?: boolean;
}

export default function SearchableSelect({
  name,
  options,
  defaultValue = "",
  value,
  onChange,
  placeholder = "Выберите вариант...",
  required = false,
  allowCustom = false,
  disabled = false,
}: SearchableSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const [innerValue, setInnerValue] = useState(defaultValue);
  
  const currentSelection = useMemo(() => 
    options.find((opt) => opt.value === (value !== undefined ? value : innerValue)) || 
    (allowCustom && (value || innerValue) ? { value: (value || innerValue)!, label: (value || innerValue)! } : null),
    [options, value, innerValue, allowCustom]
  );

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

  const handleSelect = (option: Option) => {
    if (option.disabled) return;
    if (value === undefined) {
      setInnerValue(option.value);
    }
    setIsOpen(false);
    setSearchValue("");
    if (onChange) {
      onChange(option.value);
    }
  };

  return (
    <div ref={containerRef} className={css({ position: "relative", w: "full", userSelect: "none" })}>
      <input type="hidden" name={name} value={currentSelection?.value || ""} required={required} />
      
      {/* Trigger / Input */}
      <div 
        role="button"
        tabIndex={disabled ? -1 : 0}
        onClick={(e) => {
          if (disabled) return;
          e.preventDefault();
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        className={flex({ 
          align: "center", 
          gap: "10px", 
          px: "14px", 
          py: "12px", 
          bg: disabled ? "var(--surface-secondary)" : "var(--input-bg)", 
          border: "1px solid", 
          borderColor: isOpen ? "var(--sber-green)" : "var(--border-color)", 
          borderRadius: "14px", 
          cursor: disabled ? "not-allowed" : "pointer",
          transition: "all 0.2s",
          WebkitTapHighlightColor: "transparent",
          _active: { bg: disabled ? "var(--surface-secondary)" : "var(--surface-secondary)" },
          w: "full",
          opacity: disabled ? 0.7 : 1
        })}
      >
        <div className={css({ flex: 1, overflow: "hidden", minW: 0 })}>
          {currentSelection ? (
            <p className={css({ fontSize: "14px", fontWeight: "600", color: disabled ? "var(--secondary-text)" : "var(--foreground)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" })}>
              {currentSelection.label}
            </p>
          ) : (
            <p className={css({ fontSize: "14px", color: "var(--secondary-text)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" })}>{placeholder}</p>
          )}
        </div>
        {!disabled && <ChevronDown size={18} className={css({ color: "var(--secondary-text)", transform: isOpen ? "rotate(180deg)" : "none", transition: "transform 0.2s" })} />}
      </div>

      {/* Dropdown Panel */}
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
          border: "1px solid", 
          borderColor: "var(--border-color)", 
          zIndex: 10000, 
          p: "12px",
          gap: "4px",
          maxH: { base: "80vh", md: "320px" },
          overflow: "hidden"
        })}>
          {/* Mobile Handle */}
          <div className={css({ 
            display: { base: "block", md: "none" }, 
            w: "40px", 
            h: "4px", 
            bg: "var(--border-color)", 
            borderRadius: "full", 
            mx: "auto", 
            mb: "12px" 
          })} />

          {/* Search Input inside dropdown */}
          <div className={flex({ align: "center", gap: "10px", px: "12px", py: { base: "14px", md: "10px" }, bg: "var(--surface-secondary)", borderRadius: "12px", mb: "8px" })}>
            <Search size={18} className={css({ color: "var(--secondary-text)" })} />
            <input 
              autoFocus
              placeholder="Поиск..."
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              className={css({ bg: "transparent", border: "none", outline: "none", fontSize: "16px", w: "full", color: "var(--foreground)" })}
            />
          </div>

          <div className={css({ 
            overflowY: "auto", 
            maxH: { base: "calc(80vh - 100px)", md: "220px" }, 
            pr: "4px", 
            WebkitOverflowScrolling: "touch" 
          })}>
            {filteredOptions.length > 0 ? (
              filteredOptions.map((opt) => (
                <div 
                  key={opt.value}
                  onClick={() => handleSelect(opt)}
                  className={flex({ 
                    align: "center", 
                    justify: "space-between",
                    px: "12px", 
                    py: { base: "14px", md: "10px" }, 
                    borderRadius: "10px", 
                    cursor: opt.disabled ? "default" : "pointer", 
                    WebkitTapHighlightColor: "transparent",
                    _hover: opt.disabled ? {} : { bg: "var(--surface-secondary)" },
                    _active: opt.disabled ? {} : { bg: "var(--border-color)" },
                    bg: currentSelection?.value === opt.value ? "rgba(33, 160, 56, 0.1)" : "transparent",
                    opacity: opt.disabled ? 0.6 : 1
                  })}
                >
                  <span className={css({ 
                    fontSize: "14px", 
                    fontWeight: opt.disabled ? "800" : (currentSelection?.value === opt.value ? "700" : "500"),
                    color: currentSelection?.value === opt.value ? "var(--sber-green)" : "var(--foreground)",
                    textTransform: opt.disabled ? "uppercase" : "none",
                    letterSpacing: opt.disabled ? "0.02em" : "normal"
                  })}>
                    {opt.label}
                  </span>
                  {currentSelection?.value === opt.value && !opt.disabled && <Check size={16} className={css({ color: "var(--sber-green)" })} />}
                </div>
              ))
            ) : (
              searchValue && allowCustom ? (
                <div 
                  onClick={() => handleSelect({ value: searchValue, label: searchValue })}
                  className={flex({ 
                    align: "center", 
                    gap: "10px",
                    px: "12px", 
                    py: { base: "14px", md: "10px" }, 
                    borderRadius: "10px", 
                    cursor: "pointer", 
                    bg: "rgba(59, 130, 246, 0.1)",
                    color: "rgb(59, 130, 246)",
                    _hover: { bg: "rgba(59, 130, 246, 0.2)" }
                  })}
                >
                  <Plus size={16} />
                  <span className={css({ fontSize: "14px", fontWeight: "700" })}>Использовать &quot;{searchValue}&quot;</span>
                </div>
              ) : (
                <div className={css({ py: "30px", textAlign: "center", color: "var(--secondary-text)", fontSize: "14px" })}>
                  Ничего не найдено
                </div>
              )
            )}
          </div>
        </div>
      )}
    </div>
  );
}
