// O service worker precisa listar todo arquivo do app, senão ele não abre offline.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

const ROOT = new URL('../../', import.meta.url).pathname.replace(/^\/(\w:)/, '$1');
const sw = readFileSync(join(ROOT, 'sw.js'), 'utf8');
const assets = new Set([...sw.matchAll(/'\.\/([^']+)'/g)].map(m => m[1]));

function walk(dir) {
  return readdirSync(join(ROOT, dir)).flatMap(n => {
    const p = join(dir, n);
    return statSync(join(ROOT, p)).isDirectory() ? walk(p) : [p.split(sep).join('/')];
  });
}

test('todo arquivo do app está no ASSETS do sw.js', () => {
  const files = ['index.html', 'manifest.webmanifest', ...walk('css'), ...walk('js'), ...walk('icons'), ...walk('img'), ...walk('fonts'), ...walk('vendor')]
    .filter(f => !/(LICENSE|\.md$|\.txt$)/.test(f));
  assert.deepEqual(files.filter(f => !assets.has(f)), []);
});

test('todo item do ASSETS existe', () => {
  assert.deepEqual([...assets].filter(a => !existsSync(join(ROOT, a))), []);
});
