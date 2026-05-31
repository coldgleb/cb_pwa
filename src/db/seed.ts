import { db } from "./index";
import { banks, mccCodes, users } from "./schema";
import bcrypt from "bcryptjs";

async function main() {
  console.log("Seeding database...");

  // Create admin user
  const hashedPassword = await bcrypt.hash("admin123", 10);
  await db.insert(users).values({
    id: "baaa1eea-9680-46dd-9178-eebe2406cbe0",
    name: "Admin",
    email: "saygingleb101@gmail.com",
    password: hashedPassword,
    role: "admin",
  }).onConflictDoUpdate({
    target: users.email,
    set: {
      password: hashedPassword,
      role: "admin",
      name: "Admin"
    }
  });

  const popularBanks = [
    { name: "Т-Банк (Тинькофф)", logo: "https://acdn.tinkoff.ru/static/documents/09695663-0a7c-47b7-872e-36067b57b3f9.png", website: "tbank.ru" },
    { name: "Сбербанк", logo: "https://upload.wikimedia.org/wikipedia/commons/4/4c/Sberbank_Logo_2020.svg", website: "sberbank.ru" },
    { name: "Альфа-Банк", logo: "https://upload.wikimedia.org/wikipedia/commons/4/4d/Alfa-Bank_Logo.svg", website: "alfabank.ru" },
    { name: "ВТБ", logo: "https://upload.wikimedia.org/wikipedia/commons/3/3d/VTB_Logo_2018.svg", website: "vtb.ru" },
    { name: "Совкомбанк", logo: "https://sovcombank.ru/favicon.ico", website: "sovcombank.ru" },
    { name: "ОТП Банк", logo: "https://www.otpbank.ru/favicon.ico", website: "otpbank.ru" },
  ];

  for (const bank of popularBanks) {
    await db.insert(banks).values(bank).onConflictDoUpdate({
      target: banks.name,
      set: { logo: bank.logo, website: bank.website }
    });
  }

  const essentialMccs = [
    { code: "5411", description: "Супермаркеты" },
    { code: "5812", description: "Рестораны" },
    { code: "5814", description: "Фастфуд" },
    { code: "5912", description: "Аптеки" },
    { code: "5541", description: "АЗС" },
    { code: "4111", description: "Транспорт" },
    { code: "4121", description: "Такси" },
    { code: "5691", description: "Одежда" },
    { code: "5732", description: "Электроника" },
    { code: "5211", description: "Дом и ремонт" },
  ];

  for (const mcc of essentialMccs) {
    await db.insert(mccCodes).values(mcc).onConflictDoNothing();
  }

  console.log("Seeding completed!");
}

main().catch(console.error);
