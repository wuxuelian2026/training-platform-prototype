import { readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { defineConfig } from 'vite';

const currentDir = dirname(fileURLToPath(import.meta.url));

function collectHtmlEntries(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = join(directory, entry.name);

    if (entry.isDirectory()) {
      return collectHtmlEntries(entryPath);
    }

    return entry.isFile() && entry.name.endsWith('.html') ? [entryPath] : [];
  });
}

const multiPageInputs = [
  join(currentDir, 'index.html'),
  join(currentDir, '培训后台.html'),
  join(currentDir, 'login.html'),
  ...['admin', 'teacher', 'learner', 'visualization'].flatMap((app) => collectHtmlEntries(join(currentDir, app)))
];

export default defineConfig({
  base: './',
  server: {
    port: 4173,
    strictPort: false
  },
  preview: {
    port: 4174,
    strictPort: false
  },
  build: {
    rollupOptions: {
      input: multiPageInputs
    }
  }
});
