"use server";

import { db } from "@/db";
import { userCards } from "@/db/schema";
import { auth } from "@/auth";
import { revalidatePath } from "next/cache";

export async function addUserCard(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const bankCardId = parseInt(formData.get("bankCardId") as string);
  const lastFourDigits = formData.get("lastFourDigits") as string;

  if (isNaN(bankCardId)) throw new Error("Invalid card type");

  await db.insert(userCards).values({
    userId: session.user.id,
    bankCardId,
    lastFourDigits: lastFourDigits || null,
  });

  revalidatePath("/cards");
  revalidatePath("/");
}
