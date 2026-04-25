"use server";

import { db } from "@/db";
import { bankCardSettings } from "@/db/schema";
import { auth } from "@/auth";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { recalculateTransactionsForBankCard } from "./transactions";

export async function addBankCardSetting(formData: FormData) {
  const session = await auth();
  if (session?.user?.role !== "admin") throw new Error("Unauthorized");

  const bankCardId = parseInt(formData.get("bankCardId") as string);
  const roundingType = formData.get("roundingType") as string;
  const startDate = formData.get("startDate") as string;

  if (isNaN(bankCardId) || !roundingType || !startDate) {
    throw new Error("Invalid data");
  }

  await db.insert(bankCardSettings).values({
    bankCardId,
    roundingType,
    startDate,
  });

  // Recalculate all transactions for this card type to apply historical rules
  await recalculateTransactionsForBankCard(bankCardId);

  revalidatePath(`/admin/bank-cards/${bankCardId}`);
}

export async function deleteBankCardSetting(id: number, bankCardId: number) {
  const session = await auth();
  if (session?.user?.role !== "admin") throw new Error("Unauthorized");

  await db.delete(bankCardSettings).where(eq(bankCardSettings.id, id));
  
  await recalculateTransactionsForBankCard(bankCardId);

  revalidatePath(`/admin/bank-cards/${bankCardId}`);
}
