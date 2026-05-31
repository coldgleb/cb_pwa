import RecalculateProgress from "@/components/admin/RecalculateProgress";
import { css } from "../../../../../styled-system/css";
import { stack, flex } from "../../../../../styled-system/patterns";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function RecalculatePage() {
  return (
    <div className={stack({ gap: "32px" })}>
      <header className={flex({ align: "center", gap: "16px" })}>
        <Link href="/profile" className="sber-icon-button">
          <ArrowLeft size={20} />
        </Link>
        <div className={stack({ gap: "0" })}>
          <h1 className={css({ fontSize: "24px", fontWeight: "800", color: "var(--foreground)" })}>Глобальный пересчет</h1>
          <p className={css({ fontSize: "14px", color: "var(--secondary-text)" })}>Обновление транзакций по новым правилам</p>
        </div>
      </header>

      <RecalculateProgress />
    </div>
  );
}
