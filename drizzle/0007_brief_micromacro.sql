CREATE TABLE `transaction_category_splits` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`transaction_id` integer NOT NULL,
	`spending_category_id` integer NOT NULL,
	`amount` real NOT NULL,
	FOREIGN KEY (`transaction_id`) REFERENCES `transactions`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`spending_category_id`) REFERENCES `spending_categories`(`id`) ON UPDATE no action ON DELETE no action
);
