import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { ReactNode } from "react";
import { css } from "../../../../styled-system/css";
import { flex, container, stack } from "../../../../styled-system/patterns";
import { Landmark, CreditCard, Hash, LayoutDashboard, Store } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const session = await auth();

  if (session?.user?.role !== "admin") {
    redirect("/");
  }

  const navItems = [
    { label: "Банки", href: "/admin/banks", icon: Landmark },
    { label: "Карты", href: "/admin/bank-cards", icon: CreditCard },
    { label: "МСС", href: "/admin/mcc", icon: Hash },
    { label: "Мерчанты", href: "/admin/merchants", icon: Store },
  ];

  return (
    <div className={css({ minH: "100vh", bg: "var(--background)", color: "var(--foreground)" })}>
      {/* Fixed Header Container */}
      <div className={css({ position: "sticky", top: 0, zIndex: 100, bg: "var(--background)" })}>
        {/* Навигация */}
        <nav className={css({ bg: "var(--card-bg)", borderBottom: "1px solid", borderColor: "var(--border-color)", py: "12px" })}>
          <div className={container({ maxWidth: { base: "512px", lg: "100%" }, px: { base: "20px", lg: "40px" } })}>
            <div className={flex({ align: "center", justify: "space-between" })}>
              <div className={flex({ align: "center", gap: "10px" })}>
                <div className={css({ w: "32px", h: "32px", bg: "var(--foreground)", borderRadius: "10px", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--card-bg)", fontSize: "10px", fontWeight: "bold" })}>
                  AD
                </div>
                <span className={css({ fontSize: "15px", fontWeight: "800", color: "var(--foreground)" })}>Админка</span>
              </div>
              <a href="/" className={css({ p: "8px", color: "var(--sber-green)" })}>
                <LayoutDashboard size={20} />
              </a>
            </div>
          </div>
        </nav>

        {/* Горизонтальное меню */}
        <div className={css({ bg: "var(--card-bg)", mb: "24px" })}>
          <div className={container({ maxWidth: { base: "512px", lg: "100%" }, px: { base: "20px", lg: "40px" }, py: "16px" })}>
            <div className={flex({ gap: "16px", overflowX: "auto" })}>
              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <a key={item.href} href={item.href} className={stack({ align: "center", gap: "8px", minW: "80px" })}>
                    <div className={css({ 
                      w: "48px", 
                      h: "48px", 
                      borderRadius: "14px", 
                      bg: "var(--input-bg)", 
                      display: "flex", 
                      alignItems: "center", 
                      justifyContent: "center", 
                      color: "var(--secondary-text)",
                      border: "1px solid",
                      borderColor: "var(--border-color)",
                      transition: "all 0.2s",
                      _hover: { bg: "var(--border-color)", color: "var(--sber-green)", borderColor: "var(--sber-green)" }
                    })}>
                      <Icon size={20} />
                    </div>
                    <span className={css({ fontSize: "11px", fontWeight: "700", color: "var(--secondary-text)", textAlign: "center" })}>{item.label}</span>
                  </a>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <main className={container({ maxWidth: { base: "512px", lg: "100%" }, px: { base: "20px", lg: "40px" }, pb: "calc(100px + env(safe-area-inset-bottom))" })}>
        {children}
      </main>
    </div>
  );
}
