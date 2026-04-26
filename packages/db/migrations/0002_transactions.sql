CREATE TABLE `transactions` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`type` text NOT NULL,
	`amount_cents` integer NOT NULL,
	`currency` text DEFAULT 'MXN' NOT NULL,
	`category` text NOT NULL,
	`occurred_at` integer NOT NULL,
	`source` text NOT NULL,
	`source_ref` text,
	`note` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer,
	FOREIGN KEY (`owner_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "transactions_type_chk" CHECK("transactions"."type" IN ('income','expense')),
	CONSTRAINT "transactions_amount_chk" CHECK("transactions"."amount_cents" > 0),
	CONSTRAINT "transactions_cat_len_chk" CHECK(length("transactions"."category") BETWEEN 1 AND 32),
	CONSTRAINT "transactions_source_chk" CHECK("transactions"."source" IN ('form','text','voice','image','chat')),
	CONSTRAINT "transactions_note_len_chk" CHECK("transactions"."note" IS NULL OR length("transactions"."note") <= 280)
);
--> statement-breakpoint
CREATE INDEX `tx_owner_time_idx` ON `transactions` (`owner_id`,`occurred_at`);--> statement-breakpoint
CREATE INDEX `tx_owner_cat_idx` ON `transactions` (`owner_id`,`category`);--> statement-breakpoint
CREATE INDEX `tx_owner_type_idx` ON `transactions` (`owner_id`,`type`);