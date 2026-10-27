// tools/consolidar.py: mesmo uid que o app, deduplicação, registros apagados e CSVs para o Excel.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { legacyUid } from '../../js/db.js';

const ROOT = new URL('../../', import.meta.url).pathname.replace(/^\/(\w:)/, '$1');
const PY = process.platform === 'win32' ? 'python' : 'python3';
const py = (code, input) => execFileSync(PY, ['-c', `import sys, json; sys.path.insert(0, ${JSON.stringify(join(ROOT, 'tools'))}); import consolidar\n${code}`],
  { input, encoding: 'utf8', env: { ...process.env, PYTHONIOENCODING: 'utf-8', PYTHONUTF8: '1' } });

const ROWS = [
  ['sessions', { id: 1, date: '2026-10-19', planId: 'inferior-a', startedAt: 1760900000000, finishedAt: null }],
  ['sets', { id: 7, sessionId: 1, date: '2026-10-19', planId: 'inferior-a', exId: 'ia1', setIndex: 0, kg: 122.5, reps: 10, secs: null, effort: 'medio', rir: 2.5, ts: 1760900100000 }],
  ['body', { id: 3, date: '2026-10-20', weight: 82.1, waist: null, note: 'manhã, após o café' }],
  ['body', { id: 4, date: '2026-10-21', weight: 82, waist: 88, note: '' }],
  ['comps', { id: 1, date: '2026-03-03', method: 'Bioimpedância', weight: 83, fatPct: 24.35, fatKg: 20.21, leanKg: 62.79, muscleKg: null, visceral: 7, note: 'aparelho "X"' }],
  ['cardio', { id: 2, date: '2026-10-21', type: 'intervalado', minutes: 30, effort: 'leve', note: 'ok', speeds: { walk: 5.5, run: 7 }, incline: 0.1 }],
  ['settings', { key: 'startDate', value: '2026-09-14' }]
];

test('uid de registro antigo é o mesmo no app e no consolidar.py', () => {
  const js = ROWS.map(([s, r]) => legacyUid(s, r));
  const pyOut = JSON.parse(py('rows = json.load(sys.stdin)\nprint(json.dumps([consolidar.legacy_uid(s, r) for s, r in rows]))', JSON.stringify(ROWS)));
  assert.deepEqual(pyOut, js);
});

test('consolida backups v1 e v2 sem duplicar e respeitando o que foi apagado', () => {
  const dir = mkdtempSync(join(tmpdir(), 'backups-')), out = mkdtempSync(join(tmpdir(), 'historico-'));
  const v1 = { app: 'treino-app', version: 1, exportedAt: '2026-10-22T10:00:00.000Z',
    sessions: [ROWS[0][1]], sets: [ROWS[1][1]], body: [ROWS[2][1], ROWS[3][1]], comps: [ROWS[4][1]], cardio: [ROWS[5][1]], settings: [ROWS[6][1]] };
  // o mesmo aparelho, depois da migração: uids do conteúdo, um peso apagado, coisas novas
  const mig = (s, r, extra = {}) => ({ ...r, uid: legacyUid(s, r), updatedAt: 1793000000000, ...extra });
  const v2 = { app: 'treino-app', version: 2, exportedAt: '2026-11-02T10:00:00.000Z',
    sessions: [mig('sessions', ROWS[0][1]), { id: 2, uid: 's2', date: '2026-10-27', planId: 'superior-a', startedAt: 1, finishedAt: 2400001, updatedAt: 2 }],
    sets: [mig('sets', ROWS[1][1]), { id: 8, uid: 'x8', sessionId: 2, date: '2026-10-27', planId: 'superior-a', exId: 'sa1', setIndex: 0, kg: 30, reps: 10, effort: 'facil', ts: 5, updatedAt: 5 },
      { id: 9, uid: 'x9', sessionId: 2, date: '2026-10-27', planId: 'superior-a', exId: 'ia1', setIndex: 0, kg: 130, reps: 8, effort: 'medio', ts: 6, updatedAt: 6 }],
    body: [mig('body', ROWS[2][1], { deleted: true, updatedAt: 1793500000000 }), mig('body', ROWS[3][1]), { id: 5, uid: 'b5', date: '2026-10-28', weight: 81.6, waist: null, note: '', updatedAt: 9 }],
    comps: [mig('comps', ROWS[4][1])], cardio: [mig('cardio', ROWS[5][1])], settings: [{ ...ROWS[6][1], uid: 'setting:startDate', updatedAt: 1 }],
    meals: [{ uid: 'meal:2026-10-27:cafe', date: '2026-10-27', slot: 'cafe', optionId: 'paosal', done: true, m: [414, 33, 41, 12, 1.2], updatedAt: 3 },
      { uid: 'meal:2026-10-27:almoco', date: '2026-10-27', slot: 'almoco', build: { prot: 'tilapia', carb: 'batata', molho: 'iog' }, done: true, m: [400.5, 45.1, 37.2, 8, 9], updatedAt: 4 }],
    water: [{ uid: 'water:2026-10-27', date: '2026-10-27', cups: 12, updatedAt: 4 }],
    weekly: [{ uid: 'week:2026-W44', start: '2026-10-26', closedAt: 1, feeling: { energia: 'alta', sono: 'ok', nota: 'boa' }, updatedAt: 7 }] };
  writeFileSync(join(dir, 'treino-backup-2026-10-22.json'), JSON.stringify(v1));
  writeFileSync(join(dir, 'bem-estar-2026-S44.json'), JSON.stringify(v2));
  writeFileSync(join(dir, 'outra-coisa.json'), JSON.stringify({ app: 'outro' }));
  const log = execFileSync(PY, [join(ROOT, 'tools', 'consolidar.py'), dir, '--saida', out], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  assert.match(log, /2 arquivo\(s\) consolidados/);

  const csv = name => readFileSync(join(out, name), 'utf8');
  const rows = name => csv(name).replace(/^﻿/, '').trim().split(/\r?\n/).slice(1);
  assert.ok(csv('peso.csv').startsWith('﻿data;peso_kg;cintura_cm;observacao'));
  // peso de 20/10 foi apagado no celular; 21/10 não duplica; 28/10 é novo
  assert.deepEqual(rows('peso.csv'), ['2026-10-21;82;88;', '2026-10-28;81,6;;']);
  assert.equal(rows('series.csv').length, 3);
  assert.equal(rows('treinos.csv').length, 2);
  assert.match(rows('treinos.csv')[1], /^2026-10-27;Superior A;.*;40;2;/);
  assert.equal(rows('cardio.csv').length, 1);
  assert.match(rows('cardio.csv')[0], /5,5;7;0,1;/);
  assert.equal(rows('composicao.csv').length, 1);
  assert.match(rows('composicao.csv')[0], /24,35/);
  assert.equal(rows('refeicoes.csv').length, 2);
  assert.match(rows('refeicoes.csv')[1], /tilapia;batata;iog;;sim;400,5;45,1/);
  assert.deepEqual(rows('agua.csv'), ['2026-10-27;12;3']);

  const hist = JSON.parse(readFileSync(join(out, 'historico.json'), 'utf8'));
  assert.equal(hist.body.length, 3); // o apagado fica no histórico, marcado
  assert.equal(hist.body.find(b => b.date === '2026-10-20').deleted, true);

  const rep = readFileSync(join(out, 'relatorio-semanal.md'), 'utf8');
  assert.match(rep, /# Semana de 26\/10 a 01\/11\/2026/);
  assert.match(rep, /Musculação: 1 de 4 \(Superior A\)/);
  assert.match(rep, /Leg press 45°: 122,5 → 130,0 kg/);
  assert.match(rep, /Média por dia marcado: 814 kcal e 78 g de proteína/);
  assert.match(rep, /Energia: alta/);
  assert.ok(existsSync(join(out, 'historico.json')));
});
