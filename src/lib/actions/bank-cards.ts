"use server";

import { db } from "@/db";
import { bankCards, bankCardSettings, bankCategories } from "@/db/schema";
import { auth } from "@/auth";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { recalculateTransactionsForBankCard } from "./transactions";

export { recalculateTransactionsForBankCard };

export async function createBankCard(formData: FormData) {

  const session = await auth();
  if (session?.user?.role !== "admin") throw new Error("Unauthorized");

  const name = formData.get("name") as string;
  const bankId = parseInt(formData.get("bankId") as string);
  const roundingType = formData.get("roundingType") as string || "no_rounding";
  const defaultCashbackLimit = parseFloat(formData.get("defaultCashbackLimit") as string) || null;

  if (!name || isNaN(bankId)) throw new Error("Invalid data");

  const [newCard] = await db.insert(bankCards).values({
    name,
    bankId,
    roundingType,
    defaultCashbackLimit,
  }).returning();

  if (newCard) {
    await db.insert(bankCategories).values([
      {
        bankCardId: newCard.id,
        name: "Остальные покупки",
        defaultPercentage: 0,
        roundingType: "inherit",
      },
      {
        bankCardId: newCard.id,
        name: "Без кешбэка",
        defaultPercentage: 0,
        roundingType: "inherit",
      }
    ]);
  }

  revalidatePath("/admin/bank-cards");
}

export async function updateBankCard(id: number, formData: FormData) {
  const session = await auth();
  if (session?.user?.role !== "admin") throw new Error("Unauthorized");

  const name = formData.get("name") as string;
  const bankId = parseInt(formData.get("bankId") as string);
  const roundingType = formData.get("roundingType") as string || "no_rounding";
  const defaultCashbackLimit = parseFloat(formData.get("defaultCashbackLimit") as string) || null;

  if (!name || isNaN(bankId)) throw new Error("Invalid data");

  await db.update(bankCards)
    .set({ name, bankId, roundingType, defaultCashbackLimit })
    .where(eq(bankCards.id, id));

  // Trigger recalculation for all users using this card type
  await recalculateTransactionsForBankCard(id);

  revalidatePath("/admin/bank-cards");
  revalidatePath(`/admin/bank-cards/${id}`);
}

export async function deleteBankCard(id: number) {
  const session = await auth();
  if (session?.user?.role !== "admin") throw new Error("Unauthorized");

  // Related categories, settings, etc. should ideally be deleted or handled.
  // Assuming cascade is not fully set up in SQLite via Drizzle automatically without explicit schema support.
  
  await db.delete(bankCategories).where(eq(bankCategories.bankCardId, id));
  await db.delete(bankCardSettings).where(eq(bankCardSettings.bankCardId, id));
  await db.delete(bankCards).where(eq(bankCards.id, id));

  revalidatePath("/admin/bank-cards");
}
