"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { css } from "../../styled-system/css";
import { flex, stack } from "../../styled-system/patterns";
import { Moon, Sun, Monitor } from "lucide-react";

export default function ThemeToggle() {
  const [mounted, setMounted] = useState(false);
  const { theme, setTheme } = useTheme();

  // useEffect only runs on the client, so now we can safely show the UI
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <div className={flex({ h: "44px", w: "full", bg: "var(--input-bg)", borderRadius: "12px" })} />;
  }

  return (
    <div className={flex({ gap: "8px", bg: "var(--input-bg)", p: "6px", borderRadius: "14px" })}>
      <button
        onClick={() => setTheme("light")}
        className={flex({ 
          align: "center", 
          justify: "center", 
          gap: "8px", 
          flex: 1, 
          py: "10px", 
          borderRadius: "10px",
          cursor: "pointer",
          transition: "all 0.2s",
          bg: theme === "light" ? "var(--card-bg)" : "transparent",
          color: theme === "light" ? "var(--foreground)" : "var(--secondary-text)",
          shadow: theme === "light" ? "0 2px 8px rgba(0,0,0,0.1)" : "none",
          fontWeight: theme === "light" ? "700" : "500",
          border: "none",
          outline: "none"
        })}
      >
        <Sun size={18} /> Светлая
      </button>
      <button
        onClick={() => setTheme("dark")}
        className={flex({ 
          align: "center", 
          justify: "center", 
          gap: "8px", 
          flex: 1, 
          py: "10px", 
          borderRadius: "10px",
          cursor: "pointer",
          transition: "all 0.2s",
          bg: theme === "dark" ? "var(--card-bg)" : "transparent",
          color: theme === "dark" ? "var(--foreground)" : "var(--secondary-text)",
          shadow: theme === "dark" ? "0 2px 8px rgba(0,0,0,0.1)" : "none",
          fontWeight: theme === "dark" ? "700" : "500",
          border: "none",
          outline: "none"
        })}
      >
        <Moon size={18} /> Темная
      </button>
      <button
        onClick={() => setTheme("system")}
        className={flex({ 
          align: "center", 
          justify: "center", 
          gap: "8px", 
          flex: 1, 
          py: "10px", 
          borderRadius: "10px",
          cursor: "pointer",
          transition: "all 0.2s",
          bg: theme === "system" ? "var(--card-bg)" : "transparent",
          color: theme === "system" ? "var(--foreground)" : "var(--secondary-text)",
          shadow: theme === "system" ? "0 2px 8px rgba(0,0,0,0.1)" : "none",
          fontWeight: theme === "system" ? "700" : "500",
          border: "none",
          outline: "none"
        })}
      >
        <Monitor size={18} /> Авто
      </button>
    </div>
  );
}
