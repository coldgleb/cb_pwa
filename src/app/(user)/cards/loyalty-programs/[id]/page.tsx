import { db } from "@/db";
import { banks, loyaltyPrograms, bankCategories, userCashbackRules } from "@/db/schema";
import { auth } from "@/auth";
import MonthlyRulesForm from "@/components/MonthlyRulesForm";
import { css } from "../../../../../../styled-system/css";
import { stack } from "../../../../../../styled-system/patterns";
import { eq, desc, and } from "drizzle-orm";
import { redirect, notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function LoyaltyProgramRulesPage({ 
  params, 
  searchParams 
}: { 
  params: Promise<{ id: string }>,
  searchParams: Promise<{ month?: string }>
}) {
  const session = await auth();
  if (!session) redirect("/");

  const { id } = await params;
  const loyaltyProgramId = parseInt(id);
  if (isNaN(loyaltyProgramId)) notFound();

  const queryParams = await searchParams;
  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const yearMonth = queryParams.month || currentMonth;
  const startDate = `${yearMonth}-01`;

  // Fetch loyalty program details
  const [program] = await db
    .select({
      id: loyaltyPrograms.id,
      name: loyaltyPrograms.name,
      bankName: banks.name,
    })
    .from(loyaltyPrograms)
    .innerJoin(banks, eq(loyaltyPrograms.bankId, banks.id))
    .where(eq(loyaltyPrograms.id, loyaltyProgramId))
    .limit(1);

  if (!program) notFound();

  const allCategories = await db.select().from(bankCategories);

  // Fetch user selected rules for this program
  const activeRules = await db
    .select({
      id: userCashbackRules.id,
      percentage: userCashbackRules.percentage,
      bankCategoryId: userCashbackRules.bankCategoryId,
      categoryName: bankCategories.name,
      cashbackLimit: userCashbackRules.cashbackLimit,
    })
    .from(userCashbackRules)
    .leftJoin(bankCategories, eq(userCashbackRules.bankCategoryId, bankCategories.id))
    .where(
      and(
        eq(userCashbackRules.userId, session.user.id!),
        eq(userCashbackRules.loyaltyProgramId, loyaltyProgramId),
        eq(userCashbackRules.startDate, startDate)
      )
    )
    .orderBy(desc(userCashbackRules.percentage));

  return (
    <div className={css({ minH: "100vh", bg: "var(--background)" })}>
      <div className="sber-container">
        <header className={stack({ gap: "4px", mb: "32px" })}>
          <a href="/cards" className="sber-icon-button">
            <ArrowLeft size={20} />
          </a>
          <h1 className={css({ fontSize: "24px", fontWeight: "800", color: "var(--foreground)" })}>Категории программы лояльности</h1>
          <p className={css({ fontSize: "14px", color: "secondaryText", fontWeight: "600" })}>
            {program.bankName} — {program.name}
          </p>
        </header>

        <div className={stack({ gap: "40px" })}>
          <MonthlyRulesForm 
            key={yearMonth}
            loyaltyProgramId={program.id}
            loyaltyProgramName={program.name}
            bankName={program.bankName}
            allCategories={allCategories} 
            initialMonth={yearMonth}
            activeRules={activeRules.map(r => ({ 
              categoryId: r.bankCategoryId!, 
              percentage: r.percentage,
              cashbackLimit: r.cashbackLimit
            }))}
          />
        </div>
      </div>
    </div>
  );
}
