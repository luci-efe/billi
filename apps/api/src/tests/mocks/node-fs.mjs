// Comprehensive `fs` stub for the Workers/vitest pool. Workerd's bare `fs`
// polyfill (under nodejs_compat_v2) lacks many synchronous APIs Mastra's
// bundle pulls in; we never touch the filesystem in tests, so a no-op
// surface for every export is sufficient.
//
// Strategy: declare the exports Mastra's bundles destructure at import time
// (esbuild's `import { realpathSync, constants, existsSync } from 'fs'`
// requires those names to exist as module exports — a Proxy alone wouldn't
// satisfy named-import linking). For any access that goes through `fs.foo`
// at runtime, fall back to a no-op via the default export's Proxy.
const noop = () => undefined;
const noopAsync = () => Promise.resolve();
const noopRead = () => '';
const noopList = () => [];
const noopStat = () => ({
  isDirectory: () => false,
  isFile: () => false,
  isSymbolicLink: () => false,
  size: 0,
  mtime: new Date(0),
  mtimeMs: 0,
});

export const constants = {
  F_OK: 0,
  R_OK: 4,
  W_OK: 2,
  X_OK: 1,
  O_RDONLY: 0,
  O_WRONLY: 1,
  O_RDWR: 2,
  O_CREAT: 64,
  O_EXCL: 128,
  O_TRUNC: 512,
  O_APPEND: 1024,
  COPYFILE_EXCL: 1,
};

// Sync APIs Mastra's chunks pull in directly.
export const realpathSync = (p) => p;
export const existsSync = () => false;
export const readFileSync = noopRead;
export const writeFileSync = noop;
export const appendFileSync = noop;
export const mkdirSync = noop;
export const rmdirSync = noop;
export const rmSync = noop;
export const unlinkSync = noop;
export const renameSync = noop;
export const copyFileSync = noop;
export const statSync = noopStat;
export const lstatSync = noopStat;
export const readdirSync = noopList;
export const accessSync = noop;
export const chmodSync = noop;
export const chownSync = noop;
export const truncateSync = noop;
export const symlinkSync = noop;
export const readlinkSync = (p) => p;
export const openSync = () => 0;
export const closeSync = noop;
export const fsyncSync = noop;
export const utimesSync = noop;
export const watchFile = noop;
export const unwatchFile = noop;
export const watch = () => ({ close: noop, on: noop });

// Async (callback) APIs, kept for completeness.
export const readFile = noopAsync;
export const writeFile = noopAsync;
export const appendFile = noopAsync;
export const mkdir = noopAsync;
export const rmdir = noopAsync;
export const rm = noopAsync;
export const unlink = noopAsync;
export const rename = noopAsync;
export const copyFile = noopAsync;
export const stat = noopAsync;
export const lstat = noopAsync;
export const readdir = noopAsync;
export const access = noopAsync;
export const open = noopAsync;
export const close = noopAsync;
export const truncate = noopAsync;

export const promises = {
  readFile: async () => '',
  writeFile: noopAsync,
  appendFile: noopAsync,
  mkdir: noopAsync,
  rmdir: noopAsync,
  rm: noopAsync,
  unlink: noopAsync,
  rename: noopAsync,
  copyFile: noopAsync,
  stat: async () => noopStat(),
  lstat: async () => noopStat(),
  readdir: async () => [],
  access: noopAsync,
  open: noopAsync,
  truncate: noopAsync,
  realpath: async (p) => p,
};

export const createReadStream = () => ({ on: noop, pipe: noop, close: noop });
export const createWriteStream = () => ({ on: noop, write: noop, end: noop, close: noop });

// Default export: Proxy that returns a no-op for any unknown property access.
// Keeps us covered if Mastra adds a new fs.* call between releases.
const namedExports = {
  constants,
  realpathSync,
  existsSync,
  readFileSync,
  writeFileSync,
  appendFileSync,
  mkdirSync,
  rmdirSync,
  rmSync,
  unlinkSync,
  renameSync,
  copyFileSync,
  statSync,
  lstatSync,
  readdirSync,
  accessSync,
  chmodSync,
  chownSync,
  truncateSync,
  symlinkSync,
  readlinkSync,
  openSync,
  closeSync,
  fsyncSync,
  utimesSync,
  watchFile,
  unwatchFile,
  watch,
  readFile,
  writeFile,
  appendFile,
  mkdir,
  rmdir,
  rm,
  unlink,
  rename,
  copyFile,
  stat,
  lstat,
  readdir,
  access,
  open,
  close,
  truncate,
  promises,
  createReadStream,
  createWriteStream,
};

export default new Proxy(namedExports, {
  get(target, prop) {
    if (prop in target) return Reflect.get(target, prop);
    // Unknown property → return a no-op function. Any caller that does
    // `fs.weirdNewMethod(...)` gets `undefined`, mirroring how the named
    // exports work.
    return noop;
  },
});
