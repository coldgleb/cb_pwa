"use client";

import { usePathname } from "next/navigation";
import { Home, CreditCard, PlusCircle, History, BarChart2, Sliders, Search } from "lucide-react";
import { css } from "../../styled-system/css";
import { flex, stack } from "../../styled-system/patterns";

interface BottomNavProps {
  isAdmin?: boolean;
}

export default function BottomNav({ isAdmin = false }: BottomNavProps) {
  const pathname = usePathname();

  // Hide BottomNav on registration or admin pages (admin has its own sidebar/nav)
  if (pathname === "/register") return null;
  // Actually the user wants "Админ" in the bottom nav, so we might want to show it everywhere 
  // or only on user pages. Let's show it if it's not the root login page.
  
  interface NavItem {
    label: string;
    href: string;
    icon: any;
    isMain?: boolean;
  }

  const navItems: NavItem[] = [
    { label: "Главная", href: "/", icon: Home },
    { label: "Поиск", href: "/search", icon: Search },
    { label: "Карты", href: "/cards", icon: CreditCard },
    { label: "История", href: "/transactions", icon: History },
    { label: "Статистика", href: "/statistics", icon: BarChart2 },
  ];

  if (isAdmin) {
    navItems.push({ label: "Управление", href: "/admin/banks", icon: Sliders });
  }

  return (
    <nav className={css({
      position: "fixed",
      bottom: 0,
      left: 0,
      right: 0,
      bg: "var(--card-bg)",
      boxShadow: "0 -4px 15px rgba(0,0,0,0.03)",
      zIndex: 1000,
      pb: "safe-area-inset-bottom", // Support for notch phones
    })}>
      <div className={flex({ 
        justify: "space-around", 
        align: "center", 
        maxWidth: "512px", 
        margin: "0 auto", 
        h: "64px",
        px: "8px"
      })}>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = item.href === "/" 
            ? pathname === "/" 
            : pathname.startsWith(item.href);

          return (
            <a 
              key={item.href} 
              href={item.href}
              className={stack({ 
                align: "center", 
                gap: "4px", 
                flex: 1, 
                textDecoration: "none",
                color: isActive ? "sberGreen" : "#94a3b8",
                transition: "all 0.2s"
              })}
            >
              <div className={css({
                position: "relative",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                w: item.isMain ? "40px" : "auto",
                h: item.isMain ? "40px" : "auto",
                borderRadius: item.isMain ? "12px" : "0",
                bg: item.isMain ? (isActive ? "sberGreen" : "#3b82f6") : "transparent",
                color: item.isMain ? "white" : "inherit",
                shadow: item.isMain ? "0 4px 12px rgba(59, 130, 246, 0.3)" : "none"
              })}>
                <Icon size={item.isMain ? 24 : 22} strokeWidth={isActive ? 2.5 : 2} />
              </div>
              <span className={css({ 
                fontSize: "10px", 
                fontWeight: isActive ? "800" : "600",
                textTransform: "uppercase",
                letterSpacing: "0.02em"
              })}>
                {item.label}
              </span>
            </a>
          );
        })}
      </div>
    </nav>
  );
}
