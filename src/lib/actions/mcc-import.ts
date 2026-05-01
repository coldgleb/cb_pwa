"use server";

import { auth } from "@/auth";
import { db } from "@/db";
import { mccCodes, bankCategoryMcc, bankCategories } from "@/db/schema";
import { eq, and, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { recalculateTransactionsForBankCard } from "./transactions";
import { createBankCategory } from "./categories";
import { linkMultipleMccToCategory } from "./mcc";

export interface MccCategoryImport {
  name: string;
  mccs: string[];
  minPercent?: number;
}

export async function fetchMccCategoriesFromUrl(url: string): Promise<MccCategoryImport[]> {
  const session = await auth();
  if (session?.user?.role !== "admin") throw new Error("Unauthorized");

  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });
    
    if (!res.ok) throw new Error(`Failed to fetch URL: ${res.statusText}`);
    
    const html = await res.text();
    const categories: MccCategoryImport[] = [];
    
    // 1. Explicitly look for "No Cashback" section by ID
    const noCashbackMatch = html.match(/id="no-cashback-mccs"[\s\S]*?(?:<\/div>\s*<\/div>\s*<\/div>|mt-3)/i);
    if (noCashbackMatch) {
      const sectionHtml = noCashbackMatch[0];
      const mccs = new Set<string>();
      
      const codeLinkRegex = /\/code\/(\d{4})/g;
      let codeMatch;
      while ((codeMatch = codeLinkRegex.exec(sectionHtml)) !== null) {
        mccs.add(codeMatch[1]);
      }
      
      const plainCodeRegex = /(?:^|[^0-9])([0-9]{4})(?![0-9])/g;
      let plainMatch;
      while ((plainMatch = plainCodeRegex.exec(sectionHtml.replace(/<[^>]+>/g, " "))) !== null) {
        mccs.add(plainMatch[1]);
      }

      if (mccs.size > 0) {
        categories.push({
          name: "Без кешбэка",
          mccs: Array.from(mccs).sort(),
          minPercent: 0
        });
      }
    }

    // 2. Extract categories from list-group-item blocks to ensure proper association
    const itemRegex = /class="list-group-item[\s\S]*?class="h5 mb-1"([^>]*>[\s\S]*?<\/div>[\s\S]*?)<\/div>\s*<\/div>\s*<\/div>/g;
    let itemMatch;
    
    while ((itemMatch = itemRegex.exec(html)) !== null) {
      const blockContent = itemMatch[1];
      
      // Extract Name and Percentage
      const nameMatch = blockContent.match(/>([\s\S]*?)<\/div>/);
      if (!nameMatch) continue;
      
      const fullHeader = nameMatch[1].replace(/<[^>]+>/g, " ").trim();
      if (!fullHeader) continue;

      const percentMatch = fullHeader.match(/\((\d+)%\)/);
      const name = fullHeader.replace(/\(\d+%\)/, "").trim();
      const percent = percentMatch ? parseInt(percentMatch[1]) : undefined;

      // Special handling for "No Cashback" categories in the list
      if (/Без кешбэка|Нет кэшбэка/i.test(name)) {
        if (!categories.some(c => /Без кешбэка|Нет кэшбэка/i.test(c.name))) {
          const mccs = new Set<string>();
          const searchMccMatch = blockContent.match(/href="[^"]*?m=([\d,]+)"/);
          if (searchMccMatch) {
            searchMccMatch[1].split(",").forEach(m => {
              const trimmed = m.trim();
              if (trimmed.length === 4) mccs.add(trimmed);
            });
          }
          if (mccs.size > 0) {
            categories.push({
              name: "Без кешбэка",
              mccs: Array.from(mccs).sort(),
              minPercent: 0
            });
          }
        }
        continue;
      }
      
      const mccs = new Set<string>();
      
      // Try extracting from search link first (most accurate)
      const searchMccMatch = blockContent.match(/href="[^"]*?m=([\d,]+)"/);
      if (searchMccMatch) {
        searchMccMatch[1].split(",").forEach(m => {
          const trimmed = m.trim();
          if (trimmed.length === 4) mccs.add(trimmed);
        });
      }
      
      // If no search link, try /code/XXXX links in this block
      if (mccs.size === 0) {
        const codeLinkRegex = /\/code\/(\d{4})/g;
        let cMatch;
        while ((cMatch = codeLinkRegex.exec(blockContent)) !== null) {
          mccs.add(cMatch[1]);
        }
      }

      // Special case: "На все покупки" might not have specific MCCs but we want it
      if (name && (mccs.size > 0 || /все покупки/i.test(name))) {
        if (!categories.some(c => c.name === name)) {
          categories.push({
            name,
            mccs: Array.from(mccs).sort(),
            minPercent: percent
          });
        }
      }
    }

    // Fallback to old behavior if no structured blocks found
    if (categories.length === 0) {
      // (Keep existing logic but scoped down)
      let cleanHtml = html
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, " ")
        .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, " ")
        .replace(/<[^>]+>/g, " ")
        .replace(/&nbsp;/g, " ")
        .replace(/\s+/g, " ");

      const headers: { name: string, minPercent?: number, index: number }[] = [];
      const standardHeaderRegex = /([А-ЯЁA-Z][а-яёa-zА-ЯЁ\s&,.-]{1,50}?)\s*\((\d+)(?:-(\d+))?%\)/g;
      let m;
      while ((m = standardHeaderRegex.exec(cleanHtml)) !== null) {
        headers.push({ name: m[1].trim(), minPercent: parseInt(m[2]), index: m.index });
      }

      headers.sort((a, b) => a.index - b.index);

      for (let i = 0; i < headers.length; i++) {
        const current = headers[i];
        const next = headers[i + 1];
        const sectionText = cleanHtml.slice(current.index, next ? next.index : cleanHtml.length);
        const mccsSet = new Set<string>();
        const individualRegex = /(?:^|[^0-9])([0-9]{4})(?![0-9])/g;
        let indMatch;
        while ((indMatch = individualRegex.exec(sectionText)) !== null) {
          mccsSet.add(indMatch[1]);
        }
        if (mccsSet.size > 0) {
          categories.push({
            name: current.name,
            mccs: Array.from(mccsSet).sort(),
            minPercent: current.minPercent
          });
        }
      }
    }
    
    return categories;
  } catch (error) {
    console.error("Import error:", error);
    throw error;
  }
}

export async function importMccsToCategory(categoryId: number, mccs: string[]) {
  const session = await auth();
  if (session?.user?.role !== "admin") throw new Error("Unauthorized");

  if (mccs.length === 0) return;

  const [cat] = await db.select({ bankCardId: bankCategories.bankCardId }).from(bankCategories).where(eq(bankCategories.id, categoryId));
  const effectiveDate = "2000-01-01";
  const yesterday = new Date(new Date(effectiveDate).getTime() - 86400000).toISOString().split('T')[0];

  for (const code of mccs) {
    // Ensure MCC exists in dictionary
    await db.insert(mccCodes)
      .values({ code, description: "Добавлен автоматически" })
      .onConflictDoNothing();

    // Expire existing
    await db.update(bankCategoryMcc)
      .set({ endDate: yesterday })
      .where(
        and(
          eq(bankCategoryMcc.categoryId, categoryId),
          eq(bankCategoryMcc.mccCode, code),
          isNull(bankCategoryMcc.endDate)
        )
      );

    // Link new
    await db.insert(bankCategoryMcc).values({
      categoryId,
      mccCode: code,
      startDate: effectiveDate,
    });
  }

  if (cat) await recalculateTransactionsForBankCard(cat.bankCardId);

  revalidatePath(`/admin/categories/${categoryId}/mcc`);
}

export async function importFullCardFromUrl(bankCardId: number, url: string, selectedCategories: MccCategoryImport[]) {
  const session = await auth();
  if (session?.user?.role !== "admin") throw new Error("Unauthorized");

  const today = new Date().toISOString().split('T')[0];

  for (const cat of selectedCategories) {
    // 1. Skip categories like "1% на все покупки"
    if (/на все покупки/i.test(cat.name)) continue;

    // 2. Handle "Нет кэшбэка" or "Без кешбэка" -> map to existing "Без кешбэка"
    if (/Нет кэшбэка|Без кешбэка/i.test(cat.name)) {
      const [noCashbackCat] = await db
        .select({ id: bankCategories.id })
        .from(bankCategories)
        .where(and(eq(bankCategories.bankCardId, bankCardId), eq(bankCategories.name, "Без кешбэка")))
        .limit(1);
      
      if (noCashbackCat) {
        await linkMultipleMccToCategory(noCashbackCat.id, cat.mccs.join(", "));
      }
      continue;
    }

    const formData = new FormData();
    formData.append("bankCardId", bankCardId.toString());
    formData.append("name", cat.name);
    formData.append("defaultPercentage", (cat.minPercent || 1).toString());
    formData.append("startDate", today);
    formData.append("roundingType", "inherit");
    formData.append("mccText", cat.mccs.join(", "));
    
    await createBankCategory(formData);
  }

  revalidatePath(`/admin/bank-cards/${bankCardId}`);
}
