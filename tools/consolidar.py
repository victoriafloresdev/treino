#!/usr/bin/env python3
"""Consolida os backups do app (bem-estar-AAAA-Sww.json e treino-backup-*.json) no computador.

Uso:
    python tools/consolidar.py <pasta com os backups> [--saida privado/historico]

- Junta todos os arquivos da pasta (e subpastas), deduplica pelo uid de cada registro
  (vence o updatedAt mais recente) e respeita os registros apagados no celular.
- Gera historico.json, CSVs que abrem no Excel (separador ';', vírgula decimal) e
  relatorio-semanal.md com os números da última semana.
- Só usa a biblioteca padrão do Python 3.
"""
import argparse
import csv
import datetime as dt
import json
import math
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
# 'photos' (fotos de progresso, v3) fica de fora de propósito: a consolidação é de números, não de imagens
STORES = ['sessions', 'sets', 'body', 'comps', 'cardio', 'settings', 'meals', 'water', 'daytypes', 'profile', 'achievements', 'weekly']
CONTROL = {'id', 'uid', 'updatedAt', 'deleted'}


# ---------- uid de registros antigos: igual a legacyUid() em js/db.js ----------
def js_number(v):
    if isinstance(v, bool):
        return 'true' if v else 'false'
    if isinstance(v, int):
        return str(v)
    if math.isnan(v) or math.isinf(v):
        return 'null'
    if v == int(v) and abs(v) < 1e21:
        return str(int(v))
    r = repr(v)
    # o JavaScript escreve 1e-7 e 1e+21; o Python, 1e-07 e 1e+21
    return re.sub(r'e([+-])0*(\d)', lambda m: 'e' + m.group(1) + m.group(2), r)


def js_json(v):
    if v is None:
        return 'null'
    if isinstance(v, (bool, int, float)):
        return js_number(v)
    if isinstance(v, str):
        return json.dumps(v, ensure_ascii=False)
    return stable(v)


def stable(v):
    if isinstance(v, list):
        return '[' + ','.join(stable(x) for x in v) + ']'
    if isinstance(v, dict):
        keys = sorted((k for k in v if k not in CONTROL), key=lambda k: k.encode('utf-16-be'))
        return '{' + ','.join(json.dumps(k, ensure_ascii=False) + ':' + stable(v[k]) for k in keys) + '}'
    return js_json(v)


def fnv(text):
    units = text.encode('utf-16-le')
    codes = [units[i] | (units[i + 1] << 8) for i in range(0, len(units), 2)]
    h1, h2 = 0x811c9dc5, 0x01000193 ^ len(codes)
    for c in codes:
        h1 = ((h1 ^ c) * 0x01000193) & 0xFFFFFFFF
        h2 = ((h2 ^ c) * 0x5bd1e995) & 0xFFFFFFFF
    return f'{h1:08x}{h2:08x}'


def legacy_uid(store, row):
    return f"setting:{row['key']}" if store == 'settings' else f'v1:{store}:{fnv(stable(row))}'


def legacy_updated(row):
    t = row.get('ts') or row.get('finishedAt') or row.get('startedAt')
    if t:
        return t
    d = row.get('date')
    if isinstance(d, str) and re.fullmatch(r'\d{4}-\d{2}-\d{2}', d):
        y, m, dd = map(int, d.split('-'))
        return int(dt.datetime(y, m, dd, 12).timestamp() * 1000)
    return 0


# ---------- leitura e junção ----------
def load_backups(folder):
    files = []
    for p in sorted(Path(folder).rglob('*.json')):
        try:
            data = json.loads(p.read_text(encoding='utf-8'))
        except (OSError, ValueError) as e:
            print(f'  ignorado (não é JSON): {p.name} ({e})', file=sys.stderr)
            continue
        if not isinstance(data, dict) or data.get('app') != 'treino-app':
            print(f'  ignorado (não é backup do app): {p.name}', file=sys.stderr)
            continue
        files.append((data.get('exportedAt') or '', p, data))
    files.sort(key=lambda f: (f[0], f[1].name))
    return files


def consolidate(files):
    merged = {s: {} for s in STORES}
    for _, path, data in files:
        session_uid = {}
        for store in STORES:
            for raw in data.get(store) or []:
                row = dict(raw)
                row.setdefault('uid', None)
                if not row['uid']:
                    row['uid'] = legacy_uid(store, raw)
                if row.get('updatedAt') is None:
                    row['updatedAt'] = legacy_updated(raw)
                if store == 'sessions' and 'id' in row:
                    session_uid[row['id']] = row['uid']
                if store == 'sets':
                    # o id da sessão é do aparelho; o uid liga a série à sessão em qualquer arquivo
                    row['sessionUid'] = session_uid.get(row.get('sessionId'), row.get('sessionUid'))
                cur = merged[store].get(row['uid'])
                if cur is None or (row.get('updatedAt') or 0) >= (cur.get('updatedAt') or 0):
                    merged[store][row['uid']] = row
    return {s: sorted(rows.values(), key=lambda r: (str(r.get('date') or r.get('start') or r.get('key') or ''), r.get('updatedAt') or 0))
            for s, rows in merged.items()}


def live(rows):
    return [r for r in rows if not r.get('deleted')]


# ---------- nomes da ficha (js/plan.js) ----------
def plan_names():
    try:
        src = (ROOT / 'js' / 'plan.js').read_text(encoding='utf-8')
        plan = json.loads(re.search(r'export const PLAN = (\[.*?\n\]);', src, re.S).group(1))
        return ({p['id']: p['name'] for p in plan}, {it['id']: it['name'] for p in plan for it in p['items']})
    except (OSError, AttributeError, ValueError):
        return {}, {}


# ---------- CSV para o Excel em pt-BR ----------
def cell(v):
    if v is None:
        return ''
    if isinstance(v, bool):
        return 'sim' if v else 'não'
    if isinstance(v, float):
        v = round(v, 2)
        return (str(int(v)) if v == int(v) else repr(v)).replace('.', ',')
    return str(v)


def write_csv(path, header, rows):
    with open(path, 'w', encoding='utf-8-sig', newline='') as f:
        w = csv.writer(f, delimiter=';')
        w.writerow(header)
        for r in rows:
            w.writerow([cell(x) for x in r])


def e1rm(kg, reps):
    return kg * (1 + reps / 30) if kg and reps and 0 < reps <= 15 else None


def ms_to_iso(ms):
    return dt.datetime.fromtimestamp(ms / 1000).strftime('%Y-%m-%d %H:%M') if ms else None


def write_csvs(out, data):
    plans, exs = plan_names()
    sessions = live(data['sessions'])
    sets = live(data['sets'])
    by_session = {}
    for s in sets:
        by_session.setdefault(s.get('sessionUid'), []).append(s)

    write_csv(out / 'series.csv', ['data', 'treino', 'exercicio_id', 'exercicio', 'serie', 'carga_kg', 'repeticoes', 'segundos', 'esforco', 'forca_estimada_kg'],
              [[s.get('date'), plans.get(s.get('planId'), s.get('planId')), s.get('exId'), exs.get(s.get('exId'), ''), (s.get('setIndex') or 0) + 1,
                s.get('kg'), s.get('reps'), s.get('secs'), s.get('effort'), e1rm(s.get('kg'), s.get('reps'))]
               for s in sorted(sets, key=lambda s: (s.get('date') or '', s.get('ts') or 0))])

    rows = []
    for s in sessions:
        ss = by_session.get(s['uid'], [])
        if not ss:
            continue
        dur = round((s['finishedAt'] - s['startedAt']) / 60000) if s.get('finishedAt') and s.get('startedAt') else None
        rows.append([s.get('date'), plans.get(s.get('planId'), s.get('planId')), ms_to_iso(s.get('startedAt')), ms_to_iso(s.get('finishedAt')), dur,
                     len(ss), float(sum((x.get('kg') or 0) * (x.get('reps') or 0) for x in ss))])
    write_csv(out / 'treinos.csv', ['data', 'treino', 'inicio', 'fim', 'duracao_min', 'series', 'volume_kg'], rows)

    write_csv(out / 'cardio.csv', ['data', 'tipo', 'minutos', 'esforco', 'etapa', 'completou', 'dor_dia_seguinte', 'vel_caminhada_kmh', 'vel_trote_kmh', 'inclinacao_pct', 'distancia_km', 'observacao'],
              [[c.get('date'), c.get('type'), c.get('minutes'), c.get('effort'), (c['stage'] + 1) if isinstance(c.get('stage'), int) else None, c.get('completed'),
                c.get('painNextDay'), (c.get('speeds') or {}).get('walk'), (c.get('speeds') or {}).get('run'), c.get('incline'), c.get('distanceKm'), c.get('note')]
               for c in live(data['cardio'])])

    def macro(m, i):
        return float(m[i]) if isinstance(m, list) and len(m) > i else None
    write_csv(out / 'refeicoes.csv', ['data', 'refeicao', 'opcao', 'proteina_prato', 'carbo_prato', 'molho', 'incluida', 'feita', 'kcal', 'proteina_g', 'carbo_g', 'gordura_g', 'fibra_g'],
              [[m.get('date'), m.get('slot'), m.get('optionId'), (m.get('build') or {}).get('prot'), (m.get('build') or {}).get('carb'), (m.get('build') or {}).get('molho'),
                m.get('included'), bool(m.get('done')), *[macro(m.get('m'), i) for i in range(5)]]
               for m in live(data['meals'])])

    write_csv(out / 'agua.csv', ['data', 'copos_250ml', 'litros'],
              [[w.get('date'), w.get('cups'), (w.get('cups') or 0) * 0.25] for w in live(data['water'])])
    write_csv(out / 'peso.csv', ['data', 'peso_kg', 'cintura_cm', 'observacao'],
              [[b.get('date'), b.get('weight'), b.get('waist'), b.get('note')] for b in live(data['body'])])
    write_csv(out / 'composicao.csv', ['data', 'metodo', 'peso_kg', 'gordura_pct', 'gordura_kg', 'massa_livre_kg', 'massa_muscular_kg', 'gordura_visceral', 'observacao'],
              [[c.get('date'), c.get('method'), c.get('weight'), c.get('fatPct'), c.get('fatKg'), c.get('leanKg'), c.get('muscleKg'), c.get('visceral'), c.get('note')]
               for c in live(data['comps'])])


# ---------- relatório da última semana ----------
def fmt(v, d=1):
    return '–' if v is None else f'{v:,.{d}f}'.replace(',', 'X').replace('.', ',').replace('X', '.')


def avg(xs):
    xs = [x for x in xs if x is not None]
    return sum(xs) / len(xs) if xs else None


def avg7(body, upto):
    start = (dt.date.fromisoformat(upto) - dt.timedelta(days=6)).isoformat()
    return avg([b.get('weight') for b in body if b.get('weight') is not None and start <= b.get('date', '') <= upto])


def report(data, files):
    plans, exs = plan_names()
    last_export = max((f[0] for f in files), default='')[:10] or dt.date.today().isoformat()
    ref = dt.date.fromisoformat(last_export)
    # última semana completa (segunda a domingo) até a data do arquivo mais recente
    ws = ref - dt.timedelta(days=ref.weekday() + (0 if ref.weekday() == 6 else 7))
    we = ws + dt.timedelta(days=6)
    a, b = ws.isoformat(), we.isoformat()
    inw = lambda d: d and a <= d <= b  # noqa: E731
    sets = [s for s in live(data['sets']) if inw(s.get('date'))]
    sessions = [s for s in live(data['sessions']) if inw(s.get('date')) and any(x.get('sessionUid') == s['uid'] for x in sets)]
    cardio = [c for c in live(data['cardio']) if inw(c.get('date'))]
    meals = [m for m in live(data['meals']) if inw(m.get('date')) and m.get('done') and isinstance(m.get('m'), list)]
    days = sorted({m['date'] for m in meals})
    kcal = avg([sum(m['m'][0] for m in meals if m['date'] == d) for d in days])
    prot = avg([sum(m['m'][1] for m in meals if m['date'] == d) for d in days])
    water = avg([w.get('cups') for w in live(data['water']) if inw(w.get('date'))])
    body = live(data['body'])
    w_now, w_prev = avg7(body, b), avg7(body, (ws - dt.timedelta(days=1)).isoformat())
    before = [s for s in live(data['sets']) if (s.get('date') or '') < a]
    ups = []
    for ex in sorted({s['exId'] for s in sets if s.get('kg')}):
        cur = max((s.get('kg') or 0) for s in sets if s['exId'] == ex)
        old = [s.get('kg') or 0 for s in before if s['exId'] == ex]
        if old and cur > max(old):
            ups.append(f'- {exs.get(ex, ex)}: {fmt(float(max(old)))} → {fmt(float(cur))} kg')
    closing = next((w for w in live(data['weekly']) if w.get('start') == a), None)
    feel = (closing or {}).get('feeling') or {}
    lines = [
        f'# Semana de {ws:%d/%m} a {we:%d/%m/%Y}', '',
        f'Gerado em {dt.datetime.now():%d/%m/%Y %H:%M} a partir de {len(files)} arquivo(s). Números de kcal e gasto são estimativas.', '',
        '## Treino',
        f"- Musculação: {len(sessions)} de 4 ({', '.join(sorted({plans.get(s.get('planId'), s.get('planId')) for s in sessions})) or 'nenhum'})",
        f'- Séries registradas: {len(sets)}',
        f"- Cardio: {len(cardio)} sessões, {sum(c.get('minutes') or 0 for c in cardio)} min",
        '', '## Cargas que subiram', *(ups or ['- nenhuma nesta semana']),
        '', '## Comida e água',
        f'- Dias com refeições marcadas: {len(days)}',
        f'- Média por dia marcado: {fmt(kcal, 0)} kcal e {fmt(prot, 0)} g de proteína',
        f'- Água: média de {fmt(water)} copos de 250 ml por dia',
        '', '## Corpo',
        f'- Peso, média de 7 dias: {fmt(w_now)} kg' + (f' ({"+" if w_now - w_prev > 0 else ""}{fmt(w_now - w_prev)} kg vs. semana anterior)' if w_now and w_prev else ''),
    ]
    if closing:
        lines += ['', '## Como foi a semana', f"- Energia: {feel.get('energia') or '–'}", f"- Sono: {feel.get('sono') or '–'}", f"- Observações: {feel.get('nota') or '–'}"]
    return '\n'.join(lines) + '\n'


def main(argv=None):
    ap = argparse.ArgumentParser(description='Junta os backups do app num histórico com CSVs para o Excel.')
    ap.add_argument('pasta', help='pasta com os arquivos .json exportados pelo app')
    ap.add_argument('--saida', default=str(ROOT / 'privado' / 'historico'), help='pasta de saída (padrão: privado/historico)')
    args = ap.parse_args(argv)
    files = load_backups(args.pasta)
    if not files:
        print('Nenhum backup do app encontrado nessa pasta.', file=sys.stderr)
        return 1
    data = consolidate(files)
    out = Path(args.saida)
    out.mkdir(parents=True, exist_ok=True)
    (out / 'historico.json').write_text(json.dumps({
        'geradoEm': dt.datetime.now().isoformat(timespec='seconds'),
        'arquivos': [p.name for _, p, _ in files],
        **data}, ensure_ascii=False, indent=1), encoding='utf-8')
    write_csvs(out, data)
    (out / 'relatorio-semanal.md').write_text(report(data, files), encoding='utf-8')
    total = {s: len(live(r)) for s, r in data.items() if r}
    print(f'{len(files)} arquivo(s) consolidados em {out}')
    print('  ' + ', '.join(f'{k}: {v}' for k, v in total.items()))
    return 0


if __name__ == '__main__':
    sys.exit(main())
