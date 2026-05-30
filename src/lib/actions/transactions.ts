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

  const type = (formData.get("type") as string) || "expense";
  const amount = parseFloat(formData.get("amount") as string);
  const paidAmountRaw = formData.get("paidAmount") as string;
  const paidAmount = type === "expense" ? (paidAmountRaw ? parseFloat(paidAmountRaw) : amount) : amount;
  const manualAdjustment = type === "expense" ? (parseFloat(formData.get("manualAdjustment") as string) || 0) : 0;
  const mccCode = type === "expense" ? (formData.get("mccCode") as string || null) : null;
  const userCardId = parseInt(formData.get("userCardId") as string);
  const dateStr = formData.get("date") as string || new Date().toISOString().split('T')[0];
  const transactionDateIso = formData.get("transactionDateIso") as string;
  const transactionDate = transactionDateIso ? new Date(transactionDateIso) : new Date();

  // For transfer operations
  let toUserCardId: number | null = null;
  if (type === "transfer") {
    const toUserCardIdRaw = formData.get("toUserCardId") as string;
    toUserCardId = toUserCardIdRaw ? parseInt(toUserCardIdRaw) : null;
    if (!toUserCardId || isNaN(toUserCardId)) {
      throw new Error("Выберите карту/счет получателя");
    }
    if (toUserCardId === userCardId) {
      throw new Error("Карта отправителя и получателя не могут совпадать");
    }
  }

  let finalMerchantName = formData.get("merchantName") as string || "";
  if (type === "transfer") {
    finalMerchantName = "Перевод";
  } else if (type === "income" && !finalMerchantName) {
    finalMerchantName = "Входящий перевод / Доход";
  }
  
  // Get raw value from form to distinguish between "not provided" and "intentionally empty"
  const spendingCategoryIdRaw = formData.get("spendingCategoryId");
  const spendingCategoryId = (spendingCategoryIdRaw !== null && spendingCategoryIdRaw !== "") 
    ? parseInt(spendingCategoryIdRaw as string) 
    : null;
    
  const splitsJson = formData.get("splits") as string;
  const splits = splitsJson ? JSON.parse(splitsJson) : [];

  if (isNaN(amount) || amount <= 0) {
    throw new Error("Укажите корректную сумму");
  }
  if (isNaN(userCardId)) {
    throw new Error("Выберите банковскую карту");
  }

  let finalSpendingCategoryId = spendingCategoryId;
  let finalMerchant = null;

  if (type === "expense") {
    // Ensure merchant exists. We only update merchant's category if one was provided in the form.
    finalMerchant = await ensureMerchantExists(finalMerchantName, spendingCategoryId || undefined);

    // Use the form's category if provided (even if it's null/empty), 
    // otherwise fallback to merchant's default only if the form field wasn't present or was null.
    if (spendingCategoryIdRaw === null && finalMerchant?.spendingCategoryId) {
      finalSpendingCategoryId = finalMerchant.spendingCategoryId;
    } else if (spendingCategoryIdRaw === "" ) {
      finalSpendingCategoryId = null;
    } else if (spendingCategoryId === null && finalMerchant?.spendingCategoryId) {
      // This case covers when it wasn't in form or was null but merchant has one
      finalSpendingCategoryId = finalMerchant.spendingCategoryId;
    }
  }

  let cashback = 0;
  let categoryId = null;
  let nominalPercentage = 0;

  if (type === "expense") {
    const calcResult = await calculateCashbackForTransaction(
      paidAmount,
      mccCode || "",
      finalMerchantName,
      userCardId,
      dateStr
    );
    cashback = calcResult.cashback;
    categoryId = calcResult.categoryId;
    nominalPercentage = calcResult.nominalPercentage || 0;
  }

  const [newTx] = await db.insert(transactions).values({
    userId: session.user.id,
    userCardId,
    toUserCardId,
    type,
    amount,
    paidAmount,
    transactionDate,
    merchantName: finalMerchantName,
    mccCode,
    calculatedCashback: cashback,
    cashbackPercentage: nominalPercentage,
    manualCashbackAdjustment: manualAdjustment,
    categoryId,
    spendingCategoryId: finalSpendingCategoryId,
  }).returning();

  if (type === "expense" && splits.length > 0) {
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

  const type = (formData.get("type") as string) || "expense";
  const amount = parseFloat(formData.get("amount") as string);
  const paidAmountRaw = formData.get("paidAmount") as string;
  const paidAmount = type === "expense" ? (paidAmountRaw ? parseFloat(paidAmountRaw) : amount) : amount;
  const manualAdjustment = type === "expense" ? (parseFloat(formData.get("manualAdjustment") as string) || 0) : 0;
  const mccCode = type === "expense" ? (formData.get("mccCode") as string || null) : null;
  const userCardId = parseInt(formData.get("userCardId") as string);
  const dateStr = formData.get("date") as string || new Date().toISOString().split('T')[0];
  const transactionDateIso = formData.get("transactionDateIso") as string;
  const transactionDate = transactionDateIso ? new Date(transactionDateIso) : new Date();
  
  // For transfer operations
  let toUserCardId: number | null = null;
  if (type === "transfer") {
    const toUserCardIdRaw = formData.get("toUserCardId") as string;
    toUserCardId = toUserCardIdRaw ? parseInt(toUserCardIdRaw) : null;
    if (!toUserCardId || isNaN(toUserCardId)) {
      throw new Error("Выберите карту/счет получателя");
    }
    if (toUserCardId === userCardId) {
      throw new Error("Карта отправителя и получателя не могут совпадать");
    }
  }

  let finalMerchantName = formData.get("merchantName") as string || "";
  if (type === "transfer") {
    finalMerchantName = "Перевод";
  } else if (type === "income" && !finalMerchantName) {
    finalMerchantName = "Входящий перевод / Доход";
  }

  // Get raw value from form to distinguish between "not provided" and "intentionally empty"
  const spendingCategoryIdRaw = formData.get("spendingCategoryId");
  const spendingCategoryId = (spendingCategoryIdRaw !== null && spendingCategoryIdRaw !== "") 
    ? parseInt(spendingCategoryIdRaw as string) 
    : null;
    
  const splitsJson = formData.get("splits") as string;
  const splits = splitsJson ? JSON.parse(splitsJson) : [];

  if (isNaN(amount) || amount <= 0) {
    throw new Error("Укажите корректную сумму");
  }
  if (isNaN(userCardId)) {
    throw new Error("Выберите банковскую карту");
  }

  let finalSpendingCategoryId = spendingCategoryId;
  let finalMerchant = null;

  if (type === "expense") {
    // Ensure merchant exists
    finalMerchant = await ensureMerchantExists(finalMerchantName, spendingCategoryId || undefined);

    // Intentional NULL handling
    if (spendingCategoryIdRaw === null && finalMerchant?.spendingCategoryId) {
      finalSpendingCategoryId = finalMerchant.spendingCategoryId;
    } else if (spendingCategoryIdRaw === "" ) {
      finalSpendingCategoryId = null;
    } else if (spendingCategoryId === null && finalMerchant?.spendingCategoryId) {
       finalSpendingCategoryId = finalMerchant.spendingCategoryId;
    }
  }

  let cashback = 0;
  let categoryId = null;
  let nominalPercentage = 0;

  if (type === "expense") {
    const calcResult = await calculateCashbackForTransaction(
      paidAmount,
      mccCode || "",
      finalMerchantName,
      userCardId,
      dateStr,
      id
    );
    cashback = calcResult.cashback;
    categoryId = calcResult.categoryId;
    nominalPercentage = calcResult.nominalPercentage || 0;
  }

  await db.update(transactions)
    .set({
      userCardId,
      toUserCardId,
      type,
      amount,
      paidAmount,
      transactionDate,
      merchantName: finalMerchantName,
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
  if (type === "expense" && splits.length > 0) {
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
