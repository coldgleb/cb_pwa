import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { ReactNode } from "react";
import { css } from "../../../../styled-system/css";
import { flex, container, stack } from "../../../../styled-system/patterns";
import { Landmark, CreditCard, Hash, LayoutDashboard, Store } from "lucide-react";

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
    <div className={css({ minH: "100vh", bg: "#f4f4f4" })}>
      {/* Fixed Header Container */}
      <div className={css({ position: "sticky", top: 0, zIndex: 100, bg: "#f4f4f4" })}>
        {/* Навигация */}
        <nav className={css({ bg: "white", borderBottom: "1px solid", borderColor: "#e2e8f0", py: "12px" })}>
          <div className={container({ maxWidth: "512px", px: "20px" })}>
            <div className={flex({ align: "center", justify: "space-between" })}>
              <div className={flex({ align: "center", gap: "10px" })}>
                <div className={css({ w: "32px", h: "32px", bg: "#0f172a", borderRadius: "10px", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontSize: "10px", fontWeight: "bold" })}>
                  AD
                </div>
                <span className={css({ fontSize: "15px", fontWeight: "800", color: "#000" })}>Админка</span>
              </div>
              <a href="/" className={css({ p: "8px", color: "#21a038" })}>
                <LayoutDashboard size={20} />
              </a>
            </div>
          </div>
        </nav>

        {/* Горизонтальное меню */}
        <div className={css({ bg: "white", borderBottom: "1px solid", borderColor: "#e2e8f0", mb: "24px" })}>
          <div className={container({ maxWidth: "512px", px: "20px", py: "16px" })}>
            <div className={flex({ gap: "16px", overflowX: "auto" })}>
              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <a key={item.href} href={item.href} className={stack({ align: "center", gap: "8px", minW: "80px" })}>
                    <div className={css({ 
                      w: "48px", 
                      h: "48px", 
                      borderRadius: "14px", 
                      bg: "#f8fafc", 
                      display: "flex", 
                      alignItems: "center", 
                      justifyContent: "center", 
                      color: "#64748b",
                      border: "1px solid",
                      borderColor: "#f1f5f9"
                    })}>
                      <Icon size={20} />
                    </div>
                    <span className={css({ fontSize: "11px", fontWeight: "700", color: "#64748b", textAlign: "center" })}>{item.label}</span>
                  </a>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <main className={container({ maxWidth: "512px", px: "20px", pb: "40px" })}>
        {children}
      </main>
    </div>
  );
}
