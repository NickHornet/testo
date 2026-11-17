import * as db from "./db.js";
import { S, $, $$, esc, avviso, apriModale, chiudiModale, conferma, prova, icona, GIORNI_L, oraCH } from "./ui.js";
import { noteRilevanti, markdown, estraiPiano } from "./assistente.js";
import { fabbisogno } from "./nutrizione.js";

const CHIAVE = "testo_chat";
const leggi = () => { try { return JSON.parse(sessionStorage.getItem(CHIAVE) || "[]"); } catch { return []; } };
const scrivi = (m) => sessionStorage.setItem(CHIAVE, JSON.stringify(m.slice(-30)));
const SUGGERIMENTI = ["Fammi una dieta per la massa adatta ai miei orari", "Crea una scheda di 4 giorni", "Quanti omega-3 dovrei prendere?", "Con la panca non sento il petto, cosa cambio?", "Quante proteine mi servono?"];

function testoProfilo() {
  const p = S.profilo || {}, f = fabbisogno(p), c = S.consensi;
  const r = [`Età: ${p.anno_nascita ? new Date().getFullYear() - p.anno_nascita : "?"} anni`, `Sesso: ${p.sesso || "?"}`];
  if (c.salute?.accettato) { r.push(`Altezza: ${p.altezza_cm || "?"} cm`, `Peso: ${p.peso_kg || "?"} kg`); if (p.limitazioni) r.push(`Limitazioni: ${p.limitazioni}`); }
  else r.push("Dati sulla salute: non condivisi (dai solo indicazioni generali, niente calcoli personali di calorie)");
  r.push(`Obiettivo: ${p.obiettivo}`, `Livello: ${p.livello}`, `Allenamenti a settimana: ${p.allenamenti_sett}`,
    `Sveglia: ${p.sveglia || "?"}, a letto: ${p.a_letto || "?"}`, `Lavoro: ${p.lavoro_dalle ? `${p.lavoro_dalle}-${p.lavoro_alle}` : "non indicato"}`, `Pausa pranzo: ${p.pausa_pranzo || "?"}`,
    `Ora allenamento: ${p.ora_allenamento || "?"}`, `Pesce a settimana: ${p.pesce_sett ?? "?"}`, `Vegano: ${p.vegano ? "sì" : "no"}`, `Caffeina: ${p.caffeina_ok === false ? "preferisce evitarla" : "ok"}`);
  if (f && c.salute?.accettato) r.push(`Stima già calcolata dall'app: mantenimento ${f.mantenimento} kcal, obiettivo ${f.kcal} kcal, proteine ${f.p} g`);
  return r.join("\n");
}

export async function render(el) {
  const c = S.consensi;
  if (!c.ia?.accettato) {
    el.innerHTML = `<main class="stack"><header class="head"><h1>Assistente IA</h1></header><section class="card stack-s"><p>Per usare l'assistente serve il tuo consenso.</p>
    <p class="small muted">Le tue domande e i dati del profilo necessari, senza email, vengono elaborati da un modello di intelligenza artificiale (Groq, server negli USA). Non scrivere nomi, indirizzi o dati di salute che non servono. Le risposte sono generate automaticamente e possono contenere errori.</p>
    <button class="btn primario pieno" id="ok">Attiva l'assistente</button></section></main>`;
    $("#ok").onclick = async () => { await prova(() => db.daiConsenso("ia", true)); S.consensi = await db.consensi(); render(el); };
    return;
  }
  const avvisoVisto = localStorage.getItem("testo_avviso_ia") === "1";
  const msgs = leggi();
  el.innerHTML = `<main class="stack">
  <header class="head"><div><h1>Assistente IA</h1><span class="etichetta">INTELLIGENZA ARTIFICIALE · STUDI DELL'ARCHIVIO</span></div><button class="btn piccolo" id="nuova">Nuova chat</button></header>
  ${avvisoVisto ? "" : `<section class="card stack-s" style="border-color:#FFB35C"><span class="etichetta warn">PRIMA DI INIZIARE</span><p class="small">Le risposte sono generate da un'<b>intelligenza artificiale</b> sulla base di studi scientifici. Possono contenere errori e non sostituiscono il parere di un medico o di un dietista.</p><button class="btn pieno" id="capito">Ho capito</button></section>`}
  <div class="chat" id="chat">${msgs.length ? msgs.map(bolla).join("") : `<div class="stack-s"><p class="small muted">Prova a chiedere:</p>${SUGGERIMENTI.map((s) => `<button class="chip" data-s="${esc(s)}" style="justify-content:flex-start;text-align:left;min-height:40px">${esc(s)}</button>`).join("")}</div>`}</div>
  <p class="xs muted" style="text-align:center">Assistente IA: le risposte possono contenere errori. Non è un parere medico. Su sostanze dopanti parla solo dei rischi per la salute.</p>
  <form id="f" class="row" style="position:sticky;bottom:calc(84px + env(safe-area-inset-bottom));background:var(--bg);padding:8px 0"><label class="sr" for="d">Domanda</label><textarea id="d" rows="1" placeholder="Chiedi all'assistente IA…" style="min-height:50px;height:50px"></textarea><button class="btn primario" aria-label="Invia" style="width:52px;flex:none">${icona("invia", 20)}</button></form></main>`;
  $("#capito") && ($("#capito").onclick = () => { localStorage.setItem("testo_avviso_ia", "1"); render(el); });
  $("#nuova").onclick = () => { scrivi([]); render(el); };
  $$("[data-s]", el).forEach((b) => (b.onclick = () => invia(el, b.dataset.s)));
  attivaPiani(el);
  $("#f").onsubmit = (e) => { e.preventDefault(); const t = $("#d").value.trim(); if (t) invia(el, t); };
  const pre = sessionStorage.getItem("testo_domanda"); if (pre) { sessionStorage.removeItem("testo_domanda"); $("#d").value = pre; }
  $("#d").onkeydown = (e) => { if (e.key === "Enter" && !e.shiftKey && !("ontouchstart" in window)) { e.preventDefault(); $("#f").requestSubmit(); } };
  const ultimo = $("#chat").lastElementChild; ultimo?.scrollIntoView({ block: "start" });
}
function bolla(m, i) {
  if (m.role === "user") return `<div class="msg-utente">${esc(m.content)}</div>`;
  const { testo, piano } = estraiPiano(m.content);
  return `<div class="msg-ia card stack-s"><span class="etichetta-ia">ASSISTENTE IA</span><div class="corpo-testo small">${markdown(testo)}</div>
  ${piano ? cardPiano(piano, i) : ""}
  ${m.fonti?.length ? `<div class="row wrap" style="gap:6px">${m.fonti.map((f) => `<span class="fonte">${esc(f)}</span>`).join("")}</div>` : ""}
  <span class="xs muted" style="border-top:1px solid var(--line);padding-top:8px">Risposta generata dall'IA · verifica le fonti citate</span></div>`;
}
function cardPiano(piano, i) {
  if (piano.tipo === "calendario" && Array.isArray(piano.voci)) {
    const n = piano.voci.length;
    return `<div class="card piatta stack-s" style="border-color:#FF2E43"><b class="small">Piano giornaliero · ${n} voci</b><ul class="lista xs">${piano.voci.slice(0, 12).map((v) => `<li><span class="mono">${esc(v.ora)}</span> ${esc(v.titolo)} <span class="muted">· ${(v.giorni || []).map((g) => GIORNI_L[g]?.slice(0, 3)).join(" ")}</span></li>`).join("")}</ul><div class="grid2"><button class="btn primario" data-salva="${i}">Mi piace, salvalo</button><button class="btn" data-cambia>Cambia qualcosa</button></div></div>`;
  }
  if (piano.tipo === "scheda" && Array.isArray(piano.schede)) {
    return `<div class="card piatta stack-s" style="border-color:#FF2E43"><b class="small">Schede di allenamento · ${piano.schede.length}</b><ul class="lista xs">${piano.schede.map((s) => `<li><b>${esc(s.nome)}</b> ${s.giorno != null ? "· " + GIORNI_L[s.giorno] : ""}<br><span class="muted">${(s.esercizi || []).map((e) => `${esc(S.mappaEs.get(e.id)?.n || e.id)} ${e.serie}×${esc(e.ripetizioni)}`).join(" · ")}</span></li>`).join("")}</ul><div class="grid2"><button class="btn primario" data-salva="${i}">Mi piace, salvale</button><button class="btn" data-cambia>Cambia qualcosa</button></div></div>`;
  }
  return "";
}
function attivaPiani(el) {
  $$("[data-cambia]", el).forEach((b) => (b.onclick = () => { $("#d").value = "Vorrei cambiare: "; $("#d").focus(); }));
  $$("[data-salva]", el).forEach((b) => (b.onclick = async () => {
    const m = leggi()[+b.dataset.salva]; const { piano } = estraiPiano(m.content);
    if (piano.tipo === "calendario") {
      const valide = piano.voci.filter((v) => /^\d{1,2}:\d{2}$/.test(v.ora) && v.titolo);
      const sostituisci = await conferma(`Aggiungo ${valide.length} voci al calendario, con i promemoria. Vuoi prima togliere le voci create in precedenza da piani o giornata tipo?`, "Sì, sostituisci");
      await prova(async () => {
        if (sostituisci) for (const v of (await db.voci()).filter((x) => ["assistente", "giornata"].includes(x.origine))) await db.eliminaVoce(v.id);
        for (const v of valide) await db.aggiungiVoce({ titolo: String(v.titolo).slice(0, 80), ora: v.ora.padStart(5, "0"), tipo: ["pasto", "integratore", "allenamento", "recupero", "altro"].includes(v.tipo) ? v.tipo : "altro", dettaglio: v.dettaglio ? String(v.dettaglio).slice(0, 300) : null, giorni: (v.giorni || [1, 2, 3, 4, 5, 6, 0]).filter((g) => g >= 0 && g <= 6), promemoria: true, anticipo_min: v.tipo === "allenamento" ? 30 : 0, origine: "assistente" });
      }, "Salvato nel calendario, con i promemoria.");
      b.closest(".card").innerHTML = `<b class="small ok">Salvato nel calendario</b><a class="btn piccolo" href="#calendario">Apri il calendario ›</a>`;
    } else {
      await prova(async () => {
        for (const s of piano.schede) await db.salvaScheda({ nome: String(s.nome).slice(0, 60), giorno: s.giorno ?? null, esercizi: (s.esercizi || []).filter((e) => S.mappaEs.has(e.id)).map((e) => ({ id: e.id, serie: +e.serie || 3, ripetizioni: String(e.ripetizioni || "8-12") })) });
      }, "Schede salvate in Allenamento.");
      b.closest(".card").innerHTML = `<b class="small ok">Schede salvate</b><a class="btn piccolo" href="#allenamento">Apri Allenamento ›</a>`;
    }
  }));
}
async function invia(el, testo) {
  const msgs = leggi();
  msgs.push({ role: "user", content: testo }); scrivi(msgs);
  render(el);
  const chat = $("#chat");
  chat.insertAdjacentHTML("beforeend", `<div class="msg-ia card" id="attesa"><span class="etichetta-ia">ASSISTENTE IA</span><p class="small muted puntini">Sto cercando negli studi</p></div>`);
  $("#attesa").scrollIntoView({ block: "end" });
  try {
    const note = await noteRilevanti(msgs.slice(-3).filter((m) => m.role === "user").map((m) => m.content).join(" "));
    const ch = oraCH();
    const r = await db.chiediAssistente({
      messaggi: msgs.slice(-10).map((m) => ({ role: m.role, content: m.content })),
      note, profilo: testoProfilo(), oggi: `${GIORNI_L[ch.giorno]} ${ch.iso}`,
      esercizi: S.esercizi.filter((e) => e.top).map((e) => `${e.id} | ${e.n}`).join("\n"),
    });
    msgs.push({ role: "assistant", content: r.testo || "Nessuna risposta.", fonti: note.map((n) => n.t) });
  } catch (e) {
    msgs.push({ role: "assistant", content: `⚠️ ${e.message}` });
  }
  scrivi(msgs); render(el);
}
