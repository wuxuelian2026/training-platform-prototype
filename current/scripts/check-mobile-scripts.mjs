import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
let checked = 0;
function checkDirectory(directory, role) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const file = join(directory, entry.name);
    if (entry.isDirectory()) {
      checkDirectory(file, role);
      continue;
    }
    if (!file.endsWith('.html')) continue;
    const html = readFileSync(file, 'utf8');
    if (!html.includes('data-mobile-shell')) continue;
    const scripts = [...html.matchAll(/<script\b[^>]*src="([^"]+)"[^>]*>/g)]
      .map(match => resolve(dirname(file), match[1]));
    const shell = join(root, 'shared/js/mobile-shell.js');
    const business = join(root, `shared/js/${role}.js`);
    const other = join(root, `shared/js/${role === 'learner' ? 'teacher' : 'learner'}.js`);
    assert.equal(scripts.filter(script => script === shell).length, 1, `${file}: shell must load once`);
    assert.equal(scripts.filter(script => script === business).length, 1, `${file}: business must load once`);
    assert(!scripts.includes(other), `${file}: cross-role business script`);
    assert(scripts.indexOf(shell) < scripts.indexOf(business), `${file}: shell must run first`);
    assert(!/<script\b[^>]*(?:type="module"|\basync\b|\bdefer\b)/.test(html), `${file}: scripts must execute in order`);
    const loaded = new Set();
    for (const script of scripts) {
      const source = readFileSync(script, 'utf8');
      for (const [, dependency] of source.matchAll(/__classicRequire\("([^"]+)"\)/g)) {
        assert(loaded.has(join(root, dependency)), `${file}: ${dependency} must precede ${script}`);
      }
      loaded.add(script);
    }
    checked++;
  }
}
checkDirectory(join(root, 'learner'), 'learner');
checkDirectory(join(root, 'teacher'), 'teacher');
assert(checked > 0, 'No mobile pages checked');
console.log(`Mobile script checks passed: ${checked} pages`);
