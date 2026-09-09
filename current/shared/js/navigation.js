import { relativePath } from './paths.js';

export function go(path) {
  window.location.assign(relativePath(path));
}
