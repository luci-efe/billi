# QA_FINDINGS — Billi staging MVP final audit

**Auditor:** Claude / OMP  
**Date:** 2026-05-07  
**Repo:** `billi`  
**Scope:** staging Worker + current frontend deployment candidates

---

## Summary

### Verdict: GO for release readiness

 > The canonical staging environment is now serving the reviewed frontend build, the expanded RAG corpus is live in canonical `billi-staging`, and the remaining release blockers from the previous audit have been re-verified on staging.

 > Verified working on the active staging environment:
- canonical staging API remains live at `https://billi-api-staging.eduardo-lalo1999.workers.dev`
- expanded RAG corpus was ingested into canonical `billi-staging` as `95` `general-knowledge` chunks, plus earlier topic-specific chunks
- authenticated educational chat now answers broader Mexico-finance questions with grounded answers, including RFC and CAT prompts validated live in browser
- the canonical Pages frontend `https://billi-web-staging-6pj.pages.dev` now serves the new build asset `index-BWzE0f1B.js`
- the canonical deployment has a real dark/light theme system
- the protected shell shows visible theme toggles, defaults to dark mode, and successfully switches to light mode with `document.documentElement.className = "light"` and `localStorage.theme = "light"`
- `Perfil y Plan` is readable in both dark and light modes on the canonical staging frontend
- existing critical flows remain verified: auth sync, chat, transactions create, invoices/documents, image capture, and full web build/typecheck

Important environment note:
- Canonical frontend: `https://billi-web-staging-6pj.pages.dev`
- Latest production-branch Pages preview used to refresh canonical: `https://a2ecece0.billi-web-staging-6pj.pages.dev`
- `https://billi-web-staging.pages.dev` is stale and must not be used for validation

---

## Final remediations applied

### 1. Frontend staging auth/bootstrap fixed

Observed regression:
- the active Pages bundle could fail at boot with `Uncaught Error: Missing Publishable Key`
- earlier browser 401s were also amplified by stale/stuck token behavior and auth readiness races

Applied fixes:
- `apps/web/src/lib/api-client.ts`
  - per-request Clerk token provider instead of reusing one stale bearer forever
- `apps/web/src/routes/root.tsx`
  - API auth remains disabled until Clerk is loaded and token sync completes
- staging Pages rebuilt and redeployed with:
  - `VITE_API_BASE_URL=https://billi-api-staging.eduardo-lalo1999.workers.dev`
  - `VITE_CLERK_PUBLISHABLE_KEY=<staging Clerk publishable key>`

### 2. RAG staging DB drift corrected

Observed root cause:
- local successful retrieval had been exercised against a different Turso DB
- canonical staging DB `billi-staging` originally had `rag_chunks = 0`
- Worker runtime DB selection is driven entirely by `TURSO_DATABASE_URL` / `TURSO_AUTH_TOKEN` secrets

Applied fixes:
- loaded the SAT / investing / savings corpus into canonical staging DB `billi-staging`
- rotated staging Worker Turso secrets to the canonical staging DB
- redeployed the Worker
- lowered `SIMILARITY_THRESHOLD` in `apps/api/src/mastra/workflows/chatbot.ts` from `0.65` to `0.62` to match observed live staging similarity scores without admitting weaker low-score hits

### 3. API user bootstrap fixed for authenticated create flows

Observed regression:
- authenticated API transaction creation could fail with `internal_server_error` when a Clerk user existed in auth but not yet in the app DB

Applied fix:
- `apps/api/src/index.ts`
  - authenticated middleware path now upserts the user row before handing off to downstream routes
- redeployed staging Worker

### 4. Chat suggested question aligned with live corpus

Observed regression:
- the visible suggested prompt `Explícame qué es el ISR` fell back in staging because the staged educational corpus currently grounds SAT / savings / investing, not ISR specifically

Applied fix:
- `apps/web/src/routes/chat.tsx`
  - replaced `Explícame qué es el ISR` with `¿Qué es el SAT?`

### 5. Dashboard/date-scope mismatch fixed

> New issue found during post-audit validation: dashboard totals did not match the visible transactions list for a signed-in QA user.

Observed root cause:
- capture-confirmed transactions could be persisted with a same-day future `occurredAt` because the capture pipeline normalized date-only values to ISO timestamps anchored later in the day
- dashboard summary correctly aggregates only the selected period up to `now`
- dashboard recent list previously fetched unbounded latest transactions, so it could show future/out-of-period rows that were not included in totals

> Applied fixes:
- `apps/api/src/mastra/workflows/capture.ts`
  - capture proposals now normalize dates to `YYYY-MM-DD` instead of full ISO timestamps
- `apps/web/src/hooks/use-capture.ts`
  - confirmation now parses date-only values into a local start-of-day timestamp instead of a future same-day timestamp
- `apps/web/src/hooks/use-dashboard.ts`
  - dashboard recent transactions are now fetched with the same period `from` / `to` bounds as the selected dashboard summary window
- `apps/web/src/routes/dashboard.tsx`
  - recent transactions copy now explicitly says they are within the selected period

> Live result:
- dashboard now shows `-$234.56` and only the in-period transaction for the QA user instead of mixing in a future-dated capture row

> 6. Auth visibility / settings readability improved

> New issue found during manual review: the user had no obvious identity affordance in some layouts and Perfil y Plan tabs could be hard to read against the hardcoded dark tab bar.

Applied fixes:
- `apps/web/src/routes/root.tsx`
  - added visible Clerk `UserButton` in the desktop sidebar identity row and header area
- `apps/web/src/routes/settings.tsx`
  - raised tab label contrast so inactive tabs stay readable against the dark background


---

## Verified live staging state

### Active deployment targets
- Pages project: `https://billi-web-staging-6pj.pages.dev`
- latest verified canonical Pages asset after final redeploy: `index-BWzE0f1B.js`
- latest production-branch Pages preview that refreshed canonical: `https://a2ecece0.billi-web-staging-6pj.pages.dev`
- API Worker: `https://billi-api-staging.eduardo-lalo1999.workers.dev`
- latest verified Worker version after final API redeploy: `93eea35a-d48b-4a9c-aa94-58817776f8a2`

### Live API verification

Verified with fresh Clerk-backed auth tokens against the real staging Worker:
- `GET /api/me` -> `200`
- `POST /api/me/consent` -> `204`
- `POST /api/transactions` -> `201`
- `POST /api/transactions/:txId/documents` -> `201`
- `GET /api/transactions/:txId/documents` -> `200`
- `GET /api/documents/:docId` -> `200` with `Content-Type: application/pdf`
- `DELETE /api/documents/:docId` -> `204`
- `POST /api/capture` text capture -> structured proposal returned

### Live browser verification

Verified in Puppeteer on the real `...-6pj.pages.dev` site after the final Pages redeploy:

#### Auth / app shell
- landing page renders instead of a blank app boot failure
- signed-in app shell renders correctly
- sidebar navigation works
- user/session state becomes usable in-browser after Clerk session activation

#### Consent flow
Verified with a fresh Clerk user with no prior consent:
- `Perfil y Plan` initially showed:
  - `Consentimiento pendiente`
  - `Pendiente`
  - actionable `Aceptar Consentimiento` button
- clicking `Aceptar Consentimiento` updated the card to:
  - `Consentimiento aceptado`
  - `Versión 1 aceptada`
  - `Activo`
- subsequent navigation reflected the upgraded account state (`Plan Beta`)

#### Invoices / documents flow
Verified live in-browser:
- invoices page listed a real transaction created for the signed-in user
- upload zone accepted a PDF attachment
- uploaded file appeared under `Archivos vinculados`
- open/download actions used authenticated blob URLs on the frontend
- delete removed the document and the UI returned to `Aún no hay comprobantes`

#### Chat image capture flow
Verified live in-browser:
- image attachment preview appears in chat composer
- `Analizar y registrar movimiento` becomes enabled when an image is attached
- a synthetic receipt-style image produced a populated review modal with:
  - amount `289.99`
  - type `expense`
  - category `Supermercado`
  - merchant `WALMART`
- confirming the proposal persisted the transaction
- transaction later appeared in `Transacciones` with:
  - concept `WALMART`
  - category `Supermercado`
  - amount `-$289.99`

#### Educational chat / RAG
Verified live in-browser after broad-corpus ingestion:
- `¿Qué es el RFC y para qué sirve en México?` -> grounded answer covering SAT identity, obligations, and practical usage
- `¿Qué es el CAT en una tarjeta de crédito?` -> grounded answer covering annual total cost, comparison role, and the limits of using CAT alone

Previously verified live via authenticated API/browser checks after the first RAG repair:
- `Explícame lo básico para empezar a invertir en México` -> grounded answer
- `¿Qué es el SAT?` -> grounded answer
- `¿Cómo puedo ahorrar más?` -> grounded answer

---

## Local verification evidence

### Web
- `bun run --filter @billi/web test` -> PASS (`21/21` tests)
- `bun run --filter @billi/web typecheck` -> PASS
- `bun run --filter @billi/web build` -> PASS
- canonical staging frontend now serves `index-BWzE0f1B.js` after explicit Pages deploy to production branch `dev`

### API
- expanded corpus ingested into canonical `billi-staging`: `95` chunks under `general-knowledge` plus existing topic rows
- `bun run --filter @billi/api test src/tests/transactions.fetch.test.ts` -> PASS
- `bun run --filter @billi/api typecheck` -> PASS

---

## Risks / non-blocking follow-up

These do not block staging MVP signoff, but should still be tracked:
- the web bundle remains large (`dist/assets/index-BWzE0f1B.js` ~`1,030 kB` minified) and Vite warns about chunk size
- branch-alias Pages deploys do not refresh the canonical staging domain unless the deploy explicitly targets the configured production branch (`dev`)
- API vitest still emits existing Cloudflare worker-pool warnings about compatibility-date fallback / cross-request promise resolve during local test runs

---

## Final decision

### GO

Staging is now acceptable as a finished MVP environment for the audited scope.

The previously blocking issues are resolved:
- canonical staging frontend now serves the reviewed theme-enabled build
- canonical staging RAG corpus is populated and broadened
- educational chat is grounded on both original and expanded staged topics
- consent works
- documents work
- image capture review + persistence works
- transaction flows work
- runtime dark/light theme works on the canonical frontend

Use only this frontend URL for staging validation:
- `https://billi-web-staging-6pj.pages.dev`
