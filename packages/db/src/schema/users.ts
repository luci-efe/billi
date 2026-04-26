import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

// Mirror of Clerk-owned identities. PK equals Clerk's user_id string
// (e.g. "user_2abc..."). Domain tables FK against this row so ownership
// lives at the SQL layer. See ADR-003.
export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  email: text('email').notNull().default(''),
  rfc: text('rfc'),
  defaultCurrency: text('default_currency').notNull().default('MXN'),
  createdAt: integer('created_at')
    .notNull()
    .default(sql`(unixepoch())`),
  consentV: integer('consent_v'),
  consentAt: integer('consent_at'),
});

export type UserRow = typeof users.$inferSelect;
export type NewUserRow = typeof users.$inferInsert;
