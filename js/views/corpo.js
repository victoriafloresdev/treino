// Tela Corpo: peso, cintura e composição.
import { esc, todayStr, fmtShort, fmtN } from '../util.js';
import { program, phaseLabel, loadAll } from '../training.js';
import { main, setBar } from '../ui.js';

/* ================= tela: Corpo ================= */
export async function viewCorpo() {
  const p = await program();
  setBar('Corpo', phaseLabel(p));
  const all = await loadAll();
  const today = todayStr();
  const body = [...all.body].sort((a, b) => a.date < b.date ? 1 : -1);
  const comps = [...all.comps].sort((a, b) => a.date < b.date ? 1 : -1);
  main.innerHTML = `
    <div class="card"><h2>Peso e cintura</h2>
      <div class="grid2" style="margin-top:10px">
        <label class="f">Data<input type="date" id="bDate" value="${today}"></label>
        <label class="f">Peso (kg)<input id="bW" inputmode="decimal" placeholder="75,0"></label>
        <label class="f">Cintura (cm)<input id="bWaist" inputmode="decimal" placeholder="opcional"></label>
        <label class="f">Observação<input id="bNote" placeholder="opcional"></label>
      </div>
      <div class="form-actions"><button class="btn solid block" data-act="saveBody">Salvar medida</button></div>
      <p class="small muted" style="margin:10px 0 0">Cintura: meça na altura do umbigo, de manhã, a cada 2 semanas.</p>
    </div>

    <div class="card"><h2>Avaliação de composição</h2>
      <p class="small muted" style="margin:0 0 10px">Bioimpedância, dobras cutâneas ou outro método. Preencha o que o laudo trouxer.</p>
      <label class="f">Método<select id="cMethod"><option>Dobras cutâneas</option><option>Bioimpedância</option><option>Outro</option></select></label>
      <div class="grid2" style="margin-top:10px">
        <label class="f">Data<input type="date" id="cDate" value="${today}"></label>
        <label class="f">Peso (kg)<input id="cW" inputmode="decimal"></label>
        <label class="f">% de gordura<input id="cFat" inputmode="decimal"></label>
        <label class="f">Massa de gordura (kg)<input id="cFatKg" inputmode="decimal" placeholder="calcula sozinho"></label>
        <label class="f">Massa livre de gordura (kg)<input id="cLean" inputmode="decimal" placeholder="calcula sozinho"></label>
        <label class="f">Massa muscular (kg)<input id="cMus" inputmode="decimal" placeholder="bioimpedância"></label>
        <label class="f">Gordura visceral<input id="cVis" inputmode="decimal" placeholder="bioimpedância"></label>
        <label class="f">Observação<input id="cNote" placeholder="local, aparelho"></label>
      </div>
      <div class="form-actions"><button class="btn solid block" data-act="saveComp">Salvar avaliação</button></div>
    </div>

    <h2 class="section-title">Avaliações</h2>
    <div class="card">${comps.length ? `<div class="tbl" style="margin:0"><table class="t"><thead><tr><th>Data</th><th>Método</th><th>Peso</th><th>% gord.</th><th>MLG</th><th></th></tr></thead><tbody>
      ${comps.map(c => `<tr><td>${fmtShort(c.date)}/${c.date.slice(2, 4)}</td><td>${esc(c.method)}</td><td>${fmtN(c.weight)}</td><td>${fmtN(c.fatPct)}</td><td>${fmtN(c.leanKg)}</td><td><button class="del" data-del="comps:${c.id}">apagar</button></td></tr>`).join('')}
      </tbody></table></div><p class="small muted">MLG = massa livre de gordura (kg).</p>` : `<p class="empty">Nenhuma avaliação ainda.</p>`}</div>

    <h2 class="section-title">Histórico de peso</h2>
    <div class="card">${body.length ? `<table class="t"><thead><tr><th>Data</th><th>Peso</th><th>Cintura</th><th></th></tr></thead><tbody>
      ${body.slice(0, 40).map(b => `<tr><td>${fmtShort(b.date)}</td><td>${fmtN(b.weight)} kg</td><td>${b.waist ? fmtN(b.waist) + ' cm' : '–'}</td><td><button class="del" data-del="body:${b.id}">apagar</button></td></tr>`).join('')}
      </tbody></table>` : `<p class="empty">Nenhuma medida ainda.</p>`}</div>`;
}
