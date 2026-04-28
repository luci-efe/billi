import { defineWorkersConfig } from '@cloudflare/vitest-pool-workers/config';
import path from 'path';

// Vitest config for the Worker. Pinned to @cloudflare/vitest-pool-workers
// ^0.5.41 (the last 2.x-compatible minor) because pool 0.14.x requires
// Vitest ^4 and a different plugin-style entry. Once we are ready to bump
// Vitest across the monorepo we can move to the 0.14.x line.
const fsPromisesStub = path.resolve(__dirname, './src/tests/mocks/fs-promises.ts');
const nodeFsStub = path.resolve(__dirname, './src/tests/mocks/node-fs.mjs');
const nodeOsStub = path.resolve(__dirname, './src/tests/mocks/node-os.ts');

export default defineWorkersConfig({
  define: {
    // Build-time-replaced flag. See src/types/runtime-flags.d.ts. Vitest sees
    // it as `true`; Wrangler's [define] sets it to `false` for production /
    // staging / local-dev bundles, so esbuild DCE removes the test branches
    // from the deployed Worker.
    __BILLI_TEST__: 'true',
  },
  plugins: [
    {
      // The pool's workerd build (2024-12-30) does not expose `fs/promises`,
      // `fs`, or `os`, and the pool relativises the specifier before handing
      // it to Vite — so a plain `resolve.alias` never fires. This plugin
      // intercepts the resolution earlier and rewrites any specifier that
      // looks like a request for those builtins (with or without the `node:`
      // prefix, with or without a leading `/`) to a local stub.
      name: 'billi-node-builtin-stub',
      enforce: 'pre' as const,
      resolveId(id: string) {
        if (id === 'fs/promises' || id === 'node:fs/promises') return fsPromisesStub;
        if (id === 'fs' || id === 'node:fs') return nodeFsStub;
        if (id === 'os' || id === 'node:os') return nodeOsStub;
        return null;
      },
    },
  ],
  ssr: {
    // Force Vite to re-bundle Mastra's dist chunks so the resolve.alias
    // entries below can rewrite their `fs/promises` / `node:fs/promises` /
    // `fs` / `os` imports to the local stubs. Without this, SSR-mode Vite
    // externalises node_modules and aliases never apply.
    noExternal: [/^@mastra\//],
  },
  resolve: {
    alias: [
      // Mastra's bundled chunks import `fs/promises`, bare `fs`, and `os`
      // (with and without the `node:` prefix) at module top level. The pool's
      // workerd build doesn't expose any of them with the current
      // nodejs_compat flags, so we redirect the specifiers to local no-op
      // stubs. None of the workflows we exercise in tests actually touch the
      // filesystem or read OS metadata.
      { find: 'fs/promises', replacement: fsPromisesStub },
      { find: 'node:fs/promises', replacement: fsPromisesStub },
      { find: 'fs', replacement: nodeFsStub },
      { find: 'node:fs', replacement: nodeFsStub },
      { find: 'os', replacement: nodeOsStub },
      { find: 'node:os', replacement: nodeOsStub },
      { find: '@', replacement: path.resolve(__dirname, './src') },
    ],
  },
  test: {
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
            BILLI_ENV: 'test',
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
