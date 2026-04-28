// Stub for `node:fs/promises` used during the Workers/vitest pool runs.
// Mastra's bundled chunks import it lazily (for cache/storage paths). The pool
// runtime is workerd; even with `nodejs_compat`/`nodejs_compat_v2` flags, the
// pinned 2024-12-30 workerd build does not surface `node:fs/promises`. Aliasing
// the specifier to this file in vitest.config.ts keeps Mastra's import graph
// intact while neutralising the FS calls — none of the workflows we exercise
// in tests actually depend on the filesystem.
export const readFile = async () => '';
export const writeFile = async () => {};
export const mkdir = async () => {};
export const access = async () => {};
export const readdir = async () => [];
export const stat = async () => ({ isDirectory: () => false });
export const rm = async () => {};
export const unlink = async () => {};

export default {
  readFile,
  writeFile,
  mkdir,
  access,
  readdir,
  stat,
  rm,
  unlink,
};
