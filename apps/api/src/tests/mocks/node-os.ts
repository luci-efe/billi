// Stub for `node:os` used during the Workers/vitest pool runs.
// Mastra's bundled chunks import `os` for things like tmpdir / cpus that we
// never exercise in tests. The pinned workerd build does not surface
// `node:os` even with `nodejs_compat`/`nodejs_compat_v2`, so we alias the
// specifier to this no-op shim.
export const tmpdir = (): string => '/tmp';
export const homedir = (): string => '/';
export const hostname = (): string => 'localhost';
export const platform = (): string => 'linux';
export const arch = (): string => 'x64';
export const type = (): string => 'Linux';
export const release = (): string => '0.0.0';
export const cpus = (): unknown[] => [];
export const totalmem = (): number => 0;
export const freemem = (): number => 0;
export const uptime = (): number => 0;
export const networkInterfaces = (): Record<string, unknown[]> => ({});
export const userInfo = (): { username: string; uid: number; gid: number; shell: string | null; homedir: string } => ({
  username: 'worker',
  uid: 0,
  gid: 0,
  shell: null,
  homedir: '/',
});
export const EOL = '\n';

export default {
  tmpdir,
  homedir,
  hostname,
  platform,
  arch,
  type,
  release,
  cpus,
  totalmem,
  freemem,
  uptime,
  networkInterfaces,
  userInfo,
  EOL,
};
