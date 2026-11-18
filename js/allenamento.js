import * as db from "./db.js";
import { S, $, $$, esc, avviso, apriModale, chiudiModale, conferma, prova, icona, imgEs, oraCH, GIORNI_L, ORDINE_GIORNI } from "./ui.js";
import { NOMI } from "./corpo.js";
import { giorniAllenamento } from "./nutrizione.js";

const es = (id) => S.mappaEs.get(id) || { id, n: id, p: [], s: [], img: [], i: [], r: 90 };
const RECUPERI = [30, 45, 60, 75, 90, 120, 150, 180, 240, 300];
const fmtRec = (s) => (s >= 60 ? `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")} min` : `${s} s`);
const recDi = (e) => +e.recupero || es(e.id).r || 90;
const selRec = (attr, val) => `<select ${attr} aria-label="Recupero">${RECUPERI.map((r) => `<option value="${r}" ${+val === r ? "selected" : ""}>${fmtRec(r)}</option>`).join("")}</select>`;
const R = (id, serie, rip) => ({ id, serie, ripetizioni: rip });
const PARTENZA = {
  fb: [
    { nome: "Full body A", esercizi: [R("Barbell_Squat", 3, "6-8"), R("Barbell_Bench_Press_-_Medium_Grip", 3, "6-8"), R("Bent_Over_Barbell_Row", 3, "8-10"), R("Seated_Dumbbell_Press", 2, "8-12"), R("Lying_Leg_Curls", 2, "10-12"), R("Cable_Crunch", 2, "10-15")] },
    { nome: "Full body B", esercizi: [R("Romanian_Deadlift", 3, "6-8"), R("Incline_Dumbbell_Press", 3, "8-10"), R("Wide-Grip_Lat_Pulldown", 3, "8-12"), R("Dumbbell_Lunges", 2, "10-12"), R("Side_Lateral_Raise", 3, "12-15"), R("Hammer_Curls", 2, "10-12")] },
  ],
  ul: [
    { nome: "Upper A", esercizi: [R("Barbell_Bench_Press_-_Medium_Grip", 3, "6-8"), R("Bent_Over_Barbell_Row", 3, "6-8"), R("Seated_Dumbbell_Press", 3, "8-10"), R("Wide-Grip_Lat_Pulldown", 3, "8-12"), R("Barbell_Curl", 2, "8-12"), R("Triceps_Pushdown_-_Rope_Attachment", 2, "10-12")] },
    { nome: "Lower A", esercizi: [R("Barbell_Squat", 3, "6-8"), R("Romanian_Deadlift", 3, "8-10"), R("Leg_Press", 2, "10-12"), R("Lying_Leg_Curls", 2, "10-12"), R("Standing_Calf_Raises", 3, "10-15"), R("Hanging_Leg_Raise", 2, "10-15")] },
    { nome: "Upper B", esercizi: [R("Incline_Dumbbell_Press", 3, "8-10"), R("Seated_Cable_Rows", 3, "8-12"), R("Pullups", 3, "6-10"), R("Side_Lateral_Raise", 3, "12-15"), R("Hammer_Curls", 2, "10-12"), R("EZ-Bar_Skullcrusher", 2, "10-12")] },
    { nome: "Lower B", esercizi: [R("Barbell_Deadlift", 3, "5-6"), R("Bodyweight_Walking_Lunge", 3, "10-12"), R("Leg_Extensions", 3, "12-15"), R("Seated_Leg_Curl", 3, "10-12"), R("Barbell_Hip_Thrust", 3, "8-12"), R("Seated_Calf_Raise", 3, "12-15")] },
  ],
  ppl: [
    { nome: "Push", esercizi: [R("Barbell_Bench_Press_-_Medium_Grip", 3, "6-8"), R("Incline_Dumbbell_Press", 3, "8-10"), R("Seated_Dumbbell_Press", 3, "8-10"), R("Side_Lateral_Raise", 3, "12-15"), R("Triceps_Pushdown_-_Rope_Attachment", 3, "10-12")] },
    { nome: "Pull", esercizi: [R("Pullups", 3, "6-10"), R("Bent_Over_Barbell_Row", 3, "6-8"), R("Seated_Cable_Rows", 3, "10-12"), R("Face_Pull", 3, "12-15"), R("Barbell_Curl", 3, "8-12")] },
    { nome: "Legs", esercizi: [R("Barbell_Squat", 3, "6-8"), R("Romanian_Deadlift", 3, "8-10"), R("Leg_Press", 3, "10-12"), R("Lying_Leg_Curls", 3, "10-12"), R("Standing_Calf_Raises", 3, "10-15")] },
    { nome: "Upper", esercizi: [R("Incline_Dumbbell_Press", 3, "8-10"), R("Wide-Grip_Lat_Pulldown", 3, "8-12"), R("Arnold_Dumbbell_Press", 3, "8-12"), R("One-Arm_Dumbbell_Row", 3, "8-12"), R("Hammer_Curls", 2, "10-12"), R("EZ-Bar_Skullcrusher", 2, "10-12")] },
    { nome: "Lower", esercizi: [R("Front_Barbell_Squat", 3, "6-8"), R("Barbell_Hip_Thrust", 3, "8-12"), R("Bodyweight_Walking_Lunge", 3, "10-12"), R("Leg_Extensions", 3, "12-15"), R("Seated_Calf_Raise", 3, "12-15")] },
  ],
};
async function creaPartenza() {
  const n = +S.profilo?.allenamenti_sett || 3;
  const giorni = giorniAllenamento(n);
  const base = n <= 3 ? PARTENZA.fb : n === 4 ? PARTENZA.ul : PARTENZA.ppl;
  await prova(async () => { for (let i = 0; i < giorni.length; i++) { const b = base[i % base.length]; await db.salvaScheda({ nome: b.nome, giorno: giorni[i], esercizi: b.esercizi }); } }, "Schede di partenza create.");
}

const sessioneCorrente = () => { try { return JSON.parse(localStorage.getItem("testo_sessione") || "null"); } catch { return null; } };
const salvaCorrente = (s) => (s ? localStorage.setItem("testo_sessione", JSON.stringify(s)) : localStorage.removeItem("testo_sessione"));

export async function render(el, param) {
  if (param) return editor(el, param);
  el.innerHTML = `<main class="stack"><p class="muted">Caricamento…</p></main>`;
  const [schede, recenti] = await Promise.all([prova(() => db.schede()), prova(() => db.sessioniRecenti(8))]);
  const ch = oraCH();
  const diOggi = (schede || []).filter((s) => s.giorno === ch.giorno);
  const inCorso = sessioneCorrente();
  const ord = [...(schede || [])].sort((a, b) => ORDINE_GIORNI.indexOf(a.giorno ?? 9) - ORDINE_GIORNI.indexOf(b.giorno ?? 9));
  el.innerHTML = `<main class="stack">
  <header class="head"><h1>Allenamento</h1><button class="btn piccolo" id="libreria">Esercizi</button></header>
  ${inCorso ? `<a class="card row between" href="#sessione" style="text-decoration:none;color:inherit;border-color:#FF2E43"><span><span class="etichetta">IN CORSO</span><br><b>${esc(inCorso.nome)}</b></span><span class="btn primario piccolo">Riprendi</span></a>` : ""}
  ${!inCorso && diOggi.length ? diOggi.map((s) => `<section class="card stack-s"><span class="etichetta">OGGI · ${GIORNI_L[ch.giorno].toUpperCase()}</span><h2>${esc(s.nome)}</h2><p class="small muted">${s.esercizi.map((e) => esc(es(e.id).n)).join(" · ")}</p><button class="btn primario pieno" data-inizia="${s.id}">Inizia</button></section>`).join("") : ""}
  <section class="stack-s"><div class="row between"><h3>Le tue schede</h3><a class="btn piccolo" href="#allenamento/nuova">${icona("piu", 16)} Nuova</a></div>
  ${ord.length ? `<ul class="lista card piatta">${ord.map((s) => `<li class="row between"><a href="#allenamento/${s.id}" style="color:inherit;text-decoration:none;flex:1"><b>${esc(s.nome)}</b><br><span class="xs muted">${s.giorno != null ? GIORNI_L[s.giorno] : "Giorno libero"} · ${s.esercizi.length} esercizi</span></a><button class="btn piccolo" data-inizia="${s.id}">Inizia</button></li>`).join("")}</ul>`
    : `<div class="card stack-s"><p class="small">Non hai ancora schede. Posso crearne di partenza in base ai tuoi ${S.profilo?.allenamenti_sett || 3} allenamenti a settimana, oppure chiedile all'assistente.</p><button class="btn primario pieno" id="partenza">Crea schede di partenza</button><a class="btn pieno" href="#assistente">Chiedi all'assistente</a></div>`}
  <button class="btn pieno" id="libero">Allenamento libero</button></section>
  ${(recenti || []).length ? `<section class="stack-s"><h3>Ultimi allenamenti</h3><ul class="lista card piatta">${recenti.map((r) => `<li class="row between"><span><b>${esc(r.nome || "Allenamento")}</b><br><span class="xs muted">${new Date(r.inizio).toLocaleDateString("it-CH", { weekday: "long", day: "numeric", month: "long" })}${r.fine ? "" : " · non chiuso"}</span></span></li>`).join("")}</ul></section>` : ""}
  </main>`;
  $$("[data-inizia]", el).forEach((b) => (b.onclick = () => inizia((schede || []).find((s) => s.id === b.dataset.inizia))));
  $("#partenza") && ($("#partenza").onclick = async () => { await creaPartenza(); render(el); });
  $("#libero").onclick = () => inizia({ id: null, nome: "Allenamento libero", esercizi: [] });
  $("#libreria").onclick = () => scegliEsercizio(null, null);
}

export async function inizia(scheda) {
  if (sessioneCorrente()) { location.hash = "#sessione"; return; }
  const s = await prova(() => db.iniziaSessione({ scheda_id: scheda.id, nome: scheda.nome }));
  if (!s) return;
  salvaCorrente({ id: s.id, nome: scheda.nome, esercizi: scheda.esercizi.map((e) => ({ ...e })), inizio: Date.now() });
  location.hash = "#sessione";
}

// ---------- sessione in corso ----------
let timer = null;
export async function sessione(el) {
  const s = sessioneCorrente();
  if (!s) { location.hash = "#allenamento"; return; }
  el.innerHTML = `<main class="stack"><p class="muted">Caricamento…</p></main>`;
  const fatte = (await prova(() => db.serieDellaSessione(s.id))) || [];
  const precedenti = {};
  await Promise.all(s.esercizi.map(async (e) => { precedenti[e.id] = (await prova(() => db.ultimaVolta(e.id, s.id))) || []; }));
  const blocchi = s.esercizi.map((e, i) => {
    const x = es(e.id);
    const mie = fatte.filter((f) => f.esercizio === e.id).sort((a, b) => a.numero - b.numero);
    const prec = precedenti[e.id];
    const n = Math.max(+e.serie || 3, mie.length + (mie.length >= (+e.serie || 3) ? 0 : 0));
    const righe = [];
    for (let k = 1; k <= n; k++) {
      const f = mie.find((m) => m.numero === k);
      const p = prec.find((m) => m.numero === k) || prec[prec.length - 1];
      righe.push(`<div class="serie-riga" data-es="${esc(e.id)}" data-n="${k}"><span class="mono small muted">${k}</span>
        <input inputmode="decimal" aria-label="Kg serie ${k}" placeholder="${p?.kg ?? "kg"}" value="${f?.kg ?? ""}" ${f ? "disabled" : ""} data-kg>
        <input inputmode="numeric" aria-label="Ripetizioni serie ${k}" placeholder="${p?.ripetizioni ?? (e.ripetizioni || "rip")}" value="${f?.ripetizioni ?? ""}" ${f ? "disabled" : ""} data-rip>
        <button class="spunta" aria-pressed="${!!f}" aria-label="Serie ${k} fatta" data-id="${f?.id || ""}">${icona("spunta", 18)}</button></div>`);
    }
    return `<section class="card stack-s"><div class="row">${x.img?.[0] ? `<button class="vedi-es" data-info="${esc(e.id)}" aria-label="Vedi esecuzione">${imgEs(x.img[0], "miniatura grande", x.n)}</button>` : ""}<div style="flex:1"><b>${esc(x.n)}</b><br><span class="xs muted">${e.serie || 3} × ${esc(e.ripetizioni || "8-12")} · recupero ${fmtRec(recDi(e))} · ${x.p.map((m) => NOMI[m]).join(", ")}</span></div><button class="btn testo xs" data-info="${esc(e.id)}">Come si fa</button></div>
      <label class="row small" style="font-weight:600;flex-direction:row;align-items:center;gap:8px">Recupero ${selRec(`data-rec="${i}" style="min-height:38px;width:auto;flex:1"`, recDi(e))}</label>
      <p class="xs ${prec.length ? "" : "muted"}">${prec.length ? `<b>Ultima volta:</b> ${prec.map((p) => `${p.kg ?? "–"} kg × ${p.ripetizioni ?? "–"}`).join(" · ")}` : "Prima volta con questo esercizio: scegli un peso con cui arrivi a 1-3 ripetizioni dal cedimento."}</p>
      <div class="serie-riga xs muted"><span>#</span><span>kg</span><span>ripetizioni</span><span></span></div>${righe.join("")}
      <div class="row"><button class="btn piccolo" data-aggiungi="${i}">${icona("piu", 14)} Serie</button><button class="btn piccolo" data-togli="${i}">Togli esercizio</button></div></section>`;
  }).join("");
  const min = Math.round((Date.now() - s.inizio) / 60000);
  el.innerHTML = `<main class="stack"><header class="head"><div><span class="etichetta">IN CORSO · ${min} MIN</span><h1>${esc(s.nome)}</h1></div></header>
  ${blocchi || `<p class="muted small">Aggiungi il primo esercizio.</p>`}
  <button class="btn pieno" id="agg">${icona("piu", 16)} Aggiungi esercizio</button>
  <div class="grid2"><button class="btn pericolo" id="annulla">Annulla</button><button class="btn primario" id="fine">Termina</button></div></main>`;
  $$("[data-info]", el).forEach((b) => (b.onclick = () => dettaglio(b.dataset.info)));
  $$("[data-aggiungi]", el).forEach((b) => (b.onclick = () => { s.esercizi[+b.dataset.aggiungi].serie = (+s.esercizi[+b.dataset.aggiungi].serie || 3) + 1; salvaCorrente(s); sessione(el); }));
  $$("[data-rec]", el).forEach((sel) => (sel.onchange = () => { s.esercizi[+sel.dataset.rec].recupero = +sel.value; salvaCorrente(s); avviso("Recupero aggiornato per questo esercizio."); }));
  $$("[data-togli]", el).forEach((b) => (b.onclick = () => { s.esercizi.splice(+b.dataset.togli, 1); salvaCorrente(s); sessione(el); }));
  $("#agg").onclick = () => scegliEsercizio(null, (id) => { s.esercizi.push({ id, serie: 3, ripetizioni: "8-12", recupero: es(id).r }); salvaCorrente(s); chiudiModale(); sessione(el); });
  $$(".serie-riga .spunta", el).forEach((b) => (b.onclick = async () => {
    const riga = b.closest(".serie-riga");
    if (b.getAttribute("aria-pressed") === "true") {
      await prova(() => db.eliminaSerie(b.dataset.id)); return sessione(el);
    }
    const kgI = $("[data-kg]", riga), ripI = $("[data-rip]", riga);
    const kg = kgI.value !== "" ? Number(kgI.value.replace(",", ".")) : kgI.placeholder !== "kg" ? Number(kgI.placeholder) : null;
    const rip = ripI.value !== "" ? parseInt(ripI.value) : parseInt(ripI.placeholder) || null;
    if (rip == null || isNaN(rip)) return avviso("Scrivi le ripetizioni.");
    const r = await prova(() => db.aggiungiSerie({ sessione_id: s.id, esercizio: riga.dataset.es, numero: +riga.dataset.n, kg: isNaN(kg) ? null : kg, ripetizioni: rip }));
    if (r) { const ex = s.esercizi.find((x) => x.id === riga.dataset.es); avviaRecupero(ex ? recDi(ex) : 90); sessione(el); }
  }));
  $("#fine").onclick = async () => { await prova(() => db.chiudiSessione(s.id), "Allenamento salvato."); salvaCorrente(null); fermaRecupero(); location.hash = "#oggi"; };
  $("#annulla").onclick = async () => { if (!(await conferma("Annullo questo allenamento e cancello le serie segnate?", "Annulla allenamento", true))) return; await prova(() => db.eliminaSessione(s.id)); salvaCorrente(null); fermaRecupero(); location.hash = "#allenamento"; };
}
function avviaRecupero(sec) {
  fermaRecupero();
  const fine = Date.now() + sec * 1000;
  const box = document.createElement("div"); box.className = "timer"; box.id = "timer"; box.setAttribute("role", "timer");
  document.body.appendChild(box);
  const tick = () => {
    const r = Math.max(0, Math.round((fine - Date.now()) / 1000));
    box.innerHTML = `<span>Recupero ${Math.floor(r / 60)}:${String(r % 60).padStart(2, "0")}</span><button class="btn piccolo" id="t30">+30 s</button><button class="btn piccolo" id="tstop">Stop</button>`;
    $("#t30", box).onclick = () => { fermaRecupero(); avviaRecupero(r + 30); };
    $("#tstop", box).onclick = fermaRecupero;
    if (r === 0) { navigator.vibrate?.([200, 100, 200]); avviso("Recupero finito: prossima serie."); fermaRecupero(); }
  };
  tick(); timer = setInterval(tick, 1000);
}
function fermaRecupero() { clearInterval(timer); $("#timer")?.remove(); }

// ---------- editor scheda ----------
async function editor(el, id) {
  const tutte = (await prova(() => db.schede())) || [];
  const s = id === "nuova" ? { id: "nuova", nome: "", giorno: null, esercizi: [] } : tutte.find((x) => x.id === id);
  if (!s) { location.hash = "#allenamento"; return; }
  const disegna = () => {
    el.innerHTML = `<main class="stack"><a href="#allenamento" class="btn testo" style="align-self:flex-start">${icona("indietro", 18)} Allenamento</a>
    <h1>${id === "nuova" ? "Nuova scheda" : "Modifica scheda"}</h1>
    <label>Nome<input id="nome" value="${esc(s.nome)}" placeholder="Es. Upper A"></label>
    <label>Giorno<select id="giorno"><option value="">Libero</option>${ORDINE_GIORNI.map((g) => `<option value="${g}" ${s.giorno === g ? "selected" : ""}>${GIORNI_L[g]}</option>`).join("")}</select></label>
    <ul class="lista card piatta">${s.esercizi.map((e, i) => `<li class="stack-s"><div class="row"><button class="vedi-es" data-vedi="${esc(e.id)}" aria-label="Vedi esecuzione">${es(e.id).img?.[0] ? imgEs(es(e.id).img[0], "miniatura grande") : ""}</button><b style="flex:1">${esc(es(e.id).n)}</b><button class="btn testo" data-su="${i}" aria-label="Sposta su">↑</button><button class="btn testo" data-via="${i}" aria-label="Togli">${icona("cestino", 18)}</button></div>
      <div class="grid3"><label>Serie<input inputmode="numeric" data-serie="${i}" value="${esc(e.serie)}"></label><label>Ripetizioni<input data-rip="${i}" value="${esc(e.ripetizioni)}"></label><label>Recupero${selRec(`data-recs="${i}"`, recDi(e))}</label></div></li>`).join("") || `<li class="small muted">Nessun esercizio.</li>`}</ul>
    <button class="btn pieno" id="agg">${icona("piu", 16)} Aggiungi esercizio</button>
    <button class="btn primario pieno" id="salva">Salva scheda</button>
    ${id !== "nuova" ? `<button class="btn pericolo pieno" id="elimina">Elimina scheda</button>` : ""}</main>`;
    const leggi = () => { s.nome = $("#nome").value; s.giorno = $("#giorno").value === "" ? null : +$("#giorno").value; $$("[data-serie]").forEach((x) => (s.esercizi[+x.dataset.serie].serie = +x.value || 3)); $$("[data-rip]").forEach((x) => (s.esercizi[+x.dataset.rip].ripetizioni = x.value)); $$("[data-recs]").forEach((x) => (s.esercizi[+x.dataset.recs].recupero = +x.value)); };
    $$("[data-via]").forEach((b) => (b.onclick = () => { leggi(); s.esercizi.splice(+b.dataset.via, 1); disegna(); }));
    $$("[data-su]").forEach((b) => (b.onclick = () => { leggi(); const i = +b.dataset.su; if (i > 0) [s.esercizi[i - 1], s.esercizi[i]] = [s.esercizi[i], s.esercizi[i - 1]]; disegna(); }));
    $$("[data-vedi]").forEach((b) => (b.onclick = () => dettaglio(b.dataset.vedi)));
    $("#agg").onclick = () => { leggi(); scegliEsercizio(null, (eid) => { s.esercizi.push({ id: eid, serie: 3, ripetizioni: "8-12", recupero: es(eid).r }); chiudiModale(); disegna(); }); };
    $("#salva").onclick = async () => { leggi(); if (!s.nome.trim()) return avviso("Dai un nome alla scheda."); const ok = await prova(() => db.salvaScheda(s), "Scheda salvata."); if (ok !== undefined) location.hash = "#allenamento"; };
    $("#elimina") && ($("#elimina").onclick = async () => { if (await conferma("Elimino questa scheda? Lo storico degli allenamenti resta.", "Elimina", true)) { await prova(() => db.eliminaScheda(s.id)); location.hash = "#allenamento"; } });
  };
  disegna();
}

// ---------- libreria esercizi ----------
const statoPicker = { q: "", cat: "Tutti", att: "Tutti", limite: 40 };
export function scegliEsercizio(muscolo, scelto) {
  const st = statoPicker;
  if (muscolo !== undefined && muscolo !== st.ultimoMuscolo) { st.filtro = muscolo; st.ultimoMuscolo = muscolo; }
  const CATS = ["Tutti", "Forza", "Powerlifting", "Sollevamento olimpico", "Pliometria", "Stretching e mobilità", "Cardio", "Strongman"];
  const ATTREZZI = ["Tutti", ...new Set(S.esercizi.map((e) => e.a))];
  apriModale(`<div class="stack picker"><div class="row between"><h2>Esercizi <span class="xs muted">(${S.esercizi.length})</span></h2><button class="btn piccolo" data-chiudi>Chiudi</button></div>
  <input id="q" placeholder="Cerca (es. panca, squat, curl, lat)" autocomplete="off" value="${esc(st.q)}">
  <div class="scorri-x">${Object.entries(NOMI).map(([k, n]) => `<button class="chip" data-m="${k}" aria-pressed="${k === st.filtro}">${n}</button>`).join("")}</div>
  <div class="grid2"><label>Tipo<select id="cat">${CATS.map((c) => `<option ${c === st.cat ? "selected" : ""}>${c}</option>`).join("")}</select></label><label>Attrezzo<select id="att">${ATTREZZI.map((c) => `<option ${c === st.att ? "selected" : ""}>${esc(c)}</option>`).join("")}</select></label></div>
  <p class="xs muted" id="conta"></p><div class="griglia-es" id="ris"></div><button class="btn pieno" id="altri" hidden>Mostra altri</button></div>`, (m) => {
    const norm = (t) => t.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const mostra = () => {
      const q = norm(st.q).split(/\s+/).filter(Boolean);
      const r = S.esercizi.filter((e) => (!st.filtro || e.p.includes(st.filtro)) && (st.cat === "Tutti" || e.c === st.cat) && (st.att === "Tutti" || e.a === st.att)
        && q.every((w) => norm(e.n + " " + e.en).includes(w)))
        .sort((a, b) => (b.top - a.top) || a.n.localeCompare(b.n));
      $("#conta", m).textContent = `${r.length} esercizi · tocca per vedere l'esecuzione`;
      $("#ris", m).innerHTML = r.slice(0, st.limite).map((e) => `<button class="carta-es" data-id="${esc(e.id)}">${e.img?.[0] ? imgEs(e.img[0], "carta-img", e.n) : `<span class="carta-img"></span>`}${e.top ? '<span class="stella">★</span>' : ""}<span class="carta-testo"><b>${esc(e.n)}</b><span>${e.p.map((x) => NOMI[x]).join(", ")} · ${esc(e.a)}</span></span></button>`).join("") || `<p class="small muted">Nessun esercizio trovato.</p>`;
      $("#altri", m).hidden = r.length <= st.limite;
      $$("[data-id]", m).forEach((b) => (b.onclick = () => dettaglio(b.dataset.id, { aggiungi: scelto ? () => scelto(b.dataset.id) : null, indietro: () => scegliEsercizio(undefined, scelto) })));
    };
    $("#q", m).oninput = (e) => { st.q = e.target.value; st.limite = 40; mostra(); };
    $("#cat", m).onchange = (e) => { st.cat = e.target.value; st.limite = 40; mostra(); };
    $("#att", m).onchange = (e) => { st.att = e.target.value; st.limite = 40; mostra(); };
    $("#altri", m).onclick = () => { st.limite += 40; mostra(); };
    $$("[data-m]", m).forEach((b) => (b.onclick = () => { st.filtro = st.filtro === b.dataset.m ? null : b.dataset.m; st.limite = 40; $$("[data-m]", m).forEach((x) => x.setAttribute("aria-pressed", x.dataset.m === st.filtro)); mostra(); }));
    mostra();
  });
}
export function dettaglio(id, azioni = {}) {
  const e = es(id);
  apriModale(`<div class="stack">${azioni.indietro ? `<button class="btn testo xs" id="indietro" style="align-self:flex-start">‹ Torna alla lista</button>` : ""}<div class="row between"><h2>${esc(e.n)}</h2><button class="btn piccolo" data-chiudi>Chiudi</button></div>
  ${e.img?.length ? `<div style="position:relative">${imgEs(e.img[0], "esercizio-img", e.n)}${e.img[1] ? `<div style="position:absolute;inset:0" id="anim">${imgEs(e.img[1], "esercizio-img", "")}</div>` : ""}</div><div class="row between"><p class="xs muted">Partenza e arrivo si alternano.</p><button class="btn testo xs" id="pausa-anim">Pausa</button></div>
  ${e.img[1] ? `<div class="grid2">${imgEs(e.img[0], "esercizio-img", "Posizione iniziale")}${imgEs(e.img[1], "esercizio-img", "Posizione finale")}</div>` : ""}` : ""}
  ${azioni.aggiungi ? `<div class="barra-azione"><button class="btn primario pieno grande" id="aggiungi">Aggiungi alla scheda</button></div>` : ""}
  <div class="row wrap" style="gap:6px">${e.p.map((m) => `<span class="chip" aria-pressed="true">${NOMI[m]}</span>`).join("")}${e.s.map((m) => `<span class="chip">${NOMI[m]}</span>`).join("")}</div>
  <p class="small muted">${esc(e.a)} · ${esc(e.l)} · ${esc(e.c || "")} · recupero consigliato ${fmtRec(e.r || 90)}</p>
  <h3>Come si fa (testo originale in inglese)</h3><ol class="small" style="padding-left:20px;margin:0">${(e.i || []).map((t) => `<li>${esc(t)}</li>`).join("")}</ol>
  <p class="xs muted">Immagini e istruzioni: Free Exercise DB (pubblico dominio). Per la tecnica in italiano chiedi all'assistente.</p></div>`, (m) => {
    $("#indietro", m) && ($("#indietro", m).onclick = azioni.indietro);
    $("#aggiungi", m) && ($("#aggiungi", m).onclick = azioni.aggiungi);
    const a = $("#anim", m); if (!a) return;
    let on = false, ferma = false; const t = setInterval(() => { if (!document.body.contains(a)) return clearInterval(t); if (ferma) return; on = !on; a.style.opacity = on ? 1 : 0; }, 1000);
    $("#pausa-anim", m).onclick = (ev) => { ferma = !ferma; ev.target.textContent = ferma ? "Riprendi" : "Pausa"; };
    a.style.transition = "opacity .3s"; a.style.opacity = 0;
  });
}
