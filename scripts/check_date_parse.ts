import { db } from "../src/db";
import { transactions } from "../src/db/schema";
import { eq } from "drizzle-orm";

const toLocalDateStr = (date: Date) => {
  const offset = date.getTimezoneOffset();
  const localDate = new Date(date.getTime() - (offset * 60 * 1000));
  return localDate.toISOString().split('T')[0];
};

async function main() {
  const [tx] = await db.select().from(transactions).where(eq(transactions.id, 1)).limit(1);
  console.log("Drizzle parsed transaction:", tx);
  console.log("transactionDate type:", typeof tx.transactionDate, tx.transactionDate instanceof Date);
  if (tx.transactionDate) {
    console.log("transactionDate raw value:", tx.transactionDate.getTime());
    console.log("toLocalDateStr(tx.transactionDate):", toLocalDateStr(tx.transactionDate));
  }
}

main().catch(console.error);
