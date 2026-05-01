"use client";

import { useState, useTransition } from "react";
import { stack, flex } from "../../styled-system/patterns";
import { css } from "../../styled-system/css";
import { Save, User, Lock } from "lucide-react";
import { updateProfile, updatePassword } from "@/lib/actions/auth";
import { useToast } from "@/components/Toast";

interface ProfileUpdateFormProps {
  initialName: string;
}

export function ProfileUpdateForm({ initialName }: ProfileUpdateFormProps) {
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();

  async function action(formData: FormData) {
    startTransition(async () => {
      try {
        await updateProfile(formData);
        toast("Профиль успешно обновлен", "success");
      } catch (error) {
        toast(error instanceof Error ? error.message : "Ошибка при обновлении профиля", "error");
      }
    });
  }

  return (
    <section className="sber-card">
      <div className={flex({ align: "center", gap: "10px", mb: "20px" })}>
        <div className={css({ p: "8px", bg: "var(--sber-green)", borderRadius: "10px", color: "white" })}>
          <User size={18} />
        </div>
        <h2 className={css({ fontSize: "18px", fontWeight: "800", color: "var(--foreground)" })}>Данные профиля</h2>
      </div>
      
      <form action={action} className={stack({ gap: "16px" })}>
        <div className={stack({ gap: "6px" })}>
          <label className="sber-label">ИМЯ</label>
          <input
            name="name"
            type="text"
            defaultValue={initialName}
            required
            className="sber-input"
          />
        </div>
        <button type="submit" className="sber-button" disabled={isPending}>
          <Save size={18} /> {isPending ? "Сохранение..." : "Сохранить профиль"}
        </button>
      </form>
    </section>
  );
}

export function PasswordChangeForm() {
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();
  const [password, setPassword] = useState("");

  async function action(formData: FormData) {
    startTransition(async () => {
      try {
        await updatePassword(formData);
        toast("Пароль успешно изменен", "success");
        setPassword(""); // Clear password field on success
      } catch (error) {
        toast(error instanceof Error ? error.message : "Ошибка при смене пароля", "error");
      }
    });
  }

  return (
    <section className="sber-card">
      <div className={flex({ align: "center", gap: "10px", mb: "20px" })}>
        <div className={css({ p: "8px", bg: "#6366f1", borderRadius: "10px", color: "white" })}>
          <Lock size={18} />
        </div>
        <h2 className={css({ fontSize: "18px", fontWeight: "800", color: "var(--foreground)" })}>Смена пароля</h2>
      </div>
      
      <form action={action} className={stack({ gap: "16px" })}>
        <div className={stack({ gap: "6px" })}>
          <label className="sber-label">НОВЫЙ ПАРОЛЬ</label>
          <input
            name="password"
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Минимум 6 символов"
            className="sber-input"
          />
        </div>
        <button type="submit" className="sber-button" style={{ backgroundColor: "#6366f1" }} disabled={isPending}>
          <Save size={18} /> {isPending ? "Обновление..." : "Обновить пароль"}
        </button>
      </form>
    </section>
  );
}
