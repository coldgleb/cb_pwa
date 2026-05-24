import { db } from "@/db";
import { transactions, userCards, bankCards, banks, bankCategories, merchants, spendingCategories, transactionCategorySplits } from "@/db/schema";
import { auth } from "@/auth";
import { css } from "../../../../styled-system/css";
import { stack, flex, grid } from "../../../../styled-system/patterns";
import { eq, sql, and, gte, lte, desc, desc as drizzleDesc } from "drizzle-orm";
import { 
  BarChart2, 
  TrendingUp, 
  Wallet, 
  ShoppingBag, 
  Building2, 
  Percent, 
  Calendar,
  ChevronRight,
  ArrowUpRight,
  PiggyBank,
  ChevronLeft
} from "lucide-react";
import { redirect } from "next/navigation";
import { getIconUrl } from "@/lib/utils/icons";

export const dynamic = "force-dynamic";

export default async function StatisticsPage({ 
  searchParams 
}: { 
  searchParams: Promise<{ [key: string]: string | string[] | undefined }> 
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/");

  const userId = session.user.id;
  const params = await searchParams;
  
  // Month filter logic
  const now = new Date();
  const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const selectedMonth = params.month as string || currentMonthStr;
  
  const [year, month] = selectedMonth.split('-').map(Number);
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0, 23, 59, 59, 999);

  // Available months for filter (last 12 months)
  const availableMonths = Array.from({ length: 12 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    return {
      value: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
      label: d.toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' })
    };
  });

  const conditions = [
    eq(transactions.userId, userId),
    gte(transactions.transactionDate, new Date(startDate.getTime())),
    lte(transactions.transactionDate, new Date(endDate.getTime()))
  ];

  // If the above still fails, it means Drizzle is sending milliseconds but DB has seconds.
  // Let's use raw numbers to be safe.
  const startUnix = Math.floor(startDate.getTime() / 1000);
  const endUnix = Math.floor(endDate.getTime() / 1000);
  
  const conditionsRaw = [
    eq(transactions.userId, userId),
    sql`(${transactions.transactionDate} / (CASE WHEN ${transactions.transactionDate} > 2000000000 THEN 1000 ELSE 1 END)) >= ${startUnix}`,
    sql`(${transactions.transactionDate} / (CASE WHEN ${transactions.transactionDate} > 2000000000 THEN 1000 ELSE 1 END)) <= ${endUnix}`
  ];

  // 1. Общая статистика за выбранный период
  const totalStats = await db
    .select({
      totalSpent: sql<number>`sum(${transactions.amount})`,
      totalCashback: sql<number>`sum(${transactions.calculatedCashback} + ${transactions.manualCashbackAdjustment})`,
      count: sql<number>`count(*)`
    })
    .from(transactions)
    .where(and(...conditionsRaw));

  const overall = totalStats[0];
  const totalSpent = Number(overall?.totalSpent) || 0;
  const totalCashback = Number(overall?.totalCashback) || 0;
  const totalCount = Number(overall?.count) || 0;
  const avgCashbackPercent = totalSpent > 0 ? (totalCashback / totalSpent) * 100 : 0;

  // 1b. Daily Dynamic (for charts)
  const dailyStats = await db
    .select({
      day: sql<string>`strftime('%Y-%m-%d', datetime(${transactions.transactionDate} / (CASE WHEN ${transactions.transactionDate} > 2000000000 THEN 1000 ELSE 1 END), 'unixepoch', 'localtime'))`,
      spent: sql<number>`sum(${transactions.amount})`,
      cashback: sql<number>`sum(${transactions.calculatedCashback} + ${transactions.manualCashbackAdjustment})`,
      count: sql<number>`count(*)`
    })
    .from(transactions)
    .where(and(...conditionsRaw))
    .groupBy(sql`1`)
    .orderBy(sql`1`);

  // Fill in missing days for smoother charts
  const daysInSelectedMonth = [];
  const totalDaysInMonth = new Date(year, month, 0).getDate();
  for (let i = 1; i <= totalDaysInMonth; i++) {
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
    const dayData = dailyStats.find(d => d.day === dateStr);
    daysInSelectedMonth.push({
      day: dateStr,
      label: String(i),
      spent: Number(dayData?.spent) || 0,
      cashback: Number(dayData?.cashback) || 0,
      count: Number(dayData?.count) || 0,
      profit: (dayData?.spent && Number(dayData.spent) > 0) ? (Number(dayData.cashback) / Number(dayData.spent)) * 100 : 0
    });
  }

  // 2. Статистика по категориям
  const categoryStats = await db
    .select({
      name: spendingCategories.name,
      spent: sql<number>`sum(COALESCE(${transactionCategorySplits.amount}, ${transactions.amount}))`,
      cashback: sql<number>`sum(
        (COALESCE(${transactionCategorySplits.amount}, ${transactions.amount}) / ${transactions.amount}) * 
        (${transactions.calculatedCashback} + ${transactions.manualCashbackAdjustment})
      )`,
    })
    .from(transactions)
    .leftJoin(transactionCategorySplits, eq(transactions.id, transactionCategorySplits.transactionId))
    .leftJoin(spendingCategories, eq(sql`COALESCE(${transactionCategorySplits.spendingCategoryId}, ${transactions.spendingCategoryId})`, spendingCategories.id))
    .where(and(...conditionsRaw))
    .groupBy(spendingCategories.id, spendingCategories.name)
    .orderBy(drizzleDesc(sql`sum(COALESCE(${transactionCategorySplits.amount}, ${transactions.amount}))`));

  // 3. Статистика по банкам
  const bankStats = await db
    .select({
      id: banks.id,
      name: banks.name,
      logo: banks.logo,
      spent: sql<number>`sum(${transactions.amount})`,
      cashback: sql<number>`sum(${transactions.calculatedCashback} + ${transactions.manualCashbackAdjustment})`,
    })
    .from(transactions)
    .innerJoin(userCards, eq(transactions.userCardId, userCards.id))
    .innerJoin(bankCards, eq(userCards.bankCardId, bankCards.id))
    .innerJoin(banks, eq(bankCards.bankId, banks.id))
    .where(and(...conditionsRaw))
    .groupBy(banks.id, banks.name, banks.logo)
    .orderBy(drizzleDesc(sql`sum(${transactions.amount})`));

  // 4. Топ магазинов
  const merchantStats = await db
    .select({
      name: transactions.merchantName,
      spent: sql<number>`sum(${transactions.amount})`,
      count: sql<number>`count(*)`,
      logo: merchants.logo,
      website: merchants.website,
    })
    .from(transactions)
    .leftJoin(merchants, eq(transactions.merchantName, merchants.name))
    .where(and(...conditionsRaw))
    .groupBy(transactions.merchantName, merchants.logo, merchants.website)
    .orderBy(drizzleDesc(sql`sum(${transactions.amount})`))
    .limit(10);

  // 5. По месяцам (динамика за 6 месяцев от выбранного)
  const dynamicStart = new Date(year, month - 6, 1);
  const dynStartUnix = Math.floor(dynamicStart.getTime() / 1000);
  const monthlyStats = await db
    .select({
      month: sql<string>`strftime('%Y-%m', datetime(${transactions.transactionDate} / (CASE WHEN ${transactions.transactionDate} > 2000000000 THEN 1000 ELSE 1 END), 'unixepoch', 'localtime'))`,
      spent: sql<number>`sum(${transactions.amount})`,
    })
    .from(transactions)
    .where(and(
      eq(transactions.userId, userId),
      sql`(${transactions.transactionDate} / (CASE WHEN ${transactions.transactionDate} > 2000000000 THEN 1000 ELSE 1 END)) >= ${dynStartUnix}`,
      sql`(${transactions.transactionDate} / (CASE WHEN ${transactions.transactionDate} > 2000000000 THEN 1000 ELSE 1 END)) <= ${endUnix}`
    ))
    .groupBy(sql`1`)
    .orderBy(sql`1`);

  return (
    <div className={css({ minH: "100vh", bg: "var(--background)", pb: "40px" })}>
      <div className={css({ 
        w: "full", 
        maxW: { base: "512px", lg: "1100px" }, 
        mx: "auto", 
        px: "20px", 
        py: "32px",
        pb: "calc(80px + env(safe-area-inset-bottom))"
      })}>
        <header className={stack({ gap: "16px", mb: "32px" })}>
          <div className={flex({ justify: "space-between", align: "center" })}>
            <div className={stack({ gap: "4px" })}>
              <h1 className={css({ fontSize: "28px", fontWeight: "900", color: "var(--foreground)" })}>Статистика</h1>
              <p className={css({ fontSize: "14px", color: "var(--secondary-text)", fontWeight: "600" })}>Анализ ваших трат и выгоды</p>
            </div>
            <BarChart2 size={32} className={css({ color: "sberGreen", opacity: 0.2 })} />
          </div>

          {/* Month Selector */}
          <div className={flex({ gap: "8px", overflowX: "auto", pb: "8px", mx: "-20px", px: "20px", scrollbar: "hidden" })}>
            {availableMonths.map((m) => (
              <a
                key={m.value}
                href={`?month=${m.value}`}
                className={css({
                  px: "16px",
                  py: "10px",
                  borderRadius: "20px",
                  fontSize: "13px",
                  fontWeight: "700",
                  whiteSpace: "nowrap",
                  transition: "all 0.2s",
                  bg: selectedMonth === m.value ? "sberGreen" : "var(--card-bg)",
                  color: selectedMonth === m.value ? "white" : "var(--foreground)",
                  border: "1px solid",
                  borderColor: selectedMonth === m.value ? "sberGreen" : "var(--border-color)",
                  _hover: { borderColor: "sberGreen" }
                })}
              >
                {m.label}
              </a>
            ))}
          </div>
        </header>

        <div className={stack({ gap: "24px" })}>
          
          {/* Общие показатели */}
          <div className={grid({ columns: { base: 1, sm: 2, lg: 3 }, gap: "16px" })}>
            {/* 1. Всего потрачено */}
            <div className="sber-card">
              <div className={flex({ justify: "space-between", mb: "12px" })}>
                <ShoppingBag size={24} className={css({ color: "#3b82f6" })} />
                <span className={css({ fontSize: "11px", fontWeight: "800", color: "var(--secondary-text)", textTransform: "uppercase" })}>Всего потрачено</span>
              </div>
              <p className={css({ fontSize: "28px", fontWeight: "900", color: "var(--foreground)" })}>{totalSpent.toLocaleString('ru-RU')} ₽</p>
              <p className={css({ fontSize: "12px", mt: "4px", color: "var(--secondary-text)", fontWeight: "600" })}>За выбранный месяц</p>
            </div>

            {/* 2. Сэкономлено */}
            <div className="sber-card" style={{ background: "linear-gradient(135deg, #21a038 0%, #2ecc71 100%)", color: "white" }}>
              <div className={flex({ justify: "space-between", mb: "12px" })}>
                <PiggyBank size={24} opacity={0.8} />
                <span className={css({ fontSize: "11px", fontWeight: "800", opacity: 0.8, textTransform: "uppercase" })}>Сэкономлено</span>
              </div>
              <p className={css({ fontSize: "28px", fontWeight: "900" })}>{totalCashback.toLocaleString('ru-RU')} ₽</p>
              <p className={css({ fontSize: "12px", mt: "4px", opacity: 0.9, fontWeight: "600" })}>За {totalCount} операций</p>
            </div>
            
            {/* 3. Процент профита */}
            <div className="sber-card">
              <div className={flex({ justify: "space-between", mb: "12px" })}>
                <Percent size={24} className={css({ color: "sberGreen" })} />
                <span className={css({ fontSize: "11px", fontWeight: "800", color: "var(--secondary-text)", textTransform: "uppercase" })}>Процент профита</span>
              </div>
              <p className={css({ fontSize: "28px", fontWeight: "900", color: "var(--foreground)" })}>{avgCashbackPercent.toFixed(2)}%</p>
              <p className={css({ fontSize: "12px", mt: "4px", color: "var(--secondary-text)", fontWeight: "600" })}>Средний возврат</p>
            </div>
          </div>

          {/* Ежедневная динамика */}
          <div className={grid({ columns: { base: 1, xl: 2 }, gap: "24px" })}>
            
            {/* График 1: Траты */}
            <section className="sber-card">
              <div className={flex({ align: "center", justify: "space-between", mb: "24px" })}>
                <div className={flex({ align: "center", gap: "10px" })}>
                  <TrendingUp size={20} className={css({ color: "#3b82f6" })} />
                  <h3 className={css({ fontSize: "16px", fontWeight: "800" })}>Траты в рублях</h3>
                </div>
              </div>
              <div className={flex({ align: "flex-end", justify: "space-between", h: "120px", gap: "4px" })}>
                {daysInSelectedMonth.map((d, i) => {
                  const maxSpent = Math.max(...daysInSelectedMonth.map(ms => ms.spent), 1);
                  const height = (d.spent / maxSpent) * 100;
                  return (
                    <div key={i} className={css({ flex: 1, position: "relative", h: "full", display: "flex", alignItems: "flex-end" })} title={`${d.day}: ${d.spent}₽`}>
                      <div className={css({ w: "full", bg: "#3b82f6", borderRadius: "2px", opacity: 0.8, minH: d.spent > 0 ? "2px" : 0 })} style={{ height: `${height}%` }} />
                      {i % 5 === 0 && <span className={css({ position: "absolute", bottom: "-20px", left: "50%", transform: "translateX(-50%)", fontSize: "9px", fontWeight: "700", color: "var(--secondary-text)" })}>{d.label}</span>}
                    </div>
                  );
                })}
              </div>
            </section>

            {/* График 2: Количество операций */}
            <section className="sber-card">
              <div className={flex({ align: "center", justify: "space-between", mb: "24px" })}>
                <div className={flex({ align: "center", gap: "10px" })}>
                  <ShoppingBag size={20} className={css({ color: "#94a3b8" })} />
                  <h3 className={css({ fontSize: "16px", fontWeight: "800" })}>Число операций</h3>
                </div>
              </div>
              <div className={flex({ align: "flex-end", justify: "space-between", h: "120px", gap: "4px" })}>
                {daysInSelectedMonth.map((d, i) => {
                  const maxCount = Math.max(...daysInSelectedMonth.map(ms => ms.count), 1);
                  const height = (d.count / maxCount) * 100;
                  return (
                    <div key={i} className={css({ flex: 1, position: "relative", h: "full", display: "flex", alignItems: "flex-end" })} title={`${d.day}: ${d.count} оп.`}>
                      <div className={css({ w: "full", bg: "#94a3b8", borderRadius: "2px", opacity: 0.6, minH: d.count > 0 ? "2px" : 0 })} style={{ height: `${height}%` }} />
                      {i % 5 === 0 && <span className={css({ position: "absolute", bottom: "-20px", left: "50%", transform: "translateX(-50%)", fontSize: "9px", fontWeight: "700", color: "var(--secondary-text)" })}>{d.label}</span>}
                    </div>
                  );
                })}
              </div>
            </section>

            {/* График 3: Кешбэк */}
            <section className="sber-card">
              <div className={flex({ align: "center", justify: "space-between", mb: "24px" })}>
                <div className={flex({ align: "center", gap: "10px" })}>
                  <PiggyBank size={20} className={css({ color: "sberGreen" })} />
                  <h3 className={css({ fontSize: "16px", fontWeight: "800" })}>Выгода в рублях</h3>
                </div>
              </div>
              <div className={flex({ align: "flex-end", justify: "space-between", h: "120px", gap: "4px" })}>
                {daysInSelectedMonth.map((d, i) => {
                  const maxCashback = Math.max(...daysInSelectedMonth.map(ms => ms.cashback), 1);
                  const height = (d.cashback / maxCashback) * 100;
                  return (
                    <div key={i} className={css({ flex: 1, position: "relative", h: "full", display: "flex", alignItems: "flex-end" })} title={`${d.day}: ${d.cashback.toFixed(2)}₽`}>
                      <div className={css({ w: "full", bg: "sberGreen", borderRadius: "2px", opacity: 0.8, minH: d.cashback > 0 ? "2px" : 0 })} style={{ height: `${height}%` }} />
                      {i % 5 === 0 && <span className={css({ position: "absolute", bottom: "-20px", left: "50%", transform: "translateX(-50%)", fontSize: "9px", fontWeight: "700", color: "var(--secondary-text)" })}>{d.label}</span>}
                    </div>
                  );
                })}
              </div>
            </section>

            {/* График 4: Процент профита */}
            <section className="sber-card">
              <div className={flex({ align: "center", justify: "space-between", mb: "24px" })}>
                <div className={flex({ align: "center", gap: "10px" })}>
                  <Percent size={20} className={css({ color: "var(--foreground)" })} />
                  <h3 className={css({ fontSize: "16px", fontWeight: "800" })}>Эффективность (%)</h3>
                </div>
              </div>
              <div className={flex({ align: "flex-end", justify: "space-between", h: "120px", gap: "4px" })}>
                {daysInSelectedMonth.map((d, i) => {
                  const maxProfit = Math.max(...daysInSelectedMonth.map(ms => ms.profit), 5);
                  const height = (d.profit / maxProfit) * 100;
                  return (
                    <div key={i} className={css({ flex: 1, position: "relative", h: "full", display: "flex", alignItems: "flex-end" })} title={`${d.day}: ${d.profit.toFixed(2)}%`}>
                      <div className={css({ w: "full", bg: "var(--foreground)", borderRadius: "2px", opacity: 0.6, minH: d.profit > 0 ? "2px" : 0 })} style={{ height: `${height}%` }} />
                      {i % 5 === 0 && <span className={css({ position: "absolute", bottom: "-20px", left: "50%", transform: "translateX(-50%)", fontSize: "9px", fontWeight: "700", color: "var(--secondary-text)" })}>{d.label}</span>}
                    </div>
                  );
                })}
              </div>
            </section>
          </div>

          {/* Сравнение месяцев */}
          <section className="sber-card">
            <div className={flex({ align: "center", gap: "10px", mb: "20px" })}>
              <Calendar size={20} className={css({ color: "var(--secondary-text)" })} />
              <h3 className={css({ fontSize: "16px", fontWeight: "800" })}>Сравнение месяцев</h3>
            </div>
            <div className={flex({ align: "flex-end", justify: "space-between", h: "120px", px: "10px", gap: "8px" })}>
              {monthlyStats.map((m, i) => {
                const maxSpent = Math.max(...monthlyStats.map(ms => ms.spent), 1);
                const height = (m.spent / maxSpent) * 100;
                const isSelected = m.month === selectedMonth;
                const monthName = new Date(m.month + "-01").toLocaleDateString('ru-RU', { month: 'short' });
                return (
                  <a key={i} href={`?month=${m.month}`} className={stack({ align: "center", gap: "8px", flex: 1, textDecoration: "none" })}>
                    <div className={css({ 
                      w: "full", 
                      bg: isSelected ? "sberGreen" : "var(--surface-secondary)", 
                      borderRadius: "6px",
                      transition: "all 0.3s",
                      minH: "4px",
                      _hover: { bg: isSelected ? "sberGreen" : "var(--border-color)" }
                    })} style={{ height: `${height}%` }} />
                    <span className={css({ 
                      fontSize: "10px", 
                      fontWeight: "700", 
                      color: isSelected ? "sberGreen" : "var(--secondary-text)", 
                      textTransform: "uppercase" 
                    })}>{monthName}</span>
                  </a>
                );
              })}
            </div>
          </section>

          {/* Категории трат */}
          <section className="sber-card">
            <div className={flex({ align: "center", gap: "10px", mb: "20px" })}>
              <ShoppingBag size={20} className={css({ color: "sberGreen" })} />
              <h3 className={css({ fontSize: "16px", fontWeight: "800" })}>Топ категорий</h3>
            </div>
            <div className={stack({ gap: "16px" })}>
              {categoryStats.length === 0 ? (
                <p className={css({ py: "20px", textAlign: "center", color: "var(--secondary-text)", fontSize: "14px" })}>Нет данных за этот период</p>
              ) : (
                categoryStats.slice(0, 8).map((cat, i) => {
                  const percentage = (cat.spent / totalSpent) * 100;
                  return (
                    <div key={i} className={stack({ gap: "6px" })}>
                      <div className={flex({ justify: "space-between", align: "center" })}>
                        <span className={css({ fontSize: "14px", fontWeight: "700" })}>{cat.name || "Без категории"}</span>
                        <span className={css({ fontSize: "14px", fontWeight: "800" })}>{cat.spent.toLocaleString('ru-RU')} ₽</span>
                      </div>
                      <div className={css({ w: "full", h: "6px", bg: "var(--surface-secondary)", borderRadius: "full", overflow: "hidden" })}>
                        <div className={css({ h: "full", bg: "sberGreen", borderRadius: "full" })} style={{ width: `${percentage}%` }} />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </section>

          {/* Эффективность по банкам */}
          <section className={stack({ gap: "16px" })}>
            <div className={flex({ align: "center", gap: "10px", px: "4px" })}>
              <Building2 size={20} className={css({ color: "sberGreen" })} />
              <h3 className={css({ fontSize: "17px", fontWeight: "800" })}>Доход по банкам</h3>
            </div>
            <div className={grid({ columns: { base: 1, sm: 2, lg: 3 }, gap: "12px" })}>
              {bankStats.map((bank, i) => (
                <a 
                  key={i} 
                  href={`/transactions?bankId=${bank.id}&startDate=${startDate.toISOString().split('T')[0]}&endDate=${endDate.toISOString().split('T')[0]}`}
                  className="sber-card" 
                  style={{ padding: "16px", textDecoration: "none", cursor: "pointer", transition: "transform 0.2s" }}
                >
                  <div className={flex({ align: "center", justify: "space-between", mb: "12px" })}>
                    <div className={flex({ align: "center", gap: "12px" })}>
                      {bank.logo ? (
                        <img src={bank.logo} className={css({ w: "24px", h: "24px", objectFit: "contain" })} alt="" />
                      ) : (
                        <Building2 size={24} className={css({ color: "var(--secondary-text)" })} />
                      )}
                      <span className={css({ fontSize: "15px", fontWeight: "700", color: "var(--foreground)" })}>{bank.name}</span>
                    </div>
                    <ChevronRight size={18} className={css({ color: "var(--border-color)" })} />
                  </div>
                  <div className={flex({ justify: "space-between", align: "flex-end" })}>
                    <div className={stack({ gap: "0" })}>
                      <span className={css({ fontSize: "11px", fontWeight: "800", color: "var(--secondary-text)" })}>КЕШБЭК</span>
                      <span className={css({ fontSize: "18px", fontWeight: "900", color: "sberGreen" })}>+{bank.cashback.toLocaleString('ru-RU')} ₽</span>
                    </div>
                    <div className={css({ px: "8px", py: "4px", bg: "rgba(33, 160, 56, 0.1)", color: "sberGreen", borderRadius: "8px", fontSize: "12px", fontWeight: "800" })}>
                      {((bank.cashback / (bank.spent || 1)) * 100).toFixed(1)}%
                    </div>
                  </div>
                </a>
              ))}
            </div>
          </section>

          {/* Топ мерчантов */}
          <section className="sber-card">
            <div className={flex({ align: "center", gap: "10px", mb: "20px" })}>
              <ShoppingBag size={20} className={css({ color: "sberGreen" })} />
              <h3 className={css({ fontSize: "16px", fontWeight: "800" })}>Любимые места</h3>
            </div>
            <div className={stack({ gap: "0", mx: "-24px" })}>
              {merchantStats.length === 0 ? (
                <p className={css({ py: "20px", textAlign: "center", color: "var(--secondary-text)", fontSize: "14px" })}>Нет операций</p>
              ) : (
                merchantStats.map((merch, i) => {
                  const icon = getIconUrl({ logo: merch.logo, website: merch.website, name: merch.name });
                  return (
                    <a 
                      key={i} 
                      href={`/transactions?merchantName=${encodeURIComponent(merch.name)}`}
                      className={flex({ 
                        align: "center", 
                        justify: "space-between", 
                        px: "24px", 
                        py: "14px", 
                        borderBottom: i === merchantStats.length - 1 ? "none" : "1px solid var(--separator)",
                        transition: "background-color 0.2s",
                        _active: { bg: "var(--surface-secondary)" },
                        _hover: { bg: "var(--surface-secondary)" },
                        textDecoration: "none"
                      })}
                    >
                      <div className={flex({ align: "center", gap: "12px" })}>
                        <div className={css({ w: "40px", h: "40px", bg: "var(--surface-secondary)", borderRadius: "12px", border: "1px solid", borderColor: "var(--border-color)", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", flexShrink: 0 })}>
                          {icon ? (
                            <img src={icon} className={css({ w: "full", h: "full", objectFit: "contain", p: "4px" })} alt="" />
                          ) : "🏪"}
                        </div>
                        <div className={stack({ gap: "0" })}>
                          <span className={css({ fontSize: "14px", fontWeight: "700", color: "var(--foreground)" })}>{merch.name}</span>
                          <span className={css({ fontSize: "11px", color: "var(--secondary-text)", fontWeight: "600" })}>{merch.count} покупок</span>
                        </div>
                      </div>
                      <div className={stack({ align: "flex-end", gap: "0" })}>
                        <span className={css({ fontSize: "15px", fontWeight: "800", color: "var(--foreground)" })}>{merch.spent.toLocaleString('ru-RU')} ₽</span>
                        <div className={flex({ align: "center", gap: "2px", color: "sberGreen", fontSize: "11px", fontWeight: "700" })}>
                          все банки <ChevronRight size={12} />
                        </div>
                      </div>
                    </a>
                  );
                })
              )}
            </div>
          </section>

          {/* Инсайты */}
          {bankStats.length > 0 && (
            <div className="sber-card" style={{ border: "1px dashed var(--sber-green)", background: "rgba(33, 160, 56, 0.02)" }}>
              <h3 className={css({ fontSize: "15px", fontWeight: "800", mb: "12px", color: "sberGreen" })}>Аналитика периода</h3>
              <p className={css({ fontSize: "14px", color: "var(--foreground)", lineHeight: "1.5", fontWeight: "500" })}>
                В этом месяце ваш самый выгодный банк — <strong>{
                  [...bankStats].sort((a, b) => (b.cashback / b.spent) - (a.cashback / a.spent))[0]?.name
                }</strong>. 
                Средний чек составил <strong>{(totalSpent / totalCount).toFixed(0)} ₽</strong>.
              </p>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
