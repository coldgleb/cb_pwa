"use client";

import { useTransition } from "react";
import { css } from "../../styled-system/css";
import { stack, flex } from "../../styled-system/patterns";
import { CreditCard, Save } from "lucide-react";
import { useToast } from "./Toast";
import { useRouter } from "next/navigation";

interface EditUserCardFormProps {
  card: {
    id: number;
    lastFour: string | null;
    cashbackLimit: number | null;
    initialBalance: number;
    accountType: string;
    creditLimit: number | null;
  };
  updateUserCardAction: (formData: FormData) => Promise<void>;
}

export default function EditUserCardForm({ card, updateUserCardAction }: EditUserCardFormProps) {
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();
  const router = useRouter();

  async function handleSubmit(formData: FormData) {
    startTransition(async () => {
      try {
        await updateUserCardAction(formData);
        toast("Настройки сохранены", "success");
        router.refresh();
      } catch (e) {
        toast(e instanceof Error ? e.message : "Ошибка при сохранении", "error");
      }
    });
  }

  return (
    <section className="sber-card">
      <div className={flex({ align: "center", gap: "10px", mb: "24px" })}>
        <div className={css({ p: "6px", bg: "var(--secondary-text)", borderRadius: "8px", color: "white" })}>
          <CreditCard size={18} />
        </div>
        <h2 className={css({ fontSize: "17px", fontWeight: "700", color: "var(--foreground)" })}>Настройки карты</h2>
      </div>

      <form action={handleSubmit} className={stack({ gap: "20px" })}>
        <input type="hidden" name="accountType" value={card.accountType} />

        <div className={flex({ gap: "12px", wrap: "wrap" })}>
          <div className={stack({ gap: "6px", flex: 1, minW: "140px" })}>
            <label className="sber-label">ПОСЛЕДНИЕ 4 ЦИФРЫ</label>
            <input
              name="lastFourDigits"
              type="text"
              maxLength={4}
              defaultValue={card.lastFour || ""}
              placeholder="0000"
              className="sber-input"
            />
          </div>
          <div className={stack({ gap: "6px", flex: 1, minW: "140px" })}>
            <label className="sber-label">ЛИМИТ КЕШБЭКА (₽)</label>
            <input
              name="cashbackLimit"
              type="number"
              defaultValue={card.cashbackLimit || ""}
              placeholder="Например, 5000"
              className="sber-input"
            />
          </div>
          <div className={stack({ gap: "6px", flex: 1, minW: "140px" })}>
            <label className="sber-label">НАЧАЛЬНЫЙ БАЛАНС (₽)</label>
            <input
              name="initialBalance"
              type="number"
              step="0.01"
              defaultValue={card.initialBalance ?? 0}
              placeholder={card.accountType === "credit" ? "-5000.00" : "0.00"}
              className="sber-input"
              style={{ fontWeight: "700" }}
            />
            {card.accountType === "credit" && (
              <span className={css({ fontSize: "11px", color: "var(--secondary-text)", fontWeight: "500" })}>
                Укажите с минусом, если есть задолженность (например, -15000)
              </span>
            )}
          </div>

          <div className={stack({ gap: "6px", flex: 1, minW: "140px" })}>
            <label className="sber-label">ТИП СЧЕТА</label>
            <input
              type="text"
              readOnly
              disabled
              value={
                card.accountType === "credit" ? "Кредитная карта" : 
                card.accountType === "cardless" ? "Счет без карты" : 
                card.accountType === "investments" ? "Инвестиции" : 
                card.accountType === "bonus" ? "Бонусный счет" : 
                "Дебетовая карта"
              }
              className="sber-input"
              style={{ opacity: 0.7, cursor: "not-allowed" }}
            />
          </div>

          {card.accountType === "credit" && (
            <div className={stack({ gap: "6px", flex: "1 1 100%", minW: "140px" })}>
              <label className="sber-label">КРЕДИТНЫЙ ЛИМИТ (₽)</label>
              <input 
                name="creditLimit" 
                type="number" 
                step="0.01" 
                defaultValue={card.creditLimit || ""}
                placeholder="50000.00" 
                className="sber-input" 
                style={{ fontWeight: "700" }}
              />
            </div>
          )}
        </div>
        <button type="submit" className="sber-button" disabled={isPending} style={{ backgroundColor: "var(--secondary-text)" }}>
          <Save size={18} /> {isPending ? "Сохранение..." : "Сохранить настройки"}
        </button>
      </form>
    </section>
  );
}
