import RecalculateProgress from "@/components/admin/RecalculateProgress";
import { css } from "../../../../../styled-system/css";
import { stack } from "../../../../../styled-system/patterns";

export default function RecalculatePage() {
  return (
    <div className={stack({ gap: "32px" })}>
      <header className={stack({ gap: "8px" })}>
        <div className={css({ 
          display: "inline-flex", 
          px: "8px", 
          py: "2px", 
          bg: "rgba(33, 160, 56, 0.1)", 
          color: "var(--sber-green)", 
          borderRadius: "6px", 
          fontSize: "10px", 
          fontWeight: "800",
          textTransform: "uppercase",
          letterSpacing: "0.05em",
          width: "fit-content"
        })}>
          Администрирование
        </div>
        <h1 className={css({ fontSize: "28px", fontWeight: "900", color: "var(--foreground)" })}>
          Пересчет операций
        </h1>
      </header>

      <RecalculateProgress />
    </div>
  );
}
