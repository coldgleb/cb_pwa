import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config();

console.log("--- DB Connection Debug ---");
console.log("DATABASE_URL:", process.env.DATABASE_URL);
console.log("DATABASE_AUTH_TOKEN exists:", !!process.env.DATABASE_AUTH_TOKEN);
console.log("NODE_ENV:", process.env.NODE_ENV);
console.log("---------------------------");
