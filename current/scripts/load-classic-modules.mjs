import { readFileSync, readdirSync } from 'node:fs';
import { dirname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const files = new Map();
const loaded = new Set();

function walk(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const file = resolve(dir, entry.name);
    if (entry.isDirectory()) walk(file);
    else if (entry.name.endsWith('.js')) files.set(relative(root, file).split('\\').join('/'), file);
  }
}

walk(resolve(root, 'shared/js'));
walk(resolve(root, 'spec'));

function dependenciesOf(source) {
  return [...source.matchAll(/__classicRequire\("([^"]+)"\)/g)].map((match) => match[1]);
}

function load(id, visiting = new Set()) {
  if (loaded.has(id)) return;
  if (visiting.has(id)) throw new Error(`Classic module dependency cycle: ${[...visiting, id].join(' -> ')}`);
  const file = files.get(id);
  if (!file) throw new Error(`Classic module not found: ${id}`);
  const source = readFileSync(file, 'utf8');
  visiting.add(id);
  for (const dependency of dependenciesOf(source)) load(dependency, visiting);
  visiting.delete(id);
  vm.runInThisContext(source, { filename: file });
  loaded.add(id);
}

export async function loadClassicModule(id) {
  load(id);
  return globalThis.__hbyxClassicModules?.[id] || {};
}
