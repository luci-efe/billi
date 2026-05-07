#!/usr/bin/env bun
/**
 * Non-headless RAG validation against the local dev stack.
 *
 * Usage:
 *   bun tests/browser/rag-validation.mjs
 *
 * Requires:
 *   - API on http://127.0.0.1:8787 (`bun run --filter @billi/api dev`)
 *   - Web on http://localhost:5173   (`bun run --filter @billi/web dev`)
 *   - Turso `rag_chunks` populated by `bun apps/api/src/scripts/rag/ingest.ts --dir content/rag/es`
 *
 * Behavior:
 *   - Launches Chromium headed (visible window).
 *   - Reuses a saved Clerk session from tests/browser/.auth.json if present.
 *   - Otherwise pauses for the operator to sign in via Clerk in the visible window,
 *     then persists the session for next runs.
 *   - Drives the chat UI with 6 educational questions from the new corpus,
 *     captures answers + `Fuentes:` chips, and writes a JSON report.
 */
import { chromium } from 'playwright';
import { readFile, writeFile, mkdir, access } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const AUTH_STATE = join(__dirname, '.auth.json');
const REPORT = join(__dirname, 'rag-validation-report.json');
const APP_URL = process.env.BILLI_WEB_URL ?? 'http://localhost:5173';
const SLOWMO = Number(process.env.PW_SLOWMO ?? 250);

const QUESTIONS = [
  '¿Cómo leo mi recibo de nómina y qué es el aguinaldo en México?',
  '¿Cómo declaro ingresos por Uber o Rappi ante el SAT?',
  '¿Cómo elijo entre Infonavit, Fovissste y un crédito hipotecario bancario?',
  '¿Qué es el CAT en una tarjeta de crédito?',
  '¿Cómo invierto en CETES con Cetes Directo?',
  '¿Cómo construyo historial crediticio sano en México?',
];

const FALLBACK = 'No encontré información específica en mi base de conocimientos';

async function exists(p) {
  try { await access(p); return true; } catch { return false; }
}

async function main() {
  const hasAuth = await exists(AUTH_STATE);
  console.log(`[run] APP_URL=${APP_URL}  reusingAuth=${hasAuth}`);

  const browser = await chromium.launch({
    headless: false,
    slowMo: SLOWMO,
    args: ['--start-maximized'],
  });

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    storageState: hasAuth ? AUTH_STATE : undefined,
  });
  const page = await context.newPage();

  await page.goto(APP_URL, { waitUntil: 'domcontentloaded' });

  // Wait until the protected app shell is visible. The chat heading "Chat Billi"
  // only renders when a Clerk session exists and consent is accepted.
  console.log('[run] waiting for signed-in app shell (sign in manually if needed)…');
  await page.waitForLoadState('networkidle').catch(() => {});

  // If the landing page is up, click the sign-in CTA to surface Clerk.
  const signInCta = page.getByRole('button', { name: /iniciar sesi/i }).first();
  if (await signInCta.isVisible().catch(() => false)) {
    console.log('[run] landing detected – click "Iniciar sesión" then complete sign in');
  }

  // The operator finishes the Clerk flow in the visible window. Do NOT
  // re-navigate while they sign in — that interrupts the Clerk widget.
  // Instead, watch the URL: once it stops being the landing page and the
  // app shell is visible, we know auth + consent succeeded.
  console.log('[run] sign in via Clerk in the visible browser window. Waiting…');
  const deadline = Date.now() + 15 * 60_000;
  let signedIn = false;
  while (Date.now() < deadline) {
    const url = page.url();
    const onChat = /\/chat(\?|$|\/)/.test(url);
    if (onChat) {
      const heading = page.getByRole('heading', { name: /chat billi/i }).first();
      if (await heading.isVisible({ timeout: 1500 }).catch(() => false)) {
        signedIn = true;
        break;
      }
    } else {
      // Detect the post-auth shell on any in-app route by probing the sidebar nav.
      const navChat = page.getByRole('link', { name: /chat/i }).first();
      if (await navChat.isVisible({ timeout: 800 }).catch(() => false)) {
        await navChat.click().catch(() => {});
        await page.waitForLoadState('domcontentloaded').catch(() => {});
        const heading = page.getByRole('heading', { name: /chat billi/i }).first();
        if (await heading.isVisible({ timeout: 4000 }).catch(() => false)) {
          signedIn = true;
          break;
        }
      }
    }
    await page.waitForTimeout(2000).catch(() => {});
  }

  if (!signedIn) {
    throw new Error('Timed out waiting for sign-in (15 min)');
  }

  await context.storageState({ path: AUTH_STATE });
  console.log(`[run] auth state saved → ${AUTH_STATE}`);

  const composer = page.getByPlaceholder(/escribe|pregunta|mensaje/i).first();
  // Fall back to the textarea/input near the Send button if the placeholder differs.
  const inputLocator = (await composer.count()) > 0
    ? composer
    : page.locator('input[type="text"], textarea').last();

  const results = [];

  for (const q of QUESTIONS) {
    console.log(`\n[run] asking: ${q}`);
    await inputLocator.fill(q);
    await page.keyboard.press('Enter');

    // Wait for the new assistant bubble to render. The UI shows "Billi está procesando..."
    // while the request is in flight; wait for that to disappear.
    await page.waitForTimeout(800);
    const processing = page.getByText(/Billi está procesando/i).first();
    await processing.waitFor({ state: 'hidden', timeout: 60_000 }).catch(() => {});

    // The latest assistant bubble is the last `.bg-muted.text-foreground` block.
    // Use a robust selector: the latest <p> inside an assistant message.
    const assistantBubbles = page.locator('div.bg-muted >> p.leading-relaxed');
    const lastIndex = (await assistantBubbles.count()) - 1;
    const text = lastIndex >= 0 ? (await assistantBubbles.nth(lastIndex).innerText()) : '';

    // Find the Fuentes chip row that follows the latest bubble (if any).
    const fuentesRows = page.locator('div.bg-muted', { has: page.locator('text=Fuentes:') });
    const lastFuentes = (await fuentesRows.count()) - 1;
    let sources = [];
    if (lastFuentes >= 0) {
      const chips = fuentesRows.nth(lastFuentes).locator('span').filter({ hasNot: page.locator('text=Fuentes:') });
      const labels = await chips.allInnerTexts();
      sources = labels
        .map((s) => s.trim())
        .filter((s) => s && !/^Fuentes:?$/i.test(s) && !/^Billi/.test(s) && !/^\d{1,2}:\d{2}/.test(s));
    }

    const grounded = !!text && !text.includes(FALLBACK) && sources.length > 0;
    results.push({ question: q, grounded, sources, snippet: text.slice(0, 280) });
    console.log(`  grounded=${grounded} sources=${JSON.stringify(sources)}`);
    await page.waitForTimeout(600);
  }

  await mkdir(dirname(REPORT), { recursive: true });
  await writeFile(
    REPORT,
    JSON.stringify(
      {
        ranAt: new Date().toISOString(),
        appUrl: APP_URL,
        passCount: results.filter((r) => r.grounded).length,
        total: results.length,
        results,
      },
      null,
      2,
    ),
  );
  console.log(`\n[run] report → ${REPORT}`);

  // Hold the browser open for 8s so the operator can eyeball the final state.
  await page.waitForTimeout(8000);
  await browser.close();

  const passed = results.filter((r) => r.grounded).length;
  console.log(`\n[run] PASS ${passed}/${results.length}`);
  process.exit(passed === results.length ? 0 : 1);
}

main().catch((err) => {
  console.error('[run] fatal:', err);
  process.exit(2);
});
