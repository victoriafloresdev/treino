// Progresso › Fotos: até 4 fotos por semana (frente, lado, costas e livre), só neste aparelho.
// Vão no backup e podem ser salvas no app Fotos. Comparação lado a lado com outra semana.
import { todayStr, addDays, weekStart, fmtShort } from '../util.js';
import { program, phaseLabel } from '../training.js';
import { app, main, setBar, subTabs, on, onChange, openSheet, closeSheet, toast } from '../ui.js';
import { db } from '../db.js';
import { icon } from '../ui/icons.js';
import { PROG_TABS } from './progresso.js';

export const POSES = [['frente', 'Frente'], ['lado', 'Lado'], ['costas', 'Costas'], ['livre', 'Livre']];
const F = { week: null, cmp: null };
const photoUid = (ws, pose) => `photo:${ws}:${pose}`;
const poseName = id => POSES.find(p => p[0] === id)?.[1] || id;
const weekLabel = ws => `${fmtShort(ws)} a ${fmtShort(addDays(ws, 6))}`;

// reduz a foto (lado maior 1280 px, JPEG): cerca de 200–300 KB cada
export async function shrink(file, max = 1280) {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => rej(new Error('Não foi possível abrir a imagem.')); i.src = url; });
    const k = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
    const w = Math.round(img.naturalWidth * k), h = Math.round(img.naturalHeight * k);
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    c.getContext('2d').drawImage(img, 0, 0, w, h);
    return { img: c.toDataURL('image/jpeg', 0.82), w, h };
  } finally { URL.revokeObjectURL(url); }
}

export async function viewFotos() {
  const tok = app.seq;
  const p = await program();
  const all = await db.all('photos');
  if (tok !== app.seq) return;
  setBar('Progresso', phaseLabel(p));
  const cur = weekStart(todayStr()), ws = F.week && F.week <= cur ? F.week : cur;
  const mine = Object.fromEntries(all.filter(x => x.date === ws).map(x => [x.pose, x]));
  const weeks = [...new Set(all.map(x => x.date))].filter(w => w !== ws).sort();
  const cmp = weeks.includes(F.cmp) ? F.cmp : weeks.find(w => w < ws) || weeks[0] || null;
  const other = Object.fromEntries(all.filter(x => x.date === cmp).map(x => [x.pose, x]));
  const n = Object.keys(mine).length;

  main.innerHTML = subTabs('progresso', PROG_TABS, 'fotos') + `
    <div class="datenav">
      <button class="icon-btn" type="button" data-act="phWeek" data-d="-7" aria-label="Semana anterior">${icon('caret-right', 'flip')}</button>
      <div class="datenav-pick"><span><b>${ws === cur ? 'Esta semana' : weekLabel(ws)}</b><small>${ws === cur ? weekLabel(ws) : `${n} de 4 fotos`}</small></span></div>
      <button class="icon-btn" type="button" data-act="phWeek" data-d="7" aria-label="Próxima semana" ${ws >= cur ? 'disabled' : ''}>${icon('caret-right')}</button>
    </div>
    <div class="ph-grid">${POSES.map(([id, name]) => mine[id]
      ? `<button class="ph-slot has" type="button" data-act="phOpen" data-pose="${id}" aria-label="Ver foto: ${name}"><img src="${mine[id].img}" alt="" loading="lazy"><span class="ph-l">${name}</span></button>`
      : `<label class="ph-slot" data-on="phAdd" data-pose="${id}">${icon('camera')}<span>${name}</span><small>Adicionar</small>
          <input type="file" accept="image/*" aria-label="Adicionar foto: ${name}"></label>`).join('')}
    </div>
    <p class="small muted">Para comparar melhor: mesmo lugar, mesma luz e mesma roupa, de manhã. As fotos ficam só neste celular e vão junto no backup.</p>
    ${n ? `<div class="form-actions"><button class="btn block" type="button" data-act="phSave">${icon('download-simple')} Salvar fotos da semana no celular</button></div>` : ''}
    ${cmp && n ? `<h2 class="section-title">Comparar</h2>
      <fieldset class="chipset" data-on="phCmp"><legend>Comparar ${ws === cur ? 'esta semana' : 'a semana de ' + fmtShort(ws)} com</legend><div class="opts scroll-x">
        ${weeks.map(w => `<label class="chip"><input type="radio" name="phCmp" value="${w}" ${w === cmp ? 'checked' : ''}><span>${fmtShort(w)}</span></label>`).join('')}</div></fieldset>
      <div class="ph-cmp">${POSES.filter(([id]) => mine[id] && other[id]).map(([id, name]) => `
        <figure><figcaption>${name}</figcaption><div class="ph-pair">
          <div><img src="${other[id].img}" alt="${name}, semana de ${fmtShort(cmp)}"><small>${fmtShort(cmp)}</small></div>
          <div><img src="${mine[id].img}" alt="${name}, semana de ${fmtShort(ws)}"><small>${fmtShort(ws)}</small></div></div></figure>`).join('')
        || '<p class="empty">Nenhum ângulo em comum entre as duas semanas.</p>'}</div>` : ''}`;
}

async function savePhoto(ws, pose, file) {
  if (!file) return;
  try {
    const p = await shrink(file);
    await db.put('photos', { uid: photoUid(ws, pose), date: ws, pose, takenOn: todayStr(), ...p });
    if (navigator.storage?.persist) navigator.storage.persist().catch(() => {});
    closeSheet(); toast('Foto salva.'); app.route();
  } catch (e) { toast(e.message || 'Não foi possível salvar a foto.'); }
}
const curWeek = () => (F.week && F.week <= weekStart(todayStr()) ? F.week : weekStart(todayStr()));

on({
  phWeek(el) { F.week = addDays(curWeek(), Number(el.dataset.d)); app.route(); },
  async phOpen(el) {
    const ws = curWeek(), pose = el.dataset.pose, ph = await db.get('photos', photoUid(ws, pose));
    if (!ph) return;
    openSheet(`<h2>${poseName(pose)} · ${weekLabel(ws)}</h2>
      <img class="ph-big" src="${ph.img}" alt="Foto ${poseName(pose).toLowerCase()} da semana de ${fmtShort(ws)}">
      <div class="form-actions" style="display:grid;gap:10px">
        <label class="btn block" data-on="phAdd" data-pose="${pose}" style="cursor:pointer">Trocar foto<input type="file" accept="image/*" hidden></label>
        <button class="btn danger block" type="button" data-act="phDel" data-pose="${pose}">Apagar foto</button></div>`);
  },
  async phDel(el) {
    if (!confirm('Apagar esta foto deste aparelho?')) return;
    const ws = curWeek(), pose = el.dataset.pose;
    // o registro apagado não guarda a imagem
    await db.put('photos', { uid: photoUid(ws, pose), date: ws, pose, deleted: true });
    closeSheet(); toast('Foto apagada.'); app.route();
  },
  // manda as imagens para o app Fotos / Arquivos pela folha de compartilhamento (ou baixa, no computador)
  async phSave() {
    const ws = curWeek(), list = (await db.all('photos')).filter(x => x.date === ws);
    const files = await Promise.all(list.map(async x => new File([await (await fetch(x.img)).blob()], `progresso-${ws}-${x.pose}.jpg`, { type: 'image/jpeg' })));
    try {
      if (navigator.canShare && navigator.canShare({ files })) { await navigator.share({ files, title: `Fotos de progresso ${weekLabel(ws)}` }); return; }
      for (const f of files) {
        const a = document.createElement('a'); a.href = URL.createObjectURL(f); a.download = f.name;
        document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000);
      }
    } catch (e) { if (e.name !== 'AbortError') toast('Não foi possível salvar: ' + e.message); }
  }
});
onChange({
  phAdd(el, e) { savePhoto(curWeek(), el.dataset.pose, e.target.files?.[0]); },
  phCmp(el, e) { F.cmp = e.target.value; app.route(); }
});
