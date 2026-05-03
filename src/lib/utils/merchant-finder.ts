import { db } from "@/db";
import { mccCodes } from "@/db/schema";
import { eq, inArray } from "drizzle-orm";

export async function findMccForMerchant(merchantName: string) {
  try {
    const url = `https://mcc-codes.ru/search/?q=${encodeURIComponent(merchantName)}`;
    const response = await fetch(url);
    if (!response.ok) return null;
    
    const html = await response.text();
    
    // Find all MCC codes linked via /code/XXXX pattern
    const codeLinkRegex = /\/code\/(\d{4})/g;
    const potentialCodes: string[] = [];
    let match;
    while ((match = codeLinkRegex.exec(html)) !== null) {
      const code = match[1];
      // Still exclude years just in case
      const numeric = parseInt(code);
      if (!(numeric >= 2000 && numeric <= 2100)) {
        potentialCodes.push(code);
      }
    }

    if (potentialCodes.length === 0) return null;

    // Filter codes that actually exist in our local database
    const validCodes = await db
      .select({ code: mccCodes.code })
      .from(mccCodes)
      .where(inArray(mccCodes.code, potentialCodes));
    
    const validSet = new Set(validCodes.map(c => c.code));
    const matchedCodes = potentialCodes.filter(code => validSet.has(code));

    if (matchedCodes.length === 0) return null;

    // Count frequency of each code
    const counts: Record<string, number> = {};
    matchedCodes.forEach(code => {
      counts[code] = (counts[code] || 0) + 1;
    });

    // Sort by frequency descending
    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    
    const mainMcc = sorted[0][0];
    const additionalMccs = sorted.slice(1).map(entry => entry[0]);

    // Ensure 0000 is included in additional if not already
    if (mainMcc !== "0000" && !additionalMccs.includes("0000")) {
      additionalMccs.push("0000");
    }

    return {
      mainMcc,
      additionalMccs: additionalMccs.join(",")
    };
  } catch (error) {
    console.error("Merchant finder error:", error);
    return null;
  }
}
