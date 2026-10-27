// Ponto de entrada: eventos globais, rotas e service worker.
import { $, $$, esc, todayStr, num } from './util.js';
import { itemById } from './training.js';
import { app, main, toast, closeSheet, destroyCharts, actions } from './ui.js';
import { viewHoje, applyDayColor } from './views/hoje.js';
import { viewComida } from './views/comida.js';
import { dayInfo } from './days.js';
import { viewTreinoLista } from './views/treino.js';
import { S, viewSessao, setsOf, renderSessao, saveSet, finishSession, howSheet } from './views/sessao.js';
import { viewProgresso } from './views/progresso.js';
import { viewCorpo } from './views/corpo.js';
import { viewMais, viewGuia, exportData, importFile } from './views/mais.js';
import { viewCardio } from './views/cardio.js';
import { db, STORES } from './db.js';

/* ================= eventos ================= */
document.addEventListener('click', async e => {
  const t = e.target;
  if (t.closest('[data-close]')) { closeSheet(); if (!t.closest('a')) return; }

  const tg = t.closest('[data-toggle]');
  if (tg) { const id = tg.dataset.toggle; S.open.has(id) ? S.open.delete(id) : S.open.add(id);
    const el = $(`#ex-${id}`); el.classList.toggle('open'); tg.setAttribute('aria-expanded', el.classList.contains('open')); return; }

  const eff = t.closest('.effort [data-e]');
  if (eff) { $$('[data-e]', eff.parentElement).forEach(b => b.setAttribute('aria-pressed', String(b === eff))); return; }

  const sv = t.closest('[data-save]'); if (sv) { sv.disabled = true; try { await saveSet(sv.dataset.save); } finally { sv.disabled = false; } return; }

  const ds = t.closest('[data-delset]');
  if (ds) { const id = Number(ds.dataset.delset); await db.del('sets', id); S.sets = S.sets.filter(s => s.id !== id);
    // renumera as séries restantes do exercício
    const exId = ds.closest('.ex').id.slice(3);
    const rest = setsOf(exId); for (let i = 0; i < rest.length; i++) if (rest[i].setIndex !== i) { rest[i].setIndex = i; await db.put('sets', rest[i]); }
    renderSessao(); toast('Série apagada.'); return; }

  const ex = t.closest('[data-extra]'); if (ex) { S.extra = ex.dataset.extra; renderSessao(); return; }
  const how = t.closest('[data-how]'); if (how) { howSheet(itemById(how.dataset.how)); return; }

  const sg = t.closest('.seg [data-v]');
  if (sg) { $$('[data-v]', sg.parentElement).forEach(b => b.setAttribute('aria-pressed', String(b === sg))); return; }

  const del = t.closest('[data-del]');
  if (del) { const [store, id] = del.dataset.del.split(':'); if (confirm('Apagar este registro?')) { await db.del(store, Number(id)); route(); } return; }

  const imp = t.closest('[data-imp]');
  if (imp) { try { await db.importAll(importFile.pending, imp.dataset.imp); closeSheet(); toast('Dados importados.'); route(); }
    catch (err) { toast(err.message, 4000); } return; }

  const act = t.closest('[data-act]')?.dataset.act;
  if (!act) return;
  if (actions[act]) { await actions[act](t.closest('[data-act]'), e); return; }
  if (act === 'setStart') { const v = $('#startDate').value; if (!v) return; await db.setSetting('startDate', v); toast('Data de início salva.'); route(); }
  if (act === 'saveWeight') { const w = num($('#wQuick').value); if (!w) { toast('Informe o peso.'); return; }
    await db.add('body', { date: todayStr(), weight: w, waist: null, note: '' }); toast('Peso salvo.'); route(); }
  if (act === 'saveBody') { const w = num($('#bW').value), waist = num($('#bWaist').value);
    if (w == null && waist == null) { toast('Informe o peso ou a cintura.'); return; }
    await db.add('body', { date: $('#bDate').value || todayStr(), weight: w, waist, note: $('#bNote').value.trim() }); toast('Medida salva.'); route(); }
  if (act === 'saveComp') {
    const w = num($('#cW').value), fat = num($('#cFat').value);
    let fatKg = num($('#cFatKg').value), lean = num($('#cLean').value);
    if (fat == null && fatKg == null) { toast('Informe ao menos o % de gordura.'); return; }
    if (fatKg == null && w && fat != null) fatKg = Math.round(w * fat) / 100;
    if (lean == null && w && fatKg != null) lean = Math.round((w - fatKg) * 100) / 100;
    const method = $('#cMethod').value;
    await db.add('comps', { date: $('#cDate').value || todayStr(), method, weight: w, fatPct: fat, fatKg, leanKg: lean,
      muscleKg: num($('#cMus').value), visceral: num($('#cVis').value), note: $('#cNote').value.trim() });
    if (w) await db.add('body', { date: $('#cDate').value || todayStr(), weight: w, waist: null, note: `avaliação (${method})` });
    toast('Avaliação salva.'); route(); }
  if (act === 'finish') finishSession();
  if (act === 'export') exportData();
  if (act === 'wipe') {
    if (!confirm('Apagar TODOS os dados deste aparelho?')) return;
    if (!confirm('Tem certeza? Isso não pode ser desfeito.')) return;
    for (const s of STORES) await db.clear(s);
    toast('Dados apagados.'); location.hash = 'hoje'; route();
  }
});

/* ================= rotas ================= */
async function route() {
  const my = ++app.seq;
  closeSheet(); destroyCharts();
  const [r, arg] = (location.hash.slice(1) || 'hoje').split('/');
  // endereço antigo da aba Corpo
  if (r === 'corpo') { location.replace('#progresso/corpo'); return; }
  const tab = { guia: 'mais', cardio: 'treino' }[r] || r;
  $$('.nav a').forEach(a => a.setAttribute('aria-current', a.dataset.r === tab ? 'page' : 'false'));
  // a cor de destaque segue o tipo de hoje em todas as telas
  if (r !== 'hoje' && r !== 'comida') dayInfo().then(i => applyDayColor(i.type)).catch(() => {});
  try {
    if (r === 'treino' && arg) await viewSessao(arg);
    else if (r === 'treino') await viewTreinoLista();
    else if (r === 'cardio') await viewCardio();
    else if (r === 'comida') await viewComida(arg);
    else if (r === 'progresso' && arg === 'corpo') await viewCorpo();
    else if (r === 'progresso') await viewProgresso();
    else if (r === 'mais') await viewMais();
    else if (r === 'guia') viewGuia();
    else await viewHoje();
  } catch (err) {
    console.error(err);
    if (my !== app.seq) return;
    main.innerHTML = `<div class="card"><h2>Algo deu errado</h2><p class="muted">${esc(err.message)}</p><p class="small muted">Recarregue o app. Se persistir, exporte um backup em Mais.</p></div>`;
  }
}
let lastRoute = null;
window.addEventListener('hashchange', () => {
  const r = location.hash; if (r !== lastRoute) { lastRoute = r; window.scrollTo(0, 0); route(); }
});
app.route = route;
lastRoute = location.hash; route();

/* ================= service worker (offline e atualização) ================= */
if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  navigator.serviceWorker.register('./sw.js').then(reg => {
    reg.addEventListener('updatefound', () => {
      const nw = reg.installing;
      nw?.addEventListener('statechange', () => {
        if (nw.state === 'installed' && navigator.serviceWorker.controller) {
          const t = $('#toast'); t.innerHTML = 'Nova versão disponível. <u>Toque para atualizar</u>'; t.classList.add('on');
          t.onclick = () => { nw.postMessage('skipWaiting'); };
        }
      });
    });
  }).catch(() => {});
  let reloaded = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => { if (!reloaded) { reloaded = true; location.reload(); } });
}
