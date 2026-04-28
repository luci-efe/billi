-- Drop if exists to ensure we start clean given the previous failure
DROP TABLE IF EXISTS `rag_chunks`;
--> statement-breakpoint
CREATE TABLE `rag_chunks` (
	`id` text PRIMARY KEY NOT NULL,
	`topic` text NOT NULL,
	`content` text NOT NULL,
	`metadata` text,
	`embedding` F32_BLOB(1536)
);
--> statement-breakpoint
CREATE INDEX `idx_rag_chunks_embedding` ON `rag_chunks` (
  libsql_vector_idx(embedding)
);
