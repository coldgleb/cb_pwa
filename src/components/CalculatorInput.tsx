"use client";

import { useState, useEffect, useRef } from "react";
import { css } from "../../styled-system/css";

interface CalculatorInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  name: string;
  defaultValue?: string | number;
}

export default function CalculatorInput({ name, defaultValue, className, ...props }: CalculatorInputProps) {
  const [inputValue, setInputValue] = useState(defaultValue?.toString() || "");
  const [result, setResult] = useState<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const evaluateExpression = (val: string) => {
    try {
      // Normalize comma to dot for calculation
      const normalized = val.replace(/,/g, ".");
      // Remove all characters except numbers, dots, and operators + - * / ( )
      const sanitized = normalized.replace(/[^0-9.+\-*/()]/g, "");
      if (!sanitized) return null;
      
      // Use Function constructor as a safer alternative to eval for simple math
      // though still should be careful. For simple math it's generally okay.
      // eslint-disable-next-line no-new-func
      const calc = new Function(`return ${sanitized}`);
      const res = calc();
      
      if (typeof res === "number" && !isNaN(res) && isFinite(res)) {
        return res;
      }
    } catch (e) {
      return null;
    }
    return null;
  };

  const handleBlur = () => {
    const evaluated = evaluateExpression(inputValue);
    if (evaluated !== null) {
      const rounded = Math.round(evaluated * 100) / 100;
      setInputValue(rounded.toString());
      setResult(null);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleBlur();
      inputRef.current?.blur();
    }
  };

  useEffect(() => {
    const evaluated = evaluateExpression(inputValue);
    if (evaluated !== null && inputValue.match(/[+\-*/()]/)) {
      setResult(evaluated);
    } else {
      setResult(null);
    }
  }, [inputValue]);

  return (
    <div className={css({ position: "relative", w: "full" })}>
      <input
        ref={inputRef}
        type="text"
        name={name}
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        className={className}
        {...props}
      />
      {result !== null && (
        <div className={css({
          position: "absolute",
          right: "12px",
          top: "50%",
          transform: "translateY(-50%)",
          bg: "var(--sber-green)",
          color: "white",
          px: "8px",
          py: "2px",
          borderRadius: "6px",
          fontSize: "12px",
          fontWeight: "800",
          pointerEvents: "none",
          shadow: "sm",
          zIndex: 10
        })}>
          = {result.toLocaleString("ru-RU")}
        </div>
      )}
    </div>
  );
}
