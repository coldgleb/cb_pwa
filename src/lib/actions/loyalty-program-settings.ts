"use server";

import { db } from "@/db";
import { loyaltyProgramSettings } from "@/db/schema";
import { auth } from "@/auth";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { recalculateTransactionsForLoyaltyProgram } from "./loyalty-programs";

export async function addLoyaltyProgramSetting(formData: FormData) {
  const session = await auth();
  if (session?.user?.role !== "admin") throw new Error("Unauthorized");

  const loyaltyProgramId = parseInt(formData.get("loyaltyProgramId") as string);
  const roundingType = formData.get("roundingType") as string;
  const startDate = formData.get("startDate") as string;

  if (isNaN(loyaltyProgramId) || !roundingType || !startDate) {
    throw new Error("Invalid data");
  }

  await db.insert(loyaltyProgramSettings).values({
    loyaltyProgramId,
    roundingType,
    startDate,
  });

  // Recalculate all transactions for all cards using this loyalty program
  await recalculateTransactionsForLoyaltyProgram(loyaltyProgramId);

  revalidatePath(`/admin/loyalty-programs/${loyaltyProgramId}`);
}

export async function deleteLoyaltyProgramSetting(id: number, loyaltyProgramId: number) {
  const session = await auth();
  if (session?.user?.role !== "admin") throw new Error("Unauthorized");

  await db.delete(loyaltyProgramSettings).where(eq(loyaltyProgramSettings.id, id));
  
  await recalculateTransactionsForLoyaltyProgram(loyaltyProgramId);

  revalidatePath(`/admin/loyalty-programs/${loyaltyProgramId}`);
}
