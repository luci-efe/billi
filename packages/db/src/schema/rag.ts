import { text, sqliteTable } from 'drizzle-orm/sqlite-core';
import { createId } from '@paralleldrive/cuid2';
import { f32Blob } from './custom-types';

export const ragChunks = sqliteTable('rag_chunks', {
  id: text('id').primaryKey().$defaultFn(() => createId()),
  topic: text('topic').notNull(),
  content: text('content').notNull(),
  metadata: text('metadata', { mode: 'json' }),
  embedding: f32Blob('embedding', { dimensions: 1536 }), 
});
