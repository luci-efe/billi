// JS stub for `node:os` (or bare `os`) injected into Mastra's pre-built
// chunks at test startup (see ../global-setup.ts). Mastra's telemetry layer
// pulls in @opentelemetry/resources whose platform detectors (OSDetectorSync,
// HostDetectorSync, ProcessDetectorSync) import `os`. The pinned vitest
// pool's workerd build (2024-12-30) does not expose `node:os`, so we
// redirect the import to this no-op surface.
//
// Strategy: declare every `os.*` Mastra/OpenTelemetry destructures at import
// time (named imports must exist as exports). For runtime `os.foo()` calls
// against the default export, fall back to a no-op via Proxy.
export const tmpdir = () => '/tmp';
export const homedir = () => '/';
export const hostname = () => 'localhost';
export const platform = () => 'linux';
export const arch = () => 'x64';
export const type = () => 'Linux';
export const release = () => '0.0.0';
export const version = () => '0.0.0';
export const cpus = () => [];
export const totalmem = () => 0;
export const freemem = () => 0;
export const uptime = () => 0;
export const loadavg = () => [0, 0, 0];
export const networkInterfaces = () => ({});
export const userInfo = () => ({
  username: 'worker',
  uid: 0,
  gid: 0,
  shell: null,
  homedir: '/',
});
export const machine = () => 'unknown';
export const endianness = () => 'LE';
export const EOL = '\n';
export const constants = {
  signals: {},
  errno: {},
  priority: {},
};

const namedExports = {
  tmpdir,
  homedir,
  hostname,
  platform,
  arch,
  type,
  release,
  version,
  cpus,
  totalmem,
  freemem,
  uptime,
  loadavg,
  networkInterfaces,
  userInfo,
  machine,
  endianness,
  EOL,
  constants,
};

const noop = () => undefined;

export default new Proxy(namedExports, {
  get(target, prop) {
    if (prop in target) return Reflect.get(target, prop);
    return noop;
  },
});
