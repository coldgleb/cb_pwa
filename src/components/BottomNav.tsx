"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { Home, CreditCard, Plus, History, Settings } from "lucide-react";
import { css } from "../../styled-system/css";
import { flex, stack } from "../../styled-system/patterns";

interface BottomNavProps {
  isAdmin?: boolean;
}

export default function BottomNav({ isAdmin = false }: BottomNavProps) {
  const pathname = usePathname();

  // Hide BottomNav on registration page
  if (pathname === "/register") return null;
  
  interface NavItem {
    label: string;
    href: string;
    icon: any;
  }

  const navItemsLeft: NavItem[] = [
    { label: "Главная", href: "/", icon: Home },
    { label: "Счета", href: "/cards", icon: CreditCard },
  ];

  const navItemsRight: NavItem[] = [
    { label: "История", href: "/transactions", icon: History },
    { label: "Профиль", href: "/profile", icon: Settings },
  ];

  return (
    <nav className={css({
      position: "fixed",
      bottom: 0,
      left: 0,
      right: 0,
      bg: "var(--card-bg)",
      boxShadow: "0 -4px 20px rgba(0,0,0,0.05)",
      zIndex: 1000,
      pb: "calc(8px + env(safe-area-inset-bottom))", 
      pt: "8px",
      borderTop: "1px solid var(--border-color)"
    })}>
      <div className={flex({ 
        justify: "space-between", 
        align: "center", 
        maxWidth: "512px", 
        margin: "0 auto", 
        px: "16px",
        position: "relative"
      })}>
        
        {/* Left Items */}
        <div className={flex({ flex: 1, justify: "space-around" })}>
          {navItemsLeft.map((item) => {
            const Icon = item.icon;
            const isActive = item.href === "/" 
              ? pathname === "/" 
              : pathname.startsWith(item.href);

            return (
              <Link 
                key={item.href} 
                href={item.href}
                className={stack({ 
                  align: "center", 
                  gap: "4px", 
                  textDecoration: "none",
                  color: isActive ? "var(--sber-green)" : "var(--secondary-text)",
                  transition: "color 0.2s"
                })}
              >
                <Icon size={24} strokeWidth={isActive ? 2.5 : 2} />
                <span className={css({ 
                  fontSize: "10px", 
                  fontWeight: isActive ? "700" : "500",
                })}>
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>

        {/* Center FAB */}
        <div className={css({ 
          position: "relative", 
          w: "64px", 
          display: "flex", 
          justifyContent: "center",
          mx: "8px"
        })}>
          <Link 
            href="/transactions/new"
            className={flex({
              position: "absolute",
              bottom: "-10px", // Lift it up slightly above the bar
              align: "center",
              justify: "center",
              w: "56px",
              h: "56px",
              borderRadius: "20px", // Squircle shape
              bg: "var(--sber-green)",
              color: "white",
              shadow: "0 8px 24px rgba(33, 160, 56, 0.4)",
              transition: "transform 0.2s, background 0.2s",
              _hover: { bg: "var(--sber-green-hover)", transform: "translateY(-2px)" },
              _active: { transform: "translateY(2px)" }
            })}
          >
            <Plus size={32} strokeWidth={2.5} />
          </Link>
        </div>

        {/* Right Items */}
        <div className={flex({ flex: 1, justify: "space-around" })}>
          {navItemsRight.map((item) => {
            const Icon = item.icon;
            const isActive = pathname.startsWith(item.href);

            return (
              <Link 
                key={item.href} 
                href={item.href}
                className={stack({ 
                  align: "center", 
                  gap: "4px", 
                  textDecoration: "none",
                  color: isActive ? "var(--sber-green)" : "var(--secondary-text)",
                  transition: "color 0.2s"
                })}
              >
                <Icon size={24} strokeWidth={isActive ? 2.5 : 2} />
                <span className={css({ 
                  fontSize: "10px", 
                  fontWeight: isActive ? "700" : "500",
                })}>
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>

      </div>
    </nav>
  );
}
