import { db } from "@/db";
import { bankCategories, mccCodes, bankCategoryMcc, bankCards, banks, merchants, bankCategoryMerchant, loyaltyPrograms } from "@/db/schema";
import { linkMccToCategory, unlinkMccFromCategory, linkMerchantToCategory, unlinkMerchantFromCategory, linkMultipleMccToCategory } from "@/lib/actions/mcc";
import { css } from "../../../../../../../styled-system/css";
import { stack, flex } from "../../../../../../../styled-system/patterns";
import { eq, and, notInArray, isNull } from "drizzle-orm";
import { notFound } from "next/navigation";
import { ArrowLeft, Trash2, Plus, Store, Tag } from "lucide-react";
import SearchableSelect from "@/components/SearchableSelect";
import CopyMccsButton from "@/components/admin/CopyMccsButton";
import CompositionActions from "@/components/admin/CompositionActions";

export const dynamic = "force-dynamic";

export default async function CategoryCompositionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const categoryId = parseInt(id);

  if (isNaN(categoryId)) notFound();

  const [category] = await db
    .select({
      id: bankCategories.id,
      name: bankCategories.name,
      loyaltyProgramId: bankCategories.loyaltyProgramId,
      programName: loyaltyPrograms.name,
      bankName: banks.name,
    })
    .from(bankCategories)
    .where(eq(bankCategories.id, categoryId))
    .leftJoin(loyaltyPrograms, eq(bankCategories.loyaltyProgramId, loyaltyPrograms.id))
    .leftJoin(banks, eq(loyaltyPrograms.bankId, banks.id))
    .limit(1);

  if (!category) notFound();

  // Active MCCs
  const linkedMcc = await db
    .select({
      code: mccCodes.code,
      description: mccCodes.description,
    })
    .from(bankCategoryMcc)
    .innerJoin(mccCodes, eq(bankCategoryMcc.mccCode, mccCodes.code))
    .where(
      and(
        eq(bankCategoryMcc.categoryId, categoryId),
        isNull(bankCategoryMcc.endDate)
      )
    );

  const linkedCodes = linkedMcc.map(m => m.code);
  
  const availableMcc = await db
    .select()
    .from(mccCodes)
    .where(linkedCodes.length > 0 ? notInArray(mccCodes.code, linkedCodes) : undefined);

  const mccOptions = availableMcc.map(m => ({ value: m.code, label: `${m.code} — ${m.description}` }));

  // Active Merchants
  const linkedMerchants = await db
    .select({
      id: merchants.id,
      name: merchants.name,
    })
    .from(bankCategoryMerchant)
    .innerJoin(merchants, eq(bankCategoryMerchant.merchantId, merchants.id))
    .where(
      and(
        eq(bankCategoryMerchant.categoryId, categoryId),
        isNull(bankCategoryMerchant.endDate)
      )
    );

  const linkedMerchantIds = linkedMerchants.map(m => m.id);

  const availableMerchants = await db
    .select()
    .from(merchants)
    .where(linkedMerchantIds.length > 0 ? notInArray(merchants.id, linkedMerchantIds) : undefined);
    
  const merchantOptions = availableMerchants.map(m => ({ value: m.id.toString(), label: m.name }));

  return (
    <div className={css({ minH: "100vh", bg: "var(--background)", pb: "40px" })}>
      <div className="sber-container-admin">
        <header className={flex({ align: "center", gap: "16px", mb: "32px" })}>
          <a href={`/admin/loyalty-programs/${category.loyaltyProgramId}`} className="sber-icon-button" style={{ flexShrink: 0 }}>
            <ArrowLeft size={20} />
          </a>
          <div className={stack({ gap: "4px" })}>
            <h1 className={css({ fontSize: "24px", fontWeight: "800", color: "var(--foreground)" })}>Состав категории</h1>
            <div className={flex({ align: "center", gap: "8px" })}>
              <span className={css({ px: "8px", py: "3px", bg: "var(--foreground)", color: "var(--card-bg)", borderRadius: "6px", fontSize: "11px", fontWeight: "800" })}>
                {category.name.toUpperCase()}
              </span>
              <p className={css({ fontSize: "13px", color: "var(--secondary-text)", fontWeight: "600" })}>
                {category.bankName} • {category.programName}
              </p>
            </div>
          </div>
        </header>

        <div className={stack({ gap: "32px" })}>
          
          {/* Блок МСС */}
          <section className="sber-card">
            <div className={flex({ align: "center", justify: "space-between", mb: "20px" })}>
              <div className={flex({ align: "center", gap: "10px" })}>
                <div className={css({ p: "6px", bg: "var(--sber-green)", borderRadius: "8px", color: "white" })}>
                  <Tag size={18} />
                </div>
                <h2 className="sber-label" style={{ marginBottom: 0 }}>MCC-КОДЫ</h2>
              </div>
              <CopyMccsButton mccs={linkedMcc.map(m => m.code).join(", ")} />
            </div>
            
            <div className={css({ bg: "var(--surface-secondary)", p: "20px", borderRadius: "16px", border: "1px solid", borderColor: "var(--border-color)" })}>
              <CompositionActions 
                categoryId={categoryId}
                type="mcc"
                options={mccOptions}
                linkAction={linkMccToCategory}
                unlinkAction={unlinkMccFromCategory}
                linkMultipleAction={linkMultipleMccToCategory}
                linkedItems={linkedMcc.map(m => ({ id: m.code, label: m.description, sublabel: m.code }))}
              />
            </div>
          </section>

          {/* Блок Мерчантов */}
          <section className="sber-card">
            <div className={flex({ align: "center", gap: "10px", mb: "20px" })}>
              <div className={css({ p: "6px", bg: "#3b82f6", borderRadius: "8px", color: "white" })}>
                <Store size={18} />
              </div>
              <h2 className="sber-label" style={{ marginBottom: 0 }}>ПРИВЯЗАННЫЕ МАГАЗИНЫ</h2>
            </div>
            
            <div className={css({ bg: "var(--surface-secondary)", p: "20px", borderRadius: "16px", border: "1px solid", borderColor: "var(--border-color)" })}>
              <CompositionActions 
                categoryId={categoryId}
                type="merchant"
                options={merchantOptions}
                linkAction={linkMerchantToCategory}
                unlinkAction={unlinkMerchantFromCategory}
                linkedItems={linkedMerchants.map(m => ({ id: m.id, label: m.name }))}
              />
            </div>
            <p className={css({ fontSize: "12px", color: "var(--secondary-text)", mt: "12px", ml: "4px", lineHeight: "1.5" })}>
              Добавление конкретных магазинов имеет приоритет над общими MCC-кодами. Полезно для партнеров или исключений.
            </p>
          </section>

        </div>
      </div>
    </div>
  );
}
