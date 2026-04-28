import { describe, it, expect, beforeEach } from "vitest";
import { sql } from "drizzle-orm";
import { createDbClient } from "../../client";
import {
  createDocument,
  listDocumentsByTransactionId,
  getDocumentById,
  deleteDocument,
  countDocumentsForUser,
} from "../documents";
import { createTransaction, type NewTransaction } from "../transactions";

const db = createDbClient({ url: "file::memory:" });

const ownerId = "user_doc_a";
const otherOwnerId = "user_doc_b";
const txIdA = "01HRAX0Z1A2B3C4D5E6F7G8H9A";
const txIdB = "01HRAX0Z1A2B3C4D5E6F7G8H9B";

async function seedSchema() {
  await db.run(sql`DROP TABLE IF EXISTS documents`);
  await db.run(sql`DROP TABLE IF EXISTS transactions`);
  await db.run(sql`DROP TABLE IF EXISTS users`);

  await db.run(sql`
    CREATE TABLE users (
      id TEXT PRIMARY KEY NOT NULL,
      email TEXT NOT NULL,
      consent_v INTEGER,
      consent_at INTEGER,
      created_at INTEGER DEFAULT (unixepoch()) NOT NULL
    )
  `);
  await db.run(sql`
    CREATE TABLE transactions (
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
  await db.run(sql`
    CREATE TABLE documents (
      id TEXT PRIMARY KEY NOT NULL,
      owner_id TEXT NOT NULL,
      transaction_id TEXT NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
      storage_key TEXT NOT NULL,
      file_name TEXT NOT NULL,
      file_type TEXT NOT NULL,
      file_size INTEGER NOT NULL,
      created_at INTEGER NOT NULL DEFAULT (unixepoch())
    )
  `);

  await db.run(sql`INSERT INTO users (id, email) VALUES (${ownerId}, 'a@example.com')`);
  await db.run(sql`INSERT INTO users (id, email) VALUES (${otherOwnerId}, 'b@example.com')`);

  const txInputBase: Omit<NewTransaction, "type"> & { type: NewTransaction["type"] } = {
    type: "expense",
    amountCents: 100,
    category: "test",
    occurredAt: 1_700_000_000,
    source: "form",
  };
  await createTransaction(db, ownerId, { id: txIdA, ...txInputBase });
  await createTransaction(db, otherOwnerId, { id: txIdB, ...txInputBase });
}

describe("Documents Repository", () => {
  beforeEach(async () => {
    await seedSchema();
  });

  describe("createDocument + getDocumentById", () => {
    it("creates a document and reads it back for the owner", async () => {
      const id = "01HRAX0Z1A2B3C4D5E6F7G8DOC1";
      await createDocument(db, {
        id,
        ownerId,
        transactionId: txIdA,
        storageKey: `${txIdA}/${id}.pdf`,
        fileName: "factura.pdf",
        fileType: "application/pdf",
        fileSize: 1234,
      });

      const found = await getDocumentById(db, id, ownerId);
      expect(found).not.toBeNull();
      expect(found?.fileName).toBe("factura.pdf");
      expect(found?.fileType).toBe("application/pdf");
      expect(found?.fileSize).toBe(1234);
    });

    it("returns null when the requesting user is not the owner", async () => {
      const id = "01HRAX0Z1A2B3C4D5E6F7G8DOC2";
      await createDocument(db, {
        id,
        ownerId,
        transactionId: txIdA,
        storageKey: `${txIdA}/${id}.png`,
        fileName: "ticket.png",
        fileType: "image/png",
        fileSize: 200,
      });

      const found = await getDocumentById(db, id, otherOwnerId);
      expect(found).toBeNull();
    });
  });

  describe("listDocumentsByTransactionId", () => {
    it("returns only documents owned by the requesting user", async () => {
      await createDocument(db, {
        id: "01HRAX0Z1A2B3C4D5E6F7G8DOC3",
        ownerId,
        transactionId: txIdA,
        storageKey: `${txIdA}/a.pdf`,
        fileName: "a.pdf",
        fileType: "application/pdf",
        fileSize: 10,
      });
      await createDocument(db, {
        id: "01HRAX0Z1A2B3C4D5E6F7G8DOC4",
        ownerId,
        transactionId: txIdA,
        storageKey: `${txIdA}/b.pdf`,
        fileName: "b.pdf",
        fileType: "application/pdf",
        fileSize: 20,
      });

      const own = await listDocumentsByTransactionId(db, txIdA, ownerId);
      expect(own).toHaveLength(2);

      const foreign = await listDocumentsByTransactionId(db, txIdA, otherOwnerId);
      expect(foreign).toHaveLength(0);
    });
  });

  describe("deleteDocument", () => {
    it("deletes only when ownerId matches", async () => {
      const id = "01HRAX0Z1A2B3C4D5E6F7G8DOC5";
      await createDocument(db, {
        id,
        ownerId,
        transactionId: txIdA,
        storageKey: `${txIdA}/c.pdf`,
        fileName: "c.pdf",
        fileType: "application/pdf",
        fileSize: 50,
      });

      const wrong = await deleteDocument(db, id, otherOwnerId);
      expect(wrong).toBe(false);
      expect(await getDocumentById(db, id, ownerId)).not.toBeNull();

      const ok = await deleteDocument(db, id, ownerId);
      expect(ok).toBe(true);
      expect(await getDocumentById(db, id, ownerId)).toBeNull();
    });
  });

  describe("countDocumentsForUser", () => {
    it("counts documents scoped to a single owner", async () => {
      await createDocument(db, {
        id: "01HRAX0Z1A2B3C4D5E6F7G8DOC6",
        ownerId,
        transactionId: txIdA,
        storageKey: `${txIdA}/x.pdf`,
        fileName: "x.pdf",
        fileType: "application/pdf",
        fileSize: 1,
      });
      await createDocument(db, {
        id: "01HRAX0Z1A2B3C4D5E6F7G8DOC7",
        ownerId: otherOwnerId,
        transactionId: txIdB,
        storageKey: `${txIdB}/y.pdf`,
        fileName: "y.pdf",
        fileType: "application/pdf",
        fileSize: 1,
      });

      expect(await countDocumentsForUser(db, ownerId)).toBe(1);
      expect(await countDocumentsForUser(db, otherOwnerId)).toBe(1);
      expect(await countDocumentsForUser(db, "user_does_not_exist")).toBe(0);
    });
  });
});
