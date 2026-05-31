import { auth } from "@/auth";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { css } from "../../../styled-system/css";
import { stack, flex } from "../../../styled-system/patterns";
import { ArrowLeft, User, Moon, BarChart2, Search, Sliders, ChevronRight, LayoutDashboard } from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";
import { ProfileUpdateForm, PasswordChangeForm } from "@/components/ProfileForms";
import Link from "next/link";

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
      <div className={css({ 
        w: "full", 
        maxW: { base: "512px", lg: "1100px" }, 
        mx: "auto", 
        px: "20px", 
        py: "32px",
        pb: "calc(80px + env(safe-area-inset-bottom))"
      })}>
        
        <header className={flex({ align: "center", gap: "16px", mb: "32px" })}>
          <Link href="/" className={css({ w: "40px", h: "40px", bg: "var(--card-bg)", borderRadius: "full", shadow: "sm", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--secondary-text)", border: "1px solid", borderColor: "var(--border-color)", cursor: "pointer" })}>
            <ArrowLeft size={20} />
          </Link>
          <h1 className={css({ fontSize: "24px", fontWeight: "800", color: "var(--foreground)" })}>Личный кабинет</h1>
        </header>

        <div className={stack({ gap: "24px" })}>
          
          <ProfileUpdateForm initialName={user.name || ""} />

          {/* Tools Section */}
          <section className="sber-card">
            <div className={flex({ align: "center", gap: "10px", mb: "20px" })}>
              <div className={css({ p: "8px", bg: "var(--surface-secondary)", borderRadius: "10px", color: "var(--sber-green)" })}>
                <LayoutDashboard size={18} />
              </div>
              <h2 className={css({ fontSize: "18px", fontWeight: "800", color: "var(--foreground)" })}>Инструменты</h2>
            </div>
            
            <div className={stack({ gap: "12px" })}>
              <Link href="/search" className={flex({ justify: "space-between", align: "center", p: "16px", bg: "var(--surface-secondary)", borderRadius: "16px", transition: "all 0.2s", _hover: { transform: "translateX(4px)", bg: "var(--border-color)" } })}>
                <div className={flex({ align: "center", gap: "12px" })}>
                  <Search size={20} className={css({ color: "var(--sber-green)" })} />
                  <div className={stack({ gap: "0" })}>
                    <span className={css({ fontWeight: "700", fontSize: "15px" })}>Выбор лучшей карты</span>
                    <span className={css({ fontSize: "12px", color: "var(--secondary-text)" })}>Узнать, где больше кешбэк</span>
                  </div>
                </div>
                <ChevronRight size={18} className={css({ color: "var(--secondary-text)" })} />
              </Link>

              <Link href="/statistics" className={flex({ justify: "space-between", align: "center", p: "16px", bg: "var(--surface-secondary)", borderRadius: "16px", transition: "all 0.2s", _hover: { transform: "translateX(4px)", bg: "var(--border-color)" } })}>
                <div className={flex({ align: "center", gap: "12px" })}>
                  <BarChart2 size={20} className={css({ color: "#3b82f6" })} />
                  <div className={stack({ gap: "0" })}>
                    <span className={css({ fontWeight: "700", fontSize: "15px" })}>Статистика трат</span>
                    <span className={css({ fontSize: "12px", color: "var(--secondary-text)" })}>Анализ расходов по категориям</span>
                  </div>
                </div>
                <ChevronRight size={18} className={css({ color: "var(--secondary-text)" })} />
              </Link>
            </div>
          </section>

          {/* Admin Section */}
          {user.role === "admin" && (
            <section className="sber-card" style={{ border: "1px solid rgba(59, 130, 246, 0.3)" }}>
              <div className={flex({ align: "center", gap: "10px", mb: "20px" })}>
                <div className={css({ p: "8px", bg: "rgba(59, 130, 246, 0.1)", borderRadius: "10px", color: "#3b82f6" })}>
                  <Sliders size={18} />
                </div>
                <h2 className={css({ fontSize: "18px", fontWeight: "800", color: "var(--foreground)" })}>Администрирование</h2>
              </div>
              
              <div className={stack({ gap: "12px" })}>
                <Link href="/admin/banks" className={flex({ justify: "space-between", align: "center", p: "16px", bg: "rgba(59, 130, 246, 0.05)", borderRadius: "16px", transition: "all 0.2s", _hover: { transform: "translateX(4px)", bg: "rgba(59, 130, 246, 0.1)" } })}>
                  <span className={css({ fontWeight: "700", fontSize: "15px" })}>Банки, карты и программы</span>
                  <ChevronRight size={18} />
                </Link>
                <Link href="/admin/merchants" className={flex({ justify: "space-between", align: "center", p: "16px", bg: "rgba(59, 130, 246, 0.05)", borderRadius: "16px", transition: "all 0.2s", _hover: { transform: "translateX(4px)", bg: "rgba(59, 130, 246, 0.1)" } })}>
                  <span className={css({ fontWeight: "700", fontSize: "15px" })}>Торговые точки и MCC</span>
                </Link>
                <Link href="/admin/spending-categories" className={flex({ justify: "space-between", align: "center", p: "16px", bg: "rgba(59, 130, 246, 0.05)", borderRadius: "16px", transition: "all 0.2s", _hover: { transform: "translateX(4px)", bg: "rgba(59, 130, 246, 0.1)" } })}>
                  <span className={css({ fontWeight: "700", fontSize: "15px" })}>Категории расходов</span>
                </Link>
                <Link href="/admin/recalculate" className={flex({ justify: "space-between", align: "center", p: "16px", bg: "rgba(59, 130, 246, 0.05)", borderRadius: "16px", transition: "all 0.2s", _hover: { transform: "translateX(4px)", bg: "rgba(59, 130, 246, 0.1)" } })}>
                  <span className={css({ fontWeight: "700", fontSize: "15px" })}>Глобальный пересчет</span>
                </Link>
              </div>
            </section>
          )}

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
