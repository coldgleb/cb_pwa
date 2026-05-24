CREATE TABLE `transaction_templates` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` text NOT NULL,
	`template_name` text NOT NULL,
	`amount` real NOT NULL,
	`merchant_name` text NOT NULL,
	`mcc_code` text,
	`user_card_id` integer,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`mcc_code`) REFERENCES `mcc_codes`(`code`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`user_card_id`) REFERENCES `user_cards`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
ALTER TABLE `bank_cards` ADD `is_archived` integer DEFAULT false;--> statement-breakpoint
ALTER TABLE `transactions` ADD `cashback_percentage` real;