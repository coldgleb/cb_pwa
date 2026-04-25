import { db } from "@/db";
import { transactions, userCards, bankCards, banks, bankCategories, merchants } from "@/db/schema";
import { auth } from "@/auth";
import { css } from "../../../../styled-system/css";
import { stack, container, flex } from "../../../../styled-system/patterns";
import { eq, desc, and, gte, lte, inArray, asc } from "drizzle-orm";
import { redirect } from "next/navigation";
import { ArrowLeft, ShoppingCart, Utensils, Car, Coffee, Smartphone, Globe, Gift, HelpCircle, Filter, X, Store } from "lucide-react";
import { deleteTransaction } from "@/lib/actions/transactions";
import { Trash2, Edit2 } from "lucide-react";
import SearchableSelect from "@/components/SearchableSelect";
import { getIconUrl } from "@/lib/utils/icons";

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

  // Build query with filters
  const conditions = [eq(transactions.userId, session.user.id!)];
  
  if (startDate) conditions.push(gte(transactions.transactionDate, new Date(startDate)));
  if (endDate) {
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);
    conditions.push(lte(transactions.transactionDate, end));
  }
  if (cardId) conditions.push(eq(transactions.userCardId, cardId));
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
    <div className={css({ minH: "100vh", bg: "#f4f4f4" })}>
      <div className="sber-container">
        <header className={stack({ gap: "4px", mb: "32px" })}>
          <a href="/" className="sber-icon-button">
            <ArrowLeft size={20} />
          </a>
          <h1 className={css({ fontSize: "24px", fontWeight: "800", color: "#000" })}>История</h1>
        </header>

        {/* Filters */}
        <section className="sber-card" style={{ marginBottom: "24px", padding: "16px" }}>
          <form method="get" className={stack({ gap: "16px" })}>
            <div className={flex({ gap: "10px", wrap: "wrap" })}>
              <div className={stack({ gap: "4px", flex: "1", minW: "140px" })}>
                <label className="sber-label">ОТ</label>
                <input type="date" name="startDate" defaultValue={startDate} className="sber-input" style={{ padding: "10px", fontSize: "13px" }} />
              </div>
              <div className={stack({ gap: "4px", flex: "1", minW: "140px" })}>
                <label className="sber-label">ДО</label>
                <input type="date" name="endDate" defaultValue={endDate} className="sber-input" style={{ padding: "10px", fontSize: "13px" }} />
              </div>
            </div>

            <div className={flex({ gap: "10px", wrap: "wrap" })}>
              <div className={stack({ gap: "4px", flex: "1", minW: "140px" })}>
                <label className="sber-label">БАНК</label>
                <SearchableSelect 
                  name="bankId" 
                  options={bankOptions}
                  defaultValue={bankId?.toString()}
                  placeholder="Все банки"
                />
              </div>
              <div className={stack({ gap: "4px", flex: "1", minW: "140px" })}>
                <label className="sber-label">КАРТА</label>
                <SearchableSelect 
                  name="cardId" 
                  options={cardOptions}
                  defaultValue={cardId?.toString()}
                  placeholder="Все карты"
                />
              </div>
            </div>

            <div className={flex({ gap: "8px" })}>
              <button type="submit" className="sber-button" style={{ flex: 1, padding: "12px" }}>
                <Filter size={16} /> Применить
              </button>
              <a href="/transactions" className={css({ p: "12px", bg: "#f1f5f9", borderRadius: "14px", color: "#64748b", display: "flex", alignItems: "center", justifyContent: "center" })}>
                <X size={18} />
              </a>
            </div>
          </form>
        </section>

        <div className={stack({ gap: "12px" })}>
          {history.length === 0 ? (
            <div className={css({ py: "80px", textAlign: "center", color: "secondaryText", bg: "white", borderRadius: "24px", border: "1px dashed", borderColor: "#e2e8f0" })}>
              <p className={css({ fontSize: "15px", fontWeight: "600" })}>Покупки не найдены</p>
            </div>
          ) : (
            history.map(item => {
              const isSplit = item.paidAmount && item.paidAmount !== item.amount;
              const merchantIcon = getIconUrl({ logo: item.merchantLogo, website: item.merchantWebsite, name: item.merchantName });
              const totalCashback = (item.cashback || 0) + (item.manualAdjustment || 0);

              return (
                <div key={item.id} className="sber-card" style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div className={css({ w: "52px", h: "52px", borderRadius: "16px", bg: "#f8fafc", display: "flex", alignItems: "center", justifyContent: "center", border: "1px solid", borderColor: "#f1f5f9", overflow: "hidden" })}>
                    {merchantIcon ? (
                      <img src={merchantIcon} alt={item.merchantName} className={css({ w: "full", h: "full", objectFit: "contain", p: "4px" })} />
                    ) : (
                      <div className={css({ color: "#64748b" })}>
                        {getCategoryIcon(item.categoryName)}
                      </div>
                    )}
                  </div>
                  <div className={stack({ gap: "0", flex: "1" })}>
                    <p className={css({ fontWeight: "800", fontSize: "16px", color: "#000" })}>{item.merchantName}</p>
                    <p className={css({ fontSize: "13px", color: "secondaryText", fontWeight: "500" })}>
                      {item.bankName} {item.cardName}
                    </p>
                    <div className={flex({ align: "center", gap: "6px", mt: "4px" })}>
                      <span className={css({ fontSize: "11px", fontWeight: "800", color: "#94a3b8", textTransform: "uppercase" })}>
                        {item.date?.toLocaleDateString('ru-RU')}
                      </span>
                      <span className={css({ w: "3px", h: "3px", bg: "#cbd5e1", borderRadius: "full" })} />
                      <span className={css({ fontSize: "11px", fontWeight: "800", color: "sberGreen", textTransform: "uppercase" })}>
                        {item.categoryName || 'Без категории'}
                      </span>
                    </div>
                  </div>
                  <div className={stack({ align: "end", gap: "8px" })}>
                    <div className={stack({ align: "end", gap: "2px" })}>
                      <p className={css({ fontWeight: "900", fontSize: "17px", color: "#000" })}>
                        {item.amount.toFixed(2)}₽
                      </p>
                      {isSplit && (
                        <p className={css({ fontSize: "10px", color: "secondaryText", fontWeight: "700" })}>
                          ЧЕК: {item.paidAmount?.toFixed(2)}₽
                        </p>
                      )}
                      {totalCashback > 0 && (
                        <div className={css({ px: "8px", py: "2px", bg: "#f0fdf4", color: "sberGreen", borderRadius: "8px", fontSize: "12px", fontWeight: "900" })}>
                          +{totalCashback.toFixed(2)}
                        </div>
                      )}
                    </div>
                    
                    <div className={flex({ gap: "8px" })}>
                      <a href={`/transactions/${item.id}/edit`} className={css({ color: "#64748b", p: "4px", _hover: { color: "sberGreen" } })}>
                        <Edit2 size={16} />
                      </a>
                      <form action={deleteTransaction.bind(null, item.id)}>
                        <button type="submit" className={css({ color: "#64748b", p: "4px", cursor: "pointer", _hover: { color: "#ef4444" } })}>
                          <Trash2 size={16} />
                        </button>
                      </form>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
