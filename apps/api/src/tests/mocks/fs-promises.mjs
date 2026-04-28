// Stub for `node:fs/promises` — copied by global-setup.ts into the bun cache
// next to Mastra's chunks. Edits to this file take effect on next test run.
export const readFile = async () => '';
export const writeFile = async () => {};
export const mkdir = async () => {};
export const access = async () => {};
export const readdir = async () => [];
export const stat = async () => ({ isDirectory: () => false });
export const rm = async () => {};
export const unlink = async () => {};
export const realpath = async (p) => p;
export const lstat = async () => ({ isDirectory: () => false, isFile: () => false, isSymbolicLink: () => false });

export default {
  readFile, writeFile, mkdir, access, readdir, stat, rm, unlink, realpath, lstat,
};
