import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { describe, expect, it } from "vitest";
import { createClient } from "@libsql/client";

const repoRoot = new URL("../../../../..", import.meta.url).pathname;

describe("checked-in migrations", () => {
  it("apply cleanly to a fresh database and keep rag_chunks topic-based", async () => {
    const dir = await mkdtemp(join(tmpdir(), "billi-db-migrate-"));
    const dbPath = join(dir, "fresh.db");

    const env: Record<string, string | undefined> = {
      ...process.env,
      TURSO_DATABASE_URL: `file:${dbPath}`,
    };
    delete env.TURSO_AUTH_TOKEN;
    try {
      const result = spawnSync(
        "bun",
        ["run", "--filter", "@billi/db", "migrate"],
        {
          cwd: repoRoot,
          env,
          encoding: "utf8",
        },
      );

      expect(result.stderr + result.stdout).not.toContain("document_id");
      expect(result.status, result.stderr + result.stdout).toBe(0);

      const client = createClient({ url: `file:${dbPath}` });
      const columns = await client.execute("PRAGMA table_info(rag_chunks)");
      const columnNames = columns.rows.map((row) => String(row.name));

      expect(columnNames).toContain("topic");
      expect(columnNames).not.toContain("document_id");

      await client.close();
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});
