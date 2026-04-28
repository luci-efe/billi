import { customType } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

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
      return Array.from(new Float32Array(value.buffer));
    }
    return [];
  },
  toDriver(value: number[]) {
    // We use a raw SQL cast to vector32 for insertion
    return sql`vector32(${JSON.stringify(value)})` as any;
  },
});
