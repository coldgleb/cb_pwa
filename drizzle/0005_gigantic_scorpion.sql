CREATE TABLE `spending_categories` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`parent_id` integer,
	FOREIGN KEY (`parent_id`) REFERENCES `spending_categories`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
ALTER TABLE `merchants` ADD `spending_category_id` integer REFERENCES spending_categories(id);--> statement-breakpoint
ALTER TABLE `transactions` ADD `spending_category_id` integer REFERENCES spending_categories(id);