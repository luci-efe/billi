// Ambient declaration so `import.meta.env.MODE` typechecks without depending on
// `vite/client`. Vitest (and any Vite-driven build) injects `import.meta.env`
// at compile time; in the production Worker bundle the `MODE === 'test'`
// branches are dead-code-eliminated.

interface ImportMetaEnv {
  readonly MODE: 'test' | 'development' | 'production' | string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
