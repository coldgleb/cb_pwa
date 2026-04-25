import { db } from "@/db";
import { userCards, userCashbackRules, transactions } from "@/db/schema";
import { auth, signOut } from "@/auth";
import { loginUser } from "@/lib/actions/auth";
import { css } from "../../styled-system/css";
import { stack, flex } from "../../styled-system/patterns";
import { eq, sql, and, gte } from "drizzle-orm";
import { Wallet, LogOut, ShieldCheck, Percent } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function Home() {
  let session;
  try {
    session = await auth();
  } catch (e) {
    console.error("Auth session fetch error:", e);
  }
  
  let spentThisMonth = 0;
  let cashbackThisMonth = 0;
  let avgPercentage = 0;

  if (session?.user?.id) {
    try {
      const now = new Date();
      const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      
      const stats = await db
        .select({ 
          totalSpent: sql<number>`sum(amount)`,
          totalCalculated: sql<number>`sum(calculated_cashback)`,
          totalManual: sql<number>`sum(manual_cashback_adjustment)`
        })
        .from(transactions)
        .where(
          and(
            eq(transactions.userId, session.user.id),
            gte(transactions.transactionDate, firstDayOfMonth)
          )
        );
      
      spentThisMonth = Number(stats[0]?.totalSpent) || 0;
      const calculated = Number(stats[0]?.totalCalculated) || 0;
      const manual = Number(stats[0]?.totalManual) || 0;
      cashbackThisMonth = calculated + manual;
      avgPercentage = spentThisMonth > 0 ? (cashbackThisMonth / spentThisMonth) * 100 : 0;
    } catch (e) {
      console.error("Dashboard query error:", e);
    }
  }

  const userName = session?.user?.name || session?.user?.email || 'Гость';
  const shortName = (userName as string).split(' ')[0] || 'Гость';

  return (
    <div className={css({ minH: "100vh", bg: "#f4f4f4" })}>
      <div className="sber-container">
        
        {/* Header */}
        <header className={flex({ justify: "space-between", align: "center", mb: "40px" })}>
          <div className={flex({ align: "center", gap: "14px" })}>
            <div className={css({ w: "52px", h: "52px", borderRadius: "18px", bg: "white", display: "flex", alignItems: "center", justifyContent: "center", shadow: "0 4px 12px rgba(0,0,0,0.05)", fontSize: "24px", border: "1px solid", borderColor: "#f1f5f9" })}>
              👤
            </div>
            <div className={stack({ gap: "0" })}>
              <p className={css({ fontSize: "14px", color: "secondaryText", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.02em" })}>Добрый день,</p>
              <p className={css({ fontSize: "20px", fontWeight: "800", color: "#000" })}>{shortName}</p>
            </div>
          </div>
          {session && (
            <form action={async () => { "use server"; await signOut(); }}>
              <button className={css({ p: "12px", color: "#64748b", bg: "white", borderRadius: "14px", cursor: "pointer", shadow: "sm", border: "1px solid", borderColor: "#f1f5f9", _hover: { color: "#ef4444" } })}>
                <LogOut size={22} />
              </button>
            </form>
          )}
        </header>

        <main>
          {session ? (
            <div className={stack({ gap: "24px" })}>
              <h2 className={css({ fontSize: "22px", fontWeight: "900", color: "#000", mb: "8px" })}>Итоги месяца</h2>
              
              <div className={stack({ gap: "16px" })}>
                {/* Spent */}
                <div className="sber-card" style={{ background: "linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)" }}>
                  <p className="sber-label" style={{ marginBottom: "8px" }}>ПОТРАЧЕНО В ЭТОМ МЕСЯЦЕ</p>
                  <p className={css({ fontSize: "32px", fontWeight: "900", color: "#0f172a" })}>
                    {spentThisMonth.toLocaleString('ru-RU')} <span className={css({ fontSize: "20px", color: "#94a3b8" })}>₽</span>
                  </p>
                </div>

                {/* Cashback */}
                <div className="sber-card" style={{ background: "linear-gradient(135deg, #21a038 0%, #2ecc71 100%)", color: "white" }}>
                  <p className={css({ fontSize: "11px", fontWeight: "800", color: "rgba(255,255,255,0.8)", mb: "8px", textTransform: "uppercase", letterSpacing: "0.5px" })}>ПОЛУЧЕНО КЕШБЭКА</p>
                  <p className={css({ fontSize: "32px", fontWeight: "900" })}>
                    {cashbackThisMonth.toLocaleString('ru-RU')} <span className={css({ fontSize: "20px", opacity: 0.8 })}>₽</span>
                  </p>
                </div>

                {/* Average % */}
                <div className="sber-card">
                  <div className={flex({ justify: "space-between", align: "center" })}>
                    <div>
                      <p className="sber-label" style={{ marginBottom: "4px" }}>СРЕДНИЙ ПРОЦЕНТ</p>
                      <p className={css({ fontSize: "28px", fontWeight: "900", color: "sberGreen" })}>
                        {avgPercentage.toFixed(2)}%
                      </p>
                    </div>
                    <div className={css({ w: "54px", h: "54px", bg: "#f0fdf4", borderRadius: "16px", display: "flex", alignItems: "center", justifyContent: "center", color: "sberGreen" })}>
                      <Percent size={28} strokeWidth={3} />
                    </div>
                  </div>
                </div>
              </div>

              <section className={css({ mt: "16px", p: "20px", bg: "#f8fafc", borderRadius: "24px", border: "1px solid", borderColor: "#f1f5f9" })}>
                <p className={css({ fontSize: "13px", color: "#64748b", lineHeight: "1.5", textAlign: "center" })}>
                  Вся информация обновляется автоматически при добавлении новых покупок.
                </p>
              </section>
            </div>
          ) : (
            <div className={stack({ align: "center", py: "40px", gap: "40px" })}>
              <div className={stack({ gap: "12px", textAlign: "center" })}>
                <div className={css({ w: "88px", h: "88px", bg: "sberGreen", borderRadius: "32px", mx: "auto", display: "flex", alignItems: "center", justifyContent: "center", color: "white", shadow: "0 15px 30px rgba(33,160,56,0.3)", mb: "12px" })}>
                  <ShieldCheck size={48} />
                </div>
                <h2 className={css({ fontSize: "32px", fontWeight: "900", letterSpacing: "-0.5px", color: "#000" })}>Вход в систему</h2>
                <p className={css({ color: "secondaryText", fontSize: "15px", maxWidth: "260px", mx: "auto", fontWeight: "500" })}>
                  Пожалуйста, авторизуйтесь для доступа к вашим данным
                </p>
              </div>

              <div className={stack({ gap: "24px", w: "full", maxWidth: "340px" })}>
                <form action={async (formData) => { "use server"; await loginUser(formData); }} className={stack({ gap: "16px" })}>
                  <div className={stack({ gap: "8px" })}>
                    <label className="sber-label">EMAIL</label>
                    <input
                      name="email"
                      type="email"
                      placeholder="example@mail.ru"
                      required
                      className="sber-input"
                    />
                  </div>
                  <div className={stack({ gap: "8px" })}>
                    <label className="sber-label">ПАРОЛЬ</label>
                    <input
                      name="password"
                      type="password"
                      placeholder="••••••••"
                      required
                      className="sber-input"
                    />
                  </div>
                  <button className="sber-button" style={{ marginTop: '16px' }}>
                    Войти в аккаунт
                  </button>
                </form>
                <div className={stack({ align: "center", gap: "6px", mt: "8px" })}>
                  <p className={css({ fontSize: "14px", color: "secondaryText", fontWeight: "500" })}>Нет профиля?</p>
                  <a href="/register" className={css({ fontSize: "14px", fontWeight: "800", color: "sberGreen", textDecoration: "underline", textUnderlineOffset: "4px" })}>
                    Зарегистрироваться
                  </a>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
