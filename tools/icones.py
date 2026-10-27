#!/usr/bin/env python3
"""Gera icons/sprite.svg com os ícones Phosphor (MIT) usados pelo app.

Uso: python tools/icones.py
Para acrescentar um ícone, inclua o nome em ICONES (veja https://phosphoricons.com) e rode de novo.
Os nomes terminados em -fill vêm do peso preenchido. Precisa de internet só na hora de gerar.
"""
import re
import urllib.request
from pathlib import Path

VERSAO = '2.1.1'
ICONES = [
    # navegação
    'house', 'barbell', 'fork-knife', 'chart-line-up', 'dots-three-outline',
    # tipos de dia e atividades
    'flame', 'person-simple-run', 'leaf', 'sneaker-move', 'moon', 'sun-horizon', 'pill',
    # estados
    'check', 'check-circle', 'check-circle-fill', 'circle', 'warning-circle', 'info',
    # ações
    'plus', 'minus', 'x', 'caret-right', 'caret-down', 'arrow-counter-clockwise', 'play-fill', 'pause-fill', 'stop',
    'timer', 'clock', 'export', 'download-simple', 'upload-simple', 'trash', 'pencil-simple', 'magnifying-glass',
    # temas
    'drop', 'drop-fill', 'scales', 'calendar-check', 'calendar-dots', 'trophy', 'lightbulb', 'swap', 'pizza',
    'bowl-food', 'heartbeat', 'target', 'list-checks', 'book-open', 'user-circle', 'question', 'barbell-fill',
]
BASE = f'https://unpkg.com/@phosphor-icons/core@{VERSAO}/assets'
ROOT = Path(__file__).resolve().parent.parent


def baixar(nome):
    peso = 'fill' if nome.endswith('-fill') else 'regular'
    svg = urllib.request.urlopen(f'{BASE}/{peso}/{nome}.svg', timeout=30).read().decode('utf-8')
    corpo = re.search(r'<svg[^>]*>(.*)</svg>', svg, re.S).group(1).strip()
    return f'<symbol id="i-{nome}" viewBox="0 0 256 256">{corpo}</symbol>'


def main():
    simbolos = '\n'.join(baixar(n) for n in ICONES)
    saida = ROOT / 'icons' / 'sprite.svg'
    saida.write_text(
        f'<!-- Phosphor Icons {VERSAO} (MIT, https://phosphoricons.com). Gerado por tools/icones.py. -->\n'
        f'<svg xmlns="http://www.w3.org/2000/svg" fill="currentColor">\n{simbolos}\n</svg>\n', encoding='utf-8')
    print(f'{len(ICONES)} ícones em {saida}')


if __name__ == '__main__':
    main()
