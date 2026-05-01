import { css } from "../../../../styled-system/css";
import { stack, flex } from "../../../../styled-system/patterns";
import { BarChart2, Clock } from "lucide-react";

export default function StatisticsPage() {
  return (
    <div className={css({ minH: "100vh", bg: "var(--background)" })}>
      <div className="sber-container">
        <header className={stack({ gap: "4px", mb: "32px" })}>
          <h1 className={css({ fontSize: "24px", fontWeight: "800", color: "var(--foreground)" })}>Статистика</h1>
        </header>

        <section className={stack({ align: "center", py: "60px", gap: "20px" })}>
          <div className={css({ 
            w: "80px", 
            h: "80px", 
            bg: "var(--card-bg)", 
            borderRadius: "28px", 
            display: "flex", 
            alignItems: "center", 
            justifyContent: "center", 
            color: "#94a3b8",
            shadow: "sm",
            border: "1px solid",
            borderColor: "#f1f5f9"
          })}>
            <BarChart2 size={40} />
          </div>
          <div className={stack({ gap: "8px", textAlign: "center" })}>
            <h2 className={css({ fontSize: "18px", fontWeight: "700", color: "var(--foreground)" })}>Скоро здесь будет график</h2>
            <p className={css({ fontSize: "14px", color: "secondaryText", maxWidth: "260px", mx: "auto", fontWeight: "500" })}>
              Различная статистика по вашим операциям и кешбэку появится в этом разделе позже.
            </p>
          </div>
          
          <div className={flex({ align: "center", gap: "8px", px: "16px", py: "8px", bg: "var(--surface-secondary)", borderRadius: "12px", color: "#64748b" })}>
            <Clock size={14} />
            <span className={css({ fontSize: "12px", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.05em" })}>В разработке</span>
          </div>
        </section>
      </div>
    </div>
  );
}
