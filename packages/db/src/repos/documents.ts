import { eq, and } from "drizzle-orm";
import { documents, type NewDocumentRow } from "../schema/documents";
import type { DbClient } from "../client";

export async function createDocument(
  db: any,
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
  db: any,
  transactionId: string,
  ownerId: string
) {
  const result = await db
    .select()
    .from(documents)
    .where(and(eq(documents.transactionId, transactionId), eq(documents.ownerId, ownerId)))
    .all();
  return result;
}
