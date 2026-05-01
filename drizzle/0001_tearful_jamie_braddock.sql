CREATE TABLE `bank_card_settings` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`bank_card_id` integer NOT NULL,
	`rounding_type` text NOT NULL,
	`start_date` text NOT NULL,
	FOREIGN KEY (`bank_card_id`) REFERENCES `bank_cards`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `bank_category_merchant` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`category_id` integer NOT NULL,
	`merchant_id` integer NOT NULL,
	`start_date` text DEFAULT '2000-01-01' NOT NULL,
	`end_date` text,
	FOREIGN KEY (`category_id`) REFERENCES `bank_categories`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`merchant_id`) REFERENCES `merchants`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
ALTER TABLE `bank_cards` ADD `rounding_type` text DEFAULT 'no_rounding' NOT NULL;--> statement-breakpoint
ALTER TABLE `bank_cards` ADD `default_cashback_limit` real;--> statement-breakpoint
ALTER TABLE `bank_categories` ADD `default_percentage` real DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `bank_categories` ADD `tiers` text DEFAULT '[]' NOT NULL;--> statement-breakpoint
ALTER TABLE `bank_categories` ADD `rounding_type` text DEFAULT 'inherit' NOT NULL;--> statement-breakpoint
ALTER TABLE `bank_categories` ADD `start_date` text DEFAULT '2000-01-01' NOT NULL;--> statement-breakpoint
ALTER TABLE `bank_categories` ADD `end_date` text;--> statement-breakpoint
ALTER TABLE `bank_categories` ADD `cashback_limit` real;--> statement-breakpoint
ALTER TABLE `bank_categories` DROP COLUMN `is_base`;--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_bank_category_mcc` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`category_id` integer NOT NULL,
	`mcc_code` text NOT NULL,
	`start_date` text DEFAULT '2000-01-01' NOT NULL,
	`end_date` text,
	FOREIGN KEY (`category_id`) REFERENCES `bank_categories`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`mcc_code`) REFERENCES `mcc_codes`(`code`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_bank_category_mcc`("id", "category_id", "mcc_code", "start_date", "end_date") SELECT "id", "category_id", "mcc_code", "start_date", "end_date" FROM `bank_category_mcc`;--> statement-breakpoint
DROP TABLE `bank_category_mcc`;--> statement-breakpoint
ALTER TABLE `__new_bank_category_mcc` RENAME TO `bank_category_mcc`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
ALTER TABLE `bank_exclusions` ADD `bank_card_id` integer NOT NULL REFERENCES bank_cards(id);--> statement-breakpoint
ALTER TABLE `bank_exclusions` DROP COLUMN `bank_id`;--> statement-breakpoint
ALTER TABLE `banks` ADD `website` text;--> statement-breakpoint
ALTER TABLE `mcc_codes` ADD `full_description` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `merchants` ADD `main_mcc` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `merchants` ADD `additional_mccs` text DEFAULT '0000' NOT NULL;--> statement-breakpoint
ALTER TABLE `merchants` ADD `logo` text;--> statement-breakpoint
ALTER TABLE `merchants` ADD `website` text;--> statement-breakpoint
ALTER TABLE `transactions` ADD `paid_amount` real;--> statement-breakpoint
ALTER TABLE `transactions` ADD `manual_cashback_adjustment` real DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `user_cards` ADD `cashback_limit` real;--> statement-breakpoint
ALTER TABLE `user_cashback_rules` ADD `tiers` text DEFAULT '[]' NOT NULL;--> statement-breakpoint
ALTER TABLE `user_cashback_rules` ADD `cashback_limit` real;--> statement-breakpoint
ALTER TABLE `users` ADD `password` text;--> statement-breakpoint
ALTER TABLE `users` ADD `role` text DEFAULT 'user' NOT NULL;