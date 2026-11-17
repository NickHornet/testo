// Piccole utilità di interfaccia condivise
export const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
export const $ = (sel, el = document) => el.querySelector(sel);
export const $$ = (sel, el = document) => [...el.querySelectorAll(sel)];
export const S = { utente: null, profilo: null, consensi: {}, esercizi: [], mappaEs: new Map() };

export function avviso(testo, ms = 2600) {
  const a = $("#avviso"); a.textContent = testo; a.hidden = false;
  clearTimeout(avviso.t); avviso.t = setTimeout(() => (a.hidden = true), ms);
}
export function apriModale(html, alMontaggio) {
  const m = $("#modale");
  m.innerHTML = `<div class="foglio">${html}</div>`;
  m.hidden = false;
  document.body.style.overflow = "hidden";
  m.onclick = (e) => { if (e.target === m) chiudiModale(); };
  $$("[data-chiudi]", m).forEach((b) => (b.onclick = chiudiModale));
  alMontaggio?.(m);
  const primo = m.querySelector("input,select,textarea,button"); primo?.focus?.({ preventScroll: true });
}
export function chiudiModale() { const m = $("#modale"); m.hidden = true; m.innerHTML = ""; document.body.style.overflow = ""; }
export function conferma(testo, ok = "Conferma", pericolo = false) {
  return new Promise((res) => {
    apriModale(`<div class="stack"><p>${esc(testo)}</p><div class="grid2"><button class="btn" data-no>Annulla</button><button class="btn ${pericolo ? "pericolo" : "primario"}" data-si>${esc(ok)}</button></div></div>`, (m) => {
      $("[data-no]", m).onclick = () => { chiudiModale(); res(false); };
      $("[data-si]", m).onclick = () => { chiudiModale(); res(true); };
    });
  });
}
export async function prova(fn, msgOk) {
  try { const r = await fn(); if (msgOk) avviso(msgOk); return r === undefined ? true : r; }
  catch (e) { console.error(e); avviso(e.message || "Qualcosa non ha funzionato. Riprova."); return undefined; }
}
const P = { fill: "none", stroke: "currentColor", "stroke-width": 1.8, "stroke-linecap": "round", "stroke-linejoin": "round" };
const ICONE = {
  oggi: '<circle cx="12" cy="12" r="8"/><path d="M12 7v5l3 2"/>',
  allenamento: '<path d="M3 10v4M6 8v8M18 8v8M21 10v4M6 12h12"/>',
  calendario: '<rect x="4" y="5" width="16" height="15" rx="2"/><path d="M8 3v4M16 3v4M4 10h16"/>',
  dieta: '<path d="M7 3v8a2 2 0 0 0 4 0V3M9 11v10M16 3c-2 2-2 6 0 8v10"/>',
  assistente: '<path d="M12 3l1.8 4.6L18 9l-4.2 1.4L12 15l-1.8-4.6L6 9l4.2-1.4z"/><path d="M18 15l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8z"/>',
  profilo: '<circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6"/>',
  spunta: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
  piu: '<path d="M12 5v14M5 12h14"/>',
  campana: '<path d="M6 16V11a6 6 0 0 1 12 0v5l2 2H4z"/><path d="M10 20a2 2 0 0 0 4 0"/>',
  indietro: '<path d="M15 5l-7 7 7 7"/>',
  cestino: '<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>',
  invia: '<path d="M4 12l16-8-6 16-2-7z"/>',
};
export function icona(n, size = 22, extra = "") {
  const attr = Object.entries(P).map(([k, v]) => `${k}="${v}"`).join(" ");
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" ${attr} aria-hidden="true" ${extra}>${ICONE[n] || ""}</svg>`;
}
export function logo(size = 96, sfondo = true) {
  const back = sfondo ? `<rect x="2" y="2" width="96" height="96" rx="22" fill="#0D0405" stroke="#4A161B" stroke-width="2"/><path d="M14 26V14h12M74 14h12v12M86 74v12H74M26 86H14V74" stroke="#FF2E43" stroke-opacity="0.45" stroke-width="2" fill="none"/>` : "";
  return `<svg width="${size}" height="${size}" viewBox="0 0 100 100" role="img" aria-label="Logo T.E.S.T.O.">${back}<g style="filter:drop-shadow(0 0 4px #FF2E43)" fill="#FF2E43"><rect x="20" y="25" width="7" height="22" rx="2"/><rect x="27" y="29" width="4" height="14" rx="1"/><rect x="73" y="25" width="7" height="22" rx="2"/><rect x="69" y="29" width="4" height="14" rx="1"/><rect x="31" y="32" width="38" height="8" rx="1"/><rect x="45" y="40" width="10" height="38" rx="1"/><circle cx="64" cy="73" r="5"/></g></svg>`;
}
export const wordmark = () => `<span class="wordmark">T<i>.</i>E<i>.</i>S<i>.</i>T<i>.</i>O<i>.</i></span>`;
export const GIORNI = ["Dom", "Lun", "Mar", "Mer", "Gio", "Ven", "Sab"];
export const GIORNI_L = ["Domenica", "Lunedì", "Martedì", "Mercoledì", "Giovedì", "Venerdì", "Sabato"];
export const ORDINE_GIORNI = [1, 2, 3, 4, 5, 6, 0];
// data di oggi e giorno della settimana in ora svizzera
export function oraCH(d = new Date()) {
  const iso = d.toLocaleDateString("sv-SE", { timeZone: "Europe/Zurich" });
  const [y, m, g] = iso.split("-").map(Number);
  const loc = new Date(y, m - 1, g);
  return { iso, giorno: loc.getDay(), data: loc, minuti: Number(d.toLocaleTimeString("en-GB", { timeZone: "Europe/Zurich", hour: "2-digit", minute: "2-digit", hour12: false }).split(":").reduce((h, m) => h * 60 + +m)) };
}
export function lunediDi(d) { const x = new Date(d); const g = (x.getDay() + 6) % 7; x.setDate(x.getDate() - g); x.setHours(0, 0, 0, 0); return x; }
export const isoData = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
export const IMG = (p) => `https://cdn.jsdelivr.net/gh/yuhonas/free-exercise-db@main/exercises/${p}`;
export const IMG2 = (p) => `https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/${p}`;
export function imgEs(p, cls = "miniatura", alt = "") {
  return `<img class="${cls}" src="${IMG(p)}" alt="${esc(alt)}" loading="lazy" onerror="if(!this.dataset.r){this.dataset.r=1;this.src='${IMG2(p)}'}">`;
}
