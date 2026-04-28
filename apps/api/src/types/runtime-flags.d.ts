// Build-time-defined boolean. Substituted via esbuild's `--define` mechanism by
// both Wrangler (`[define]` block in `wrangler.toml`) and Vitest (`define` in
// `vitest.config.ts`):
//
//   - vitest:   __BILLI_TEST__ = true
//   - wrangler: __BILLI_TEST__ = false   (production / staging / local dev)
//
// Because the substitution is literal text, esbuild dead-code-eliminates the
// branch that doesn't apply at build time. Production bundles do NOT contain
// any of the test-only auth-bypass / mock-DB / mock-key code paths.
//
// Read this constant directly (e.g. `if (__BILLI_TEST__) { … }`); do not assign
// it to a runtime variable that gets read later, or esbuild may keep both
// branches.
declare const __BILLI_TEST__: boolean;
