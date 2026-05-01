import { db } from "@/db";
import { merchants, mccCodes } from "@/db/schema";
import { asc } from "drizzle-orm";
import SearchBestCard from "@/components/SearchBestCard";
import { css } from "../../../../styled-system/css";
import { stack } from "../../../../styled-system/patterns";

export const dynamic = "force-dynamic";

export default async function SearchPage() {
  const allMerchants = await db.select({ name: merchants.name }).from(merchants).orderBy(asc(merchants.name));
  const allMccs = await db.select().from(mccCodes).orderBy(asc(mccCodes.code));

  return (
    <div className="sber-container">
      <div className={stack({ gap: "32px" })}>
        <h1 className={css({ fontSize: "28px", fontWeight: "900", color: "var(--foreground)" })}>Выбор карты</h1>
        <SearchBestCard merchants={allMerchants} mccs={allMccs} />
      </div>
    </div>
  );
}
