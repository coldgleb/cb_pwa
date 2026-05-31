"use server";

import { db } from "@/db";
import { loyaltyPrograms, bankCategories, bankCards } from "@/db/schema";
import { auth } from "@/auth";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { recalculateTransactionsForBankCard } from "./transactions";

export async function recalculateTransactionsForLoyaltyProgram(loyaltyProgramId: number) {
  const cards = await db
    .select({ id: bankCards.id })
    .from(bankCards)
    .where(eq(bankCards.loyaltyProgramId, loyaltyProgramId));
  for (const card of cards) {
    await recalculateTransactionsForBankCard(card.id);
  }
}

export async function createLoyaltyProgram(formData: FormData) {
  const session = await auth();
  if (session?.user?.role !== "admin") throw new Error("Unauthorized");

  const name = formData.get("name") as string;
  const bankId = parseInt(formData.get("bankId") as string);
  const description = formData.get("description") as string || null;
  const roundingType = formData.get("roundingType") as string || "no_rounding";

  if (!name || isNaN(bankId)) throw new Error("Invalid data");

  const [newProgram] = await db.insert(loyaltyPrograms).values({
    name,
    bankId,
    description,
    roundingType,
  }).returning();

  if (newProgram) {
    await db.insert(bankCategories).values([
      {
        loyaltyProgramId: newProgram.id,
        name: "Остальные покупки",
        defaultPercentage: 1, // Let's give it 1% by default as base fallback
        roundingType: "inherit",
        startDate: "2000-01-01",
      },
      {
        loyaltyProgramId: newProgram.id,
        name: "Без кешбэка",
        defaultPercentage: 0,
        roundingType: "inherit",
        startDate: "2000-01-01",
      }
    ]);
  }

  revalidatePath("/admin/loyalty-programs");
  revalidatePath("/admin/banks");
}

export async function updateLoyaltyProgram(id: number, formData: FormData) {
  const session = await auth();
  if (session?.user?.role !== "admin") throw new Error("Unauthorized");

  const name = formData.get("name") as string;
  const bankId = parseInt(formData.get("bankId") as string);
  const description = formData.get("description") as string || null;
  const roundingType = formData.get("roundingType") as string || "no_rounding";

  if (!name || isNaN(bankId)) throw new Error("Invalid data");

  await db.update(loyaltyPrograms)
    .set({ name, bankId, description, roundingType })
    .where(eq(loyaltyPrograms.id, id));

  // Trigger recalculation for all cards using this loyalty program
  await recalculateTransactionsForLoyaltyProgram(id);

  revalidatePath("/admin/loyalty-programs");
  revalidatePath(`/admin/loyalty-programs/${id}`);
  revalidatePath("/admin/banks");
}

export async function deleteLoyaltyProgram(id: number) {
  const session = await auth();
  if (session?.user?.role !== "admin") throw new Error("Unauthorized");

  // Note: Before deleting a loyalty program, we should unbind any cards or categories.
  
  // Find categories under this loyalty program 
  const categories = await db
    .select({ id: bankCategories.id })
    .from(bankCategories)
    .where(eq(bankCategories.loyaltyProgramId, id));

  // Update cards using this loyalty program to NULL
  await db.update(bankCards)
    .set({ loyaltyProgramId: null })
    .where(eq(bankCards.loyaltyProgramId, id));

  // Delete categories
  await db.delete(bankCategories).where(eq(bankCategories.loyaltyProgramId, id));

  // Finally delete the loyalty program
  await db.delete(loyaltyPrograms).where(eq(loyaltyPrograms.id, id));

  revalidatePath("/admin/loyalty-programs");
  revalidatePath("/admin/banks");
}
