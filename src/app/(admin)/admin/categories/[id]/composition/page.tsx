import { db } from "@/db";
import { bankCategories, mccCodes, bankCategoryMcc, bankCards, banks, merchants, bankCategoryMerchant } from "@/db/schema";
import { linkMccToCategory, unlinkMccFromCategory, linkMerchantToCategory, unlinkMerchantFromCategory } from "@/lib/actions/mcc";
import { css } from "../../../../../../../styled-system/css";
import { stack, flex } from "../../../../../../../styled-system/patterns";
import { eq, and, notInArray, isNull } from "drizzle-orm";
import { notFound } from "next/navigation";
import { ArrowLeft, Trash2, Plus, Store, Tag } from "lucide-react";
import SearchableSelect from "@/components/SearchableSelect";

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
            </div>
            
            <div className="sber-card" style={{ padding: "16px" }}>
              <form action={async (formData) => {
                "use server";
                const code = formData.get("mccCode") as string;
                if (code) await linkMccToCategory(categoryId, code);
              }} className={stack({ gap: "12px", mb: "16px" })}>
                <div className={flex({ gap: "8px", align: "end", w: "full" })}>
                  <div className={stack({ gap: "4px", flex: 1, minW: 0 })}>
                    <label className={css({ fontSize: "10px", fontWeight: "800", color: "secondaryText", textTransform: "uppercase" })}>Добавить код</label>
                    <SearchableSelect 
                      name="mccCode"
                      options={mccOptions}
                      placeholder="Выберите MCC..."
                    />
                  </div>
                  <button type="submit" className="sber-button" style={{ width: "auto", padding: "12px 16px" }}>
                    <Plus size={18} />
                  </button>
                </div>
              </form>

              <div className={stack({ gap: "8px" })}>
                {linkedMcc.length === 0 ? (
                  <div className={css({ p: "24px", textAlign: "center", bg: "#f8fafc", borderRadius: "16px", color: "secondaryText", fontSize: "13px" })}>
                    MCC-коды не привязаны
                  </div>
                ) : (
                  linkedMcc.map(mcc => (
                    <div key={mcc.code} className={flex({ align: "center", justify: "space-between", p: "12px", bg: "#f8fafc", borderRadius: "14px" })}>
                      <div className={flex({ align: "center", gap: "12px" })}>
                        <div className={css({ fontWeight: "800", color: "sberGreen", fontSize: "14px", fontVariantNumeric: "tabular-nums" })}>{mcc.code}</div>
                        <span className={css({ fontSize: "13px", color: "#000", fontWeight: "600" })}>{mcc.description}</span>
                      </div>
                      <form action={unlinkMccFromCategory.bind(null, categoryId, mcc.code)}>
                        <button className={css({ p: "8px", color: "#ef4444", cursor: "pointer", _hover: { bg: "#fef2f2", borderRadius: "full" } })}>
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
              <form action={async (formData) => {
                "use server";
                const merchantId = parseInt(formData.get("merchantId") as string);
                if (!isNaN(merchantId)) await linkMerchantToCategory(categoryId, merchantId);
              }} className={stack({ gap: "12px", mb: "16px" })}>
                <div className={flex({ gap: "8px", align: "end", w: "full" })}>
                  <div className={stack({ gap: "4px", flex: 1, minW: 0 })}>
                    <label className={css({ fontSize: "10px", fontWeight: "800", color: "secondaryText", textTransform: "uppercase" })}>Добавить магазин</label>
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
                  <div className={css({ p: "24px", textAlign: "center", bg: "#f8fafc", borderRadius: "16px", color: "secondaryText", fontSize: "13px" })}>
                    Отдельные магазины не привязаны
                  </div>
                ) : (
                  linkedMerchants.map(merchant => (
                    <div key={merchant.id} className={flex({ align: "center", justify: "space-between", p: "12px", bg: "#f8fafc", borderRadius: "14px" })}>
                      <div className={flex({ align: "center", gap: "12px" })}>
                        <Store size={18} className={css({ color: "sberGreen" })} />
                        <span className={css({ fontSize: "14px", color: "#000", fontWeight: "700" })}>{merchant.name}</span>
                      </div>
                      <form action={unlinkMerchantFromCategory.bind(null, categoryId, merchant.id)}>
                        <button className={css({ p: "8px", color: "#ef4444", cursor: "pointer", _hover: { bg: "#fef2f2", borderRadius: "full" } })}>
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
    </div>
  );
}
