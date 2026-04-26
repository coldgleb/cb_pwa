const { createClient } = require("@libsql/client");
require("dotenv").config();

async function run() {
  const client = createClient({
    url: "file:local.db",
  });

  const txs = await client.execute("SELECT id, calculated_cashback, merchant_name FROM transactions");
  const problematic = txs.rows.filter(t => {
      const cb = t.calculated_cashback;
      if (cb === null) return false;
      return (cb * 100) % 1 !== 0;
  });

  console.log("Transactions with more than 2 decimal places in cashback:", problematic);
}

run().catch(console.error);
