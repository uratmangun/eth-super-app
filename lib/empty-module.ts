function unavailable() {
  throw new Error("This Node.js API is unavailable in the browser bundle.");
}

const emptyModule = {
  access: unavailable,
  exec: unavailable,
  open: unavailable,
  spawn: unavailable,
  stat: unavailable,
  unlink: unavailable,
  writeFile: unavailable,
};

export const exec = unavailable;
export const access = unavailable;
export const open = unavailable;
export const spawn = unavailable;
export const stat = unavailable;
export const unlink = unavailable;
export const writeFile = unavailable;

export default emptyModule;
