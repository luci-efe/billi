CREATE TABLE `documents` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`transaction_id` text NOT NULL,
	`storage_key` text NOT NULL,
	`file_name` text NOT NULL,
	`file_type` text NOT NULL,
	`file_size` integer NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`transaction_id`) REFERENCES `transactions`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
DROP INDEX "tx_owner_time_idx";--> statement-breakpoint
DROP INDEX "tx_owner_cat_idx";--> statement-breakpoint
DROP INDEX "tx_owner_type_idx";--> statement-breakpoint
ALTER TABLE `rag_chunks` ALTER COLUMN "embedding" TO "embedding" F32_BLOB(1536);--> statement-breakpoint
CREATE INDEX `tx_owner_time_idx` ON `transactions` (`owner_id`,`occurred_at`);--> statement-breakpoint
CREATE INDEX `tx_owner_cat_idx` ON `transactions` (`owner_id`,`category`);--> statement-breakpoint
CREATE INDEX `tx_owner_type_idx` ON `transactions` (`owner_id`,`type`);