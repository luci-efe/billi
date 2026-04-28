#!/usr/bin/env node
// Pre-patch Mastra's pre-built chunks for the vitest-pool-workers test run.
// MUST run before vitest starts because the pool eagerly loads chunks before
// vitest's globalSetup hook fires — patching from globalSetup is too late on
// the first test file.
//
// Run via: `bun apps/api/scripts/patch-mastra.mjs` or as a `pretest` hook in
// apps/api/package.json. Idempotent (safe to re-run; skipped if already
// patched). Reverted by `bun install --force` or by wiping the bun cache.

import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const apiRoot = path.resolve(here, '..');
const monorepoRoot = path.resolve(apiRoot, '../..');
const bunCacheRoot = path.join(monorepoRoot, 'node_modules', '.bun');
const sourceStubsDir = path.join(apiRoot, 'src/tests/mocks');

const MARKER_PREFIX = '/* billi-test-patch-';
const MARKER = '/* billi-test-patch-v4 */';

const STUB_DIR_NAME = 'billi-stubs';
const FS_PROMISES_STUB = 'fs-promises.mjs';
const NODE_FS_STUB = 'node-fs.mjs';
const NODE_OS_STUB = 'node-os.mjs';

async function findFiles(dir, predicate) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const results = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === STUB_DIR_NAME) continue;
      results.push(...(await findFiles(full, predicate)));
    } else if (predicate(entry.name)) {
      results.push(full);
    }
  }
  return results;
}

function stripPriorMarker(source) {
  let s = source;
  while (s.startsWith(MARKER_PREFIX)) {
    const newlineAt = s.indexOf('\n');
    if (newlineAt === -1) break;
    s = s.slice(newlineAt + 1);
  }
  return s;
}

async function patchMastraChunk(filePath) {
  const original = await fs.readFile(filePath, 'utf8');
  if (original.startsWith(`${MARKER}\n`) && !original.startsWith(`${MARKER}\n${MARKER_PREFIX}`)) {
    return false;
  }
  const stripped = stripPriorMarker(original);

  let patched = stripped
    .replace(/from\s+['"](?:node:)?fs\/promises['"]/g, `from "./${STUB_DIR_NAME}/${FS_PROMISES_STUB}"`)
    .replace(/from\s+['"](?:node:)?fs['"]/g, `from "./${STUB_DIR_NAME}/${NODE_FS_STUB}"`)
    .replace(/from\s+['"](?:node:)?os['"]/g, `from "./${STUB_DIR_NAME}/${NODE_OS_STUB}"`);

  patched = patched
    .replace(/import\(\s*['"](?:node:)?fs\/promises['"]\s*\)/g, `import("./${STUB_DIR_NAME}/${FS_PROMISES_STUB}")`)
    .replace(/import\(\s*['"](?:node:)?fs['"]\s*\)/g, `import("./${STUB_DIR_NAME}/${NODE_FS_STUB}")`)
    .replace(/import\(\s*['"](?:node:)?os['"]\s*\)/g, `import("./${STUB_DIR_NAME}/${NODE_OS_STUB}")`);

  patched = patched.replace(
    /^import[^;]*from\s+['"](?:node:)?child_process['"];?$/gm,
    '// removed by billi-test-patch (child_process)',
  );

  if (patched === stripped && stripped === original) {
    return false;
  }

  patched = `${MARKER}\n${patched}`;
  await fs.writeFile(filePath, patched, 'utf8');
  return true;
}

async function ensureStubs(distRoot) {
  const targetDir = path.join(distRoot, STUB_DIR_NAME);
  await fs.mkdir(targetDir, { recursive: true });
  const stubs = [
    ['fs-promises.mjs', FS_PROMISES_STUB],
    ['node-fs.mjs', NODE_FS_STUB],
    ['node-os.mjs', NODE_OS_STUB],
  ];
  for (const [src, dst] of stubs) {
    const from = path.join(sourceStubsDir, src);
    const to = path.join(targetDir, dst);
    await fs.copyFile(from, to);
  }
}

async function patchPackage(pkgRoot) {
  let exists = true;
  try {
    await fs.access(pkgRoot);
  } catch {
    exists = false;
  }
  if (!exists) return 0;

  const distDirs = new Set();
  const files = await findFiles(pkgRoot, (n) => n.endsWith('.js') || n.endsWith('.mjs'));
  for (const file of files) {
    distDirs.add(path.dirname(file));
  }
  for (const dir of distDirs) {
    await ensureStubs(dir);
  }

  let count = 0;
  for (const file of files) {
    if (await patchMastraChunk(file)) count += 1;
  }
  return count;
}

async function main() {
  let entries;
  try {
    entries = await fs.readdir(bunCacheRoot);
  } catch {
    console.log('[patch-mastra] no bun cache to patch (skipping)');
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
    total += await patchPackage(distRoot);
  }
  if (total > 0) {
    console.log(`[patch-mastra] patched ${total} mastra chunk(s)`);
  } else {
    console.log('[patch-mastra] all chunks already patched');
  }
}

main().catch((err) => {
  console.error('[patch-mastra] fatal:', err);
  process.exit(1);
});
