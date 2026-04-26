import { db } from "@/db";
import { bankCategories, mccCodes, bankCategoryMcc, bankCards, banks, merchants, bankCategoryMerchant } from "@/db/schema";
import { linkMccToCategory, unlinkMccFromCategory, linkMerchantToCategory, unlinkMerchantFromCategory, linkMultipleMccToCategory } from "@/lib/actions/mcc";
import { css } from "../../../../../../../styled-system/css";
import { stack, flex } from "../../../../../../../styled-system/patterns";
import { eq, and, notInArray, isNull } from "drizzle-orm";
import { notFound } from "next/navigation";
import { ArrowLeft, Trash2, Plus, Store, Tag } from "lucide-react";
import SearchableSelect from "@/components/SearchableSelect";
import CopyMccsButton from "@/components/admin/CopyMccsButton";
import CompositionActions from "@/components/admin/CompositionActions";

export default async function CategoryCompositionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const categoryId = parseInt(id);

  if (isNaN(categoryId)) notFound();

  const [category] = await db
    .select({
      id: bankCategories.id,
      name: bankCategories.name,
      bankCardId: bankCategories.bankCardId,
      cardName: bankCards.name,
      bankName: banks.name,
    })
    .from(bankCategories)
    .where(eq(bankCategories.id, categoryId))
    .leftJoin(bankCards, eq(bankCategories.bankCardId, bankCards.id))
    .leftJoin(banks, eq(bankCards.bankId, banks.id))
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
    <div className={css({ minH: "100vh", bg: "#f4f4f4" })}>
      <div className="sber-container">
        <header className={stack({ gap: "4px", mb: "32px" })}>
          <a href={`/admin/bank-cards/${category.bankCardId}`} className="sber-icon-button">
            <ArrowLeft size={20} />
          </a>
          <h1 className={css({ fontSize: "24px", fontWeight: "800", color: "#000" })}>Состав "{category.name}"</h1>
          <p className={css({ fontSize: "14px", color: "secondaryText", fontWeight: "600" })}>{category.bankName} • {category.cardName}</p>
        </header>

        <div className={stack({ gap: "40px" })}>
          
          {/* Блок МСС */}
          <section className={stack({ gap: "16px" })}>
            <div className={flex({ align: "center", justify: "space-between" })}>
              <h2 className="sber-label">ПРИВЯЗАННЫЕ MCC-КОДЫ</h2>
              <CopyMccsButton mccs={linkedMcc.map(m => m.code).join(", ")} />
            </div>
            
            <CompositionActions 
              categoryId={categoryId}
              type="mcc"
              options={mccOptions}
              linkAction={linkMccToCategory}
              unlinkAction={unlinkMccFromCategory}
              linkMultipleAction={linkMultipleMccToCategory}
              linkedItems={linkedMcc.map(m => ({ id: m.code, label: m.description, sublabel: m.code }))}
            />
          </section>

          {/* Блок Мерчантов */}
          <section className={stack({ gap: "16px" })}>
            <div className={flex({ align: "center", justify: "space-between" })}>
              <h2 className="sber-label">ПРИВЯЗАННЫЕ МЕРЧАНТЫ (МАГАЗИНЫ)</h2>
            </div>
            
            <CompositionActions 
              categoryId={categoryId}
              type="merchant"
              options={merchantOptions}
              linkAction={linkMerchantToCategory}
              unlinkAction={unlinkMerchantFromCategory}
              linkedItems={linkedMerchants.map(m => ({ id: m.id, label: m.name }))}
            />
          </section>

        </div>
      </div>
    </div>
  );
}
