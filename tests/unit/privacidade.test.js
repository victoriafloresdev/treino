// Nenhum dado de saúde da usuária pode estar em arquivo versionado (o repositório é público).
// A lista de termos fica em privado/termos-proibidos.txt, fora do git; sem ela, o teste é pulado.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { join } from 'node:path';

const ROOT = new URL('../../', import.meta.url).pathname.replace(/^\/(\w:)/, '$1');
const LIST = join(ROOT, 'privado', 'termos-proibidos.txt');

test('arquivos versionados não citam dados de saúde', { skip: !existsSync(LIST) && 'lista de termos ausente' }, () => {
  const terms = readFileSync(LIST, 'utf8').split(/\r?\n/).map(t => t.trim()).filter(t => t && !t.startsWith('#'));
  // arquivos rastreados e os novos ainda não ignorados
  const files = execSync('git ls-files --cached --others --exclude-standard', { cwd: ROOT, encoding: 'utf8' })
    // imagens, fontes e o sprite de ícones (coordenadas de desenho) ficam de fora
    .split('\n').filter(f => f && !/\.(png|jpg|woff2|svg)$/.test(f) && !f.startsWith('vendor/') && !f.endsWith('package-lock.json'));
  const hits = [];
  for (const f of files) {
    if (!existsSync(join(ROOT, f))) continue;
    const text = readFileSync(join(ROOT, f), 'utf8');
    for (const t of terms) {
      // palavra inteira: um termo curto não casa dentro de um nome de função
      const escaped = t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const re = new RegExp(`(?<![\\p{L}\\p{N}])${escaped}(?![\\p{L}\\p{N}])`, 'iu');
      if (re.test(text)) hits.push(`${f}: "${t}"`);
    }
  }
  assert.deepEqual(hits, []);
});
