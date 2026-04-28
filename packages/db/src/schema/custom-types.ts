import { customType } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

// Drizzle custom column for libSQL/Turso `F32_BLOB(N)` storage.
//
// Read path: the driver hands back the raw little-endian Float32 BLOB as a
// `Buffer`, which we decode into `number[]`. This works on both Turso and
// local sqlite — the bytes are the same either way.
//
// Write path: we emit a SQL fragment `vector32('[...]')` so Turso casts the
// JSON to its native vector type. The local-sqlite fallback in
// `repos/rag.ts` bypasses this customType and writes the raw BLOB directly,
// because vanilla sqlite has no `vector32()` SQL function.
export const f32Blob = customType<{
  data: number[];
  config: { dimensions: number };
  configRequired: true;
  driverData: Buffer;
}>({
  dataType(config) {
    return `F32_BLOB(${config.dimensions})`;
  },
  fromDriver(value: unknown) {
    if (value instanceof Buffer) {
      return Array.from(new Float32Array(value.buffer, value.byteOffset, value.byteLength / 4));
    }
    if (value instanceof Uint8Array) {
      return Array.from(new Float32Array(value.buffer, value.byteOffset, value.byteLength / 4));
    }
    return [];
  },
  toDriver(value: number[]) {
    // Cast through `unknown` because drizzle's customType signature insists
    // toDriver returns the driverData type (Buffer); we actually return a
    // SQL fragment so the engine evaluates `vector32(...)` server-side.
    return sql`vector32(${JSON.stringify(value)})` as unknown as Buffer;
  },
});
