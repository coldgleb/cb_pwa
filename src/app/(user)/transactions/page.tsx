import { db } from "@/db";
import { transactions, userCards, bankCards, banks, bankCategories, merchants, spendingCategories, transactionCategorySplits } from "@/db/schema";
import { auth } from "@/auth";
import { css } from "../../../../styled-system/css";
import { stack, container, flex, grid, wrap } from "../../../../styled-system/patterns";
import { eq, desc, and, gte, lte, inArray, asc, aliasedTable } from "drizzle-orm";
import { redirect } from "next/navigation";
import { ArrowLeft, PlusCircle } from "lucide-react";
import TransactionsList from "@/components/TransactionsList";
import { getSpendingCategoryOptions } from "@/lib/actions/spending-categories";

export const dynamic = "force-dynamic";

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
  
  const getArrayParam = (param: string | string[] | undefined): string[] => {
    if (!param) return [];
    return Array.isArray(param) ? param : [param];
  };

  const bankIds = getArrayParam(params.bankId);
  const cardIds = getArrayParam(params.cardId);

  // 1. Parallelize initial data fetching for filters
  const [myCards, spendingCategoryOptions] = await Promise.all([
    db
      .select({
        id: userCards.id,
        cardName: bankCards.name,
        bankName: banks.name,
        bankId: banks.id,
        accountType: userCards.accountType
      })
      .from(userCards)
      .innerJoin(bankCards, eq(userCards.bankCardId, bankCards.id))
      .innerJoin(banks, eq(bankCards.bankId, banks.id))
      .where(
        and(
          eq(userCards.userId, session.user.id!),
          inArray(userCards.accountType, ["debit", "credit"])
        )
      ),
    getSpendingCategoryOptions()
  ]);

  const uniqueBanks = Array.from(new Map(myCards.map(c => [c.bankId, { id: c.bankId, name: c.bankName }])).values());

  const bankOptions = uniqueBanks.map(b => ({ value: b.id.toString(), label: b.name }));
  const cardOptions = myCards.map(c => ({ 
    value: c.id.toString(), 
    label: `${c.bankName} ${c.cardName}`,
    bankId: c.bankId 
  }));

  // Build query with filters
  const conditions = [eq(transactions.userId, session.user.id!)];
  
  if (startDate) conditions.push(gte(transactions.transactionDate, new Date(startDate)));
  if (endDate) {
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);
    conditions.push(lte(transactions.transactionDate, end));
  }
  
  if (cardIds.length > 0) {
    conditions.push(inArray(transactions.userCardId, cardIds.map(id => parseInt(id))));
  } else if (bankIds.length > 0) {
    const bankCardsIds = myCards.filter(c => bankIds.includes(c.bankId.toString())).map(c => c.id);
    if (bankCardsIds.length > 0) {
      conditions.push(inArray(transactions.userCardId, bankCardsIds));
    } else {
      conditions.push(eq(transactions.userCardId, -1)); // No matches
    }
  }

  const toUserCards = aliasedTable(userCards, "to_user_cards");
  const toBankCards = aliasedTable(bankCards, "to_bank_cards");
  const toBanks = aliasedTable(banks, "to_banks");

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
      spendingCategoryName: spendingCategories.name,
      merchantLogo: merchants.logo,
      merchantWebsite: merchants.website,
      type: transactions.type,
      toUserCardId: transactions.toUserCardId,
      toCardName: toBankCards.name,
      toBankName: toBanks.name,
    })
    .from(transactions)
    .leftJoin(userCards, eq(transactions.userCardId, userCards.id))
    .leftJoin(bankCards, eq(userCards.bankCardId, bankCards.id))
    .leftJoin(banks, eq(bankCards.bankId, banks.id))
    .leftJoin(toUserCards, eq(transactions.toUserCardId, toUserCards.id))
    .leftJoin(toBankCards, eq(toUserCards.bankCardId, toBankCards.id))
    .leftJoin(toBanks, eq(toBankCards.bankId, toBanks.id))
    .leftJoin(bankCategories, eq(transactions.categoryId, bankCategories.id))
    .leftJoin(spendingCategories, eq(transactions.spendingCategoryId, spendingCategories.id))
    .leftJoin(merchants, eq(transactions.merchantName, merchants.name))
    .where(and(...conditions))
    .orderBy(desc(transactions.transactionDate))
    .limit(50);

  const allSplits = await db
    .select({
      transactionId: transactionCategorySplits.transactionId,
      amount: transactionCategorySplits.amount,
      categoryName: spendingCategories.name,
    })
    .from(transactionCategorySplits)
    .innerJoin(spendingCategories, eq(transactionCategorySplits.spendingCategoryId, spendingCategories.id))
    .where(inArray(transactionCategorySplits.transactionId, history.length > 0 ? history.map(h => h.id) : [-1]));

  const splitsMap = allSplits.reduce((acc, s) => {
    if (!acc[s.transactionId]) acc[s.transactionId] = [];
    acc[s.transactionId].push(s);
    return acc;
  }, {} as Record<number, any[]>);

  return (
    <div className={css({ minH: "100vh", bg: "var(--background)" })}>
      <div className={container({ 
        maxWidth: { base: "512px", lg: "1100px" }, 
        px: "20px", 
        py: "32px",
        pb: "calc(120px + env(safe-area-inset-bottom))"
      })}>
        <header className={flex({ justify: "space-between", align: "flex-start", mb: "32px", gap: "16px", flexDir: { base: "column", sm: "row" } })}>
          <div className={stack({ gap: "4px" })}>
            <a href="/" className="sber-icon-button">
              <ArrowLeft size={20} />
            </a>
            <h1 className={css({ fontSize: "24px", fontWeight: "800", color: "var(--foreground)" })}>История</h1>
          </div>
          <a href="/transactions/new" className="sber-button" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", textDecoration: "none", width: "auto", minWidth: "180px" }}>
            <PlusCircle size={20} /> Новая транзакция
          </a>
        </header>

        <TransactionsList initialHistory={history} splitsMap={splitsMap} />
      </div>
    </div>
  );
}
