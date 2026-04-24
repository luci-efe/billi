---
id: BIL-18
title: "ST-05-01: Exportación CSV del plan gratuito"
cycle: 1
epic: EP-05
milestone: MS-02
estimate: S (2 points)
priority: High
status: Todo
owner: Fernando
linear_url: https://linear.app/billi/issue/BIL-18
git_branch: eduardolalo1999/bil-18-st-05-01-exportacion-csv-del-plan-gratuito
blocked_by:
  - BIL-4
blocks: []
depends_on_adr:
  - AD-01
  - ADR-003
---

# BIL-18 — Exportación CSV del plan gratuito (spec slice)

## 1. Purpose

CSV export is two things at once: a user-visible feature ("puedo sacar mi historial cuando quiera") and a regulatory obligation (LFPDPPP Art. 22 portability/ARCO access). It is also cheap insurance against the vendor-lock-in concern Mexican professionals carry — "si me voy, ¿mis datos se vienen conmigo?". Getting this right in MVP — format, encoding, filename conventions — is what makes the feature feel professional instead of like a developer afterthought.

The slice is intentionally small (S=2) because the heavy lifting lives in BIL-4 (transactions schema) and BIL-2 (ownership). This slice adds one endpoint, one button, and the serialisation rules.

## 2. Scope boundaries

**In scope.**
- Hono endpoint `GET /api/transactions/export.csv` with filter query params.
- Streaming response body (no full buffering).
- RFC 4180 compliance + UTF-8 BOM for Excel-ES compatibility.
- UI button on `/transactions` route that triggers browser download.
- Ownership enforcement (same pattern as BIL-4).

**Out of scope.**
- Excel `.xlsx` format.
- PDF statements.
- Scheduled / emailed exports.
- Full-account export (profile + settings + transactions).
- Premium-tier features (multi-range, custom columns).

## 3. Acceptance criteria (expanded Gherkin)

- **AC-1.** Given an authenticated `GET /api/transactions/export.csv?from=1711929600&to=1714521599`, when the Worker handles it, then the response is `200` with `Content-Type: text/csv; charset=utf-8`, `Content-Disposition: attachment; filename="billi-transacciones-20260424-093015.csv"`, body starts with UTF-8 BOM (`EF BB BF`), then header row, then one row per matching transaction.
- **AC-2.** Given two users A and B, when user B calls the endpoint, then only user B's rows appear. Verified with an integration test that seeds both users.
- **AC-3.** Given `from` and `to` are both present, then the filter is inclusive on both ends (`occurred_at BETWEEN from AND to`).
- **AC-4.** Given a `note` contains `,`, `"`, `\r`, or `\n`, when serialised, then the field is wrapped in double quotes and any inner `"` is doubled to `""` per RFC 4180.
- **AC-5.** Given no authenticated session, when the endpoint is called, then response is `401` (Clerk middleware handles this before our handler runs).
- **AC-6.** Given the query would return more than 10,000 rows, when the Worker counts first, then response is `413` with JSON body `{ error: "too_many_rows", limit: 10000, hint: "narrow the date range" }` — and the body is NOT CSV (we switch `Content-Type` to `application/json` on error).
- **AC-7.** Given the query returns zero rows, then the body is BOM + header row only (no empty line shenanigans).
- **AC-8.** Given the `/transactions` page with current filters, when the user clicks "Exportar CSV", then the browser initiates a download with the filter state preserved in the URL. The button is disabled while a previous export is in-flight.

## 4. HTTP surface

| Method | Path | Query | Response |
|---|---|---|---|
| GET | `/api/transactions/export.csv` | `from?`, `to?`, `type?`, `category?` | `text/csv; charset=utf-8` (200) or JSON (4xx) |

Zod schema `exportQuerySchema` reuses the list filter shape from BIL-4 minus pagination.

## 5. Implementation shape (conceptual)

```ts
// worker/src/routes/transactions-export.ts
import { stream } from "hono/streaming";
const BOM = "﻿";
const HEADER = "id,fecha,tipo,monto,moneda,categoria,fuente,nota\r\n";

app.get("/api/transactions/export.csv", async (c) => {
  const ownerId = c.get("auth").userId;
  const filter = exportQuerySchema.parse(c.req.query());
  const count = await countTransactions(db, ownerId, filter);
  if (count > 10_000) return c.json({ error: "too_many_rows", limit: 10_000, hint: "narrow the date range" }, 413);

  const filename = `billi-transacciones-${utcFilenameTimestamp()}.csv`;
  c.header("Content-Type", "text/csv; charset=utf-8");
  c.header("Content-Disposition", `attachment; filename="${filename}"`);
  c.header("Cache-Control", "private, no-store");

  return stream(c, async (s) => {
    await s.write(BOM + HEADER);
    for await (const row of iterTransactions(db, ownerId, filter)) {
      await s.write(toCsvLine(row));
    }
  });
});
```

`iterTransactions` is an async generator over a Drizzle cursor — no full buffering.

## 6. CSV rules (authoritative)

- **Line endings.** `\r\n`.
- **Field separator.** `,`.
- **Encoding.** UTF-8 with BOM (`EF BB BF`). Excel-ES on Windows will open the file with correct accents (á, é, í, ó, ú, ñ) only if BOM is present; without it Excel assumes Windows-1252 and mojibake ensues.
- **Quoting rule.** A field is wrapped in `"..."` iff it contains `,`, `"`, `\r`, or `\n`. Inside a quoted field, `"` is doubled to `""`. Pure-ASCII alphanumeric fields are unquoted (reduces file size; RFC 4180 permits both).
- **Header row (Spanish for end user).** `id,fecha,tipo,monto,moneda,categoria,fuente,nota`.
- **Column rendering.**
  - `id` — ULID as-is.
  - `fecha` — ISO-8601 UTC date `YYYY-MM-DD` derived from `occurred_at`. Excel parses this as a date automatically.
  - `tipo` — localised: `ingreso` | `gasto`.
  - `monto` — `(amount_cents / 100).toFixed(2)` with `.` decimal separator (not MX comma; CSV interop trumps locale — see Open Questions).
  - `moneda` — ISO-4217 code (e.g. `MXN`).
  - `categoria` — raw string.
  - `fuente` — localised: `form→formulario`, `text→texto`, `voice→voz`, `image→imagen`, `chat→chat`.
  - `nota` — raw string, quoted per rules above.
- **Filename.** `billi-transacciones-YYYYMMDD-HHMMSS.csv` (UTC).

## 7. UI surface

Files:
- `apps/web/src/components/transactions/export-button.tsx` (new).
- `apps/web/src/routes/transactions.tsx` (modify — mount button in page toolbar).

The button reads current filter state from URL search params (`from`, `to`, `type`, `category`), constructs the download URL, and sets `window.location.assign(url)`. During an in-flight export the button shows a spinner and is `disabled`. On a `413` response the UI detects the JSON shape via `fetch` + `response.headers.get('content-type')` pre-flight, shows a Sonner toast with the hint, and does not trigger the download.

## 8. Test plan

Files under `worker/src/routes/__tests__/` and `apps/web/src/components/transactions/__tests__/`.

**Worker (Vitest + `@cloudflare/vitest-pool-workers`):**
1. `export.happy-path.test.ts` — AC-1 baseline; assert headers, BOM, header row, data row count.
2. `export.ownership.test.ts` — AC-2; two seeded users, each gets only their rows.
3. `export.time-filter.test.ts` — AC-3 inclusivity on both ends.
4. `export.quoting-comma.test.ts` — AC-4 note with `,` is quoted.
5. `export.quoting-quote.test.ts` — note with `"` becomes `""`.
6. `export.quoting-newline.test.ts` — note with `\n` is quoted and roundtrips.
7. `export.unauth.test.ts` — AC-5 returns 401.
8. `export.too-many-rows.test.ts` — AC-6 returns 413 JSON.
9. `export.empty-range.test.ts` — AC-7 body is BOM + header only (byte-exact).
10. `export.filename-timestamp.test.ts` — filename matches `/^billi-transacciones-\d{8}-\d{6}\.csv$/`.
11. `export.utf8-bom.test.ts` — first three bytes are `EF BB BF`.

**Frontend (Vitest + @testing-library/react):**
12. `export-button.render.test.tsx` — renders with label "Exportar CSV".
13. `export-button.url.test.tsx` — click triggers navigation with current filter state in URL.
14. `export-button.disabled.test.tsx` — disabled while previous export in flight.
15. `export-button.error-toast.test.tsx` — on mocked 413 response, toast is shown and download is NOT triggered.

## 9. Verify (PASS/FAIL)

- ☐ `bun test` passes for both worker and frontend test files.
- ☐ Manual: download opens cleanly in Excel-ES (Windows) with accents preserved — proves BOM works.
- ☐ Manual: download opens cleanly in LibreOffice Calc (Linux/Mac fallback).
- ☐ Manual: two dev Clerk accounts; exports are isolated per owner.
- ☐ 10k-row export completes in under 5 seconds on the dev environment.
- ☐ Response headers include `Cache-Control: private, no-store`.
- ☐ No PII in Worker logs (grep `wrangler tail` output during a test export).

## 10. Security checklist

- Query params do not carry PII (only filter values).
- No `Cache-Control: public` — exports are per-user.
- `413` response is JSON, not CSV (clients that blindly `<a download>` the URL will download an error "file" — we document this edge in the UI and use a pre-flight fetch).
- Ownership check at the SQL layer; no admin override.
- Filename does not include any user-controlled string (only UTC timestamp).

## 11. LFPDPPP note

Art. 22 (ARCO — access and portability): a machine-readable export in a widely-supported format satisfies the "access" right. Combined with BIL-4's DELETE endpoint, the user has full access + cancellation capabilities.

## 12. Open questions

1. **MX-locale comma for `monto`?** Current spec uses `.` for CSV interoperability. Proposed alternative: ship a second endpoint `/export-excel-es.csv` that uses `;` as field separator and `,` as decimal — Excel-ES auto-detects this dialect. Defer to post-MVP unless a user complains.
2. **Chat-sourced rows flag?** Should the CSV include a `verificado` column indicating whether the row was user-confirmed (source=form) vs. LLM-suggested-then-confirmed? Out of scope here; requires a new column on `transactions` — track as follow-up if needed.
3. **Sort order.** Current: `occurred_at ASC, id ASC` (chronological, natural for bank-statement reading). BIL-4 list uses DESC. Confirm this intentional difference with PM.
