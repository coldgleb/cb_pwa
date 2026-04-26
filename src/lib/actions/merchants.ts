"use server";

import { db } from "@/db";
import { merchants, bankCategoryMerchant, userCashbackRules, transactions } from "@/db/schema";
import { auth } from "@/auth";
import { revalidatePath } from "next/cache";
import { eq, inArray } from "drizzle-orm";
import { findMccForMerchant } from "@/lib/utils/merchant-finder";
import { recalculateTransactionsForMerchantNames } from "./cashback-engine";

export async function getMerchantMccSuggestions(name: string) {
  const [existing] = await db.select().from(merchants).where(eq(merchants.name, name)).limit(1);
  if (existing) {
    return {
      mainMcc: existing.mainMcc,
      additionalMccs: existing.additionalMccs
    };
  }

  // Try to find MCCs externally
  const found = await findMccForMerchant(name);
  return found || { mainMcc: "0000", additionalMccs: "0000" };
}

export async function ensureMerchantExists(name: string) {
  const [existing] = await db.select().from(merchants).where(eq(merchants.name, name)).limit(1);
  if (existing) return existing;

  // Try to find MCCs externally
  const found = await findMccForMerchant(name);
  
  const mainMcc = found?.mainMcc || "0000";
  const additionalMccs = found?.additionalMccs || "0000";

  const [newMerchant] = await db.insert(merchants).values({
    name,
    mainMcc,
    additionalMccs,
  }).returning();

  return newMerchant;
}

export async function createMerchant(formData: FormData) {
  const session = await auth();
  if (session?.user?.role !== "admin") throw new Error("Unauthorized");

  const name = formData.get("name") as string;
  const mainMccRaw = formData.get("mainMcc") as string;
  const additionalMccsText = formData.get("additionalMccs") as string || "";
  const website = formData.get("website") as string;
  const logo = formData.get("logo") as string;

  const mainMcc = mainMccRaw?.match(/^\d{4}/)?.[0];

  if (!name || !mainMcc) throw new Error("Name and Main MCC are required");

  const codes = [...new Set(additionalMccsText.match(/\b\d{4}\b/g) || [])];
  if (!codes.includes("0000")) codes.push("0000");

  await db.insert(merchants).values({
    name,
    mainMcc,
    additionalMccs: codes.join(","),
    website,
    logo,
  });

  revalidatePath("/admin/merchants");
}

export async function updateMerchant(id: number, formData: FormData) {
  const session = await auth();
  if (session?.user?.role !== "admin") throw new Error("Unauthorized");

  const name = formData.get("name") as string;
  const mainMccRaw = formData.get("mainMcc") as string;
  const additionalMccsText = formData.get("additionalMccs") as string || "";
  const website = formData.get("website") as string;
  const logo = formData.get("logo") as string;

  const mainMcc = mainMccRaw?.match(/^\d{4}/)?.[0];

  if (!name || !mainMcc) throw new Error("Name and Main MCC are required");

  const [oldMerchant] = await db.select({ name: merchants.name }).from(merchants).where(eq(merchants.id, id)).limit(1);

  const codes = [...new Set(additionalMccsText.match(/\b\d{4}\b/g) || [])];
  if (!codes.includes("0000")) codes.push("0000");

  await db.update(merchants)
    .set({
      name,
      mainMcc,
      additionalMccs: codes.join(","),
      website,
      logo,
    })
    .where(eq(merchants.id, id));

  const names = [name];
  if (oldMerchant) names.push(oldMerchant.name);

  await recalculateTransactionsForMerchantNames(names);

  revalidatePath("/admin/merchants");
}

export async function deleteMerchant(id: number) {
  const session = await auth();
  if (session?.user?.role !== "admin") throw new Error("Unauthorized");

  try {
    const [merchant] = await db.select({ name: merchants.name }).from(merchants).where(eq(merchants.id, id)).limit(1);
    if (!merchant) return;

    // 1. Delete associated category links
    await db.delete(bankCategoryMerchant).where(eq(bankCategoryMerchant.merchantId, id));

    // 2. Clear merchantId in user cashback rules
    await db.update(userCashbackRules)
      .set({ merchantId: null })
      .where(eq(userCashbackRules.merchantId, id));

    // 3. Delete the merchant itself
    await db.delete(merchants).where(eq(merchants.id, id));

    // 4. Targeted recalculation for transactions with this name
    await recalculateTransactionsForMerchantNames([merchant.name]);

    revalidatePath("/admin/merchants");
  } catch (error) {
    console.error("Failed to delete merchant:", error);
    throw new Error("Failed to delete merchant.");
  }
}
