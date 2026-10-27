// Ajudantes compartilhados pelos testes de interface.
export const SIZES = [
  { name: '375', width: 375, height: 667 },
  { name: '402', width: 402, height: 874 }, // iPhone 17
  { name: '440', width: 440, height: 956 }
];
export const SCHEMES = ['light', 'dark'];

// Junta erros do console e da página para conferir no fim do teste.
export function watchErrors(page) {
  const errors = [];
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', e => errors.push(e.message));
  return errors;
}

// Grava dados de exemplo pelo próprio módulo de banco do app.
export async function seed(page) {
  await page.goto('/index.html#mais');
  await page.waitForSelector('main > *');
  await page.evaluate(async () => {
    const { db } = await import('/js/db.js');
    const d = n => { const x = new Date(); x.setDate(x.getDate() - n); return x.toISOString().slice(0, 10); };
    await db.setSetting('startDate', d(24));
    await db.setSetting('lastBackup', d(1));
    for (let w = 3; w >= 0; w--) {
      const date = d(w * 7 + 1);
      const sid = await db.add('sessions', { date, planId: 'inferior-a', startedAt: Date.now() - 3600e3, finishedAt: Date.now() });
      for (const [exId, kg] of [['ia1', 122.5 + w * 5], ['ia2', 37.5], ['ia5', 60], ['ia6', 25]])
        for (let i = 0; i < 2; i++)
          await db.add('sets', { sessionId: sid, date, planId: 'inferior-a', exId, setIndex: i, kg, reps: 10 + i, secs: null, effort: i ? 'dificil' : 'medio', rir: 1, ts: Date.now() });
      await db.add('cardio', { date, type: 'caminhada', minutes: 30, effort: 'moderado', note: 'canela ok, inclinação 5% e uma observação bem comprida para testar quebra' });
      await db.add('body', { date, weight: 82 - w * 0.4, waist: 88, note: '' });
    }
    // corrida de ontem ainda sem resposta sobre dor (mostra a pergunta na tela Hoje)
    await db.add('cardio', { date: d(1), type: 'intervalado', minutes: 30, effort: 'moderado', note: '', stage: 1, completed: 'sim' });
    // perfil fictício, só para exercitar os textos que vêm do perfil
    await db.put('profile', { uid: 'profile:main', nome: 'Teste', importedAt: new Date().toISOString(),
      remedio: { rotulo: 'Remédio de teste com água', sub: 'Texto de exemplo de um lembrete com várias palavras.', hora: '06h00', h: 6, e: '💊' },
      textos: { 'nota.carneVermelha': 'Nota pessoal de teste.', 'dica.medico.pontos': '<ul><li>Ponto de teste um</li><li>Ponto de teste dois</li></ul>' },
      dicas: { remedio: { e: '💊', title: 'Remédio de teste', small: 'Exemplo', html: '<p>Texto de exemplo.</p>' } } });
    await db.add('comps', { date: d(80), method: 'Dobras cutâneas', weight: 83.15, fatPct: 24.5, fatKg: 20.37, leanKg: 62.78, muscleKg: null, visceral: null, note: 'Pollock 7 dobras' });
    await db.add('comps', { date: d(40), method: 'Bioimpedância', weight: 82.5, fatPct: 23.4, fatKg: 19.31, leanKg: 63.19, muscleKg: 35.2, visceral: 7, note: 'aparelho da academia' });
  });
}

// Procura elementos visíveis que saem da borda do contêiner ou da tela.
export async function findOverflow(page) {
  return page.evaluate(() => {
    const bad = [];
    const vw = document.documentElement.clientWidth;
    if (document.documentElement.scrollWidth > window.innerWidth) bad.push(`página rola na horizontal: ${document.documentElement.scrollWidth} > ${window.innerWidth}`);
    // contêineres feitos para rolar na horizontal (tabela larga, fila de chips)
    const SCROLL_X = '.tbl, .scroll-x';
    const label = el => el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') + (el.className && typeof el.className === 'string' ? '.' + el.className.trim().split(/\s+/).join('.') : '');
    for (const el of document.querySelectorAll('body *')) {
      const cs = getComputedStyle(el);
      if (cs.display === 'none' || cs.visibility === 'hidden') continue;
      if (el.closest('svg') && el.tagName.toLowerCase() !== 'svg') continue;
      // texto só para leitor de tela: é cortado de propósito
      if (el.closest('.sr')) continue;
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) continue;
      if (cs.position === 'fixed') {
        if (r.left < -1 || r.right > vw + 1) bad.push(`${label(el)} fixo sai da tela (${Math.round(r.left)}–${Math.round(r.right)} de ${vw})`);
        continue;
      }
      const p = el.parentElement;
      if (!p || p === document.body) continue;
      // dentro de um contêiner que rola na horizontal, sair do pai é permitido;
      // o próprio contêiner é conferido quando o laço passa por ele
      if (p.closest(SCROLL_X)) continue;
      const pr = p.getBoundingClientRect();
      const pcs = getComputedStyle(p);
      const inL = pr.left + parseFloat(pcs.borderLeftWidth), inR = pr.right - parseFloat(pcs.borderRightWidth);
      if (r.left < inL - 1 || r.right > inR + 1)
        bad.push(`${label(el)} sai de ${label(p)} (${Math.round(r.left)}–${Math.round(r.right)} vs ${Math.round(inL)}–${Math.round(inR)})`);
      if (r.right > vw + 1) bad.push(`${label(el)} passa da tela`);
    }
    // controles cortados por um ancestral que esconde o excesso (ex.: classe com altura fixa aplicada sem querer)
    for (const el of document.querySelectorAll('button, a, label, input:not([type=radio]):not([type=checkbox]):not([type=file])')) {
      const cs = getComputedStyle(el);
      if (cs.display === 'none' || cs.visibility === 'hidden' || el.closest('.sr, [hidden]')) continue;
      const r = el.getBoundingClientRect();
      if (!r.width || !r.height) continue;
      for (let a = el.parentElement; a && a !== document.body; a = a.parentElement) {
        const o = getComputedStyle(a);
        if (o.overflowX === 'visible' && o.overflowY === 'visible') continue;
        if (a.matches(SCROLL_X) || o.overflowY === 'auto' || o.overflowY === 'scroll') break; // área que rola: o conteúdo é alcançável
        const ar = a.getBoundingClientRect();
        if (r.bottom > ar.bottom + 1 || r.top < ar.top - 1 || r.right > ar.right + 1 || r.left < ar.left - 1) {
          bad.push(`${label(el)} cortado por ${label(a)}`); break;
        }
      }
    }
    // texto que vaza da própria caixa (palavra longa, número grande)
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      if (!n.textContent.trim()) continue;
      const host = n.parentElement;
      if (!host || host.closest('svg, script, style, .sr') || host.closest(SCROLL_X)) continue;
      const hcs = getComputedStyle(host);
      if (hcs.display === 'none' || hcs.visibility === 'hidden' || hcs.textOverflow === 'ellipsis') continue;
      const box = host.getBoundingClientRect();
      if (!box.width) continue;
      const rg = document.createRange(); rg.selectNodeContents(n);
      for (const t of rg.getClientRects()) {
        if (t.width && (t.right > box.right + 1 || t.left < box.left - 1)) {
          bad.push(`texto "${n.textContent.trim().slice(0, 30)}" vaza de ${label(host)}`); break;
        }
      }
    }
    return [...new Set(bad)];
  });
}
