import { db } from "@/db";
import { transactions, userCards, bankCards, banks, bankCategories, merchants } from "@/db/schema";
import { auth } from "@/auth";
import { css } from "../../../../styled-system/css";
import { stack, container, flex, grid, wrap } from "../../../../styled-system/patterns";
import { eq, desc, and, gte, lte, inArray, asc } from "drizzle-orm";
import { redirect } from "next/navigation";
import { ArrowLeft, ShoppingCart, Utensils, Car, Coffee, Smartphone, Globe, Gift, HelpCircle, Filter, X, Store, PlusCircle } from "lucide-react";
import { deleteTransaction } from "@/lib/actions/transactions";
import { Trash2, Edit2 } from "lucide-react";
import SearchableSelect from "@/components/SearchableSelect";
import { getIconUrl } from "@/lib/utils/icons";

export const dynamic = "force-dynamic";

const formatUTCDate = (d: Date) => {
  const day = String(d.getUTCDate()).padStart(2, '0');
  const month = String(d.getUTCMonth() + 1).padStart(2, '0');
  const year = d.getUTCFullYear();
  return `${day}.${month}.${year}`;
};

const formatUTCTime = (d: Date) => {
  const hours = String(d.getUTCHours()).padStart(2, '0');
  const minutes = String(d.getUTCMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
};

export default async function TransactionsPage({ 
  searchParams 
}: { 
  searchParams: Promise<{ [key: string]: string | string[] | undefined }> 
}) {
  const session = await auth();
  if (!session) redirect("/");

  const params = await searchParams;
  const startDate = params.startDate as string || "";
  const endDate = params.endDate as string || "";
  const bankId = params.bankId ? parseInt(params.bankId as string) : undefined;
  const cardId = params.cardId ? parseInt(params.cardId as string) : undefined;
  const merchantName = params.merchantName as string || "";

  // Fetch options for filters
  const myCards = await db
    .select({
      id: userCards.id,
      cardName: bankCards.name,
      bankName: banks.name,
      bankId: banks.id
    })
    .from(userCards)
    .innerJoin(bankCards, eq(userCards.bankCardId, bankCards.id))
    .innerJoin(banks, eq(bankCards.bankId, banks.id))
    .where(eq(userCards.userId, session.user.id!));

  const uniqueBanks = Array.from(new Map(myCards.map(c => [c.bankId, { id: c.bankId, name: c.bankName }])).values());

  const bankOptions = uniqueBanks.map(b => ({ value: b.id.toString(), label: b.name }));
  const cardOptions = myCards.map(c => ({ value: c.id.toString(), label: `${c.bankName} ${c.cardName}` }));

  // Get unique merchants for this user
  const userMerchants = await db
    .select({ name: transactions.merchantName })
    .from(transactions)
    .where(eq(transactions.userId, session.user.id!))
    .groupBy(transactions.merchantName)
    .orderBy(asc(transactions.merchantName));
  
  const merchantOptions = userMerchants.map(m => ({ value: m.name, label: m.name }));

  // Build query with filters
  const conditions = [eq(transactions.userId, session.user.id!)];
  
  if (startDate) conditions.push(gte(transactions.transactionDate, new Date(startDate)));
  if (endDate) {
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);
    conditions.push(lte(transactions.transactionDate, end));
  }
  if (cardId) conditions.push(eq(transactions.userCardId, cardId));
  if (merchantName) conditions.push(eq(transactions.merchantName, merchantName));
  if (bankId) {
    const bankCardsIds = myCards.filter(c => c.bankId === bankId).map(c => c.id);
    if (bankCardsIds.length > 0) {
      conditions.push(inArray(transactions.userCardId, bankCardsIds));
    } else {
      conditions.push(eq(transactions.userCardId, -1)); // No matches
    }
  }

  const history = await db
    .select({
      id: transactions.id,
      amount: transactions.amount,
      paidAmount: transactions.paidAmount,
      cashback: transactions.calculatedCashback,
      cashbackPercentage: transactions.cashbackPercentage,
      manualAdjustment: transactions.manualCashbackAdjustment,
      merchantName: transactions.merchantName,
      date: transactions.transactionDate,
      cardName: bankCards.name,
      bankName: banks.name,
      categoryName: bankCategories.name,
      merchantLogo: merchants.logo,
      merchantWebsite: merchants.website,
    })
    .from(transactions)
    .leftJoin(userCards, eq(transactions.userCardId, userCards.id))
    .leftJoin(bankCards, eq(userCards.bankCardId, bankCards.id))
    .leftJoin(banks, eq(bankCards.bankId, banks.id))
    .leftJoin(bankCategories, eq(transactions.categoryId, bankCategories.id))
    .leftJoin(merchants, eq(transactions.merchantName, merchants.name))
    .where(and(...conditions))
    .orderBy(desc(transactions.transactionDate));

  const groupedHistory = history.reduce((groups, item) => {
    const dateStr = item.date ? formatUTCDate(new Date(item.date)) : 'Неизвестно';
    if (!groups[dateStr]) {
      groups[dateStr] = [];
    }
    groups[dateStr].push(item);
    return groups;
  }, {} as Record<string, typeof history>);

  const getCategoryIcon = (category: string | null) => {
    const name = category?.toLowerCase() || "";
    if (name.includes("супер") || name.includes("продукт")) return <ShoppingCart size={20} />;
    if (name.includes("ресторан") || name.includes("еда") || name.includes("пицц")) return <Utensils size={20} />;
    if (name.includes("такси") || name.includes("авто") || name.includes("транспорт")) return <Car size={20} />;
    if (name.includes("кафе") || name.includes("кофе")) return <Coffee size={20} />;
    if (name.includes("связь") || name.includes("телефон")) return <Smartphone size={20} />;
    if (name.includes("развлеч") || name.includes("кино") || name.includes("театр")) return <Globe size={20} />;
    if (name.includes("подар") || name.includes("цвет")) return <Gift size={20} />;
    return <HelpCircle size={20} />;
  };

  return (
    <div className={css({ minH: "100vh", bg: "var(--background)" })}>
      <div className={container({ maxWidth: { base: "512px", lg: "1100px" }, px: "20px", py: "32px" })}>
        <header className={flex({ justify: "space-between", align: "flex-start", mb: "32px", gap: "16px", flexDir: { base: "column", sm: "row" } })}>
          <div className={stack({ gap: "4px" })}>
            <a href="/" className="sber-icon-button">
              <ArrowLeft size={20} />
            </a>
            <h1 className={css({ fontSize: "24px", fontWeight: "800", color: "var(--foreground)" })}>История</h1>
          </div>
          <a href="/transactions/new" className="sber-button" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", textDecoration: "none", width: "auto", minWidth: "180px" }}>
            <PlusCircle size={20} /> Новая покупка
          </a>
        </header>

        {/* Filters */}
        <section className="sber-card" style={{ marginBottom: "24px", padding: "16px" }}>
          <form method="get" className={stack({ gap: "16px" })}>
            <div className={css({ display: "grid", gridTemplateColumns: { base: "1fr", md: "repeat(auto-fit, minmax(240px, 1fr))" }, gap: "16px" })}>
              <div className={flex({ gap: "10px" })}>
                <div className={stack({ gap: "4px", flex: "1" })}>
                  <label className="sber-label">ОТ</label>
                  <input type="date" name="startDate" defaultValue={startDate} className="sber-input" style={{ padding: "10px", fontSize: "13px" }} />
                </div>
                <div className={stack({ gap: "4px", flex: "1" })}>
                  <label className="sber-label">ДО</label>
                  <input type="date" name="endDate" defaultValue={endDate} className="sber-input" style={{ padding: "10px", fontSize: "13px" }} />
                </div>
              </div>

              <div className={flex({ gap: "10px" })}>
                <div className={stack({ gap: "4px", flex: "1" })}>
                  <label className="sber-label">БАНК</label>
                  <SearchableSelect 
                    name="bankId" 
                    options={bankOptions}
                    defaultValue={bankId?.toString()}
                    placeholder="Все банки"
                  />
                </div>
                <div className={stack({ gap: "4px", flex: "1" })}>
                  <label className="sber-label">КАРТА</label>
                  <SearchableSelect 
                    name="cardId" 
                    options={cardOptions}
                    defaultValue={cardId?.toString()}
                    placeholder="Все карты"
                  />
                </div>
              </div>

              <div className={stack({ gap: "4px" })}>
                <label className="sber-label">МАГАЗИН</label>
                <SearchableSelect 
                  name="merchantName" 
                  options={merchantOptions}
                  defaultValue={merchantName}
                  placeholder="Все магазины"
                />
              </div>
            </div>

            <div className={flex({ gap: "8px", justify: "flex-end" })}>
              <a href="/transactions" className={css({ p: "12px", bg: "var(--input-bg)", borderRadius: "14px", color: "#64748b", display: "flex", alignItems: "center", justifyContent: "center", _hover: { bg: "var(--border-color)" } })}>
                <X size={18} />
              </a>
              <button type="submit" className="sber-button" style={{ width: "auto", padding: "12px 24px" }}>
                <Filter size={16} /> Применить
              </button>
            </div>
          </form>
        </section>

        <div className={stack({ gap: "32px" })}>
          {history.length === 0 ? (
            <div className={css({ py: "80px", textAlign: "center", color: "secondaryText", bg: "var(--card-bg)", borderRadius: "24px", border: "1px dashed", borderColor: "#e2e8f0" })}>
              <p className={css({ fontSize: "15px", fontWeight: "600" })}>Покупки не найдены</p>
            </div>
          ) : (
            Object.entries(groupedHistory).map(([date, items]) => (
              <div key={date} className={stack({ gap: "12px" })}>
                <h3 className={css({ fontSize: "14px", fontWeight: "800", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em", ml: "8px" })}>{date}</h3>
                <div className={css({ display: "grid", gridTemplateColumns: { base: "1fr", md: "repeat(auto-fill, minmax(320px, 1fr))" }, gap: "12px" })}>
                  {items.map(item => {
                    const isSplit = item.paidAmount && item.paidAmount !== item.amount;
                    const merchantIcon = getIconUrl({ logo: item.merchantLogo, website: item.merchantWebsite, name: item.merchantName });
                    const totalCashback = (item.cashback || 0) + (item.manualAdjustment || 0);

                    return (
                      <div key={item.id} className="sber-card" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px', justifyContent: 'space-between' }}>
                        {/* TOP ROW */}
                        <div className={flex({ justify: "space-between", align: "center", gap: "12px" })}>
                          <div className={flex({ align: "center", gap: "10px", flex: 1, minW: 0 })}>
                            {/* Top Left: Icon */}
                            <div className={css({ w: "40px", h: "40px", borderRadius: "12px", bg: "var(--surface-secondary)", display: "flex", alignItems: "center", justifyContent: "center", border: "1px solid", borderColor: "var(--border-color)", overflow: "hidden", flexShrink: 0 })}>
                              {merchantIcon ? (
                                <img src={merchantIcon} alt={item.merchantName} className={css({ w: "full", h: "full", objectFit: "contain", p: "4px" })} />
                              ) : (
                                <div className={css({ color: "#64748b" })}>
                                  {getCategoryIcon(item.categoryName)}
                                </div>
                              )}
                            </div>
                            
                            {/* Top Center: Time, Merchant, Card */}
                            <div className={stack({ gap: "0", flex: 1, minW: 0 })}>
                              <div className={flex({ align: "center", gap: "6px" })}>
                                <span className={css({ fontSize: "12px", fontWeight: "800", color: "sberGreen", flexShrink: 0 })}>
                                  {item.date ? formatUTCTime(new Date(item.date)) : ''}
                                </span>
                                <p className={css({ fontWeight: "800", fontSize: "14px", color: "var(--foreground)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" })} title={item.merchantName}>
                                  {item.merchantName}
                                </p>
                              </div>
                              <p className={css({ fontSize: "11px", color: "secondaryText", fontWeight: "500", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" })}>
                                {item.bankName} {item.cardName}
                              </p>
                            </div>
                          </div>

                          {/* Top Right: Total Cashback */}
                          <div className={css({ 
                            fontSize: "15px", 
                            fontWeight: "900", 
                            color: totalCashback > 0 ? "var(--sber-green)" : (totalCashback < 0 ? "#ef4444" : "var(--foreground)"),
                            textAlign: "right",
                            flexShrink: 0
                          })}>
                            {totalCashback !== 0 ? `${totalCashback.toFixed(2)}₽` : '—'}
                          </div>
                        </div>

                        {/* BOTTOM ROW */}
                        <div className={flex({ justify: "space-between", align: "center", gap: "12px" })}>
                          {/* Bottom Left: Expected Cashback (Calculated + Adjustment) and Percentage */}
                          <div className={flex({ align: "center", gap: "6px", flexShrink: 0 })}>
                            {item.manualAdjustment !== 0 && (
                              <div className={css({ 
                                px: "6px", 
                                py: "1px", 
                                bg: item.manualAdjustment > 0 ? "rgba(234, 179, 8, 0.1)" : "rgba(239, 68, 68, 0.1)", 
                                color: item.manualAdjustment > 0 ? "#eab308" : "#ef4444", 
                                borderRadius: "6px", 
                                fontSize: "11px", 
                                fontWeight: "900" 
                              })}>
                                {item.manualAdjustment > 0 ? `+${item.manualAdjustment.toFixed(2)}` : item.manualAdjustment.toFixed(2)}
                              </div>
                            )}

                            {item.cashback !== null && item.cashback > 0 && (
                              <div className={flex({ align: "center", gap: "4px" })}>
                                <span className={css({ fontSize: "10px", fontWeight: "800", color: "#94a3b8" })}>
                                  {item.cashbackPercentage !== null ? item.cashbackPercentage : (item.amount > 0 ? ((item.cashback || 0) / item.amount * 100).toFixed(0) : 0)}%
                                </span>
                                <div className={css({ px: "6px", py: "1px", bg: "rgba(33, 160, 56, 0.1)", color: "var(--sber-green)", borderRadius: "6px", fontSize: "11px", fontWeight: "900" })}>
                                  +{item.cashback.toFixed(2)}
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Bottom Center: Category */}
                          <div className={css({ 
                            fontSize: "10px", 
                            fontWeight: "800", 
                            color: "#94a3b8", 
                            textTransform: "uppercase", 
                            whiteSpace: "nowrap", 
                            overflow: "hidden", 
                            textOverflow: "ellipsis", 
                            flex: 1,
                            textAlign: "center"
                          })}>
                            {item.categoryName || 'Без категории'}
                          </div>

                          {/* Bottom Right: Amount and Split Info */}
                          <div className={stack({ align: "flex-end", gap: "0", flexShrink: 0 })}>
                            <p className={css({ fontWeight: "900", fontSize: "17px", color: "var(--foreground)" })}>
                              {item.amount.toFixed(2)}₽
                            </p>
                            {isSplit && (
                              <p className={css({ fontSize: "9px", color: "secondaryText", fontWeight: "700", textTransform: "uppercase" })}>
                                ЧЕК: {item.paidAmount?.toFixed(2)}₽
                              </p>
                            )}
                          </div>
                        </div>

                        {/* ACTIONS */}
                        <div className={flex({ justify: "flex-end", gap: "4px", pt: "8px", borderTop: "1px solid", borderColor: "var(--separator)" })}>
                          <a href={`/transactions/${item.id}/edit`} className={css({ color: "#64748b", p: "6px", borderRadius: "8px", _hover: { color: "var(--sber-green)", bg: "rgba(33, 160, 56, 0.05)" } })}>
                            <Edit2 size={16} />
                          </a>
                          <form action={deleteTransaction.bind(null, item.id)}>
                            <button type="submit" className={css({ color: "#64748b", p: "6px", cursor: "pointer", borderRadius: "8px", _hover: { color: "#ef4444", bg: "rgba(239, 68, 68, 0.05)" } })}>
                              <Trash2 size={16} />
                            </button>
                          </form>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}