"use server";

import { db } from "@/db";
import { merchants } from "@/db/schema";
import { auth } from "@/auth";
import { revalidatePath } from "next/cache";

import { findMccForMerchant } from "@/lib/utils/merchant-finder";

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

  // Extract the first 4-digit number as the main MCC (handles strings like "5411 - Supermarket")
  const mainMcc = mainMccRaw?.match(/^\d{4}/)?.[0];

  if (!name || !mainMcc) throw new Error("Name and Main MCC are required");

  // Parse additional MCCs: find all 4-digit numbers
  const codes = [...new Set(additionalMccsText.match(/\b\d{4}\b/g) || [])];
  
  // Ensure '0000' is always present in additional MCCs
  if (!codes.includes("0000")) {
    codes.push("0000");
  }

  await db.insert(merchants).values({
    name,
    mainMcc,
    additionalMccs: codes.join(","),
    website,
    logo,
  });

  revalidatePath("/admin/merchants");
}

import { eq } from "drizzle-orm";

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

  // Parse additional MCCs: find all 4-digit numbers
  const codes = [...new Set(additionalMccsText.match(/\b\d{4}\b/g) || [])];
  
  // Ensure '0000' is always present in additional MCCs
  if (!codes.includes("0000")) {
    codes.push("0000");
  }

  await db.update(merchants)
    .set({
      name,
      mainMcc,
      additionalMccs: codes.join(","),
      website,
      logo,
    })
    .where(eq(merchants.id, id));

  revalidatePath("/admin/merchants");
}

export async function deleteMerchant(id: number) {
  const session = await auth();
  if (session?.user?.role !== "admin") throw new Error("Unauthorized");

  await db.delete(merchants).where(eq(merchants.id, id));

  revalidatePath("/admin/merchants");
}

