import { eq, and, count } from "drizzle-orm";
import { documents, type DocumentRow, type NewDocumentRow } from "../schema/documents";
import type { DbClient } from "../client";

export type Document = DocumentRow;

export async function createDocument(
  db: DbClient,
  input: NewDocumentRow & { id: string }
): Promise<{ id: string }> {
  await db.insert(documents).values({
    id: input.id,
    ownerId: input.ownerId,
    transactionId: input.transactionId,
    storageKey: input.storageKey,
    fileName: input.fileName,
    fileType: input.fileType,
    fileSize: input.fileSize,
  });
  return { id: input.id };
}

export async function listDocumentsByTransactionId(
  db: DbClient,
  transactionId: string,
  ownerId: string
): Promise<Document[]> {
  const result = await db
    .select()
    .from(documents)
    .where(and(eq(documents.transactionId, transactionId), eq(documents.ownerId, ownerId)));
  return result;
}

export async function getDocumentById(
  db: DbClient,
  id: string,
  ownerId: string
): Promise<Document | null> {
  const result = await db
    .select()
    .from(documents)
    .where(and(eq(documents.id, id), eq(documents.ownerId, ownerId)))
    .get();
  return result ?? null;
}

export async function deleteDocument(
  db: DbClient,
  id: string,
  ownerId: string
): Promise<boolean> {
  const result = await db
    .delete(documents)
    .where(and(eq(documents.id, id), eq(documents.ownerId, ownerId)))
    .returning({ id: documents.id });
  return result.length > 0;
}

export async function countDocumentsForUser(
  db: DbClient,
  ownerId: string
): Promise<number> {
  const result = await db
    .select({ value: count() })
    .from(documents)
    .where(eq(documents.ownerId, ownerId))
    .get();
  return result?.value ?? 0;
}
