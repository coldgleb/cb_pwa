"use server";

import { db } from "@/db";
import { bankCards, bankCategories } from "@/db/schema";
import { auth } from "@/auth";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";

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

import { recalculateTransactionsForBankCard } from "./transactions";

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
