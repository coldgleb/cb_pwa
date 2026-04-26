const { createClient } = require("@libsql/client");
require("dotenv").config();

async function run() {
  const client = createClient({
    url: "file:local.db",
  });

  const banks = await client.execute("SELECT * FROM banks WHERE name LIKE '%ОТП%'");
  console.log("Banks:", banks.rows);

  if (banks.rows.length > 0) {
    const bankId = banks.rows[0].id;
    const cards = await client.execute({
      sql: "SELECT * FROM bank_cards WHERE bank_id = ?",
      args: [bankId]
    });
    console.log("Cards:", cards.rows);

    for (const card of cards.rows) {
        const settings = await client.execute({
            sql: "SELECT * FROM bank_card_settings WHERE bank_card_id = ?",
            args: [card.id]
        });
        console.log(`Settings for card ${card.id}:`, settings.rows);

        const categories = await client.execute({
            sql: "SELECT * FROM bank_categories WHERE bank_card_id = ?",
            args: [card.id]
        });
        console.log(`Categories for card ${card.id}:`, categories.rows.map(c => ({ id: c.id, name: c.name, rounding: c.rounding_type })));
        
        const userCards = await client.execute({
            sql: "SELECT * FROM user_cards WHERE bank_card_id = ?",
            args: [card.id]
        });
        
        for (const uc of userCards.rows) {
            const txs = await client.execute({
                sql: "SELECT id, amount, calculated_cashback, merchant_name FROM transactions WHERE user_card_id = ? LIMIT 5",
                args: [uc.id]
            });
            console.log(`Transactions for user_card ${uc.id}:`, txs.rows);
        }
    }
  }
}

run().catch(console.error);
