"use server";

import { db } from "@/db";
import { transactionTemplates } from "@/db/schema";
import { auth } from "@/auth";
import { eq, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export async function createTransactionTemplate(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const templateName = formData.get("templateName") as string;
  const amount = parseFloat(formData.get("amount") as string);
  const merchantName = formData.get("merchantName") as string;
  const mccCode = formData.get("mccCode") as string;
  const userCardId = parseInt(formData.get("userCardId") as string);
  const spendingCategoryIdRaw = formData.get("spendingCategoryId") as string;
  const spendingCategoryId = spendingCategoryIdRaw ? parseInt(spendingCategoryIdRaw) : null;

  if (!templateName || isNaN(amount) || !merchantName) {
    throw new Error("Missing required fields for template");
  }

  await db.insert(transactionTemplates).values({
    userId: session.user.id,
    templateName,
    amount,
    merchantName,
    mccCode: mccCode || null,
    userCardId: isNaN(userCardId) ? null : userCardId,
    spendingCategoryId,
  });

  revalidatePath("/transactions/new");
}

export async function deleteTransactionTemplate(id: number) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  await db.delete(transactionTemplates)
    .where(and(
      eq(transactionTemplates.id, id),
      eq(transactionTemplates.userId, session.user.id)
    ));

  revalidatePath("/transactions/new");
}

export async function getTransactionTemplates() {
  const session = await auth();
  if (!session?.user?.id) return [];

  return db.select()
    .from(transactionTemplates)
    .where(eq(transactionTemplates.userId, session.user.id));
}
