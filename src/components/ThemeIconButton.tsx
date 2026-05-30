"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { css } from "../../styled-system/css";

export default function ThemeIconButton() {
  const [mounted, setMounted] = useState(false);
  const { theme, setTheme } = useTheme();

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div 
        className={css({ 
          w: "44px", 
          h: "44px", 
          bg: "var(--card-bg)", 
          borderRadius: "14px", 
          border: "1px solid", 
          borderColor: "var(--border-color)", 
          opacity: 0.5 
        })} 
      />
    );
  }

  const isDark = theme === "dark";

  return (
    <button
      onClick={() => setTheme(isDark ? "light" : "dark")}
      aria-label="Toggle theme"
      className={css({
        w: "44px",
        h: "44px",
        bg: "var(--card-bg)",
        color: "var(--secondary-text)",
        borderRadius: "14px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        shadow: "sm",
        border: "1px solid",
        borderColor: "var(--border-color)",
        cursor: "pointer",
        transition: "all 0.2s",
        _hover: {
          color: "var(--foreground)",
          transform: "scale(1.05)",
        },
        _active: {
          transform: "scale(0.95)",
        }
      })}
    >
      {isDark ? <Sun size={20} /> : <Moon size={20} />}
    </button>
  );
}
