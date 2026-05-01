import { auth } from "@/auth";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { css } from "../../../styled-system/css";
import { stack, flex } from "../../../styled-system/patterns";
import { ArrowLeft, User, Lock, Moon } from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";
import { ProfileUpdateForm, PasswordChangeForm } from "@/components/ProfileForms";

export default async function ProfilePage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/");
  }

  const [user] = await db.select().from(users).where(eq(users.id, session.user.id)).limit(1);

  if (!user) {
    redirect("/");
  }

  return (
    <div className={css({ minH: "100vh", bg: "var(--background)" })}>
      <div className="sber-container">
        
        <header className={flex({ align: "center", gap: "16px", mb: "32px" })}>
          <a href="/" className={css({ w: "40px", h: "40px", bg: "var(--card-bg)", borderRadius: "full", shadow: "sm", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--secondary-text)", border: "1px solid", borderColor: "var(--border-color)", cursor: "pointer" })}>
            <ArrowLeft size={20} />
          </a>
          <h1 className={css({ fontSize: "24px", fontWeight: "800", color: "var(--foreground)" })}>Личный кабинет</h1>
        </header>

        <div className={stack({ gap: "24px" })}>
          
          <ProfileUpdateForm initialName={user.name || ""} />

          <section className="sber-card">
            <div className={flex({ align: "center", gap: "10px", mb: "20px" })}>
              <div className={css({ p: "8px", bg: "var(--surface-secondary)", borderRadius: "10px", color: "white" })}>
                <User size={18} />
              </div>
              <h2 className={css({ fontSize: "18px", fontWeight: "800", color: "var(--foreground)" })}>Системная информация</h2>
            </div>
            <div className={stack({ gap: "16px" })}>
              <div className={stack({ gap: "6px" })}>
                <label className="sber-label">EMAIL</label>
                <input
                  type="text"
                  disabled
                  value={user.email}
                  className="sber-input"
                  style={{ opacity: 0.6, cursor: "not-allowed" }}
                />
              </div>
            </div>
          </section>

          <PasswordChangeForm />

          <section className="sber-card">
            <div className={flex({ align: "center", gap: "10px", mb: "20px" })}>
              <div className={css({ p: "8px", bg: "var(--surface-secondary)", borderRadius: "10px", color: "white" })}>
                <Moon size={18} />
              </div>
              <h2 className={css({ fontSize: "18px", fontWeight: "800", color: "var(--foreground)" })}>Внешний вид</h2>
            </div>
            
            <div className={stack({ gap: "8px" })}>
              <label className="sber-label">ТЕМА ОФОРМЛЕНИЯ</label>
              <ThemeToggle />
            </div>
          </section>

        </div>
      </div>
    </div>
  );
}

