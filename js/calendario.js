import * as db from "./db.js";
import { S, $, $$, esc, avviso, apriModale, chiudiModale, conferma, prova, icona, oraCH, lunediDi, isoData, GIORNI, GIORNI_L, ORDINE_GIORNI } from "./ui.js";

const TIPI = { pasto: "PASTO", integratore: "INTEGRATORE", allenamento: "ALLENAMENTO", recupero: "RECUPERO", altro: "ALTRO" };
const COLORI = { pasto: "#FFB35C", integratore: "#B8FF3D", allenamento: "#FF2E43", recupero: "#9B8CFF", altro: "#FF9AA2" };

export async function render(el, param) {
  const ch = oraCH();
  const lun = lunediDi(ch.data);
  const scelto = param != null && param !== "" ? +param : ch.giorno;
  const dataScelta = new Date(lun); dataScelta.setDate(lun.getDate() + ((scelto + 6) % 7));
  const iso = isoData(dataScelta);
  el.innerHTML = `<main class="stack"><p class="muted">Caricamento…</p></main>`;
  const [voci, fatti] = await Promise.all([prova(() => db.voci()), prova(() => db.fatti(isoData(lun), isoData(new Date(lun.getTime() + 6 * 864e5))))]);
  const delGiorno = (voci || []).filter((v) => v.giorni?.includes(scelto)).sort((a, b) => (a.ora < b.ora ? -1 : 1));
  const fattiSet = new Set((fatti || []).filter((f) => f.data === iso).map((f) => f.voce_id));
  const futuro = iso > ch.iso;
  el.innerHTML = `<main class="stack">
  <header class="head"><div><span class="etichetta">${GIORNI_L[scelto]} ${dataScelta.getDate()}.${dataScelta.getMonth() + 1}</span><h1>Calendario</h1></div><button class="btn primario piccolo" id="nuova">${icona("piu", 16)} Aggiungi</button></header>
  <div class="giorni" role="group" aria-label="Giorno">${ORDINE_GIORNI.map((g) => { const d = new Date(lun); d.setDate(lun.getDate() + ((g + 6) % 7)); return `<button aria-pressed="${g === scelto}" data-g="${g}"><span>${GIORNI[g]}</span><b>${d.getDate()}</b></button>`; }).join("")}</div>
  ${delGiorno.length ? `<p class="small muted">${delGiorno.filter((v) => fattiSet.has(v.id)).length}/${delGiorno.length} fatte · tocca una voce per modificarla</p><ul class="timeline">${delGiorno.map((v) => `<li><span class="ora" style="color:${fattiSet.has(v.id) ? "#C29FA3" : "inherit"}">${esc(v.ora)}</span>
    <button class="voce ${v.tipo}" data-voce="${v.id}"><div class="row between"><b>${esc(v.titolo)}</b><span class="tipo" style="color:${COLORI[v.tipo] || "#FF9AA2"}">${TIPI[v.tipo] || ""}</span></div>${v.dettaglio ? `<span class="xs muted">${esc(v.dettaglio)}</span><br>` : ""}<span class="xs muted mono">${v.promemoria ? `${icona("campana", 12)} ${v.anticipo_min ? v.anticipo_min + " min prima" : "all'orario"}` : "senza promemoria"}</span>${v.tipo === "allenamento" ? `<br><a class="btn primario piccolo" href="#allenamento" style="margin-top:6px">Apri allenamento</a>` : ""}</button>
    <button class="spunta" aria-pressed="${fattiSet.has(v.id)}" aria-label="Segna come fatto" data-fatto="${v.id}" ${futuro ? "disabled" : ""}>${icona("spunta", 18)}</button></li>`).join("")}</ul>`
    : `<div class="card stack-s"><p class="small">Nessuna voce per ${GIORNI_L[scelto].toLowerCase()}.</p><button class="btn pieno" id="tipo">Crea la mia giornata tipo</button><a class="btn pieno" href="#assistente">Chiedi un piano all'assistente</a></div>`}
  <button class="btn pieno" id="ics">Metti tutto nel calendario del telefono</button></main>`;
  $$("[data-g]", el).forEach((b) => (b.onclick = () => (location.hash = "#calendario/" + b.dataset.g)));
  $$("[data-fatto]", el).forEach((b) => (b.onclick = async () => { const on = b.getAttribute("aria-pressed") !== "true"; await prova(() => db.segnaFatto(b.dataset.fatto, iso, on)); render(el, scelto); }));
  $$("[data-voce]", el).forEach((b) => (b.onclick = (e) => { if (e.target.closest("a")) return; modifica((voci || []).find((v) => v.id === b.dataset.voce), () => render(el, scelto)); }));
  $("#nuova").onclick = () => modifica({ giorni: [scelto], ora: "10:00", tipo: "altro", titolo: "", promemoria: true, anticipo_min: 0 }, () => render(el, scelto));
  $("#tipo") && ($("#tipo").onclick = async () => { const { creaGiornataTipo } = await import("./app.js"); await creaGiornataTipo(); render(el, scelto); });
  $("#ics").onclick = esportaICS;
}

export function modifica(v, dopo) {
  const nuova = !v.id;
  apriModale(`<form class="stack" id="fv"><div class="row between"><h2>${nuova ? "Nuova voce" : "Modifica voce"}</h2><button type="button" class="btn piccolo" data-chiudi>Chiudi</button></div>
  <label>Titolo<input name="titolo" value="${esc(v.titolo)}" required placeholder="Es. Creatina"></label>
  <div class="grid2"><label>Ora<input type="time" name="ora" value="${esc(v.ora)}" required></label>
  <label>Tipo<select name="tipo">${Object.keys(TIPI).map((t) => `<option value="${t}" ${v.tipo === t ? "selected" : ""}>${t[0].toUpperCase() + t.slice(1)}</option>`).join("")}</select></label></div>
  <label>Dettagli<textarea name="dettaglio" placeholder="Facoltativo">${esc(v.dettaglio || "")}</textarea></label>
  <fieldset style="border:0;padding:0;margin:0"><legend class="small" style="font-weight:600;margin-bottom:6px">Giorni</legend><div class="row wrap" style="gap:6px">${ORDINE_GIORNI.map((g) => `<button type="button" class="chip" data-g="${g}" aria-pressed="${v.giorni.includes(g)}">${GIORNI[g]}</button>`).join("")}<button type="button" class="chip" id="tutti">Tutti</button></div></fieldset>
  <div class="row between"><span><b>Promemoria</b><br><span class="xs muted">Notifica sul telefono</span></span><button type="button" class="switch" role="switch" aria-checked="${v.promemoria !== false}" id="prom" aria-label="Promemoria"></button></div>
  <label>Quando<select name="anticipo">${[0, 5, 10, 15, 30, 60].map((n) => `<option value="${n}" ${+v.anticipo_min === n ? "selected" : ""}>${n ? n + " minuti prima" : "All'orario"}</option>`).join("")}</select></label>
  <button class="btn primario pieno">Salva</button>${nuova ? "" : `<button type="button" class="btn pericolo pieno" id="del">Elimina</button>`}</form>`, (m) => {
    const giorni = new Set(v.giorni);
    $$("[data-g]", m).forEach((b) => (b.onclick = () => { const g = +b.dataset.g; giorni.has(g) ? giorni.delete(g) : giorni.add(g); b.setAttribute("aria-pressed", giorni.has(g)); }));
    $("#tutti", m).onclick = () => { ORDINE_GIORNI.forEach((g) => giorni.add(g)); $$("[data-g]", m).forEach((b) => b.setAttribute("aria-pressed", "true")); };
    $("#prom", m).onclick = (e) => e.currentTarget.setAttribute("aria-checked", e.currentTarget.getAttribute("aria-checked") !== "true");
    $("#fv", m).onsubmit = async (e) => {
      e.preventDefault(); const f = e.target;
      if (!giorni.size) return avviso("Scegli almeno un giorno.");
      const dati = { titolo: f.titolo.value.trim(), ora: f.ora.value, tipo: f.tipo.value, dettaglio: f.dettaglio.value.trim() || null, giorni: [...giorni], promemoria: $("#prom", m).getAttribute("aria-checked") === "true", anticipo_min: +f.anticipo.value };
      if (!dati.titolo) return avviso("Scrivi un titolo.");
      const ok = await prova(() => (nuova ? db.aggiungiVoce(dati) : db.modificaVoce(v.id, dati)), "Salvato.");
      if (ok !== undefined) { chiudiModale(); dopo?.(); }
    };
    $("#del", m) && ($("#del", m).onclick = async () => { chiudiModale(); if (await conferma(`Elimino "${v.titolo}" da tutti i giorni?`, "Elimina", true)) { await prova(() => db.eliminaVoce(v.id), "Eliminata."); dopo?.(); } });
  });
}

// Esporta tutte le voci nel calendario del telefono (.ics) con allarmi
export async function esportaICS() {
  const voci = (await prova(() => db.voci())) || [];
  if (!voci.length) return avviso("Il calendario è vuoto.");
  const BY = ["SU", "MO", "TU", "WE", "TH", "FR", "SA"];
  const oggi = oraCH().data;
  const pad = (n) => String(n).padStart(2, "0");
  const stamp = new Date().toISOString().replace(/[-:]/g, "").slice(0, 15) + "Z";
  const testo = (s) => String(s || "").replace(/\\/g, "\\\\").replace(/[,;]/g, (c) => "\\" + c).replace(/\n/g, "\\n");
  const righe = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//TESTO//IT", "CALSCALE:GREGORIAN", "X-WR-CALNAME:T.E.S.T.O.",
    "BEGIN:VTIMEZONE", "TZID:Europe/Zurich", "BEGIN:DAYLIGHT", "TZOFFSETFROM:+0100", "TZOFFSETTO:+0200", "TZNAME:CEST", "DTSTART:19700329T020000", "RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=-1SU", "END:DAYLIGHT",
    "BEGIN:STANDARD", "TZOFFSETFROM:+0200", "TZOFFSETTO:+0100", "TZNAME:CET", "DTSTART:19701025T030000", "RRULE:FREQ=YEARLY;BYMONTH=10;BYDAY=-1SU", "END:STANDARD", "END:VTIMEZONE"];
  for (const v of voci) {
    if (!v.giorni?.length) continue;
    // primo giorno utile a partire da oggi
    const d = new Date(oggi); for (let i = 0; i < 7 && !v.giorni.includes(d.getDay()); i++) d.setDate(d.getDate() + 1);
    const [h, mi] = v.ora.split(":");
    righe.push("BEGIN:VEVENT", `UID:${v.id}@testo`, `DTSTAMP:${stamp}`, `DTSTART;TZID=Europe/Zurich:${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}T${pad(h)}${pad(mi)}00`,
      `DURATION:PT${v.tipo === "allenamento" ? 60 : 15}M`, `RRULE:FREQ=WEEKLY;BYDAY=${v.giorni.map((g) => BY[g]).join(",")}`, `SUMMARY:${testo(v.titolo)}`);
    if (v.dettaglio) righe.push(`DESCRIPTION:${testo(v.dettaglio)}`);
    if (v.promemoria !== false) righe.push("BEGIN:VALARM", "ACTION:DISPLAY", `DESCRIPTION:${testo(v.titolo)}`, `TRIGGER:-PT${+v.anticipo_min || 0}M`, "END:VALARM");
    righe.push("END:VEVENT");
  }
  righe.push("END:VCALENDAR");
  const blob = new Blob([righe.join("\r\n")], { type: "text/calendar" });
  const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "testo-calendario.ics"; a.click();
  avviso("File del calendario pronto: aprilo e scegli «Aggiungi tutti».", 4000);
}
