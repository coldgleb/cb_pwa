import { db } from "@/db";
import { bankCategories, mccCodes, bankCategoryMcc, bankCards, banks, merchants, bankCategoryMerchant, loyaltyPrograms } from "@/db/schema";
import { linkMccToCategory, unlinkMccFromCategory, linkMerchantToCategory, unlinkMerchantFromCategory, linkMultipleMccToCategory, addMccToCategoryAction, addMerchantToCategoryAction } from "@/lib/actions/mcc";
import { css } from "../../../../../../../styled-system/css";
import { stack, flex } from "../../../../../../../styled-system/patterns";
import { eq, and, notInArray, isNull } from "drizzle-orm";
import { notFound } from "next/navigation";
import { ArrowLeft, Trash2, Plus, Store } from "lucide-react";
import SearchableSelect from "@/components/SearchableSelect";
import CopyMccsButton from "@/components/admin/CopyMccsButton";
import MccImportFromUrl from "@/components/admin/MccImportFromUrl";

export default async function CategoryCompositionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const categoryId = parseInt(id);

  if (isNaN(categoryId)) notFound();

  const addMccWithId = addMccToCategoryAction.bind(null, categoryId);
  const addMerchantWithId = addMerchantToCategoryAction.bind(null, categoryId);

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
    <div className={stack({ gap: "32px" })}>
      <header className={flex({ align: "center", gap: "16px", mb: "8px" })}>
        <a href={`/admin/loyalty-programs/${category.loyaltyProgramId}`} className="sber-icon-button">
          <ArrowLeft size={20} />
        </a>
        <div className={stack({ gap: "4px" })}>
          <h1 className={css({ fontSize: "24px", fontWeight: "800", color: "var(--foreground)" })}>Состав "{category.name}"</h1>
          <p className={css({ fontSize: "14px", color: "var(--secondary-text)", fontWeight: "600" })}>{category.bankName} • {category.programName}</p>
        </div>
      </header>

      <div className={stack({ gap: "40px" })}>
        
        {/* Блок МСС */}
        <section className={stack({ gap: "16px" })}>
          <div className={flex({ align: "center", justify: "space-between" })}>
            <h2 className="sber-label">ПРИВЯЗАННЫЕ MCC-КОДЫ</h2>
            <CopyMccsButton mccs={linkedMcc.map(m => m.code).join(", ")} />
          </div>
          
          <div className="sber-card" style={{ padding: "16px" }}>
            <form action={addMccWithId} className={stack({ gap: "16px", mb: "24px" })}>
              <div className={stack({ gap: "12px" })}>
                <div className={flex({ gap: "8px", align: "end" })}>
                  <div className={stack({ gap: "4px", flex: 1 })}>
                    <label className={css({ fontSize: "10px", fontWeight: "800", color: "var(--secondary-text)", textTransform: "uppercase" })}>Добавить код (выбор из списка)</label>
                    <SearchableSelect 
                      name="mccCode"
                      options={mccOptions}
                      placeholder="Выберите MCC..."
                    />
                  </div>
                </div>

                <div className={stack({ gap: "4px" })}>
                  <label className={css({ fontSize: "10px", fontWeight: "800", color: "var(--secondary-text)", textTransform: "uppercase" })}>Или вставьте список кодов (текстом)</label>
                  <textarea 
                    name="mccText"
                    placeholder="Например: 5411, 5812. Любой текст с 4-значными кодами будет распознан автоматически."
                    className="sber-input"
                    style={{ minHeight: "60px", paddingTop: "8px", fontSize: "13px" }}
                  />
                </div>
                
                <button type="submit" className="sber-button">
                  <Plus size={18} style={{ marginRight: "8px" }} /> ДОБАВИТЬ MCC
                </button>
              </div>
            </form>

            <MccImportFromUrl categoryId={categoryId} />

            <div className={stack({ gap: "8px" })}>
              {linkedMcc.length === 0 ? (
                <div className={css({ p: "24px", textAlign: "center", bg: "var(--surface-secondary)", borderRadius: "16px", color: "var(--secondary-text)", fontSize: "13px" })}>
                  MCC-коды не привязаны
                </div>
              ) : (
                linkedMcc.map(mcc => (
                  <div key={mcc.code} className={flex({ align: "center", justify: "space-between", p: "12px", bg: "var(--surface-secondary)", borderRadius: "14px" })}>
                    <div className={flex({ align: "center", gap: "12px" })}>
                      <div className={css({ fontWeight: "800", color: "var(--sber-green)", fontSize: "14px", fontVariantNumeric: "tabular-nums" })}>{mcc.code}</div>
                      <span className={css({ fontSize: "13px", color: "var(--foreground)", fontWeight: "600" })}>{mcc.description}</span>
                    </div>
                    <form action={unlinkMccFromCategory.bind(null, categoryId, mcc.code)}>
                      <button className={css({ p: "8px", color: "#ef4444", cursor: "pointer", _hover: { bg: "rgba(239, 68, 68, 0.1)", borderRadius: "full" } })}>
                        <Trash2 size={16} />
                      </button>
                    </form>
                  </div>
                ))
              )}
            </div>
          </div>
        </section>

        {/* Блок Мерчантов */}
        <section className={stack({ gap: "16px" })}>
          <div className={flex({ align: "center", justify: "space-between" })}>
            <h2 className="sber-label">ПРИВЯЗАННЫЕ МЕРЧАНТЫ (МАГАЗИНЫ)</h2>
          </div>
          
          <div className="sber-card" style={{ padding: "16px" }}>
            <form action={addMerchantWithId} className={stack({ gap: "12px", mb: "16px" })}>
              <div className={flex({ gap: "8px", align: "end" })}>
                <div className={stack({ gap: "4px", flex: 1 })}>
                  <label className={css({ fontSize: "10px", fontWeight: "800", color: "var(--secondary-text)", textTransform: "uppercase" })}>Добавить магазин</label>
                  <SearchableSelect 
                    name="merchantId"
                    options={merchantOptions}
                    placeholder="Выберите мерчанта..."
                  />
                </div>
                <button type="submit" className="sber-button" style={{ width: "auto", padding: "12px 16px" }}>
                  <Plus size={18} />
                </button>
              </div>
            </form>

            <div className={stack({ gap: "8px" })}>
              {linkedMerchants.length === 0 ? (
                <div className={css({ p: "24px", textAlign: "center", bg: "var(--surface-secondary)", borderRadius: "16px", color: "var(--secondary-text)", fontSize: "13px" })}>
                  Отдельные магазины не привязаны
                </div>
              ) : (
                linkedMerchants.map(merchant => (
                  <div key={merchant.id} className={flex({ align: "center", justify: "space-between", p: "12px", bg: "var(--surface-secondary)", borderRadius: "14px" })}>
                    <div className={flex({ align: "center", gap: "12px" })}>
                      <Store size={18} className={css({ color: "var(--sber-green)" })} />
                      <span className={css({ fontSize: "14px", color: "var(--foreground)", fontWeight: "700" })}>{merchant.name}</span>
                    </div>
                    <form action={unlinkMerchantFromCategory.bind(null, categoryId, merchant.id)}>
                      <button className={css({ p: "8px", color: "#ef4444", cursor: "pointer", _hover: { bg: "rgba(239, 68, 68, 0.1)", borderRadius: "full" } })}>
                        <Trash2 size={16} />
                      </button>
                    </form>
                  </div>
                ))
              )}
            </div>
          </div>
        </section>

      </div>
    </div>
  );
}
