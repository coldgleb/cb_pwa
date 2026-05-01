import { registerUser } from "@/lib/actions/auth";
import { css } from "../../../styled-system/css";
import { stack, container, flex } from "../../../styled-system/patterns";
import { Wallet, UserPlus } from "lucide-react";

export const dynamic = "force-dynamic";

export default function RegisterPage() {
  return (
    <div className={css({ minH: "100vh", bg: "var(--background)" })}>
      <div className="sber-container" style={{ maxWidth: "440px" }}>
        <div className={stack({ align: "center", mb: "40px", gap: "12px" })}>
          <div className={css({ w: "80px", h: "80px", bg: "sberGreen", borderRadius: "28px", display: "flex", alignItems: "center", justifyContent: "center", color: "white", shadow: "0 10px 25px rgba(33,160,56,0.3)", mb: "12px" })}>
            <UserPlus size={44} />
          </div>
          <h1 className={css({ fontSize: "28px", fontWeight: "900", letterSpacing: "-0.5px", color: "var(--foreground)" })}>Новый профиль</h1>
          <p className={css({ color: "secondaryText", fontSize: "15px", textAlign: "center", fontWeight: "500", maxWidth: "280px" })}>
            Создайте аккаунт, чтобы начать отслеживать кешбэк
          </p>
        </div>

        <section className="sber-card">
          <form action={registerUser} className={stack({ gap: "20px" })}>
            <div className={stack({ gap: "8px" })}>
              <label className="sber-label">ВАШЕ ИМЯ</label>
              <input
                name="name"
                type="text"
                placeholder="Иван"
                className="sber-input"
              />
            </div>
            <div className={stack({ gap: "8px" })}>
              <label className="sber-label">EMAIL</label>
              <input
                name="email"
                type="email"
                required
                placeholder="example@mail.ru"
                className="sber-input"
              />
            </div>
            <div className={stack({ gap: "8px" })}>
              <label className="sber-label">ПАРОЛЬ</label>
              <input
                name="password"
                type="password"
                required
                placeholder="••••••••"
                className="sber-input"
              />
            </div>
            <button className="sber-button" style={{ marginTop: '12px' }}>
              Зарегистрироваться
            </button>
          </form>
        </section>

        <div className={stack({ align: "center", gap: "6px", mt: "24px" })}>
          <p className={css({ fontSize: "14px", color: "secondaryText", fontWeight: "500" })}>Уже есть аккаунт?</p>
          <a href="/" className={css({ fontSize: "14px", fontWeight: "800", color: "sberGreen", textDecoration: "underline", textUnderlineOffset: "4px" })}>
            Войти в профиль
          </a>
        </div>
      </div>
    </div>
  );
}
