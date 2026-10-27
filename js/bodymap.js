// Mapa muscular em SVG: principal = --prim, secundário = --sec
function shp(m, prim, sec, tag){
  const cls = prim.includes(m) ? 'var(--prim)' : sec.includes(m) ? 'var(--sec)' : 'var(--body2)';
  return tag.replace('/>', ` fill="${cls}"/>`);
}
function halfFront(p,s){
  const b = 'var(--body)';
  return `
  <path d="M100,62 C88,62 76,66 68,72 C60,77 58,86 60,96 L66,124 C70,140 74,160 76,186 L100,194 Z" fill="${b}"/>
  <ellipse cx="57" cy="118" rx="11" ry="28" transform="rotate(8 57 118)" fill="${b}"/>
  <ellipse cx="49" cy="170" rx="9" ry="26" transform="rotate(6 49 170)" fill="${b}"/>
  <ellipse cx="45" cy="204" rx="7" ry="9" fill="${b}"/>
  <path d="M76,180 L100,190 L100,214 L72,216 C70,204 72,192 76,180 Z" fill="${b}"/>
  <ellipse cx="84" cy="258" rx="16" ry="46" fill="${b}"/>
  <ellipse cx="85" cy="306" rx="10" ry="11" fill="${b}"/>
  <ellipse cx="84" cy="344" rx="10" ry="32" fill="${b}"/>
  <ellipse cx="82" cy="382" rx="11" ry="6" fill="${b}"/>
  ${shp('side_delt',p,s,'<ellipse cx="60" cy="91" rx="8" ry="13"/>')}
  ${shp('front_delt',p,s,'<ellipse cx="70" cy="86" rx="10" ry="12"/>')}
  ${shp('chest',p,s,'<path d="M99,78 C90,76 80,78 74,87 C70,96 72,108 78,114 C88,120 96,118 99,114 Z"/>')}
  ${shp('biceps',p,s,'<ellipse cx="57" cy="122" rx="7.5" ry="19" transform="rotate(8 57 122)"/>')}
  ${shp('forearms',p,s,'<ellipse cx="49" cy="168" rx="7" ry="21" transform="rotate(6 49 168)"/>')}
  ${shp('abs',p,s,'<rect x="90.5" y="122" width="8.5" height="58" rx="3"/>')}
  ${shp('obliques',p,s,'<path d="M88,124 L79,127 C77,146 78,166 82,180 L88,182 Z"/>')}
  ${shp('quads',p,s,'<ellipse cx="81" cy="254" rx="12" ry="38"/>')}
  ${shp('adductors',p,s,'<path d="M95,220 C99,224 99,238 98,248 C96,262 94,270 92,274 C90,252 90,232 92,222 Z"/>')}
  ${shp('calves',p,s,'<ellipse cx="89" cy="336" rx="5" ry="20"/>')}`;
}
function halfBack(p,s){
  const b = 'var(--body)';
  return `
  <path d="M100,62 C88,62 76,66 68,72 C60,77 58,86 60,96 L66,124 C70,140 74,160 76,186 L100,194 Z" fill="${b}"/>
  <ellipse cx="57" cy="118" rx="11" ry="28" transform="rotate(8 57 118)" fill="${b}"/>
  <ellipse cx="49" cy="170" rx="9" ry="26" transform="rotate(6 49 170)" fill="${b}"/>
  <ellipse cx="45" cy="204" rx="7" ry="9" fill="${b}"/>
  <path d="M76,180 L100,190 L100,214 L72,216 C70,204 72,192 76,180 Z" fill="${b}"/>
  <ellipse cx="84" cy="258" rx="16" ry="46" fill="${b}"/>
  <ellipse cx="85" cy="306" rx="10" ry="11" fill="${b}"/>
  <ellipse cx="84" cy="344" rx="10" ry="32" fill="${b}"/>
  <ellipse cx="82" cy="382" rx="11" ry="6" fill="${b}"/>
  ${shp('lats',p,s,'<path d="M84,96 C76,100 70,108 68,118 C72,138 80,152 92,162 L97,140 L86,114 Z"/>')}
  ${shp('traps',p,s,'<path d="M100,56 C94,62 82,70 70,79 C80,84 92,86 100,88 Z"/>')}
  ${shp('midback',p,s,'<path d="M100,89 C92,89 86,91 84,95 L87,113 L100,128 Z"/>')}
  ${shp('lowerback',p,s,'<path d="M100,148 L93,145 C91,160 89,172 89,184 L100,188 Z"/>')}
  ${shp('side_delt',p,s,'<ellipse cx="59" cy="92" rx="7" ry="13"/>')}
  ${shp('rear_delt',p,s,'<ellipse cx="68" cy="88" rx="10" ry="11"/>')}
  ${shp('triceps',p,s,'<ellipse cx="57" cy="122" rx="7.5" ry="19" transform="rotate(8 57 122)"/>')}
  ${shp('forearms',p,s,'<ellipse cx="49" cy="168" rx="7" ry="21" transform="rotate(6 49 168)"/>')}
  ${shp('glute_med',p,s,'<ellipse cx="79" cy="195" rx="9" ry="10"/>')}
  ${shp('glutes',p,s,'<ellipse cx="88" cy="211" rx="13" ry="15"/>')}
  ${shp('hamstrings',p,s,'<ellipse cx="84" cy="262" rx="12" ry="36"/>')}
  ${shp('calves',p,s,'<ellipse cx="84" cy="336" rx="10" ry="24"/>')}`;
}
export function bodyMap(p, s, label){
  const head = `<circle cx="100" cy="34" r="18" fill="var(--body)"/><rect x="91" y="48" width="18" height="16" rx="4" fill="var(--body)"/>`;
  const mir = 'transform="translate(200,0) scale(-1,1)"';
  return `<svg viewBox="0 0 420 410" role="img" aria-label="${label}" style="width:100%;height:auto;display:block">
    <g stroke="var(--surface)" stroke-width="1.4">
      <g>${head}<g>${halfFront(p,s)}</g><g ${mir}>${halfFront(p,s)}</g></g>
      <g transform="translate(220,0)">${head}<g>${halfBack(p,s)}</g><g ${mir}>${halfBack(p,s)}</g></g>
    </g>
    <text x="100" y="406" text-anchor="middle" font-size="15" fill="var(--muted)" font-family="Atkinson Hyperlegible Next, sans-serif">frente</text>
    <text x="320" y="406" text-anchor="middle" font-size="15" fill="var(--muted)" font-family="Atkinson Hyperlegible Next, sans-serif">costas</text>
  </svg>`;
}

