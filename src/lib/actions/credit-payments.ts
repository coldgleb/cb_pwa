"use server";

import { db } from "@/db";
import { creditPayments } from "@/db/schema";
import { auth } from "@/auth";
import { revalidatePath } from "next/cache";
import { eq, and } from "drizzle-orm";

export async function createCreditPayment(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const userCardId = parseInt(formData.get("userCardId") as string);
  const amount = parseFloat(formData.get("amount") as string);
  const dueDateStr = formData.get("dueDate") as string;
  const paymentType = (formData.get("paymentType") as string) || "minimal";
  const note = formData.get("note") as string || null;

  if (isNaN(userCardId) || isNaN(amount) || !dueDateStr) {
    throw new Error("Некорректные данные платежа");
  }

  await db.insert(creditPayments).values({
    userId: session.user.id,
    userCardId,
    amount,
    dueDate: new Date(dueDateStr),
    paymentType,
    note,
    isPaid: false,
  });

  revalidatePath("/");
}

export async function toggleCreditPaymentStatus(id: number, isPaid: boolean) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  await db.update(creditPayments)
    .set({ isPaid })
    .where(and(eq(creditPayments.id, id), eq(creditPayments.userId, session.user.id)));

  revalidatePath("/");
}

export async function deleteCreditPayment(id: number) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  await db.delete(creditPayments)
    .where(and(eq(creditPayments.id, id), eq(creditPayments.userId, session.user.id)));

  revalidatePath("/");
}
