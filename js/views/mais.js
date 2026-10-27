// Telas Mais e Guia, formulários, exportar e importar.
import { $, esc, todayStr, fmtShort } from '../util.js';
import { program, phaseLabel } from '../training.js';
import { app, main, setBar, toast, openSheet, on, onChange } from '../ui.js';
import { db } from '../db.js';
import { DAYS, DAY_IDS } from '../data/nutricao.js';
import { WD, weekModelFromPlan } from '../daytype.js';
import { getModel, setModel, getProfile, importProfileFile, removeProfile } from '../days.js';

export const VERSION = '1.0.0';

/* ================= tela: Mais / Guia ================= */
export async function viewMais() {
  // descarta o desenho se outra tela foi aberta enquanto este esperava o banco
  const tok = app.seq;
  const p = await program();
  if (tok !== app.seq) return;
  setBar('Mais', phaseLabel(p));
  const lastBackup = await db.setting('lastBackup');
  const standalone = window.matchMedia('(display-mode: standalone)').matches || navigator.standalone;
  const model = await getModel(), fromPlan = weekModelFromPlan(), profile = await getProfile();
  if (tok !== app.seq) return;
  main.innerHTML = `
    <div class="card"><h2>Programa</h2>
      <label class="f" style="margin-top:8px">Data de início<input type="date" id="startDate" value="${p.start || todayStr()}"></label>
      <div class="form-actions"><button class="btn block" data-act="setStart">Salvar data de início</button></div>
      <p class="small muted" style="margin:10px 0 0">${p.start ? `Você está na semana ${p.week}. Semanas 1–2: 2 séries por exercício e RIR 3–4.` : 'Defina a data para o app calcular a semana e a fase.'}</p>
    </div>
    <div class="card"><h2>Semana modelo</h2>
      <p class="small muted" style="margin:4px 0 10px">O tipo previsto de cada dia da semana. Vem da ficha de treino: musculação seg, ter, qui e sex; cardio de segunda a sábado.</p>
      <div class="week">${WD.map((w, i) => `<div class="wk-row"><div class="wk-d"><b>${w}</b></div>
        <fieldset class="wk-opts" data-on="modelDay" data-i="${i}"><legend class="sr">Tipo previsto de ${w}</legend>
          ${DAY_IDS.map(t => `<label style="--wk:var(--day-${t})"><input type="radio" name="model-${i}" value="${t}" ${t === model[i] ? 'checked' : ''} aria-label="${esc(DAYS[t].name)}"><span aria-hidden="true">${DAYS[t].e}</span></label>`).join('')}
        </fieldset><div class="wk-k"><small>${esc(DAYS[model[i]].short)}</small></div></div>`).join('')}</div>
      ${model.join() !== fromPlan.join() ? `<div class="form-actions"><button class="btn block" type="button" data-act="modelReset">Voltar ao modelo da ficha</button></div>` : ''}
    </div>
    <div class="card"><h2>Perfil de saúde</h2>
      <p class="small muted" style="margin:4px 0 10px">Textos pessoais (remédio, pontos dos exames, metas) ficam só neste aparelho, num arquivo que você importa. Sem ele, o app mostra textos genéricos.</p>
      <p style="margin:0 0 10px">${profile ? `✓ Perfil importado em ${fmtShort(profile.importedAt.slice(0, 10))}.` : 'Nenhum perfil importado.'}</p>
      <div class="row"><label class="btn ${profile ? '' : 'solid'}" style="cursor:pointer">Importar perfil de saúde<input type="file" id="profileFile" accept="application/json,.json" hidden></label>
        ${profile ? '<button class="btn danger" type="button" data-act="profileRemove">Remover perfil</button>' : ''}</div>
    </div>
    <a class="card" href="#guia" style="display:block;text-decoration:none;color:inherit"><h2>Guia rápido ›</h2><p class="muted" style="margin:0">RIR, quando subir a carga, cardio e quando parar.</p></a>
    <div class="card"><h2>Backup</h2>
      <p class="muted" style="margin:4px 0 12px">Os dados ficam só neste celular. Exporte de tempos em tempos e guarde o arquivo no iCloud Drive ou no Google Drive. Último backup: <b>${lastBackup ? fmtShort(lastBackup) : 'nunca'}</b>.</p>
      <div class="row"><button class="btn solid" data-act="export">Exportar dados</button>
        <label class="btn" style="cursor:pointer">Importar arquivo<input type="file" id="importFile" accept="application/json,.json" hidden></label></div>
    </div>
    ${standalone ? '' : `<div class="card"><h2>Instalar no iPhone</h2>
      <ol style="margin:6px 0 0;padding-left:20px"><li>Abra este endereço no Safari.</li><li>Toque em Compartilhar (quadrado com seta).</li><li>Escolha “Adicionar à Tela de Início”.</li><li>Use sempre o ícone da tela inicial: os dados do app instalado ficam separados dos dados da aba do navegador.</li></ol></div>`}
    <div class="card"><h2>Sobre</h2>
      <p class="small muted" style="margin:4px 0 0">Versão ${VERSION}. Fotos dos exercícios: Free Exercise DB (domínio público). Gráficos: Chart.js (MIT). Fonte: Archivo (OFL). Este app organiza o treino; não substitui avaliação profissional. Dor articular, tontura, dor no peito ou falta de ar fora do normal: pare e procure avaliação médica.</p>
    </div>
    <div class="card"><h2>Apagar dados</h2>
      <p class="small muted" style="margin:4px 0 12px">Remove treinos, medidas e ajustes deste aparelho. Exporte antes.</p>
      <button class="btn danger" data-act="wipe">Apagar todos os dados</button></div>`;
  $('#importFile').onchange = e => importFile(e.target.files[0]);
  $('#profileFile').onchange = async e => { if (await importProfileFile(e.target.files[0])) app.route(); };
}

export function viewGuia() {
  setBar('Guia', '', 'mais');
  main.innerHTML = `<div class="guide">
  <h3>Quanto esforço: RIR</h3>
  <p>RIR é quantas repetições boas ainda sobrariam ao terminar a série. No app: <b>Fácil</b> = sobrariam 4 ou mais, <b>Médio</b> = 2–3, <b>Difícil</b> = 0–1.</p>
  <div class="tbl"><table><thead><tr><th>Semanas</th><th>Compostos</th><th>Isoladores</th></tr></thead><tbody>
   <tr><td>1–2</td><td>RIR 3–4 (fácil)</td><td>RIR 3–4 (fácil)</td></tr>
   <tr><td>3–4</td><td>RIR 2–3 (médio)</td><td>RIR 2 (médio)</td></tr>
   <tr><td>5–8</td><td>RIR 1–3 (médio a difícil)</td><td>RIR 1–2; a última série pode ir a 0–1</td></tr></tbody></table></div>
  <h3>Quando subir a carga</h3>
  <div class="tbl"><table><thead><tr><th>Situação</th><th>O que fazer</th></tr></thead><tbody>
   <tr><td>Todas as séries no topo da faixa, sem marcar difícil</td><td>Subir carga no menor salto do aparelho</td></tr>
   <tr><td>Dentro da faixa, repetições subindo</td><td>Manter a carga</td></tr>
   <tr><td>Alguma série abaixo do mínimo ou técnica quebrando</td><td>Reduzir 5–10%</td></tr>
   <tr><td>Duas sessões sem progresso, com sono e alimentação normais</td><td>Manter mais uma sessão; se seguir travado, reduzir 5–10%</td></tr></tbody></table></div>
  <h3>Cardio da manhã</h3>
  <div class="tbl"><table><thead><tr><th>Semanas</th><th>Quarta e sábado (~30 min)</th><th>Outros dias</th></tr></thead><tbody>
   <tr><td>1–2</td><td>Caminhada rápida com inclinação de 3–6%</td><td>Caminhada 25–30 min</td></tr>
   <tr><td>3–4</td><td>5 min caminhando, 7 × (1 min trote + 2 min caminhada), 4 min</td><td>Caminhada 30 min</td></tr>
   <tr><td>5–6</td><td>5 min caminhando, 6 × (2 min trote + 2 min caminhada), 1 min</td><td>Caminhada 30 min</td></tr>
   <tr><td>7–8</td><td>5 min caminhando, 5 × (3 min trote + 1,5 min caminhada), 2,5 min</td><td>Caminhada 30 min</td></tr></tbody></table></div>
  <p>As semanas da tabela são o mais cedo que cada etapa começa. O app só sugere avançar depois de 2 sessões completas da etapa atual sem dor no dia seguinte, e a mudança é sempre um toque seu em Treino › Cardio.</p>
  <p>Só avance de etapa se, no dia seguinte, não houver dor em canela, joelho ou tendão de Aquiles. Se o sono cair abaixo de 7 h, corte primeiro as caminhadas de terça e sexta.</p>
  <h3>Pare a série quando</h3>
  <ul><li>a técnica mudar (lombar descolando, tronco balançando, amplitude encurtando);</li>
   <li>houver dor articular aguda ou pontada;</li>
   <li>houver tontura, visão turva, dor no peito ou falta de ar fora do normal. Encerre o treino e procure avaliação médica.</li></ul>
  <p><b>Respiração:</b> solte o ar no esforço e não prenda a respiração por várias repetições seguidas.</p>
  <h3>Semana apertada</h3>
  <p>Corte nesta ordem: uma caminhada leve, a corrida de sábado, um treino superior. Os dois inferiores e um superior são o mínimo que mantém o progresso.</p>
  </div>`;
}


export async function exportData() {
  const data = await db.exportAll();
  const name = `treino-backup-${todayStr()}.json`;
  const blob = new Blob([JSON.stringify(data, null, 1)], { type: 'application/json' });
  const file = new File([blob], name, { type: 'application/json' });
  try {
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({ files: [file], title: 'Backup do treino' });
    } else {
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name;
      document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    }
    await db.setSetting('lastBackup', todayStr());
    toast('Backup exportado.');
    app.route();
  } catch (e) { if (e.name !== 'AbortError') toast('Não foi possível exportar: ' + e.message); }
}
export async function importFile(f) {
  if (!f) return;
  let data;
  try { data = JSON.parse(await f.text()); } catch (e) { toast('Arquivo inválido: não é um JSON.'); return; }
  openSheet(`<h2>Importar dados</h2>
    <p>Arquivo: <b>${esc(f.name)}</b></p>
    <p class="muted">Substituir apaga o que está neste aparelho e coloca o backup no lugar. Juntar acrescenta os registros do arquivo aos atuais.</p>
    <div class="form-actions" style="display:grid;gap:10px">
      <button class="btn solid" data-imp="replace">Substituir tudo</button>
      <button class="btn" data-imp="merge">Juntar com os dados atuais</button></div>`);
  importFile.pending = data;
}

on({
  async modelReset() { await setModel(weekModelFromPlan()); toast('Modelo da ficha restaurado.'); app.route(); },
  async profileRemove() { if (!confirm('Remover o perfil de saúde deste aparelho?')) return; await removeProfile(); toast('Perfil removido.'); app.route(); }
});
onChange({
  async modelDay(el, e) { const m = await getModel(); m[Number(el.dataset.i)] = e.target.value; await setModel(m); app.route(); }
});
