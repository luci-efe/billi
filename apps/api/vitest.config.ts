import { defineWorkersConfig } from '@cloudflare/vitest-pool-workers/config';
import path from 'path';

// Vitest config for the Worker. Pinned to @cloudflare/vitest-pool-workers
// ^0.5.41 (the last 2.x-compatible minor) because pool 0.14.x requires
// Vitest ^4 and a different plugin-style entry. Once we are ready to bump
// Vitest across the monorepo we can move to the 0.14.x line.
const fsPromisesStub = path.resolve(__dirname, './src/tests/mocks/fs-promises.ts');
const nodeOsStub = path.resolve(__dirname, './src/tests/mocks/node-os.ts');

export default defineWorkersConfig({
  define: {
    'import.meta.env.MODE': '"test"',
  },
  plugins: [
    {
      // The pool's workerd build (2024-12-30) does not expose `fs/promises`
      // or `os`, and the pool relativises the specifier before handing it to
      // Vite — so a plain `resolve.alias` never fires. This plugin intercepts
      // the resolution earlier and rewrites any specifier that looks like a
      // request for `fs/promises` or `os` (with or without the `node:` prefix,
      // with or without a leading `/`) to the local stub.
      name: 'billi-node-builtin-stub',
      enforce: 'pre' as const,
      resolveId(id: string) {
        // Exact-match the bare and node:-prefixed specifiers. Some chunks emit
        // `import x from 'os'` (no prefix) and rely on the runtime to alias
        // it to `node:os`; we have to catch both shapes here because the pool
        // hands the literal specifier to this hook before any normalisation.
        if (id === 'fs/promises' || id === 'node:fs/promises') return fsPromisesStub;
        if (id === 'os' || id === 'node:os') return nodeOsStub;
        return null;
      },
    },
  ],
  ssr: {
    // Force Vite to re-bundle Mastra's dist chunks so the resolve.alias
    // entries below can rewrite their `fs/promises` / `node:fs/promises`
    // imports to the local stub. Without this, SSR-mode Vite externalises
    // node_modules and aliases never apply.
    noExternal: [/^@mastra\//],
  },
  resolve: {
    alias: [
      // Mastra's bundled chunks import `fs/promises` and `os` (with and
      // without the `node:` prefix) at module top level. The pool's workerd
      // build doesn't expose either with the current nodejs_compat flags, so
      // we redirect both specifiers to local no-op stubs. None of the
      // workflows we exercise in tests actually touch the filesystem or read
      // OS metadata.
      { find: 'fs/promises', replacement: fsPromisesStub },
      { find: 'node:fs/promises', replacement: fsPromisesStub },
      { find: 'os', replacement: nodeOsStub },
      { find: 'node:os', replacement: nodeOsStub },
      { find: '@', replacement: path.resolve(__dirname, './src') },
    ],
  },
  test: {
    globalSetup: ['./src/tests/global-setup.ts'],
    poolOptions: {
      workers: {
        wrangler: { configPath: './wrangler.toml' },
        miniflare: {
          // nodejs_compat enables node: builtin polyfills. v2 is required for
          // some of Mastra's lazy fs imports, but the pinned workerd build
          // still lacks `fs/promises` even with v2 — see resolve.alias above
          // for the workaround.
          compatibilityFlags: ['nodejs_compat', 'nodejs_compat_v2'],
          // Test-only env. Wrangler-binding values are merged on top, so
          // anything set here that is also in wrangler.toml is overridden by
          // the wrangler value. We only set what isn't there.
          bindings: {
            CLERK_SECRET_KEY: 'sk_test_dummy',
            // The Workers/vitest pool runs the libsql *web* client, which
            // cannot open `file:` URLs. Tests therefore swap to a D1-backed
            // drizzle session in the auth middleware (see src/index.ts) and
            // these values are kept just so Mastra's LibSQLStore constructor
            // does not explode at module init.
            TURSO_DATABASE_URL: 'http://localhost',
            TURSO_AUTH_TOKEN: '',
            OPENROUTER_API_KEY: 'test',
            BILLI_LLM_MODEL: 'openai/gpt-4o-mini',
            BILLI_VISION_MODEL: 'openai/gpt-4o-mini',
          },
          // R2 binding for documents.* tests. The miniflare in-memory R2
          // implementation supports put/get/delete natively.
          r2Buckets: ['DOCUMENTS_BUCKET'],
          // KV binding for the rate limiter. Without this binding the limiter
          // fails open, which is fine for tests but defeats the purpose of
          // any test that exercises 429s.
          kvNamespaces: ['AI_CHAT_RATE_LIMIT'],
          // D1 binding used by the test middleware as the actual durable
          // store for the integration tests. Miniflare gives every test file
          // a fresh in-memory D1 instance, which is exactly the isolation we
          // want.
          d1Databases: ['BILLI_DB'],
        },
      },
    },
  },
});
