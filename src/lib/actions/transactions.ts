"use server";

import { db } from "@/db";
import { transactions, transactionCategorySplits } from "@/db/schema";
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
  const transactionDateIso = formData.get("transactionDateIso") as string;
  const transactionDate = transactionDateIso ? new Date(transactionDateIso) : new Date();
  
  // Get raw value from form to distinguish between "not provided" and "intentionally empty"
  const spendingCategoryIdRaw = formData.get("spendingCategoryId");
  const spendingCategoryId = (spendingCategoryIdRaw !== null && spendingCategoryIdRaw !== "") 
    ? parseInt(spendingCategoryIdRaw as string) 
    : null;
    
  const splitsJson = formData.get("splits") as string;
  const splits = splitsJson ? JSON.parse(splitsJson) : [];

  if (isNaN(amount) || amount <= 0) {
    throw new Error("Укажите корректную сумму покупки");
  }
  if (!merchantName) {
    throw new Error("Укажите название магазина");
  }
  if (isNaN(userCardId)) {
    throw new Error("Выберите банковскую карту");
  }

  // Ensure merchant exists. We only update merchant's category if one was provided in the form.
  const merchant = await ensureMerchantExists(merchantName, spendingCategoryId || undefined);

  // Use the form's category if provided (even if it's null/empty), 
  // otherwise fallback to merchant's default only if the form field wasn't present or was null.
  // Actually, if it's explicitly "" in formData, we should use NULL and NOT fallback.
  let finalSpendingCategoryId = spendingCategoryId;
  if (spendingCategoryIdRaw === null && merchant?.spendingCategoryId) {
    finalSpendingCategoryId = merchant.spendingCategoryId;
  } else if (spendingCategoryIdRaw === "" ) {
    finalSpendingCategoryId = null;
  } else if (spendingCategoryId === null && merchant?.spendingCategoryId) {
     // This case covers when it wasn't in form or was null but merchant has one
     finalSpendingCategoryId = merchant.spendingCategoryId;
  }


  const { cashback, categoryId, nominalPercentage } = await calculateCashbackForTransaction(
    paidAmount,
    mccCode,
    merchantName,
    userCardId,
    dateStr
  );

  const [newTx] = await db.insert(transactions).values({
    userId: session.user.id,
    userCardId,
    amount,
    paidAmount,
    transactionDate,
    merchantName,
    mccCode,
    calculatedCashback: cashback,
    cashbackPercentage: nominalPercentage,
    manualCashbackAdjustment: manualAdjustment,
    categoryId,
    spendingCategoryId: finalSpendingCategoryId,
  }).returning();

  if (splits.length > 0) {
    await db.insert(transactionCategorySplits).values(
      splits.map((s: any) => ({
        transactionId: newTx.id,
        spendingCategoryId: parseInt(s.categoryId),
        amount: parseFloat(s.amount),
      }))
    );
  }

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
  const transactionDateIso = formData.get("transactionDateIso") as string;
  const transactionDate = transactionDateIso ? new Date(transactionDateIso) : new Date();
  
  // Get raw value from form to distinguish between "not provided" and "intentionally empty"
  const spendingCategoryIdRaw = formData.get("spendingCategoryId");
  const spendingCategoryId = (spendingCategoryIdRaw !== null && spendingCategoryIdRaw !== "") 
    ? parseInt(spendingCategoryIdRaw as string) 
    : null;
    
  const splitsJson = formData.get("splits") as string;
  const splits = splitsJson ? JSON.parse(splitsJson) : [];

  // Ensure merchant exists
  const merchant = await ensureMerchantExists(merchantName, spendingCategoryId || undefined);

  // Intentional NULL handling
  let finalSpendingCategoryId = spendingCategoryId;
  if (spendingCategoryIdRaw === null && merchant?.spendingCategoryId) {
    finalSpendingCategoryId = merchant.spendingCategoryId;
  } else if (spendingCategoryIdRaw === "" ) {
    finalSpendingCategoryId = null;
  } else if (spendingCategoryId === null && merchant?.spendingCategoryId) {
     finalSpendingCategoryId = merchant.spendingCategoryId;
  }

  const { cashback, categoryId, nominalPercentage } = await calculateCashbackForTransaction(
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
      cashbackPercentage: nominalPercentage,
      manualCashbackAdjustment: manualAdjustment,
      categoryId,
      spendingCategoryId: finalSpendingCategoryId,
    })
    .where(eq(transactions.id, id));

  // Update splits
  await db.delete(transactionCategorySplits).where(eq(transactionCategorySplits.transactionId, id));
  if (splits.length > 0) {
    await db.insert(transactionCategorySplits).values(
      splits.map((s: any) => ({
        transactionId: id,
        spendingCategoryId: parseInt(s.categoryId),
        amount: parseFloat(s.amount),
      }))
    );
  }

  revalidatePath("/");
  revalidatePath("/transactions");
}

export async function deleteTransaction(id: number) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  try {
    await db.transaction(async (tx) => {
      // Manually delete splits first (in case cascade delete isn't fully supported by the environment)
      await tx.delete(transactionCategorySplits).where(eq(transactionCategorySplits.transactionId, id));
      await tx.delete(transactions).where(eq(transactions.id, id));
    });
  } catch (error) {
    console.error("Failed to delete transaction:", error);
    throw new Error("Не удалось удалить операцию. Попробуйте еще раз.");
  }

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
