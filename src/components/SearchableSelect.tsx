"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { css } from "../../styled-system/css";
import { stack, flex } from "../../styled-system/patterns";
import { Search, ChevronDown, Check, Plus } from "lucide-react";

interface Option {
  value: string;
  label: string;
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
          bg: "white", 
          border: "1px solid", 
          borderColor: isOpen ? "sberGreen" : "#e2e8f0", 
          borderRadius: "14px", 
          cursor: "pointer",
          transition: "all 0.2s",
          WebkitTapHighlightColor: "transparent",
          _active: { bg: "#f8fafc" },
          w: "full"
        })}
      >
        <div className={css({ flex: 1, overflow: "hidden", minW: 0 })}>
          {currentSelection ? (
            <p className={css({ fontSize: "14px", fontWeight: "600", color: "#000", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" })}>
              {currentSelection.label}
            </p>
          ) : (
            <p className={css({ fontSize: "14px", color: "#94a3b8", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" })}>{placeholder}</p>
          )}
        </div>
        <ChevronDown size={18} className={css({ color: "#64748b", transform: isOpen ? "rotate(180deg)" : "none", transition: "transform 0.2s" })} />
      </div>

      {/* Dropdown Panel */}
      {isOpen && (
        <div className={stack({ 
          position: "absolute", 
          top: "calc(100% + 4px)", 
          left: 0, 
          right: 0, 
          bg: "white", 
          borderRadius: "18px", 
          shadow: "0 10px 25px -5px rgba(0, 0, 0, 0.15), 0 8px 10px -6px rgba(0, 0, 0, 0.1)", 
          border: "1px solid", 
          borderColor: "#e2e8f0", 
          zIndex: 9999, 
          p: "8px",
          gap: "4px",
          maxH: "260px",
          overflow: "visible"
        })}>
          {/* Search Input inside dropdown */}
          <div className={flex({ align: "center", gap: "10px", px: "12px", py: "10px", bg: "#f8fafc", borderRadius: "12px", mb: "4px" })}>
            <Search size={16} className={css({ color: "#94a3b8" })} />
            <input 
              autoFocus
              placeholder="Поиск..."
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              className={css({ bg: "transparent", border: "none", outline: "none", fontSize: "16px", w: "full", color: "#000" })}
            />
          </div>

          <div className={css({ overflowY: "auto", maxH: "180px", pr: "4px", WebkitOverflowScrolling: "touch" })}>
            {filteredOptions.length > 0 ? (
              filteredOptions.map((opt) => (
                <div 
                  key={opt.value}
                  onPointerDown={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleSelect(opt);
                  }}
                  className={flex({ 
                    align: "center", 
                    justify: "space-between",
                    px: "12px", 
                    py: "10px", 
                    borderRadius: "10px", 
                    cursor: "pointer", 
                    WebkitTapHighlightColor: "transparent",
                    _hover: { bg: "#f1f5f9" },
                    _active: { bg: "#e2e8f0" },
                    bg: currentSelection?.value === opt.value ? "#f0fdf4" : "transparent"
                  })}
                >
                  <span className={css({ 
                    fontSize: "13px", 
                    fontWeight: currentSelection?.value === opt.value ? "700" : "500",
                    color: currentSelection?.value === opt.value ? "sberGreen" : "#334155" 
                  })}>
                    {opt.label}
                  </span>
                  {currentSelection?.value === opt.value && <Check size={14} className={css({ color: "sberGreen" })} />}
                </div>
              ))
            ) : (
              searchValue && allowCustom ? (
                <div 
                  onPointerDown={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleSelect({ value: searchValue, label: searchValue });
                  }}
                  className={flex({ 
                    align: "center", 
                    gap: "10px",
                    px: "12px", 
                    py: "10px", 
                    borderRadius: "10px", 
                    cursor: "pointer", 
                    bg: "#eff6ff",
                    color: "#1e40af",
                    _hover: { bg: "#dbeafe" }
                  })}
                >
                  <Plus size={14} />
                  <span className={css({ fontSize: "13px", fontWeight: "700" })}>Использовать "{searchValue}"</span>
                </div>
              ) : (
                <div className={css({ py: "20px", textAlign: "center", color: "#94a3b8", fontSize: "13px" })}>
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
