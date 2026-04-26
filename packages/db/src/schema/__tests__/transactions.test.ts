import { describe, it, expect } from "vitest";
import { transactions } from "../transactions";
import { getTableConfig } from "drizzle-orm/sqlite-core";

describe("Transactions Schema", () => {
  it("should have the correct table name", () => {
    const config = getTableConfig(transactions);
    expect(config.name).toBe("transactions");
  });

  it("should have all required columns with correct types", () => {
    const config = getTableConfig(transactions);
    const columns = config.columns;

    expect(columns.find(c => c.name === "id")).toBeDefined();
    expect(columns.find(c => c.name === "owner_id")).toBeDefined();
    expect(columns.find(c => c.name === "type")).toBeDefined();
    expect(columns.find(c => c.name === "amount_cents")).toBeDefined();
    expect(columns.find(c => c.name === "currency")).toBeDefined();
    expect(columns.find(c => c.name === "category")).toBeDefined();
    expect(columns.find(c => c.name === "occurred_at")).toBeDefined();
    expect(columns.find(c => c.name === "source")).toBeDefined();
    expect(columns.find(c => c.name === "source_ref")).toBeDefined();
    expect(columns.find(c => c.name === "note")).toBeDefined();
    expect(columns.find(c => c.name === "created_at")).toBeDefined();
    expect(columns.find(c => c.name === "updated_at")).toBeDefined();
  });

  it("should define the expected indexes", () => {
    const config = getTableConfig(transactions);
    const indexes = config.indexes;

    const indexNames = indexes.map(idx => idx.config.name);
    expect(indexNames).toContain("tx_owner_time_idx");
    expect(indexNames).toContain("tx_owner_cat_idx");
    expect(indexNames).toContain("tx_owner_type_idx");
  });

  it("should define the expected check constraints", () => {
    const config = getTableConfig(transactions);
    const checks = config.checks;

    const checkNames = checks.map(c => c.name);
    expect(checkNames).toContain("transactions_type_chk");
    expect(checkNames).toContain("transactions_amount_chk");
    expect(checkNames).toContain("transactions_cat_len_chk");
    expect(checkNames).toContain("transactions_source_chk");
    expect(checkNames).toContain("transactions_note_len_chk");
  });
});
