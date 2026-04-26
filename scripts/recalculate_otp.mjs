import { recalculateTransactionsForBank } from "../src/lib/actions/cashback-engine";

async function run() {
  console.log("Recalculating transactions for OTP Bank (ID 1)...");
  await recalculateTransactionsForBank(1);
  console.log("Done!");
}

run().catch(console.error);
