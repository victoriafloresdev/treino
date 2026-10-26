// Lista dos treinos.
import { fmtShort } from '../util.js';
import { program, phaseLabel, loadAll, doneThisWeek } from '../training.js';
import { app, main, setBar } from '../ui.js';
import { PLAN } from '../plan.js';

/* ================= tela: lista de treinos ================= */
export async function viewTreinoLista() {
  // descarta o desenho se outra tela foi aberta enquanto este esperava o banco
  const tok = app.seq;
  const p = await program();
  if (tok !== app.seq) return;
  setBar('Treinos', phaseLabel(p));
  const all = await loadAll();
  const done = doneThisWeek(all);
  const lastDate = id => { const s = all.realSessions.filter(x => x.planId === id).sort((a, b) => a.date < b.date ? 1 : -1)[0]; return s ? fmtShort(s.date) : null; };
  if (tok !== app.seq) return;
  main.innerHTML = PLAN.map(pl => `
    <a class="card" href="#treino/${pl.id}" style="display:block;text-decoration:none;color:inherit">
      <div class="spread"><span class="kind ${pl.kind}" style="font-weight:700;font-size:14px">${pl.day}</span>
        <span class="small ${done[pl.id] ? '' : 'muted'}" style="${done[pl.id] ? 'color:var(--ok);font-weight:700' : ''}">${done[pl.id] ? '✓ Feito nesta semana' : (lastDate(pl.id) ? 'Último: ' + lastDate(pl.id) : 'Ainda não feito')}</span></div>
      <h2 style="font-size:28px;margin-top:4px">${pl.name}</h2>
      <p class="muted" style="margin:2px 0 0">${pl.focus} · ${pl.sets[p.phase]} séries · ${pl.time[p.phase]}</p>
    </a>`).join('') + `<p class="small muted">Perdeu um treino? Faça o próximo da sequência no próximo dia livre, sem treinar perna em dias seguidos.</p>`;
}
