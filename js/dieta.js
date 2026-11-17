import * as db from "./db.js";
import { S, $, $$, esc, avviso, apriModale, chiudiModale, conferma, prova, icona, oraCH, isoData } from "./ui.js";
import { alimenti, cerca, fabbisogno, riferimenti, somma, consigliIntegratori, DA_EVITARE } from "./nutrizione.js";

const PASTI = [["colazione", "Colazione"], ["spuntino", "Spuntino"], ["pranzo", "Pranzo"], ["merenda", "Merenda"], ["cena", "Cena"]];
const r0 = (x) => Math.round(x || 0), r1 = (x) => Math.round((x || 0) * 10) / 10;

export async function render(el, param) {
  const ch = oraCH();
  const data = param && /^\d{4}-\d{2}-\d{2}$/.test(param) ? param : ch.iso;
  el.innerHTML = `<main class="stack"><p class="muted">Caricamento…</p></main>`;
  let A;
  try { A = await alimenti(); } catch { el.innerHTML = `<main class="stack"><p>Banca dati degli alimenti non disponibile.</p></main>`; return; }
  const [righe, voci] = await Promise.all([prova(() => db.diario(data)), prova(() => db.voci())]);
  const p = S.profilo || {};
  const f = fabbisogno(p);
  const rif = riferimenti(p, f);
  const t = somma(righe || [], A.mappa);
  const d = new Date(data + "T12:00:00");
  const sposta = (n) => { const x = new Date(d); x.setDate(x.getDate() + n); return isoData(x); };
  const barra = (v, max, inverso = false) => { const pc = max ? Math.min(100, (v / max) * 100) : 0; const cls = inverso ? (v > max ? "warn" : "ok") : pc >= 70 ? "ok" : "warn"; return `<div class="barra ${cls}"><span style="width:${pc}%"></span></div>`; };
  const riga = (n, v, max, u, inverso, nota = "") => `<li class="stack-s" style="padding:8px 0"><div class="row between small"><span>${n}${nota ? ` <span class="xs muted">${nota}</span>` : ""}</span><span class="mono">${typeof v === "number" ? (u === "g" && v < 10 ? r1(v) : r0(v)) : v} <span class="muted">/ ${inverso ? "max " : ""}${max} ${u}</span></span></div>${barra(v, max, inverso)}</li>`;
  const presenti = new Set((voci || []).filter((v) => v.tipo === "integratore").map((v) => v.titolo.toLowerCase()));
  const cons = consigliIntegratori(p).filter((c) => ![...presenti].some((x) => x.includes(c.titolo.split(" ")[0].toLowerCase())));
  const giaIntegratori = (voci || []).filter((v) => v.tipo === "integratore");
  el.innerHTML = `<main class="stack">
  <header class="head"><h1>Dieta</h1></header>
  <div class="row between"><a class="btn piccolo" href="#dieta/${sposta(-1)}" aria-label="Giorno prima">${icona("indietro", 16)}</a><b>${data === ch.iso ? "Oggi" : d.toLocaleDateString("it-CH", { weekday: "long", day: "numeric", month: "long" })}</b><a class="btn piccolo" href="#dieta/${sposta(1)}" aria-label="Giorno dopo" style="transform:scaleX(-1)">${icona("indietro", 16)}</a></div>
  <section class="card stack-s"><div class="row between"><h3>Nutrienti del giorno</h3><span class="xs muted">${f ? `obiettivo ${esc(p.obiettivo)}` : "completa peso e altezza nel profilo"}</span></div>
  <ul class="lista">${riga("Calorie", t.kcal, rif.kcal, "kcal")}${riga("Proteine", t.p, rif.p || r0((p.peso_kg || 75) * 1.6), "g")}${riga("Carboidrati", t.cho, rif.cho || 300, "g")}${riga("di cui zuccheri", t.zu, rif.zu, "g", true, "OMS, zuccheri totali")}${riga("Fibre", t.fi, rif.fi, "g")}${riga("Grassi", t.gr, rif.gr || 80, "g")}${riga("di cui saturi", t.sat, rif.sat, "g", true, "OMS")}${riga("Sale", t.sale, rif.sale, "g", true, "OMS")}</ul></section>
  <details class="card"><summary class="row between" style="cursor:pointer"><h3>Vitamine e minerali</h3><span class="xs muted">D-A-CH</span></summary><ul class="lista">
  ${riga("Vitamina D", t.vd, rif.vd, "µg")}${riga("Vitamina B12", t.b12, rif.b12, "µg")}${riga("Vitamina C", t.vc, rif.vc, "mg")}${riga("Calcio", t.ca, rif.ca, "mg")}${riga("Ferro", t.fe, rif.fe, "mg")}${riga("Magnesio", t.mg, rif.mg, "mg")}${riga("Potassio", t.k, rif.k, "mg")}</ul>
  <p class="xs muted">La vitamina D viene soprattutto dal sole, non dal cibo: per questo è quasi sempre bassa nel diario.</p></details>
  ${PASTI.map(([k, n]) => { const rr = (righe || []).filter((r) => r.pasto === k); const kc = rr.reduce((s, r) => s + (A.mappa.get(r.alimento)?.kcal || 0) * r.grammi / 100, 0);
    return `<section class="card stack-s"><div class="row between"><h2>${n}</h2><span class="mono small muted">${r0(kc)} kcal</span></div>
    ${rr.length ? `<ul class="lista">${rr.map((r) => { const a = A.mappa.get(r.alimento); return `<li class="row between"><span class="small" style="flex:1">${esc(a?.n || r.alimento)}<br><span class="xs muted mono">${r0(r.grammi)} g · ${r0((a?.kcal || 0) * r.grammi / 100)} kcal · P ${r1((a?.p || 0) * r.grammi / 100)} g</span></span><button class="btn testo" data-del="${r.id}" aria-label="Togli">${icona("cestino", 18)}</button></li>`; }).join("")}</ul>` : ""}
    <button class="btn piccolo" data-agg="${k}">${icona("piu", 14)} Aggiungi alimento</button></section>`; }).join("")}
  <section class="card stack-s"><div class="row between"><h2>Integratori e vitamine</h2><span class="etichetta red">FACOLTATIVI</span></div>
  ${giaIntegratori.length ? `<h3>Nella tua giornata</h3><ul class="lista">${giaIntegratori.map((v) => `<li class="row between small"><span><b>${esc(v.titolo)}</b><br><span class="xs muted">${esc(v.dettaglio || "")}</span></span><span class="mono">${esc(v.ora)}</span></li>`).join("")}</ul>` : ""}
  ${cons.length ? `<h3>Consigliati per te</h3><p class="xs muted">Basati sugli studi e sul tuo profilo. Se ti interessano, aggiungili: finiscono nel calendario con il promemoria.</p>
  ${cons.map((c, i) => `<div class="card piatta stack-s" style="padding:12px"><div class="row between"><b>${esc(c.titolo)}</b><span class="mono xs red" aria-label="Solidità delle prove">${c.stelle}</span></div>
  <div class="grid2"><div class="card piatta" style="padding:8px"><span class="etichetta">QUANTO</span><br><b class="small">${esc(c.qty)}</b></div><div class="card piatta" style="padding:8px"><span class="etichetta">QUANDO</span><br><b class="small">${esc(c.ora)}${c.giorni ? " · giorni di allenamento" : ""}</b></div></div>
  <p class="small muted">${esc(c.perche)}</p>${c.avviso ? `<p class="xs warn">${esc(c.avviso)}</p>` : ""}
  <div class="row between"><span class="fonte">${esc(c.fonte)}</span><button class="btn primario piccolo" data-int="${i}">Aggiungi alla giornata</button></div></div>`).join("")}` : `<p class="small muted">Hai già aggiunto tutti i consigli per il tuo profilo.</p>`}
  <h3>Meglio evitare</h3><ul class="lista">${DA_EVITARE.map((x) => `<li class="small"><b class="warn">${esc(x.titolo)}</b><br><span class="muted">${esc(x.perche)}</span> <span class="fonte">${esc(x.fonte)}</span></li>`).join("")}</ul>
  <p class="xs muted">Quantità entro i limiti di sicurezza per adulti. In gravidanza, con malattie o farmaci chiedi prima al medico.</p></section>
  <p class="xs muted">Valori nutritivi: Banca dati svizzera dei valori nutritivi (USAV). Riferimenti: OMS per zuccheri, saturi, sale; D-A-CH per fibre, vitamine e minerali.</p></main>`;
  $$("[data-del]", el).forEach((b) => (b.onclick = async () => { await prova(() => db.eliminaAlimento(b.dataset.del)); render(el, data); }));
  $$("[data-agg]", el).forEach((b) => (b.onclick = () => aggiungi(A, data, b.dataset.agg, () => render(el, data))));
  $$("[data-int]", el).forEach((b) => (b.onclick = async () => {
    const c = cons[+b.dataset.int];
    await prova(() => db.aggiungiVoce({ titolo: c.titolo, ora: c.ora, tipo: "integratore", dettaglio: c.qty, giorni: c.giorni || [1, 2, 3, 4, 5, 6, 0], promemoria: true, anticipo_min: 0, origine: "consiglio" }), `${c.titolo} aggiunto alle ${c.ora}, con promemoria.`);
    render(el, data);
  }));
}

function aggiungi(A, data, pasto, dopo) {
  apriModale(`<div class="stack"><div class="row between"><h2>Aggiungi alimento</h2><button class="btn piccolo" data-chiudi>Chiudi</button></div>
  <input id="q" placeholder="Cerca (es. riso, pollo, yogurt greco)" autocomplete="off"><ul class="lista" id="ris"></ul></div>`, (m) => {
    const mostra = () => {
      const r = cerca(A, $("#q", m).value);
      $("#ris", m).innerHTML = r.map((a) => `<li><button data-id="${esc(a.id)}" style="width:100%;background:none;border:0;text-align:left;padding:0"><b class="small">${esc(a.n)}</b><br><span class="xs muted mono">100 g: ${r0(a.kcal)} kcal · P ${r1(a.p)} · C ${r1(a.cho)} · G ${r1(a.gr)}</span></button></li>`).join("") || `<li class="small muted">${$("#q", m).value ? "Nessun alimento trovato. Prova con un'altra parola." : "Scrivi il nome di un alimento."}</li>`;
      $$("[data-id]", m).forEach((b) => (b.onclick = () => quantita(A.mappa.get(b.dataset.id))));
    };
    const quantita = (a) => {
      $(".foglio", m).innerHTML = `<form class="stack" id="fq"><h2>${esc(a.n)}</h2><label>Quantità (grammi)<input name="g" inputmode="decimal" value="100" required></label>
      <div class="row wrap" style="gap:6px">${[50, 100, 150, 200, 250].map((g) => `<button type="button" class="chip" data-g="${g}">${g} g</button>`).join("")}</div>
      <p class="small mono" id="anteprima"></p><button class="btn primario pieno">Aggiungi</button><button type="button" class="btn pieno" data-chiudi>Annulla</button></form>`;
      const ant = () => { const g = Number($("[name=g]", m).value.replace(",", ".")) || 0; $("#anteprima", m).textContent = `${r0(a.kcal * g / 100)} kcal · proteine ${r1(a.p * g / 100)} g · carboidrati ${r1(a.cho * g / 100)} g · grassi ${r1(a.gr * g / 100)} g`; };
      $("[name=g]", m).oninput = ant; ant();
      $$("[data-g]", m).forEach((b) => (b.onclick = () => { $("[name=g]", m).value = b.dataset.g; ant(); }));
      $$("[data-chiudi]", m).forEach((b) => (b.onclick = chiudiModale));
      $("#fq", m).onsubmit = async (e) => {
        e.preventDefault(); const g = Number(e.target.g.value.replace(",", "."));
        if (!(g > 0 && g < 5000)) return avviso("Quantità non valida.");
        const ok = await prova(() => db.aggiungiAlimento({ data, pasto, alimento: a.id, grammi: g }));
        if (ok !== undefined) { chiudiModale(); dopo(); }
      };
    };
    $("#q", m).oninput = mostra; mostra();
  });
}
