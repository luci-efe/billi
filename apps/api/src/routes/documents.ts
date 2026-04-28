import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { ulid } from "ulid";
import {
  createDocument,
  listDocumentsByTransactionId,
  getDocumentById,
  deleteDocument,
} from "@billi/db/repos/documents";
import { getTransactionById } from "@billi/db/repos/transactions";
import {
  txIdParamSchema,
  documentIdParamSchema,
} from "../schemas/documents";
import {
  validateFileUpload,
  getStorageKey,
  sanitizeFileName,
} from "../utils/documents";
import type { Env } from "../env";
import type { createDb } from "../db";

type Variables = {
  userId: string;
  db: ReturnType<typeof createDb>;
  requestId: string;
};

const router = new Hono<{ Bindings: Env; Variables: Variables }>();

// POST /api/transactions/:txId/documents
router.post(
  "/transactions/:txId/documents",
  zValidator("param", txIdParamSchema),
  async (c) => {
    const userId = c.get("userId");
    const db = c.get("db");
    const { txId } = c.req.valid("param");

    const tx = await getTransactionById(db, txId, userId);
    if (!tx) {
      return c.json({ error: "not_found" }, 404);
    }

    let formData: FormData;
    try {
      formData = await c.req.formData();
    } catch {
      return c.json({ error: "invalid_multipart" }, 400);
    }

    const filePart = formData.get("file");
    if (!(filePart instanceof File)) {
      return c.json({ error: "missing_file" }, 400);
    }

    const headerBuffer = await filePart.slice(0, 16).arrayBuffer();
    const magicBytes = new Uint8Array(headerBuffer);

    const validation = validateFileUpload({
      size: filePart.size,
      type: filePart.type,
      magicBytes,
    });
    if (!validation.valid) {
      return c.json({ error: "invalid_file", message: validation.error }, 400);
    }

    const storageKey = getStorageKey({
      transactionId: txId,
      fileName: filePart.name,
      mimeType: filePart.type,
    });

    const fileBuffer = await filePart.arrayBuffer();
    const putResult = await c.env.DOCUMENTS_BUCKET.put(storageKey, fileBuffer, {
      httpMetadata: { contentType: filePart.type },
    });
    if (!putResult) {
      return c.json({ error: "storage_failed" }, 500);
    }

    const id = ulid();
    const sanitizedName = sanitizeFileName(filePart.name);

    try {
      await createDocument(db, {
        id,
        ownerId: userId,
        transactionId: txId,
        storageKey,
        fileName: sanitizedName,
        fileType: filePart.type,
        fileSize: filePart.size,
      });
    } catch (err) {
      // Compensate: drop the orphan object from R2 so we don't leak storage.
      try {
        await c.env.DOCUMENTS_BUCKET.delete(storageKey);
      } catch {
        // best-effort; surface original error
      }
      console.error('persist_failed:', err);
      return c.json(
        { error: 'persist_failed', requestId: c.get('requestId') },
        500
      );
    }

    return c.json(
      {
        id,
        fileName: sanitizedName,
        fileType: filePart.type,
        fileSize: filePart.size,
        createdAt: Math.floor(Date.now() / 1000),
      },
      201
    );
  }
);

// GET /api/transactions/:txId/documents
router.get(
  "/transactions/:txId/documents",
  zValidator("param", txIdParamSchema),
  async (c) => {
    const userId = c.get("userId");
    const db = c.get("db");
    const { txId } = c.req.valid("param");

    const rows = await listDocumentsByTransactionId(db, txId, userId);
    const items = rows.map((r) => ({
      id: r.id,
      fileName: r.fileName,
      fileType: r.fileType,
      fileSize: r.fileSize,
      createdAt: r.createdAt,
    }));
    return c.json({ items });
  }
);

// GET /api/documents/:docId
router.get(
  "/documents/:docId",
  zValidator("param", documentIdParamSchema),
  async (c) => {
    const userId = c.get("userId");
    const db = c.get("db");
    const { docId } = c.req.valid("param");

    const row = await getDocumentById(db, docId, userId);
    if (!row) {
      return c.json({ error: "not_found" }, 404);
    }

    const obj = await c.env.DOCUMENTS_BUCKET.get(row.storageKey);
    if (!obj) {
      return c.json({ error: "not_found" }, 404);
    }

    return c.body(obj.body as unknown as ReadableStream, 200, {
      "Content-Type": obj.httpMetadata?.contentType ?? row.fileType,
      "Content-Disposition": `attachment; filename="${row.fileName.replace(/"/g, "")}"`,
      "Cache-Control": "private, no-cache",
    });
  }
);

// DELETE /api/documents/:docId
router.delete(
  "/documents/:docId",
  zValidator("param", documentIdParamSchema),
  async (c) => {
    const userId = c.get("userId");
    const db = c.get("db");
    const { docId } = c.req.valid("param");

    const row = await getDocumentById(db, docId, userId);
    if (!row) {
      return c.json({ error: "not_found" }, 404);
    }

    try {
      await c.env.DOCUMENTS_BUCKET.delete(row.storageKey);
    } catch {
      // best-effort: continue with DB delete to avoid dangling rows.
    }

    const deleted = await deleteDocument(db, docId, userId);
    if (!deleted) {
      return c.json({ error: "not_found" }, 404);
    }

    return c.body(null, 204);
  }
);

export default router;
