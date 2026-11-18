// Assistente IA: sceglie le note dell'archivio pertinenti e mostra le risposte.
let ARCHIVIO = null;
const VUOTE = new Set("il lo la i gli le un uno una di a da in con su per tra fra e o ma se che chi cosa come quando quanto quanti quante mi ti si ci vi ne non piu meno del della dello dei degli delle al allo alla ai agli alle dal dalla nel nella sul sulla mio mia miei mie tuo tua suo sua sono ho hai ha fare faccio devo posso voglio meglio".split(" "));
const SINONIMI = {
  incin: "gravidanza", gravi: "gravidanza", acqua: "idratazione", bere: "idratazione", sete: "idratazione",
  male: "infortuni dolore", dolor: "infortuni tendini", spall: "articolazioni infortuni tecnica", ginoc: "articolazioni infortuni",
  schie: "infortuni tecnica", vitam: "integratori micronutrienti", omega: "integratori", magne: "integratori micronutrienti",
  dimag: "definizione deficit", grass: "definizione composizione", stero: "PED", testo: "PED ormoni", dormi: "sonno recupero",
  stanc: "sonno recupero", eserc: "tecnica esercizi", panca: "tecnica esercizi", massa: "fase massa surplus", diet: "alimentazione",
  creat: "integratori creatina", sched: "volume frequenza allenamento programmazione", seri: "volume serie", ripet: "volume progressione", pasti: "alimentazione proteine timing",
  digiu: "digiuno intermittente strategie", cheto: "chetogenica strategie", keto: "chetogenica strategie", low: "chetogenica", vegan: "vegana vegetariana strategie", veget: "vegana vegetariana",
  colaz: "timing pasti", prima: "timing", dopo: "timing", sera: "timing caseina", notte: "timing caseina sonno", carbo: "carboidrati timing", whey: "proteine integratori",
  calor: "metabolismo dispendio", metab: "metabolismo dispendio adattamento", stall: "metabolismo adattamento definizione", passi: "metabolismo neat", neat: "metabolismo",
  progr: "programmazione progressione", carico: "progressione programmazione", delo: "scarico programmazione", scari: "scarico programmazione", split: "programmazione divisione",
  princ: "programmazione principiante", risca: "riscaldamento programmazione", recup: "recupero programmazione sonno", pausa: "fisiologia memoria",
  petto: "anatomia petto", pettor: "anatomia petto", dorso: "anatomia dorso", schien: "anatomia dorso", lat: "anatomia dorso", spalle: "anatomia spalle", delto: "anatomia spalle",
  bicip: "anatomia braccia bicipite", trici: "anatomia braccia tricipite", bracc: "anatomia braccia", addom: "anatomia addome core", addomi: "anatomia addome", core: "anatomia addome",
  glute: "anatomia glutei", gambe: "anatomia gambe quadricipite femorali", quadr: "anatomia quadricipite", femor: "anatomia femorali", polpa: "anatomia polpacci",
  fibre: "fisiologia fibre", energ: "fisiologia sistemi energetici", acido: "fisiologia", doms: "fisiologia doms", indol: "fisiologia doms", memor: "fisiologia memoria muscolare",
};
function parole(t) {
  return (t.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").match(/[a-z]{3,}/g) || []).filter((p) => !VUOTE.has(p)).map((p) => p.slice(0, 5));
}
async function archivio() {
  if (ARCHIVIO) return ARCHIVIO;
  const j = await (await fetch("dati/archivio.json")).json();
  ARCHIVIO = j.map((n) => { const ps = parole(n.t + " " + n.x); const tf = new Map(); ps.forEach((p) => tf.set(p, (tf.get(p) || 0) + 1)); return { ...n, len: ps.length, tf, tit: new Set(parole(n.t.split(" › ")[0])), sez: new Set(parole(n.t.split(" › ")[1] || "")) }; });
  ARCHIVIO.media = ARCHIVIO.reduce((s, n) => s + n.len, 0) / ARCHIVIO.length;
  return ARCHIVIO;
}
export async function noteRilevanti(domanda, quante = 3) {
  const A = await archivio();
  let q = parole(domanda);
  for (const p of [...q]) if (SINONIMI[p]) q = q.concat(parole(SINONIMI[p]));
  q = [...new Set(q)];
  const N = A.length;
  const idf = Object.fromEntries(q.map((p) => { const df = A.filter((n) => n.tf.has(p)).length; return [p, Math.log(1 + (N - df + 0.5) / (df + 0.5))]; }));
  const punti = A.map((n) => {
    let s = 0;
    for (const p of q) { const f = n.tf.get(p) || 0; s += idf[p] * (f * 2.2) / (f + 1.2 * (0.25 + 0.75 * n.len / A.media)); if (n.tit.has(p)) s += 2 * Math.max(idf[p], 1.2); else if (n.sez.has(p)) s += 0.5 * idf[p]; }
    return [s, n];
  }).sort((a, b) => b[0] - a[0]);
  const scelte = punti.filter(([s]) => s > 0).slice(0, quante).map(([, n]) => ({ t: n.t, x: n.x.slice(0, 3500) }));
  return scelte.length ? scelte : A.filter((n) => n.t.startsWith("Linee guida")).slice(0, 1).map((n) => ({ t: n.t, x: n.x.slice(0, 3500) }));
}

// Markdown essenziale e sicuro (niente HTML dall'IA)
const esc = (s) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
function inline(s) {
  return esc(s).replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>").replace(/(^|[^*])\*(?!\s)(.+?)\*/g, "$1<em>$2</em>").replace(/`([^`]+)`/g, "<code>$1</code>");
}
export function markdown(md) {
  const righe = md.replace(/\r/g, "").split("\n");
  let html = "", lista = null, tab = [];
  const chiudi = () => { if (lista) { html += `</${lista}>`; lista = null; } if (tab.length) { html += "<table>" + tab.map((r, i) => "<tr>" + r.map((c) => (i ? `<td>${inline(c)}</td>` : `<th>${inline(c)}</th>`)).join("") + "</tr>").join("") + "</table>"; tab = []; } };
  for (const r of righe) {
    const t = r.trim();
    if (/^\|.*\|$/.test(t)) { if (/^\|[\s:|-]+\|$/.test(t)) continue; if (lista) { html += `</${lista}>`; lista = null; } tab.push(t.slice(1, -1).split("|").map((c) => c.trim())); continue; }
    if (tab.length) chiudi();
    let m;
    if ((m = t.match(/^#{1,6}\s+(.*)/))) { chiudi(); html += `<h4>${inline(m[1])}</h4>`; }
    else if ((m = t.match(/^[-*•]\s+(.*)/))) { if (lista !== "ul") { chiudi(); html += "<ul>"; lista = "ul"; } html += `<li>${inline(m[1])}</li>`; }
    else if ((m = t.match(/^\d+[.)]\s+(.*)/))) { if (lista !== "ol") { chiudi(); html += "<ol>"; lista = "ol"; } html += `<li>${inline(m[1])}</li>`; }
    else if (!t) chiudi();
    else { chiudi(); html += `<p>${inline(t)}</p>`; }
  }
  chiudi();
  return html;
}
// Estrae il blocco ```piano {...}``` dalla risposta
export function estraiPiano(testo) {
  const m = testo.match(/```piano\s*([\s\S]*?)```/);
  if (!m) return { testo, piano: null };
  let piano = null;
  try { piano = JSON.parse(m[1].trim()); } catch { piano = null; }
  return { testo: testo.replace(m[0], "").trim(), piano };
}
