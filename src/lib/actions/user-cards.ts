"use server";

import { db } from "@/db";
import { bankCards, userCards } from "@/db/schema";
import { auth } from "@/auth";
import { revalidatePath } from "next/cache";
import { eq, and } from "drizzle-orm";
import { redirect } from "next/navigation";

export async function addUserCard(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const bankCardId = parseInt(formData.get("bankCardId") as string);
  const lastFourDigits = formData.get("lastFourDigits") as string;

  if (isNaN(bankCardId)) throw new Error("Invalid card type");

  // Get default limit from bank card type
  const [cardType] = await db
    .select({ defaultLimit: bankCards.defaultCashbackLimit })
    .from(bankCards)
    .where(eq(bankCards.id, bankCardId))
    .limit(1);

  const initialBalance = parseFloat(formData.get("initialBalance") as string) || 0;
  const accountType = (formData.get("accountType") as string) || "debit";
  const creditLimitVal = formData.get("creditLimit") as string;
  const creditLimit = creditLimitVal ? parseFloat(creditLimitVal) : null;
  const statementDay = formData.get("statementDay") ? parseInt(formData.get("statementDay") as string) : null;
  const paymentDay = formData.get("paymentDay") ? parseInt(formData.get("paymentDay") as string) : null;

  await db.insert(userCards).values({
    userId: session.user.id,
    bankCardId,
    lastFourDigits: lastFourDigits || null,
    cashbackLimit: cardType?.defaultLimit || null,
    initialBalance,
    accountType,
    creditLimit: accountType === "credit" ? creditLimit : null,
    statementDay,
    paymentDay,
  });

  revalidatePath("/cards");
  revalidatePath("/");
}

export async function updateUserCard(id: number, formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const lastFourDigits = formData.get("lastFourDigits") as string | null;
  const cashbackLimitRaw = formData.get("cashbackLimit") as string | null;
  const cashbackLimit = cashbackLimitRaw ? parseInt(cashbackLimitRaw) : null;
  const initialBalance = parseFloat(formData.get("initialBalance") as string) || 0;
  const accountType = (formData.get("accountType") as string) || "debit";
  const creditLimitVal = formData.get("creditLimit") as string | null;
  const creditLimit = creditLimitVal ? parseFloat(creditLimitVal) : null;
  const statementDay = formData.get("statementDay") ? parseInt(formData.get("statementDay") as string) : null;
  const paymentDay = formData.get("paymentDay") ? parseInt(formData.get("paymentDay") as string) : null;

  await db.update(userCards)
    .set({ 
      lastFourDigits: lastFourDigits || null, 
      cashbackLimit,
      initialBalance,
      accountType,
      creditLimit: accountType === "credit" ? creditLimit : null,
      statementDay,
      paymentDay,
    })
    .where(and(eq(userCards.id, id), eq(userCards.userId, session.user.id)));

  revalidatePath(`/cards/${id}`);
  revalidatePath("/cards");
}

export async function deleteUserCard(id: number) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  await db.delete(userCards)
    .where(and(eq(userCards.id, id), eq(userCards.userId, session.user.id)));

  revalidatePath("/cards");
  revalidatePath("/");
}
