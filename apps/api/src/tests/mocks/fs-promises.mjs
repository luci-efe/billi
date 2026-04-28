// JS stub for `fs/promises` injected into Mastra's pre-built chunks at test
// startup (see ../global-setup.ts). The Workers/vitest pool's pinned workerd
// (2024-12-30) does not expose `node:fs/promises`, so any chunk that imports
// it at the top level fails to load. We rewrite those imports to point here.
// The Mastra workflows we exercise in tests never reach the FS-using code
// paths, so a no-op surface is sufficient.
const noop = async () => undefined;
const noopStat = async () => ({ isDirectory: () => false, isFile: () => false });

export const access = noop;
export const mkdir = noop;
export const readFile = async () => '';
export const readdir = async () => [];
export const realpath = async (p) => p;
export const rm = noop;
export const stat = noopStat;
export const lstat = noopStat;
export const unlink = noop;
export const writeFile = noop;
export const appendFile = noop;
export const copyFile = noop;
export const rename = noop;
export const chmod = noop;
export const chown = noop;
export const utimes = noop;
export const open = noop;
export const truncate = noop;

export default {
  access,
  mkdir,
  readFile,
  readdir,
  realpath,
  rm,
  stat,
  lstat,
  unlink,
  writeFile,
  appendFile,
  copyFile,
  rename,
  chmod,
  chown,
  utimes,
  open,
  truncate,
};
