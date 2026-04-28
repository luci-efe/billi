// Stub for `node:os` — copied by global-setup.ts into the bun cache next to
// Mastra's chunks. Mastra's tracing/diagnostics code reads tmpdir/cpus/etc.;
// none of the test paths exercise them.
export const tmpdir = () => '/tmp';
export const homedir = () => '/home';
export const platform = () => 'linux';
export const arch = () => 'x64';
export const release = () => '0.0.0';
export const type = () => 'Linux';
export const version = () => '#0';
export const cpus = () => [];
export const totalmem = () => 0;
export const freemem = () => 0;
export const networkInterfaces = () => ({});
export const hostname = () => 'workerd';
export const userInfo = () => ({ username: 'workerd', uid: 0, gid: 0, shell: null, homedir: '/home' });
export const EOL = '\n';
export const constants = { signals: {}, errno: {} };
export const endianness = () => 'LE';
export const loadavg = () => [0, 0, 0];
export const uptime = () => 0;

export default {
  tmpdir, homedir, platform, arch, release, type, version, cpus, totalmem,
  freemem, networkInterfaces, hostname, userInfo, EOL, constants, endianness,
  loadavg, uptime,
};
