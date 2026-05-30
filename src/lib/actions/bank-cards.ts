"use server";

import { db } from "@/db";
import { bankCards, bankCardSettings, bankCategories, userCards } from "@/db/schema";
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
  const loyaltyProgramIdVal = formData.get("loyaltyProgramId") as string;
  const loyaltyProgramId = loyaltyProgramIdVal ? parseInt(loyaltyProgramIdVal) : null;
  const accountType = formData.get("accountType") as string || "debit";

  if (!name || isNaN(bankId)) throw new Error("Invalid data");

  await db.insert(bankCards).values({
    name,
    bankId,
    roundingType,
    defaultCashbackLimit,
    loyaltyProgramId: loyaltyProgramId && !isNaN(loyaltyProgramId) ? loyaltyProgramId : null,
    accountType,
  });

  revalidatePath("/admin/bank-cards");
}

export async function updateBankCard(id: number, formData: FormData) {
  const session = await auth();
  if (session?.user?.role !== "admin") throw new Error("Unauthorized");

  const name = formData.get("name") as string;
  const bankId = parseInt(formData.get("bankId") as string);
  const roundingType = formData.get("roundingType") as string || "no_rounding";
  const defaultCashbackLimit = parseFloat(formData.get("defaultCashbackLimit") as string) || null;
  const loyaltyProgramIdVal = formData.get("loyaltyProgramId") as string;
  const loyaltyProgramId = loyaltyProgramIdVal ? parseInt(loyaltyProgramIdVal) : null;
  const accountType = formData.get("accountType") as string || "debit";

  if (!name || isNaN(bankId)) throw new Error("Invalid data");

  await db.update(bankCards)
    .set({ 
      name, 
      bankId, 
      roundingType, 
      defaultCashbackLimit, 
      loyaltyProgramId: loyaltyProgramId && !isNaN(loyaltyProgramId) ? loyaltyProgramId : null,
      accountType,
    })
    .where(eq(bankCards.id, id));

  // Sync accountType to all user cards of this type
  await db.update(userCards)
    .set({ accountType })
    .where(eq(userCards.bankCardId, id));

  // Trigger recalculation for all users using this card type
  await recalculateTransactionsForBankCard(id);

  revalidatePath("/admin/bank-cards");
  revalidatePath(`/admin/bank-cards/${id}`);
}

export async function toggleBankCardArchive(id: number, isArchived: boolean) {
  const session = await auth();
  if (session?.user?.role !== "admin") throw new Error("Unauthorized");

  await db.update(bankCards)
    .set({ isArchived })
    .where(eq(bankCards.id, id));

  revalidatePath("/admin/bank-cards");
  revalidatePath("/cards");
}

export async function deleteBankCard(id: number) {
  const session = await auth();
  if (session?.user?.role !== "admin") throw new Error("Unauthorized");

  await db.delete(bankCardSettings).where(eq(bankCardSettings.bankCardId, id));
  await db.delete(bankCards).where(eq(bankCards.id, id));

  revalidatePath("/admin/bank-cards");
}
