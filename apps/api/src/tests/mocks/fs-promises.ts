export const readFile = async () => '';
export const writeFile = async () => {};
export const mkdir = async () => {};
export const access = async () => {};
export const readdir = async () => [];
export const stat = async () => ({ isDirectory: () => false });
export default {
  readFile,
  writeFile,
  mkdir,
  access,
  readdir,
  stat,
};
