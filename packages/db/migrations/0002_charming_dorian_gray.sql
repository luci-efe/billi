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
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `new_rag_chunks` (
	`id` text PRIMARY KEY NOT NULL,
	`document_id` text NOT NULL,
	`content` text NOT NULL,
	`embedding` F32_BLOB(1536),
	`metadata` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`document_id`) REFERENCES `documents`(`id`) ON UPDATE no action ON DELETE cascade
);--> statement-breakpoint
INSERT INTO `new_rag_chunks` (`id`, `document_id`, `content`, `embedding`, `metadata`, `created_at`)
SELECT `id`, `document_id`, `content`, `embedding`, `metadata`, `created_at` FROM `rag_chunks`;--> statement-breakpoint
DROP TABLE `rag_chunks`;--> statement-breakpoint
ALTER TABLE `new_rag_chunks` RENAME TO `rag_chunks`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE INDEX `tx_owner_time_idx` ON `transactions` (`owner_id`,`occurred_at`);--> statement-breakpoint
CREATE INDEX `tx_owner_cat_idx` ON `transactions` (`owner_id`,`category`);--> statement-breakpoint
CREATE INDEX `tx_owner_type_idx` ON `transactions` (`owner_id`,`type`);