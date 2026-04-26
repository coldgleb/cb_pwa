"use server";

import { db } from "@/db";
import { transactions } from "@/db/schema";
import { auth } from "@/auth";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { calculateCashbackForTransaction } from "./cashback-engine";
import { ensureMerchantExists } from "./merchants";

export async function createTransaction(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const amount = parseFloat(formData.get("amount") as string);
  const paidAmountRaw = formData.get("paidAmount") as string;
  const paidAmount = paidAmountRaw ? parseFloat(paidAmountRaw) : amount;
  const manualAdjustment = parseFloat(formData.get("manualAdjustment") as string) || 0;
  const mccCode = formData.get("mccCode") as string;
  const merchantName = formData.get("merchantName") as string;
  const userCardId = parseInt(formData.get("userCardId") as string);
  const dateStr = formData.get("date") as string || new Date().toISOString().split('T')[0];
  const timeStr = formData.get("time") as string || new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit', hour12: false });
  const transactionDate = new Date(`${dateStr}T${timeStr}`);

  if (isNaN(amount) || !merchantName || isNaN(userCardId)) {
    throw new Error("Invalid input data");
  }

  // Ensure merchant exists and get its details
  await ensureMerchantExists(merchantName);

  const { cashback, categoryId } = await calculateCashbackForTransaction(
    paidAmount,
    mccCode,
    merchantName,
    userCardId,
    dateStr
  );

  await db.insert(transactions).values({
    userId: session.user.id,
    userCardId,
    amount,
    paidAmount,
    transactionDate,
    merchantName,
    mccCode,
    calculatedCashback: cashback,
    manualCashbackAdjustment: manualAdjustment,
    categoryId,
  });

  revalidatePath("/");
  revalidatePath("/transactions");
}

export async function updateTransaction(id: number, formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const amount = parseFloat(formData.get("amount") as string);
  const paidAmountRaw = formData.get("paidAmount") as string;
  const paidAmount = paidAmountRaw ? parseFloat(paidAmountRaw) : amount;
  const manualAdjustment = parseFloat(formData.get("manualAdjustment") as string) || 0;
  const mccCode = formData.get("mccCode") as string;
  const merchantName = formData.get("merchantName") as string;
  const userCardId = parseInt(formData.get("userCardId") as string);
  const dateStr = formData.get("date") as string || new Date().toISOString().split('T')[0];
  const timeStr = formData.get("time") as string || new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit', hour12: false });
  const transactionDate = new Date(`${dateStr}T${timeStr}`);

  // Ensure merchant exists
  await ensureMerchantExists(merchantName);

  const { cashback, categoryId } = await calculateCashbackForTransaction(
    paidAmount,
    mccCode,
    merchantName,
    userCardId,
    dateStr,
    id
  );

  await db.update(transactions)
    .set({
      userCardId,
      amount,
      paidAmount,
      transactionDate,
      merchantName,
      mccCode,
      calculatedCashback: cashback,
      manualCashbackAdjustment: manualAdjustment,
      categoryId,
    })
    .where(eq(transactions.id, id));

  revalidatePath("/");
  revalidatePath("/transactions");
}

export async function deleteTransaction(id: number) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  await db.delete(transactions).where(eq(transactions.id, id));

  revalidatePath("/");
  revalidatePath("/transactions");
}

import { 
  recalculateTransactionsForUserCard as recalculateUserCard, 
  recalculateTransactionsForBankCard as recalculateBankCard, 
  recalculateTransactionsForBank as recalculateBank 
} from "./cashback-engine";

export async function recalculateTransactionsForUserCard(userCardId: number, startDate?: string, endDate?: string) {
  return recalculateUserCard(userCardId, startDate, endDate);
}

export async function recalculateTransactionsForBankCard(bankCardId: number) {
  return recalculateBankCard(bankCardId);
}

export async function recalculateTransactionsForBank(bankId: number) {
  return recalculateBank(bankId);
}
