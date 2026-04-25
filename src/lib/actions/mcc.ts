"use server";

import { db } from "@/db";
import { mccCodes } from "@/db/schema";
import { auth } from "@/auth";
import { revalidatePath } from "next/cache";

export async function createMccCode(formData: FormData) {
  const session = await auth();

  if (session?.user?.role !== "admin") {
    throw new Error("Unauthorized");
  }

  const code = formData.get("code") as string;
  const description = formData.get("description") as string;
  const fullDescription = formData.get("fullDescription") as string || "";

  if (!code || !description) {
    throw new Error("Code and description are required");
  }

  await db.insert(mccCodes).values({
    code,
    description,
    fullDescription,
  }).onConflictDoUpdate({
    target: mccCodes.code,
    set: { description, fullDescription }
  });

  revalidatePath("/admin/mcc");
}

import { recalculateTransactionsForBankCard } from "./transactions";
import { bankCategories } from "@/db/schema";

export async function linkMccToCategory(categoryId: number, mccCode: string, startDate?: string) {
  const session = await auth();
  if (session?.user?.role !== "admin") throw new Error("Unauthorized");

  const effectiveDate = startDate || new Date().toISOString().split('T')[0];

  // Expire any existing active link for this MCC in this category
  await db.update(bankCategoryMcc)
    .set({ endDate: new Date(new Date(effectiveDate).getTime() - 86400000).toISOString().split('T')[0] })
    .where(
      and(
        eq(bankCategoryMcc.categoryId, categoryId),
        eq(bankCategoryMcc.mccCode, mccCode),
        isNull(bankCategoryMcc.endDate)
      )
    );

  await db.insert(bankCategoryMcc).values({
    categoryId,
    mccCode,
    startDate: effectiveDate,
  });

  // Find bankCardId to recalculate
  const [cat] = await db.select({ bankCardId: bankCategories.bankCardId }).from(bankCategories).where(eq(bankCategories.id, categoryId));
  if (cat) await recalculateTransactionsForBankCard(cat.bankCardId);

  revalidatePath(`/admin/categories/${categoryId}/composition`);
}

export async function unlinkMccFromCategory(categoryId: number, mccCode: string, formData?: FormData) {
  const session = await auth();
  if (session?.user?.role !== "admin") throw new Error("Unauthorized");

  const effectiveDate = new Date().toISOString().split('T')[0];
  const yesterday = new Date(new Date(effectiveDate).getTime() - 86400000).toISOString().split('T')[0];

  await db.update(bankCategoryMcc)
    .set({ endDate: yesterday })
    .where(
      and(
        eq(bankCategoryMcc.categoryId, categoryId),
        eq(bankCategoryMcc.mccCode, mccCode),
        isNull(bankCategoryMcc.endDate)
      )
    );

  // Find bankCardId to recalculate
  const [cat] = await db.select({ bankCardId: bankCategories.bankCardId }).from(bankCategories).where(eq(bankCategories.id, categoryId));
  if (cat) await recalculateTransactionsForBankCard(cat.bankCardId);

  revalidatePath(`/admin/categories/${categoryId}/composition`);
}

import { bankCategoryMerchant } from "@/db/schema";

export async function linkMerchantToCategory(categoryId: number, merchantId: number, formData?: FormData) {
  const session = await auth();
  if (session?.user?.role !== "admin") throw new Error("Unauthorized");

  const effectiveDate = new Date().toISOString().split('T')[0];

  // Expire any existing active link
  await db.update(bankCategoryMerchant)
    .set({ endDate: new Date(new Date(effectiveDate).getTime() - 86400000).toISOString().split('T')[0] })
    .where(
      and(
        eq(bankCategoryMerchant.categoryId, categoryId),
        eq(bankCategoryMerchant.merchantId, merchantId),
        isNull(bankCategoryMerchant.endDate)
      )
    );

  await db.insert(bankCategoryMerchant).values({
    categoryId,
    merchantId,
    startDate: effectiveDate,
  });

  const [cat] = await db.select({ bankCardId: bankCategories.bankCardId }).from(bankCategories).where(eq(bankCategories.id, categoryId));
  if (cat) await recalculateTransactionsForBankCard(cat.bankCardId);

  revalidatePath(`/admin/categories/${categoryId}/composition`);
}

export async function unlinkMerchantFromCategory(categoryId: number, merchantId: number, formData?: FormData) {
  const session = await auth();
  if (session?.user?.role !== "admin") throw new Error("Unauthorized");

  const effectiveDate = new Date().toISOString().split('T')[0];
  const yesterday = new Date(new Date(effectiveDate).getTime() - 86400000).toISOString().split('T')[0];

  await db.update(bankCategoryMerchant)
    .set({ endDate: yesterday })
    .where(
      and(
        eq(bankCategoryMerchant.categoryId, categoryId),
        eq(bankCategoryMerchant.merchantId, merchantId),
        isNull(bankCategoryMerchant.endDate)
      )
    );

  const [cat] = await db.select({ bankCardId: bankCategories.bankCardId }).from(bankCategories).where(eq(bankCategories.id, categoryId));
  if (cat) await recalculateTransactionsForBankCard(cat.bankCardId);

  revalidatePath(`/admin/categories/${categoryId}/composition`);
}

export async function syncMccCodes() {
  const session = await auth();
  if (session?.user?.role !== "admin") throw new Error("Unauthorized");

  const response = await fetch("https://mcc-codes.ru/code/export/csv");
  if (!response.ok) throw new Error("Failed to fetch MCC codes");
  
  const buffer = await response.arrayBuffer();
  const decoder = new TextDecoder('utf-8');
  const text = decoder.decode(buffer);
  
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentField = "";
  let inQuotes = false;
  
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i+1];
    
    if (inQuotes) {
      if (char === '"') {
        if (nextChar === '"') {
          currentField += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        currentField += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ',') {
        currentRow.push(currentField);
        currentField = "";
      } else if (char === '\n' || char === '\r') {
        if (char === '\r' && nextChar === '\n') i++;
        currentRow.push(currentField);
        if (currentRow.length > 0 && currentRow[0] !== "MCC" && currentRow[0].length === 4) {
           rows.push(currentRow);
        }
        currentRow = [];
        currentField = "";
      } else {
        currentField += char;
      }
    }
  }
  
  if (currentField || currentRow.length > 0) {
    currentRow.push(currentField);
    if (currentRow[0] !== "MCC" && currentRow[0].length === 4) {
        rows.push(currentRow);
    }
  }

  // Batch insert for better performance
  const values = rows.map(row => ({
    code: row[0],
    description: row[1] || "Нет названия",
    fullDescription: row[2] || ""
  })).filter(v => v.code && v.code.length === 4);

  // Split into chunks to avoid potential limits
  const chunkSize = 100;
  for (let i = 0; i < values.length; i += chunkSize) {
    const chunk = values.slice(i, i + chunkSize);
    await db.insert(mccCodes)
      .values(chunk)
      .onConflictDoUpdate({
        target: mccCodes.code,
        set: { 
          description: sql`excluded.description`,
          fullDescription: sql`excluded.full_description` 
        }
      });
  }

  revalidatePath("/admin/mcc");
}

import { bankCategoryMcc } from "@/db/schema";
import { and, eq, sql, isNull } from "drizzle-orm";
