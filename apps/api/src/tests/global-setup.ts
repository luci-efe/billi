// Vitest globalSetup. Runs once in the Node host (NOT inside the Workers
// pool) before any test file loads.
//
// Mastra's pre-built ESM chunks contain top-level imports for Node built-ins
// that the pinned vitest-pool-workers (0.5.41) workerd build (2024-12-30)
// does not expose: `fs/promises`, `os` (via @opentelemetry/resources), and
// `node:child_process`. Even with `nodejs_compat`/`nodejs_compat_v2`, those
// modules don't exist in workerd. The pool's own Vite plugin chain never
// sees those imports because the chunks are shipped to workerd as raw text —
// workerd itself triggers the fallback service, which can't recover.
//
// Workaround: rewrite the offending imports in-place on every Mastra dist
// file before tests start, redirecting them to in-tree no-op stubs and
// dropping the irrecoverable child_process import. None of the workflows we
// exercise in tests actually call into the filesystem, OS metadata, or
// child_process, so the stubs are safe. The patch is idempotent (a marker
// comment is added on first run and short-circuits subsequent runs); legacy
// markers from older patcher versions are detected and re-processed. The
// rewrite is reverted by `bun install --force`, so production installs are
// clean.
import { promises as fs } from 'node:fs';
import path from 'node:path';

const MARKER = '/* billi-test-patch-v3 */';
const LEGACY_MARKERS = ['/* billi-test-patch-v2 */'];

const FS_STUB_REL_PATH = './mocks/fs-promises.mjs';
const OS_STUB_REL_PATH = './mocks/node-os.mjs';

async function findFiles(dir: string, predicate: (name: string) => boolean): Promise<string[]> {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const results: string[] = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...(await findFiles(full, predicate)));
    } else if (predicate(entry.name)) {
      results.push(full);
    }
  }
  return results;
}

async function patchMastraChunk(
  filePath: string,
  fsStubPath: string,
  osStubPath: string,
): Promise<boolean> {
  let original = await fs.readFile(filePath, 'utf8');
  if (original.startsWith(`${MARKER}\n`)) return false;

  // Strip any legacy marker so we re-run the full pass with the current rules.
  for (const legacy of LEGACY_MARKERS) {
    if (original.startsWith(`${legacy}\n`)) {
      original = original.slice(legacy.length + 1);
    }
  }

  let patched = original;

  // Rewrite fs/promises imports (with or without `node:` prefix, default or
  // namespace style) to point at the stub.
  patched = patched.replace(
    /from\s+['"](?:node:)?fs\/promises['"]/g,
    `from ${JSON.stringify(fsStubPath)}`,
  );

  // Same dance for `os` and `node:os`. `@opentelemetry/resources`'s
  // OSDetectorSync (transitively bundled into Mastra's telemetry) imports
  // `os`; the pinned workerd build doesn't expose it. Also handle absolute
  // paths the previous patcher revision may have written (best-effort revert
  // for stale paths that no longer exist).
  patched = patched.replace(
    /from\s+['"](?:node:)?os['"]/g,
    `from ${JSON.stringify(osStubPath)}`,
  );

  // Drop top-level node:child_process imports outright. Mastra only
  // references `child_process` for CLI/dev paths we never hit in tests.
  patched = patched.replace(
    /^import[^;]*from\s+['"](?:node:)?child_process['"];?$/gm,
    '// removed by billi-test-patch (child_process)',
  );
  // Same for dynamic `await import('fs/promises'|'os')` forms.
  patched = patched.replace(
    /await\s+import\(\s*['"](?:node:)?fs\/promises['"]\s*\)/g,
    `await import(${JSON.stringify(fsStubPath)})`,
  );
  patched = patched.replace(
    /await\s+import\(\s*['"](?:node:)?os['"]\s*\)/g,
    `await import(${JSON.stringify(osStubPath)})`,
  );

  if (patched === original) {
    // Still tag with the new marker so future runs short-circuit.
    if (LEGACY_MARKERS.some((m) => original.startsWith(`${m}\n`)) === false) {
      return false;
    }
  }

  patched = `${MARKER}\n${patched}`;
  await fs.writeFile(filePath, patched, 'utf8');
  return true;
}

async function patchPackage(
  pkgRoot: string,
  fsStubPath: string,
  osStubPath: string,
): Promise<number> {
  let exists = true;
  try {
    await fs.access(pkgRoot);
  } catch {
    exists = false;
  }
  if (!exists) return 0;
  const files = await findFiles(pkgRoot, (n) => n.endsWith('.js') || n.endsWith('.mjs'));
  let count = 0;
  for (const file of files) {
    if (await patchMastraChunk(file, fsStubPath, osStubPath)) count += 1;
  }
  return count;
}

export default async function setup() {
  console.log('[billi-test-setup] starting');
  const here = path.dirname(new URL(import.meta.url).pathname);
  const fsStubPath = path.resolve(here, FS_STUB_REL_PATH);
  const osStubPath = path.resolve(here, OS_STUB_REL_PATH);
  // here = apps/api/src/tests → monorepo root is 4 levels up.
  const monorepoRoot = path.resolve(here, '../../../..');
  const bunCacheRoot = path.join(monorepoRoot, 'node_modules', '.bun');

  let entries: string[] = [];
  try {
    entries = await fs.readdir(bunCacheRoot);
  } catch {
    return;
  }

  const targets = entries.filter(
    (e) =>
      e.startsWith('@mastra+core@') ||
      e.startsWith('@mastra+libsql@') ||
      e.startsWith('@mastra+memory@'),
  );

  let total = 0;
  for (const dir of targets) {
    const distRoot = path.join(bunCacheRoot, dir, 'node_modules');
    total += await patchPackage(distRoot, fsStubPath, osStubPath);
  }
  if (total > 0) {
    console.log(`[billi-test-setup] patched ${total} mastra chunk(s)`);
  }
}
