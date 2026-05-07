import { sqliteTable, text, integer, real, primaryKey } from "drizzle-orm/sqlite-core";
import type { AdapterAccountType } from "next-auth/adapters";

export const users = sqliteTable("users", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text("name"),
  email: text("email").notNull().unique(),
  password: text("password"),
  emailVerified: integer("email_verified", { mode: "timestamp_ms" }),
  image: text("image"),
  role: text("role").default("user").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(() => new Date()),
});

export const accounts = sqliteTable(
  "accounts",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").$type<AdapterAccountType>().notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("provider_account_id").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state"),
  },
  (account) => ({
    compoundKey: primaryKey({
      columns: [account.provider, account.providerAccountId],
    }),
  })
);

export const sessions = sqliteTable("sessions", {
  sessionToken: text("session_token").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expires: integer("expires", { mode: "timestamp_ms" }).notNull(),
});

export const verificationTokens = sqliteTable(
  "verification_tokens",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull(),
    expires: integer("expires", { mode: "timestamp_ms" }).notNull(),
  },
  (vt) => ({
    compoundKey: primaryKey({ columns: [vt.identifier, vt.token] }),
  })
);

export const banks = sqliteTable("banks", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull().unique(),
  logo: text("logo"),
  website: text("website"),
});

export const bankCards = sqliteTable("bank_cards", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  bankId: integer("bank_id").references(() => banks.id).notNull(),
  name: text("name").notNull(),
  roundingType: text("rounding_type").default("no_rounding").notNull(),
  defaultCashbackLimit: real("default_cashback_limit"),
});

// New table for historical settings
export const bankCardSettings = sqliteTable("bank_card_settings", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  bankCardId: integer("bank_card_id").references(() => bankCards.id).notNull(),
  roundingType: text("rounding_type").notNull(),
  startDate: text("start_date").notNull(), // ISO Date YYYY-MM-DD
});

export const userCards = sqliteTable("user_cards", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: text("user_id").references(() => users.id).notNull(),
  bankCardId: integer("bank_card_id").references(() => bankCards.id).notNull(),
  lastFourDigits: text("last_four_digits"),
  cashbackLimit: real("cashback_limit"),
});

export const mccCodes = sqliteTable("mcc_codes", {
  code: text("code").primaryKey(),
  description: text("description").notNull(),
  fullDescription: text("full_description").default("").notNull(),
});

export const bankCategories = sqliteTable("bank_categories", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  bankCardId: integer("bank_card_id").references(() => bankCards.id).notNull(),
  name: text("name").notNull(),
  defaultPercentage: real("default_percentage").default(0).notNull(),
  tiers: text("tiers").default("[]").notNull(),
  roundingType: text("rounding_type").default("inherit").notNull(),
  startDate: text("start_date").default("2000-01-01").notNull(),
  endDate: text("end_date"),
  cashbackLimit: real("cashback_limit"),
});

export const bankCategoryMcc = sqliteTable("bank_category_mcc", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  categoryId: integer("category_id").references(() => bankCategories.id).notNull(),
  mccCode: text("mcc_code").references(() => mccCodes.code).notNull(),
  startDate: text("start_date").default("2000-01-01").notNull(),
  endDate: text("end_date"),
});

export const bankCategoryMerchant = sqliteTable("bank_category_merchant", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  categoryId: integer("category_id").references(() => bankCategories.id).notNull(),
  merchantId: integer("merchant_id").references(() => merchants.id).notNull(),
  startDate: text("start_date").default("2000-01-01").notNull(),
  endDate: text("end_date"),
});

export const merchants = sqliteTable("merchants", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  mainMcc: text("main_mcc").notNull().default(""),
  additionalMccs: text("additional_mccs").notNull().default("0000"),
  logo: text("logo"),
  website: text("website"),
});

export const bankExclusions = sqliteTable("bank_exclusions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  bankCardId: integer("bank_card_id").references(() => bankCards.id).notNull(),
  mccCode: text("mcc_code").references(() => mccCodes.code).notNull(),
});

export const userCashbackRules = sqliteTable("user_cashback_rules", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userCardId: integer("user_card_id").references(() => userCards.id).notNull(),
  bankCategoryId: integer("bank_category_id").references(() => bankCategories.id),
  merchantId: integer("merchant_id").references(() => merchants.id),
  percentage: real("percentage").notNull(),
  tiers: text("tiers").default("[]").notNull(),
  startDate: text("start_date").notNull(),
  endDate: text("end_date").notNull(),
  cashbackLimit: real("cashback_limit"),
});

export const transactions = sqliteTable("transactions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: text("user_id").references(() => users.id).notNull(),
  userCardId: integer("user_card_id").references(() => userCards.id).notNull(),
  amount: real("amount").notNull(),
  paidAmount: real("paid_amount"),
  transactionDate: integer("transaction_date", { mode: "timestamp" }).$defaultFn(() => new Date()).notNull(),
  merchantName: text("merchant_name").notNull(),
  mccCode: text("mcc_code"),
  calculatedCashback: real("calculated_cashback"),
  cashbackPercentage: real("cashback_percentage"),
  manualCashbackAdjustment: real("manual_cashback_adjustment").default(0).notNull(),
  categoryId: integer("category_id").references(() => bankCategories.id),
});
