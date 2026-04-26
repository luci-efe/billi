import { describe, it, expect, beforeEach } from "vitest";
import { transactions } from "../../schema/transactions";
import { 
  createTransaction, 
  getTransactionById, 
  listTransactions, 
  updateTransaction, 
  deleteTransaction 
} from "../transactions";
import { createDbClient } from "../../client";
import { sql } from "drizzle-orm";

// Mock DB configuration for in-memory testing
const db = createDbClient({ url: "file::memory:" });

describe("Transactions Repository", () => {
  const ownerId = "user_123";
  const otherOwnerId = "user_456";

  beforeEach(async () => {
    // Create the required tables in the in-memory SQLite
    await db.run(sql`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY NOT NULL,
        email TEXT NOT NULL,
        consent_v INTEGER,
        consent_at INTEGER,
        created_at INTEGER DEFAULT (unixepoch()) NOT NULL
      )
    `);
    
    await db.run(sql`
      CREATE TABLE IF NOT EXISTS transactions (
        id TEXT PRIMARY KEY NOT NULL,
        owner_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        type TEXT NOT NULL CHECK (type IN ('income','expense')),
        amount_cents INTEGER NOT NULL CHECK (amount_cents > 0),
        currency TEXT NOT NULL DEFAULT 'MXN',
        category TEXT NOT NULL CHECK (length(category) BETWEEN 1 AND 32),
        occurred_at INTEGER NOT NULL,
        source TEXT NOT NULL CHECK (source IN ('form','text','voice','image','chat')),
        source_ref TEXT,
        note TEXT CHECK (note IS NULL OR length(note) <= 280),
        created_at INTEGER NOT NULL DEFAULT (unixepoch()),
        updated_at INTEGER
      )
    `);

    await db.run(sql`DELETE FROM transactions`);
    await db.run(sql`DELETE FROM users`);
    
    // Seed user
    await db.run(sql`INSERT INTO users (id, email) VALUES (${ownerId}, 'test@example.com')`);
    await db.run(sql`INSERT INTO users (id, email) VALUES (${otherOwnerId}, 'other@example.com')`);
  });

  describe("createTransaction", () => {
    it("should create a transaction with valid data", async () => {
      const input = {
        id: "01HRAX0Z1A2B3C4D5E6F7G8H9J",
        type: "expense" as const,
        amountCents: 1000,
        currency: "MXN",
        category: "food",
        occurredAt: Math.floor(Date.now() / 1000),
        source: "form" as const,
        note: "Tacos"
      };

      const result = await createTransaction(db, ownerId, input);
      expect(result).toHaveProperty("id");
      
      const created = await getTransactionById(db, result.id, ownerId);
      expect(created).not.toBeNull();
      expect(created).toMatchObject({
        ...input,
        ownerId,
      });
    });

    it("should enforce validation constraints (amount > 0)", async () => {
      const input = {
        id: "01HRAX0Z1A2B3C4D5E6F7G8H9K",
        type: "expense" as const,
        amountCents: 0, // Invalid
        category: "test",
        occurredAt: 123456789,
        source: "form" as const,
      };

      await expect(createTransaction(db, ownerId, input as any)).rejects.toThrow();
    });
  });

  describe("Ownership Enforcement", () => {
    it("should not allow User B to see User A's transaction", async () => {
      const input = {
        id: "01HRAX0Z1A2B3C4D5E6F7G8H9L",
        type: "income" as const,
        amountCents: 5000,
        category: "salary",
        occurredAt: 123456789,
        source: "form" as const,
      };

      const { id } = await createTransaction(db, ownerId, input);
      
      const found = await getTransactionById(db, id, otherOwnerId);
      expect(found).toBeNull();
    });

    it("should not allow User B to delete User A's transaction", async () => {
      const { id } = await createTransaction(db, ownerId, {
        id: "01HRAX0Z1A2B3C4D5E6F7G8H9M",
        type: "expense",
        amountCents: 100,
        category: "test",
        occurredAt: 123456789,
        source: "form",
      } as any);

      const deleted = await deleteTransaction(db, id, otherOwnerId);
      expect(deleted).toBe(false);

      // Verify it still exists for User A
      const exists = await getTransactionById(db, id, ownerId);
      expect(exists).not.toBeNull();
    });
  });

  describe("listTransactions", () => {
    it("should return only the owner's transactions", async () => {
      await createTransaction(db, ownerId, { id: "01HRAX0Z1A2B3C4D5E6F7G8H9N", type: "income", amountCents: 100, category: "A", occurredAt: 100, source: "form" });
      await createTransaction(db, otherOwnerId, { id: "01HRAX0Z1A2B3C4D5E6F7G8H9P", type: "income", amountCents: 200, category: "B", occurredAt: 200, source: "form" });

      const { items } = await listTransactions(db, ownerId, {});
      expect(items).toHaveLength(1);
      expect(items[0].category).toBe("A");
    });

    it("should support ordering and pagination", async () => {
      // Create multiple transactions
      for (let i = 0; i < 5; i++) {
        await createTransaction(db, ownerId, {
          id: `01HRAX0Z1A2B3C4D5E6F7G8H9${i}`,
          type: "expense",
          amountCents: 100 * (i + 1),
          category: "test",
          occurredAt: 1000 + i,
          source: "form",
        });
      }

      const firstPage = await listTransactions(db, ownerId, { limit: 2 });
      expect(firstPage.items).toHaveLength(2);
      expect(firstPage.nextCursor).toBeDefined();

      const secondPage = await listTransactions(db, ownerId, { cursor: firstPage.nextCursor });
      expect(secondPage.items).toHaveLength(3);
    });
  });
});
