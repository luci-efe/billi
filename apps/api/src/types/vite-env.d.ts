// Re-exported from runtime-flags.d.ts. The global `__BILLI_TEST__` boolean is
// substituted at build time by esbuild/Wrangler/Vitest. See runtime-flags.d.ts.
//
// (This file used to declare `import.meta.env.MODE`, which Wrangler does NOT
// auto-replace at deploy time — leading to a production runtime TypeError on
// every /api/* request. Replaced with the build-time-defined boolean above.)
export {};
