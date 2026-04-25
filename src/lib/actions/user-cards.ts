"use server";

import { db } from "@/db";
import { bankCards, userCards } from "@/db/schema";
import { auth } from "@/auth";
import { revalidatePath } from "next/cache";
import { eq, and } from "drizzle-orm";

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

  await db.insert(userCards).values({
    userId: session.user.id,
    bankCardId,
    lastFourDigits: lastFourDigits || null,
    cashbackLimit: cardType?.defaultLimit || null,
  });

  revalidatePath("/cards");
  revalidatePath("/");
}

export async function updateUserCard(id: number, formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const lastFourDigits = formData.get("lastFourDigits") as string;
  const cashbackLimit = parseFloat(formData.get("cashbackLimit") as string) || null;

  await db.update(userCards)
    .set({ lastFourDigits: lastFourDigits || null, cashbackLimit })
    .where(and(eq(userCards.id, id), eq(userCards.userId, session.user.id)));

  revalidatePath(`/cards/${id}`);
  revalidatePath("/cards");
}
