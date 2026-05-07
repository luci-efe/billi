import { describe, it, expect } from 'vitest';
import { readdir, readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Resolve the corpus directory relative to this test file. The test runs from
// the repo root (e.g. `bunx vitest run tests/rag-corpus-coverage.test.ts`),
// but anchoring on __dirname keeps it correct regardless of cwd.
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const CORPUS_DIR = path.resolve(__dirname, '../content/rag/es');

const REQUIRED_FILES = [
  'isr-para-personas.md',
  'rfc-personas-fisicas.md',
  'cfdi-facturacion-basics.md',
  'nomina-aguinaldo-y-ptu.md',
  'declaracion-anual-paso-a-paso.md',
  'plataformas-digitales-uber-rappi-didi.md',
  'creditos-hipotecarios-infonavit-fovissste-banca.md',
  'iva-personas-fisicas.md',
  'comparativa-afores-y-comisiones.md',
  'finanzas-para-freelancers-mx.md',
];

const MIN_FILE_COUNT = 28;
const MIN_BYTES = 600;
const STUB_PREFIX = 'sample-';
const YEAR_REGEX = /\b(202[3-9])\b/;

describe('RAG corpus coverage (post T-Corpus)', () => {
  it('has at least the minimum number of corpus files', async () => {
    const entries = await readdir(CORPUS_DIR);
    const docs = entries.filter((f) => f.endsWith('.md') || f.endsWith('.txt'));
    expect(docs.length).toBeGreaterThanOrEqual(MIN_FILE_COUNT);
  });

  it('contains every curated topic file', async () => {
    const entries = new Set(await readdir(CORPUS_DIR));
    for (const required of REQUIRED_FILES) {
      expect(entries.has(required), `missing required corpus file: ${required}`).toBe(true);
    }
  });

  it('every non-stub file is at least 600 bytes', async () => {
    const entries = await readdir(CORPUS_DIR);
    const docs = entries.filter(
      (f) => (f.endsWith('.md') || f.endsWith('.txt')) && !f.startsWith(STUB_PREFIX),
    );
    expect(docs.length).toBeGreaterThan(0);
    for (const file of docs) {
      const s = await stat(path.join(CORPUS_DIR, file));
      expect(s.size, `${file} is too small (${s.size} bytes)`).toBeGreaterThanOrEqual(MIN_BYTES);
    }
  });

  it('no file hardcodes a 2023-2029 year (rules change yearly)', async () => {
    const entries = await readdir(CORPUS_DIR);
    const docs = entries.filter((f) => f.endsWith('.md') || f.endsWith('.txt'));
    const offenders: Array<{ file: string; match: string }> = [];
    for (const file of docs) {
      const content = await readFile(path.join(CORPUS_DIR, file), 'utf8');
      const m = content.match(YEAR_REGEX);
      if (m) offenders.push({ file, match: m[0] });
    }
    expect(
      offenders,
      `files with hardcoded years: ${offenders.map((o) => `${o.file}:${o.match}`).join(', ')}`,
    ).toEqual([]);
  });

  it('every file starts with an H1 heading on line 1', async () => {
    const entries = await readdir(CORPUS_DIR);
    const docs = entries.filter((f) => f.endsWith('.md') || f.endsWith('.txt'));
    for (const file of docs) {
      const content = await readFile(path.join(CORPUS_DIR, file), 'utf8');
      const firstLine = content.split('\n', 1)[0] ?? '';
      expect(firstLine.startsWith('# '), `${file} does not start with '# ' H1`).toBe(true);
    }
  });
});
