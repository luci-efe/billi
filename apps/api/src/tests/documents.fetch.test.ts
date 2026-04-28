/// <reference types="@cloudflare/vitest-pool-workers" />
import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import { SELF } from 'cloudflare:test';
import { ensureTestSchema, resetTestData } from './setup';

// HTTP integration tests for the documents (R2) routes:
//   POST   /api/transactions/:txId/documents
//   GET    /api/transactions/:txId/documents
//   GET    /api/documents/:docId
//   DELETE /api/documents/:docId
//
// These tests rely on a real libsql (in-memory) DB to persist transactions and
// documents. They will only execute end-to-end when TURSO_DATABASE_URL is set
// to a memory URI; under the current pool/vitest pin combo the mock DB branch
// in index.ts may short-circuit some of these. The tests are written to the
// spec; runtime execution is gated by the test pool itself.

const OWNER = 'Bearer test_user_123';
const ATTACKER = 'Bearer attacker_user_999';

async function seedTransaction(auth: string): Promise<string> {
  const res = await SELF.fetch('http://example.com/api/transactions', {
    method: 'POST',
    headers: {
      Authorization: auth,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      type: 'expense',
      amountCents: 25000,
      currency: 'MXN',
      category: 'Comida',
      occurredAt: 1714291200,
      source: 'form',
    }),
  });
  expect(res.status).toBe(201);
  const body = (await res.json()) as { id: string };
  return body.id;
}

function pdfBytes(size: number, valid = true): Uint8Array {
  const bytes = new Uint8Array(size);
  if (valid) {
    bytes[0] = 0x25; // %
    bytes[1] = 0x50; // P
    bytes[2] = 0x44; // D
    bytes[3] = 0x46; // F
  }
  return bytes;
}

function pdfFile(bytes: Uint8Array, name = 'r.pdf'): File {
  return new File([bytes.buffer as ArrayBuffer], name, { type: 'application/pdf' });
}

describe('documents routes', () => {
  beforeAll(ensureTestSchema);
  beforeEach(resetTestData);

  it('uploads a PDF and lists it for the owner transaction', async () => {
    const txId = await seedTransaction(OWNER);
    const fd = new FormData();
    fd.append('file', pdfFile(pdfBytes(1024)));

    const upload = await SELF.fetch(
      `http://example.com/api/transactions/${txId}/documents`,
      { method: 'POST', headers: { Authorization: OWNER }, body: fd },
    );
    expect(upload.status).toBe(201);
    const created = (await upload.json()) as {
      id: string;
      fileName: string;
      fileType: string;
      fileSize: number;
      createdAt: number;
    };
    expect(created.id).toBeTruthy();
    expect(created.fileName).toBe('r.pdf');
    expect(created.fileType).toBe('application/pdf');
    expect(created.fileSize).toBe(1024);
    expect(typeof created.createdAt).toBe('number');

    const list = await SELF.fetch(
      `http://example.com/api/transactions/${txId}/documents`,
      { headers: { Authorization: OWNER } },
    );
    expect(list.status).toBe(200);
    const listBody = (await list.json()) as { items: { id: string }[] };
    expect(listBody.items.some((d) => d.id === created.id)).toBe(true);
  });

  it('rejects a file whose magic bytes do not match the declared MIME', async () => {
    const txId = await seedTransaction(OWNER);
    const fd = new FormData();
    fd.append('file', pdfFile(pdfBytes(1024, /* valid */ false)));

    const res = await SELF.fetch(
      `http://example.com/api/transactions/${txId}/documents`,
      { method: 'POST', headers: { Authorization: OWNER }, body: fd },
    );
    expect(res.status).toBe(400);
  });

  it('rejects oversize uploads with a Spanish 5MB error', async () => {
    const txId = await seedTransaction(OWNER);
    const fd = new FormData();
    fd.append('file', pdfFile(pdfBytes(6 * 1024 * 1024)));

    const res = await SELF.fetch(
      `http://example.com/api/transactions/${txId}/documents`,
      { method: 'POST', headers: { Authorization: OWNER }, body: fd },
    );
    expect(res.status).toBe(400);
    const body = (await res.json()) as { message?: string };
    expect(body.message ?? '').toContain('5MB');
  });

  it('streams the uploaded PDF back to its owner', async () => {
    const txId = await seedTransaction(OWNER);
    const bytes = pdfBytes(512);
    const fd = new FormData();
    fd.append('file', pdfFile(bytes));

    const upload = await SELF.fetch(
      `http://example.com/api/transactions/${txId}/documents`,
      { method: 'POST', headers: { Authorization: OWNER }, body: fd },
    );
    expect(upload.status).toBe(201);
    const { id: docId } = (await upload.json()) as { id: string };

    const get = await SELF.fetch(`http://example.com/api/documents/${docId}`, {
      headers: { Authorization: OWNER },
    });
    expect(get.status).toBe(200);
    expect(get.headers.get('Content-Type')).toBe('application/pdf');
    const got = new Uint8Array(await get.arrayBuffer());
    expect(got.length).toBe(bytes.length);
    expect(got[0]).toBe(0x25);
    expect(got[1]).toBe(0x50);
    expect(got[2]).toBe(0x44);
    expect(got[3]).toBe(0x46);
  });

  it('returns 404 when a different user tries to fetch the document', async () => {
    const txId = await seedTransaction(OWNER);
    const fd = new FormData();
    fd.append('file', pdfFile(pdfBytes(256)));

    const upload = await SELF.fetch(
      `http://example.com/api/transactions/${txId}/documents`,
      { method: 'POST', headers: { Authorization: OWNER }, body: fd },
    );
    expect(upload.status).toBe(201);
    const { id: docId } = (await upload.json()) as { id: string };

    const cross = await SELF.fetch(
      `http://example.com/api/documents/${docId}`,
      { headers: { Authorization: ATTACKER } },
    );
    expect(cross.status).toBe(404);
  });

  it('deletes a document for its owner and 404s on subsequent GETs', async () => {
    const txId = await seedTransaction(OWNER);
    const fd = new FormData();
    fd.append('file', pdfFile(pdfBytes(256)));

    const upload = await SELF.fetch(
      `http://example.com/api/transactions/${txId}/documents`,
      { method: 'POST', headers: { Authorization: OWNER }, body: fd },
    );
    expect(upload.status).toBe(201);
    const { id: docId } = (await upload.json()) as { id: string };

    const del = await SELF.fetch(`http://example.com/api/documents/${docId}`, {
      method: 'DELETE',
      headers: { Authorization: OWNER },
    });
    expect(del.status).toBe(204);

    const get = await SELF.fetch(`http://example.com/api/documents/${docId}`, {
      headers: { Authorization: OWNER },
    });
    expect(get.status).toBe(404);
  });
});
