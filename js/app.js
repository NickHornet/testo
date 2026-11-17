import * as db from "./db.js";
import { S, $, $$, esc, avviso, apriModale, chiudiModale, conferma, prova, icona, logo, wordmark, oraCH, lunediDi, isoData, GIORNI, GIORNI_L, ORDINE_GIORNI } from "./ui.js";
import { corpo, livello, NOMI } from "./corpo.js";
import { fabbisogno, consigliIntegratori, giornataTipo } from "./nutrizione.js";
import * as allenamento from "./allenamento.js";
import * as calendario from "./calendario.js";
import * as dieta from "./dieta.js";
import * as chat from "./chat.js";
import * as documenti from "./documenti.js";

const CFG = window.TESTO_CONFIG || {};
const app = $("#app");
const TABS = [["oggi", "Oggi"], ["allenamento", "Allenamento"], ["calendario", "Calendario"], ["dieta", "Dieta"], ["assistente", "Assistente"], ["profilo", "Profilo"]];

// ---------------- avvio ----------------
async function avvio() {
  registraServiceWorker();
  try { S.esercizi = await (await fetch("dati/esercizi.json")).json(); S.mappaEs = new Map(S.esercizi.map((e) => [e.id, e])); } catch {}
  db.quandoCambiaAccesso(async (ev, u) => {
    if (ev === "PASSWORD_RECOVERY") { location.hash = "#nuova-password"; return; }
    if (ev === "SIGNED_IN" && !S.utente) { S.utente = u; await caricaUtente(); vai(); }
    if (ev === "SIGNED_OUT") { S.utente = null; S.profilo = null; vai(); }
  });
  S.utente = await db.utente();
  if (S.utente) await caricaUtente();
  window.addEventListener("hashchange", vai);
  vai();
}
async function caricaUtente() {
  await completaRegistrazioneInSospeso();
  S.profilo = await prova(() => db.profilo());
  S.consensi = (await prova(() => db.consensi())) || {};
}
async function completaRegistrazioneInSospeso() {
  let p; try { p = JSON.parse(localStorage.getItem("testo_in_sospeso") || "null"); } catch {}
  if (!p) return;
  if (!p.consensi) return;
  const ok = await prova(async () => { for (const [t, v] of Object.entries(p.consensi)) await db.daiConsenso(t, v); });
  if (ok !== undefined) localStorage.setItem("testo_in_sospeso", JSON.stringify({ anno: p.anno }));
}
function registraServiceWorker() {
  if (!("serviceWorker" in navigator)) return;
  navigator.serviceWorker.register("sw.js").then((reg) => {
    reg.update?.();
    reg.addEventListener("updatefound", () => {
      const n = reg.installing;
      n?.addEventListener("statechange", () => { if (n.state === "installed" && navigator.serviceWorker.controller) avviso("App aggiornata: si ricarica…", 1500), setTimeout(() => location.reload(), 1500); });
    });
  }).catch(() => {});
}

// ---------------- router ----------------
function vai() {
  const [rotta, param] = (location.hash.slice(1) || "").split("/");
  window.scrollTo(0, 0);
  chiudiModale();
  const libere = { benvenuto, registrati, accedi, "nuova-password": nuovaPassword, documento: (el) => documenti.mostra(el, param) };
  if (!S.utente) {
    mostraTab(false);
    return (libere[rotta] || benvenuto)(app, param);
  }
  if (rotta === "documento") { mostraTab(true, "profilo"); return documenti.mostra(app, param); }
  if (rotta === "nuova-password") { mostraTab(false); return nuovaPassword(app); }
  if (!S.profilo) { mostraTab(false); return profiloIniziale(app); }
  const sez = {
    oggi, profilo, privacy, promemoria,
    allenamento: (el) => allenamento.render(el, param), sessione: (el) => allenamento.sessione(el),
    calendario: (el) => calendario.render(el, param), dieta: (el) => dieta.render(el, param), assistente: (el) => chat.render(el),
  };
  const f = sez[rotta] || oggi;
  const tab = rotta === "sessione" ? "allenamento" : ["privacy", "promemoria"].includes(rotta) ? "profilo" : (sez[rotta] ? rotta : "oggi");
  mostraTab(true, tab);
  f(app, param);
}
function mostraTab(si, attiva) {
  const t = $("#tabbar");
  t.hidden = !si; app.classList.toggle("vuota", !si);
  if (!si) return;
  t.innerHTML = TABS.map(([k, n]) => `<a href="#${k}" ${k === attiva ? 'aria-current="page"' : ""}>${icona(k)}<span>${n}</span></a>`).join("");
}
export function ridisegna() { vai(); }

// ---------------- benvenuto e account ----------------
function benvenuto(el) {
  el.innerHTML = `<main class="stack" style="min-height:85dvh;justify-content:space-between;padding-top:30px">
  <span class="etichetta" style="text-align:center">VERSIONE DI PROVA ${db.ONLINE ? "" : "· MODALITÀ LOCALE"}</span>
  <div class="logo-wrap">${logo(130)}${wordmark()}<span class="mono xs red" style="letter-spacing:.14em">TRAINING · EVOLUTION · STRENGTH<br>TRANSFORMATION · OPTIMIZATION</span>
  <p style="font-size:17px;font-weight:600;margin-top:10px">Il tuo coach basato sulla scienza</p>
  <p class="muted small">Allenamenti, pasti, promemoria e un assistente IA che risponde con oltre trent'anni di studi.</p></div>
  <div class="stack-s"><a class="btn primario pieno" href="#registrati">Crea il tuo account</a><a class="btn pieno" href="#accedi">Ho già un account</a>
  <p class="xs muted" style="text-align:center"><a href="#documento/privacy">Privacy</a> · <a href="#documento/condizioni">Condizioni d'uso</a> · <a href="#documento/impressum">Impressum</a></p></div></main>`;
}
function registrati(el) {
  const anno = new Date().getFullYear();
  el.innerHTML = `<main class="stack">
  <a href="#benvenuto" class="btn testo" style="align-self:flex-start">${icona("indietro", 18)} Indietro</a>
  <div class="row">${logo(40)}${wordmark().replace("wordmark", "wordmark\" style=\"font-size:16px")}</div>
  <h1>Crea il tuo account</h1>
  <form id="f" class="stack" novalidate>
    <label>Email<input name="email" type="email" autocomplete="email" required placeholder="nome@esempio.ch"></label>
    <label>Password<input name="pw" type="password" autocomplete="new-password" minlength="8" required placeholder="Almeno 8 caratteri"><span class="aiuto">Salvata solo in forma cifrata.</span></label>
    <label>Anno di nascita<input name="anno" inputmode="numeric" pattern="[0-9]{4}" required placeholder="AAAA"><span class="aiuto">Serve per l'età minima (16 anni) e per il fabbisogno. Non chiediamo nome né cognome.</span></label>
    <section class="card piatta stack-s" aria-labelledby="c1"><h3 id="c1">Obbligatori</h3>
      <label class="check"><input type="checkbox" name="eta"> <span>Ho almeno 16 anni.</span></label>
      <label class="check"><input type="checkbox" name="termini"> <span>Accetto le <a href="#documento/condizioni" target="_blank">Condizioni d'uso</a> e ho letto l'<a href="#documento/privacy" target="_blank">Informativa sulla privacy</a>.</span></label>
      <h3 style="margin-top:8px">Facoltativi (consigliati)</h3>
      <label class="check"><input type="checkbox" name="salute"> <span><b>Dati sulla salute e piani personalizzati.</b> Acconsento in modo esplicito che T.E.S.T.O. tratti i miei dati sulla salute (peso, misure, limitazioni) per calcolare fabbisogni e creare piani adatti a me. Posso revocarlo quando voglio.</span></label>
      <label class="check"><input type="checkbox" name="ia"> <span><b>Assistente IA.</b> Acconsento che le mie domande e i dati del profilo necessari, senza email, siano elaborati da un modello di intelligenza artificiale (Groq, USA) per rispondere e creare piani. Le risposte sono generate automaticamente e possono contenere errori.</span></label>
      <label class="check"><input type="checkbox" name="email_n"> <span>Voglio ricevere email sulle novità dell'app.</span></label>
    </section>
    <p id="errore" class="small warn" role="alert"></p>
    <button class="btn primario pieno" type="submit">Crea account</button>
  </form></main>`;
  $("#f").onsubmit = async (e) => {
    e.preventDefault();
    const f = e.target, er = $("#errore");
    const a = +f.anno.value;
    if (!/^\S+@\S+\.\S+$/.test(f.email.value)) return (er.textContent = "Inserisci un'email valida.");
    if (f.pw.value.length < 8) return (er.textContent = "La password deve avere almeno 8 caratteri.");
    if (!(a > 1900 && a <= anno)) return (er.textContent = "Inserisci l'anno di nascita (4 cifre).");
    if (anno - a < 16) return (er.textContent = "L'app è riservata a chi ha almeno 16 anni.");
    if (!f.eta.checked || !f.termini.checked) return (er.textContent = "Per continuare servono i due consensi obbligatori.");
    const cons = { eta: true, termini: true, salute: f.salute.checked, ia: f.ia.checked, email: f.email_n.checked };
    localStorage.setItem("testo_in_sospeso", JSON.stringify({ consensi: cons, anno: a }));
    f.querySelector("button").disabled = true;
    const r = await prova(() => db.registrati(f.email.value.trim(), f.pw.value));
    f.querySelector("button").disabled = false;
    if (!r) return;
    if (!r.session) {
      el.innerHTML = `<main class="stack" style="padding-top:40px"><div class="logo-wrap">${logo(80)}</div><h1>Controlla la tua email</h1><p class="muted">Ti abbiamo mandato un link per confermare l'account. Dopo la conferma, torna qui e accedi.</p><a class="btn primario pieno" href="#accedi">Vai ad accedere</a></main>`;
      return;
    }
    S.utente = await db.utente();
    await caricaUtente();
    location.hash = "#profilo-iniziale"; vai();
  };
}
function accedi(el) {
  el.innerHTML = `<main class="stack">
  <a href="#benvenuto" class="btn testo" style="align-self:flex-start">${icona("indietro", 18)} Indietro</a>
  <div class="row">${logo(40)}</div><h1>Accedi</h1>
  <form id="f" class="stack" novalidate>
    <label>Email<input name="email" type="email" autocomplete="email" required></label>
    <label>Password<input name="pw" type="password" autocomplete="current-password" required></label>
    <p id="errore" class="small warn" role="alert"></p>
    <button class="btn primario pieno" type="submit">Accedi</button>
    <button class="btn testo" type="button" id="dim">Password dimenticata?</button>
  </form></main>`;
  $("#f").onsubmit = async (e) => {
    e.preventDefault(); const f = e.target;
    f.querySelector("[type=submit]").disabled = true;
    const u = await prova(() => db.accedi(f.email.value.trim(), f.pw.value));
    f.querySelector("[type=submit]").disabled = false;
    if (!u) return;
    S.utente = await db.utente(); await caricaUtente(); location.hash = "#oggi"; vai();
  };
  $("#dim").onclick = async () => {
    const email = $("#f").email.value.trim();
    if (!email) return ($("#errore").textContent = "Scrivi prima la tua email qui sopra.");
    await prova(() => db.resetPassword(email), "Se l'email esiste, riceverai un link per cambiare la password.");
  };
}
function nuovaPassword(el) {
  el.innerHTML = `<main class="stack"><h1>Nuova password</h1><form id="f" class="stack"><label>Nuova password<input name="pw" type="password" minlength="8" autocomplete="new-password" required></label><button class="btn primario pieno">Salva</button></form></main>`;
  $("#f").onsubmit = async (e) => { e.preventDefault(); const ok = await prova(() => db.nuovaPassword(e.target.pw.value), "Password aggiornata."); if (ok !== undefined) location.hash = "#oggi"; };
}

// ---------------- profilo ----------------
function campiProfilo(p, salute) {
  const sel = (n, opts, v) => `<select name="${n}">${opts.map(([k, l]) => `<option value="${k}" ${String(v) === String(k) ? "selected" : ""}>${l}</option>`).join("")}</select>`;
  const ora = (n, l, v, aiuto = "") => `<label>${l}<input type="time" name="${n}" value="${esc(v || "")}">${aiuto ? `<span class="aiuto">${aiuto}</span>` : ""}</label>`;
  return `
  <section class="stack"><h3>Su di te</h3>
  <div class="grid2"><label>Sesso${sel("sesso", [["uomo", "Uomo"], ["donna", "Donna"]], p.sesso || "uomo")}</label>
  <label>Anno di nascita<input name="anno_nascita" inputmode="numeric" value="${esc(p.anno_nascita || "")}" required></label></div>
  ${salute ? `<div class="grid2"><label>Altezza (cm)<input name="altezza_cm" inputmode="decimal" value="${esc(p.altezza_cm || "")}"></label><label>Peso (kg)<input name="peso_kg" inputmode="decimal" value="${esc(p.peso_kg || "")}"></label></div>` : `<p class="small muted">Peso, altezza e limitazioni si inseriscono solo con il consenso ai dati sulla salute (Profilo → Privacy).</p>`}
  <div class="grid2"><label>Obiettivo${sel("obiettivo", [["massa", "Massa"], ["definizione", "Definizione"], ["mantenimento", "Mantenimento"], ["forza", "Forza"]], p.obiettivo || "massa")}</label>
  <label>Livello${sel("livello", [["principiante", "Principiante"], ["intermedio", "Intermedio"], ["avanzato", "Avanzato"]], p.livello || "intermedio")}</label></div>
  <label>Allenamenti a settimana${sel("allenamenti_sett", [0, 1, 2, 3, 4, 5, 6].map((n) => [n, n]), p.allenamenti_sett ?? 4)}</label>
  ${salute ? `<label>Infortuni o limitazioni (facoltativo)<textarea name="limitazioni" placeholder="Es. dolore alla spalla destra sopra la testa">${esc(p.limitazioni || "")}</textarea></label>` : ""}
  </section>
  <section class="stack"><h3>La tua giornata</h3><p class="small muted">Servono per mettere pasti, integratori e allenamenti agli orari giusti per te.</p>
  <div class="grid2">${ora("sveglia", "Sveglia", p.sveglia || "07:00")}${ora("a_letto", "A letto", p.a_letto || "23:00")}</div>
  <div class="grid2">${ora("lavoro_dalle", "Lavoro dalle", p.lavoro_dalle)}${ora("lavoro_alle", "Lavoro alle", p.lavoro_alle)}</div>
  <div class="grid2">${ora("pausa_pranzo", "Pausa pranzo", p.pausa_pranzo || "12:30")}${ora("ora_allenamento", "Ora allenamento", p.ora_allenamento || "18:00")}</div>
  </section>
  <section class="stack"><h3>Abitudini</h3>
  <div class="grid2"><label>Pesce a settimana${sel("pesce_sett", [0, 1, 2, 3, 4].map((n) => [n, n === 4 ? "4 o più" : n]), p.pesce_sett ?? 1)}</label>
  <label>Alimentazione${sel("vegano", [["false", "Onnivora / vegetariana"], ["true", "Vegana"]], String(!!p.vegano))}</label></div>
  <label>Caffeina${sel("caffeina_ok", [["true", "La tollero bene"], ["false", "Preferisco evitarla"]], String(p.caffeina_ok !== false))}</label>
  </section>`;
}
function leggiProfilo(f) {
  const d = Object.fromEntries(new FormData(f));
  const num = (v) => (v === "" || v == null ? null : Number(String(v).replace(",", ".")));
  return {
    sesso: d.sesso, anno_nascita: num(d.anno_nascita), altezza_cm: num(d.altezza_cm), peso_kg: num(d.peso_kg),
    obiettivo: d.obiettivo, livello: d.livello, allenamenti_sett: num(d.allenamenti_sett),
    sveglia: d.sveglia || null, a_letto: d.a_letto || null, lavoro_dalle: d.lavoro_dalle || null, lavoro_alle: d.lavoro_alle || null,
    pausa_pranzo: d.pausa_pranzo || null, ora_allenamento: d.ora_allenamento || null,
    pesce_sett: num(d.pesce_sett), vegano: d.vegano === "true", caffeina_ok: d.caffeina_ok === "true", limitazioni: d.limitazioni ?? null,
  };
}
function pulisciSenzaSalute(p) {
  if (S.consensi.salute?.accettato) return p;
  const { altezza_cm, peso_kg, limitazioni, ...resto } = p; return resto;
}
function profiloIniziale(el) {
  let anno = ""; try { anno = JSON.parse(localStorage.getItem("testo_in_sospeso") || "{}").anno || ""; } catch {}
  const salute = !!S.consensi.salute?.accettato;
  el.innerHTML = `<main class="stack"><span class="etichetta">PASSO 2 DI 2</span><h1>Il tuo profilo</h1><p class="muted small">Puoi cambiare tutto più avanti in Profilo.</p>
  <form id="f" class="stack">${campiProfilo({ anno_nascita: anno }, salute)}<p id="errore" class="small warn" role="alert"></p><button class="btn primario pieno">Salva e inizia</button></form></main>`;
  $("#f").onsubmit = async (e) => {
    e.preventDefault();
    const p = pulisciSenzaSalute(leggiProfilo(e.target));
    if (!p.anno_nascita || new Date().getFullYear() - p.anno_nascita < 16) return ($("#errore").textContent = "Controlla l'anno di nascita (età minima 16 anni).");
    const ok = await prova(() => db.salvaProfilo(p));
    if (ok === undefined) return;
    localStorage.removeItem("testo_in_sospeso");
    S.profilo = await db.profilo();
    if (!S.profilo) return;
    history.replaceState(null, "", "#oggi"); vai();
    apriModale(`<div class="stack"><h2>Vuoi la tua giornata tipo?</h2><p class="small muted">Creo nel calendario pasti, allenamenti e sonno ai tuoi orari, con i promemoria. Potrai cambiare tutto.</p>
      <button class="btn primario pieno" id="si">Sì, creala</button><button class="btn pieno" data-chiudi>Più tardi</button></div>`, (m) => {
      $("#si", m).onclick = async () => { await creaGiornataTipo(); chiudiModale(); location.hash = "#calendario"; };
    });
  };
}
export async function creaGiornataTipo() {
  const v = giornataTipo(S.profilo || {});
  await prova(async () => { for (const x of v) await db.aggiungiVoce(x); }, `${v.length} voci aggiunte al calendario.`);
}
function profilo(el) {
  const p = S.profilo || {};
  const f = fabbisogno(p);
  const salute = !!S.consensi.salute?.accettato;
  el.innerHTML = `<main class="stack">
  <header class="head"><h1>Profilo</h1><span class="xs muted">${esc(S.utente?.email || "")}</span></header>
  ${f ? `<section class="card stack-s"><h3>Il tuo fabbisogno stimato</h3><div class="grid3">
    <div><span class="xs muted">Calorie</span><br><b class="mono">${f.kcal}</b></div><div><span class="xs muted">Proteine</span><br><b class="mono">${f.p} g</b></div><div><span class="xs muted">Mantenimento</span><br><b class="mono">${f.mantenimento}</b></div></div>
    <p class="xs muted">Mifflin-St Jeor × attività (${f.att.toFixed(2)}), obiettivo ${esc(p.obiettivo)}. Proteine ${f.gkg} g/kg. È una stima: si corregge con il peso reale dopo 2 settimane.</p></section>` : ""}
  <div class="grid2"><a class="btn" href="#promemoria">${icona("campana", 18)} Promemoria</a><a class="btn" href="#privacy">Privacy e dati</a></div>
  <form id="f" class="stack">${campiProfilo(p, salute)}<button class="btn primario pieno">Salva profilo</button></form>
  <section class="stack-s"><button class="btn pieno" id="giornata">Ricrea la mia giornata tipo nel calendario</button>
  <button class="btn pieno" id="esci">Esci</button>
  <p class="xs muted" style="text-align:center"><a href="#documento/privacy">Privacy</a> · <a href="#documento/condizioni">Condizioni</a> · <a href="#documento/impressum">Impressum</a> · <a href="#documento/crediti">Crediti</a><br>T.E.S.T.O. versione di prova ${esc(CFG.versione || "")}</p></section></main>`;
  $("#f").onsubmit = async (e) => {
    e.preventDefault();
    const np = pulisciSenzaSalute(leggiProfilo(e.target));
    if (!np.anno_nascita || new Date().getFullYear() - np.anno_nascita < 16) return avviso("Controlla l'anno di nascita.");
    await prova(() => db.salvaProfilo(np), "Profilo salvato.");
    S.profilo = await db.profilo(); vai();
  };
  $("#giornata").onclick = async () => { if (await conferma("Aggiungo al calendario la giornata tipo con i tuoi orari attuali. Le voci che hai già restano.", "Aggiungi")) { await creaGiornataTipo(); location.hash = "#calendario"; } };
  $("#esci").onclick = async () => { await db.esci(); S.utente = null; S.profilo = null; location.hash = "#benvenuto"; vai(); };
}

// ---------------- privacy ----------------
function privacy(el) {
  const c = S.consensi;
  const sw = (tipo, titolo, desc) => `<li class="row" style="gap:12px"><div style="flex:1"><b>${titolo}</b><br><span class="xs muted">${desc}</span>${c[tipo] ? `<br><span class="xs muted mono">${c[tipo].accettato ? "attivo" : "spento"} dal ${new Date(c[tipo].creato).toLocaleDateString("it-CH")}</span>` : ""}</div><button class="switch" role="switch" aria-checked="${!!c[tipo]?.accettato}" aria-label="${titolo}" data-tipo="${tipo}"></button></li>`;
  el.innerHTML = `<main class="stack"><a href="#profilo" class="btn testo" style="align-self:flex-start">${icona("indietro", 18)} Profilo</a><h1>Privacy e dati</h1>
  <section class="card stack-s"><h3>I tuoi consensi</h3><ul class="lista">
  <li><b>Condizioni d'uso, informativa ed età minima</b><br><span class="xs muted">Necessari per usare l'app${c.termini ? ` · accettati il ${new Date(c.termini.creato).toLocaleDateString("it-CH")}` : ""}</span></li>
  ${sw("salute", "Dati sulla salute", "Peso, misure e limitazioni per piani personalizzati. Se lo spegni, quei dati vengono cancellati dal profilo.")}
  ${sw("ia", "Assistente IA", "Domande e dati necessari, senza email, elaborati da Groq (USA). Non usati per addestrare modelli.")}
  ${sw("email", "Email con novità", "Al massimo una al mese.")}
  </ul></section>
  <section class="card stack-s"><h3>I tuoi diritti</h3>
  <button class="btn pieno" id="scarica">Scarica tutti i miei dati</button>
  <button class="btn pieno" id="storico">Storico dei consensi</button>
  <a class="btn pieno" href="mailto:${esc(CFG.email || "")}">Scrivi al responsabile della privacy</a>
  <button class="btn pieno pericolo" id="elimina">Elimina account e tutti i dati</button></section>
  <p class="xs muted">Documenti: <a href="#documento/privacy">Informativa sulla privacy</a> · <a href="#documento/condizioni">Condizioni d'uso</a> · <a href="#documento/impressum">Impressum</a>. Puoi presentare reclamo all'Incaricato federale della protezione dei dati e della trasparenza (IFPDT).</p></main>`;
  $$(".switch", el).forEach((b) => (b.onclick = async () => {
    const tipo = b.dataset.tipo, nuovo = b.getAttribute("aria-checked") !== "true";
    if (!nuovo && tipo === "salute" && !(await conferma("Spegnendo questo consenso cancello peso, altezza e limitazioni dal profilo e i piani diventano generali.", "Spegni"))) return;
    await prova(() => db.daiConsenso(tipo, nuovo), nuovo ? "Consenso attivato." : "Consenso spento.");
    if (!nuovo && tipo === "salute") await prova(() => db.salvaProfilo({ altezza_cm: null, peso_kg: null, limitazioni: null }));
    S.consensi = await db.consensi(); S.profilo = await db.profilo(); privacy(el);
  }));
  $("#scarica").onclick = async () => {
    const d = await prova(() => db.esportaTutto()); if (!d) return;
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([JSON.stringify(d, null, 2)], { type: "application/json" }));
    a.download = `testo-miei-dati-${new Date().toISOString().slice(0, 10)}.json`; a.click();
  };
  $("#storico").onclick = async () => {
    const r = (await prova(() => db.storicoConsensi())) || [];
    apriModale(`<div class="stack"><h2>Storico dei consensi</h2><ul class="lista">${r.map((x) => `<li class="small"><b>${esc(x.tipo)}</b>: ${x.accettato ? "sì" : "no"} · ${new Date(x.creato).toLocaleString("it-CH")} · testo ${esc(x.versione)}</li>`).join("") || "<li>Nessuno</li>"}</ul><button class="btn pieno" data-chiudi>Chiudi</button></div>`);
  };
  $("#elimina").onclick = async () => {
    if (!(await conferma("Elimino il tuo account e tutti i dati (profilo, calendario, allenamenti, diario). Non si può annullare.", "Elimina tutto", true))) return;
    const ok = await prova(() => db.eliminaAccount());
    if (ok !== undefined) { S.utente = null; S.profilo = null; avviso("Account eliminato."); location.hash = "#benvenuto"; vai(); }
  };
}

// ---------------- promemoria (notifiche push) ----------------
const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
const standalone = () => window.matchMedia("(display-mode: standalone)").matches || navigator.standalone === true;
function b64(base64) { const p = "=".repeat((4 - (base64.length % 4)) % 4); const r = atob((base64 + p).replace(/-/g, "+").replace(/_/g, "/")); return Uint8Array.from([...r].map((c) => c.charCodeAt(0))); }
async function statoPush() {
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) return { supportato: false };
  const reg = await Promise.race([navigator.serviceWorker.ready, new Promise((r) => setTimeout(() => r(null), 1500))]);
  if (!reg) return { supportato: true, attivo: false };
  const sub = await reg.pushManager.getSubscription();
  return { supportato: true, attivo: !!sub && Notification.permission === "granted", sub };
}
export async function attivaNotifiche() {
  if (isIOS() && !standalone()) { istruzioniIOS(); return false; }
  if (!("Notification" in window) || !("PushManager" in window)) { avviso("Questo browser non supporta le notifiche. Su iPhone serve iOS 16.4 o più recente."); return false; }
  if (!CFG.vapidPublic) { avviso("Notifiche non ancora configurate sul server."); return false; }
  const perm = await Notification.requestPermission();
  if (perm !== "granted") { avviso("Notifiche non permesse. Puoi attivarle nelle impostazioni del telefono."); return false; }
  const reg = await Promise.race([navigator.serviceWorker.ready, new Promise((r) => setTimeout(() => r(null), 1500))]);
  if (!reg) return { supportato: true, attivo: false };
  const sub = (await reg.pushManager.getSubscription()) || (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64(CFG.vapidPublic) }));
  const ok = await prova(() => db.salvaPush(sub));
  if (ok !== undefined) { await prova(() => db.daiConsenso("promemoria", true)); S.consensi = await db.consensi(); avviso("Promemoria attivi su questo telefono."); return true; }
  return false;
}
function istruzioniIOS() {
  apriModale(`<div class="stack"><h2>Prima aggiungi l'app alla schermata Home</h2>
  <p class="small muted">Su iPhone le notifiche funzionano solo se T.E.S.T.O. è installata come app (iOS 16.4 o più recente).</p>
  <ol class="small" style="padding-left:20px;margin:0;display:flex;flex-direction:column;gap:6px"><li>In Safari tocca il pulsante <b>Condividi</b> (il quadrato con la freccia).</li><li>Scegli <b>Aggiungi alla schermata Home</b> e poi <b>Aggiungi</b>.</li><li>Apri T.E.S.T.O. dall'icona sulla schermata Home e accedi.</li><li>Vai in Profilo → Promemoria e tocca <b>Attiva i promemoria</b>.</li></ol>
  <button class="btn primario pieno" data-chiudi>Ho capito</button></div>`);
}
async function promemoria(el) {
  const st = await statoPush();
  el.innerHTML = `<main class="stack"><a href="#profilo" class="btn testo" style="align-self:flex-start">${icona("indietro", 18)} Profilo</a><h1>Promemoria</h1>
  <section class="card stack-s"><div class="row between"><div><b>Notifiche su questo telefono</b><br><span class="xs muted">${st.attivo ? "Attive" : "Spente"}</span></div>${st.attivo ? `<button class="btn piccolo" id="off">Disattiva</button>` : `<button class="btn primario piccolo" id="on">Attiva i promemoria</button>`}</div>
  <p class="xs muted">Arrivano all'ora di ogni voce del calendario che ha il promemoria acceso (o qualche minuto prima, se lo imposti). Il testo è generico: nome della voce e ora, senza dati sulla salute.</p></section>
  ${isIOS() && !standalone() ? `<section class="card stack-s"><b>iPhone: serve un passaggio in più</b><p class="small muted">Aggiungi l'app alla schermata Home e aprila da lì: solo così iOS permette le notifiche.</p><button class="btn pieno" id="ios">Come si fa</button></section>` : ""}
  <section class="card stack-s"><b>In alternativa: calendario del telefono</b><p class="small muted">Scarica tutte le voci con i promemoria nel calendario dell'iPhone o di Android. Funziona anche senza internet; se cambi il piano, ripeti l'operazione.</p><button class="btn pieno" id="ics">Metti nel calendario del telefono</button></section>
  <p class="xs muted">Per scegliere quali voci suonano: Calendario → tocca una voce → Promemoria.</p></main>`;
  $("#on") && ($("#on").onclick = async () => { await attivaNotifiche(); promemoria(el); });
  $("#off") && ($("#off").onclick = async () => { await st.sub?.unsubscribe(); await prova(() => db.rimuoviPush(st.sub.endpoint)); await prova(() => db.daiConsenso("promemoria", false)); promemoria(el); });
  $("#ios") && ($("#ios").onclick = istruzioniIOS);
  $("#ics").onclick = () => calendario.esportaICS();
}

// ---------------- oggi ----------------
async function oggi(el) {
  const p = S.profilo || {};
  const ch = oraCH();
  const lun = lunediDi(ch.data);
  el.innerHTML = `<main class="stack"><div class="scheletro" style="height:190px"></div><div class="scheletro" style="height:90px"></div><div class="scheletro" style="height:160px"></div></main>`;
  const [serie, voci, fattiOggi, righeDiario, schede, recenti] = await Promise.all([
    prova(() => db.serieDal(new Date(lun.getTime() - 21 * 864e5).toISOString())), prova(() => db.voci()), prova(() => db.fatti(ch.iso, ch.iso)), prova(() => db.diario(ch.iso)), prova(() => db.schede()), prova(() => db.sessioniRecenti(40)),
  ]);
  // ---- dati allenamento
  const daLun = (serie || []).filter((s) => new Date(s.creato || s.fatto || s.inizio || 0) >= lun);
  const conteggio = {};
  for (const s of daLun) {
    const e = S.mappaEs.get(s.esercizio); if (!e) continue;
    e.p.forEach((m) => (conteggio[m] = (conteggio[m] || 0) + 1));
    e.s.forEach((m) => (conteggio[m] = (conteggio[m] || 0) + 0.5));
  }
  const liv = Object.fromEntries(Object.keys(NOMI).map((m) => [m, livello(conteggio[m] || 0)]));
  const dI = (r) => new Date(r.inizio || r.creato);
  const volume = daLun.reduce((t, s) => t + (+s.kg || 0) * (+s.ripetizioni || 0), 0);
  const giorniAllenati = new Set((recenti || []).map((r) => isoData(dI(r))));
  const sessSett = (recenti || []).filter((r) => dI(r) >= lun).length;
  // settimane consecutive con almeno un allenamento
  let streak = 0;
  for (let w = 0; w < 12; w++) {
    const da = new Date(lun.getTime() - w * 7 * 864e5), a = new Date(da.getTime() + 7 * 864e5);
    if ((recenti || []).some((r) => { const d = dI(r); return d >= da && d < a; })) streak++; else if (w > 0) break;
  }
  const obiettivoSett = +p.allenamenti_sett || 3;
  const inCorso = (() => { try { return JSON.parse(localStorage.getItem("testo_sessione") || "null"); } catch { return null; } })();
  const schedaOggi = (schede || []).find((s) => s.giorno === ch.giorno);
  const fattoOggi = giorniAllenati.has(ch.iso);
  const prossimaScheda = !schedaOggi && (schede || []).filter((s) => s.giorno != null).sort((x, y) => ((x.giorno - ch.giorno + 7) % 7) - ((y.giorno - ch.giorno + 7) % 7))[0];
  // ---- calendario
  const delGiorno = (voci || []).filter((v) => v.giorni?.includes(ch.giorno)).sort((a, b) => (a.ora < b.ora ? -1 : 1));
  const fattiSet = new Set((fattiOggi || []).map((f) => f.voce_id));
  const fatteN = delGiorno.filter((v) => fattiSet.has(v.id)).length;
  const prossime = delGiorno.filter((v) => { const [h, m] = v.ora.split(":").map(Number); return h * 60 + m >= ch.minuti - 30 && !fattiSet.has(v.id); }).slice(0, 4);
  // ---- nutrizione
  const f = fabbisogno(p);
  const { alimenti, somma } = await import("./nutrizione.js");
  let tot = { kcal: 0, p: 0, cho: 0, gr: 0 };
  if ((righeDiario || []).length) { try { const A = await alimenti(); tot = somma(righeDiario, A.mappa); } catch {} }
  const anello = (val, max, r, col, sp = 9) => { const C = 2 * Math.PI * r; const q = max ? Math.min(1, val / max) : 0; return `<circle cx="70" cy="70" r="${r}" stroke="rgba(255,255,255,.07)" stroke-width="${sp}" fill="none"/><circle cx="70" cy="70" r="${r}" stroke="${col}" stroke-width="${sp}" fill="none" stroke-linecap="round" stroke-dasharray="${C}" stroke-dashoffset="${C * (1 - q)}" transform="rotate(-90 70 70)" style="filter:drop-shadow(0 0 5px ${col});transition:stroke-dashoffset 1s"/>`; };
  const macro = f ? { cho: Math.round((f.kcal - f.p * 4 - f.kcal * 0.25) / 4), gr: Math.round((f.kcal * 0.25) / 9) } : null;
  // ---- testi
  const ora = ch.minuti / 60;
  const saluto = ora < 5 ? "Notte fonda" : ora < 12 ? "Buongiorno" : ora < 18 ? "Buon pomeriggio" : "Buonasera";
  const OBI = { massa: "Massa muscolare", forza: "Forza", definizione: "Definizione", mantenimento: "Mantenimento", salute: "Salute" };
  const CONSIGLI = [
    ["Vicino al cedimento", "Per crescere conta arrivare vicino al cedimento con buona tecnica, non sentire il muscolo bruciare.", "Tecnica ed esercizi"],
    ["10 serie a settimana", "Almeno 10 serie a settimana per muscolo, divise in 2 sedute: è la base delle linee guida.", "Volume e frequenza"],
    ["Proteine sul totale", "1,6-2,2 g per kg al giorno. Distribuirle in 3-5 pasti da 25-40 g aiuta.", "Proteine e ipertrofia"],
    ["Il sonno allena", "Dormire meno di 6 ore riduce forza e recupero: il sonno fa parte dell'allenamento.", "Sonno, recupero e stress"],
    ["Creatina, ogni giorno", "Funziona se presa tutti i giorni, a qualsiasi ora: niente carico obbligatorio.", "Integratori"],
    ["Definizione lenta", "Perdi al massimo lo 0,5-1% del peso a settimana per proteggere il muscolo.", "Fase di definizione"],
    ["Recupero tra le serie", "Sui multiarticolari pesanti 2-3 minuti di pausa fanno sollevare di più nelle serie dopo.", "Volume e frequenza"],
    ["Carboidrati e allenamento", "Un pasto con carboidrati 1-3 ore prima migliora la qualità delle sedute lunghe.", "Alimentazione"],
  ];
  const [cTit, cTesto, cFonte] = CONSIGLI[(ch.data.getDate() + ch.data.getMonth()) % CONSIGLI.length];
  const st = await statoPush().catch(() => ({}));
  const top = Object.entries(conteggio).sort((a, b) => b[1] - a[1]);
  const deboli = Object.keys(NOMI).filter((m) => (conteggio[m] || 0) < 5 && !["avambracci", "lombari"].includes(m)).slice(0, 4);
  const giorniSett = [1, 2, 3, 4, 5, 6, 0].map((g, i) => { const d = new Date(lun.getTime() + i * 864e5); const iso = isoData(d); return { g, iso, fatto: giorniAllenati.has(iso), oggi: iso === ch.iso, futuro: d > ch.data && iso !== ch.iso, previsto: (schede || []).some((s) => s.giorno === g) }; });
  const durata = (sc) => Math.round(sc.esercizi.reduce((t, e) => t + (e.serie || 3) * (45 + (+e.recupero || S.mappaEs.get(e.id)?.r || 90)), 0) / 60);
  const muscoliScheda = (sc) => [...new Set(sc.esercizi.flatMap((e) => S.mappaEs.get(e.id)?.p || []))].map((m) => NOMI[m]).slice(0, 5);

  let hero;
  if (inCorso) hero = `<a class="hero" href="#sessione"><span class="etichetta">IN CORSO</span><h2 class="hero-tit">${esc(inCorso.nome)}</h2><p class="small muted">${inCorso.esercizi.length} esercizi · iniziato alle ${new Date(inCorso.inizio).toLocaleTimeString("it-CH", { hour: "2-digit", minute: "2-digit" })}</p><span class="btn primario pieno">Riprendi l'allenamento</span></a>`;
  else if (schedaOggi && !fattoOggi) hero = `<section class="hero"><span class="etichetta">ALLENAMENTO DI OGGI</span><h2 class="hero-tit">${esc(schedaOggi.nome)}</h2>
    <div class="row wrap" style="gap:6px">${muscoliScheda(schedaOggi).map((m) => `<span class="tag">${m}</span>`).join("")}</div>
    <div class="hero-dati"><div><b class="mono">${schedaOggi.esercizi.length}</b><span>esercizi</span></div><div><b class="mono">${schedaOggi.esercizi.reduce((t, e) => t + (+e.serie || 3), 0)}</b><span>serie</span></div><div><b class="mono">~${durata(schedaOggi)}'</b><span>durata</span></div></div>
    <button class="btn primario pieno grande" id="vai">${icona("allenamento", 18)} Inizia ora</button></section>`;
  else if (fattoOggi) hero = `<section class="hero ok"><span class="etichetta" style="color:var(--ok)">FATTO</span><h2 class="hero-tit">Allenamento completato</h2><p class="small muted">Ora conta il recupero: proteine nei pasti, acqua e sonno. ${prossimaScheda ? `Prossima: <b>${esc(prossimaScheda.nome)}</b> ${GIORNI_L[prossimaScheda.giorno].toLowerCase()}.` : ""}</p><a class="btn pieno" href="#dieta">Controlla i pasti</a></section>`;
  else if ((schede || []).length) hero = `<section class="hero riposo"><span class="etichetta">GIORNO DI RIPOSO</span><h2 class="hero-tit">Si cresce anche oggi</h2><p class="small muted">Il muscolo si costruisce tra una seduta e l'altra. ${prossimaScheda ? `Prossima: <b>${esc(prossimaScheda.nome)}</b> ${GIORNI_L[prossimaScheda.giorno].toLowerCase()}.` : ""}</p><div class="grid2"><button class="btn pieno" id="libero">Allenati lo stesso</button><a class="btn pieno" href="#assistente">Chiedi al coach</a></div></section>`;
  else hero = `<section class="hero"><span class="etichetta">PRIMO PASSO</span><h2 class="hero-tit">Costruiamo il tuo piano</h2><p class="small muted">Schede basate sugli studi, adattate ai tuoi ${obiettivoSett} allenamenti a settimana. Oppure fattele preparare dall'assistente.</p><div class="grid2"><a class="btn primario pieno" href="#allenamento">Crea le schede</a><a class="btn pieno" href="#assistente">Chiedi al coach</a></div></section>`;

  el.innerHTML = `<main class="stack home">
  <header class="head"><div><span class="etichetta">${GIORNI_L[ch.giorno]} ${ch.data.getDate()}.${ch.data.getMonth() + 1} · ${OBI[p.obiettivo] || "T.E.S.T.O."}</span><h1>${saluto}</h1></div>${logo(42)}</header>
  ${hero}
  <section class="card settimana"><div class="row between"><h3>La tua settimana</h3><span class="xs muted"><b class="mono" style="color:var(--ink)">${sessSett}</b> / ${obiettivoSett} allenamenti</span></div>
    <div class="giorni-sett">${giorniSett.map((d) => `<div class="gs ${d.fatto ? "fatto" : ""} ${d.oggi ? "oggi" : ""} ${d.previsto && !d.fatto ? "previsto" : ""}"><span>${GIORNI[d.g]}</span><i>${d.fatto ? icona("spunta", 14) : ""}</i></div>`).join("")}</div>
    <div class="kpi"><div><b class="mono">${streak}</b><span>${streak === 1 ? "settimana" : "settimane"} di fila</span></div><div><b class="mono">${daLun.length}</b><span>serie</span></div><div><b class="mono">${volume >= 1000 ? (volume / 1000).toFixed(1) + "t" : Math.round(volume) + "kg"}</b><span>volume</span></div></div></section>
  ${!st.attivo && db.ONLINE ? `<button class="card row avviso-notif" id="notif">${icona("campana", 22, 'style="color:#FF2E43"')}<span class="small"><b>Attiva i promemoria</b><br><span class="muted">Ti avviso per pasti, integratori e allenamenti.</span></span><span class="red">›</span></button>` : ""}
  <a class="card nutri" href="#dieta"><div class="anelli"><svg width="140" height="140" viewBox="0 0 140 140">${anello(tot.kcal, f?.kcal, 62, "#FF2E43", 10)}${anello(tot.p, f?.p, 48, "#FF9AA2", 9)}${anello(tot.cho, macro?.cho, 35, "#FFB35C", 8)}</svg><div class="centro"><b class="mono">${Math.round(tot.kcal)}</b><span>kcal</span></div></div>
    <div class="stack-s" style="flex:1"><h3>Nutrizione di oggi</h3>
    <div class="leg"><i style="background:#FF2E43"></i>Calorie <b class="mono">${Math.round(tot.kcal)}${f ? `<span class="muted">/${f.kcal}</span>` : ""}</b></div>
    <div class="leg"><i style="background:#FF9AA2"></i>Proteine <b class="mono">${Math.round(tot.p)}${f ? `<span class="muted">/${f.p}g</span>` : "g"}</b></div>
    <div class="leg"><i style="background:#FFB35C"></i>Carboidrati <b class="mono">${Math.round(tot.cho || 0)}${macro ? `<span class="muted">/${macro.cho}g</span>` : "g"}</b></div>
    <span class="xs red">${(righeDiario || []).length ? `Rimangono ${f ? Math.max(0, f.p - Math.round(tot.p)) + " g di proteine" : ""} ›` : "Registra il primo pasto ›"}</span></div></a>
  <section class="card stack-s"><div class="row between"><h3>Agenda di oggi</h3><a class="xs" href="#calendario">${fatteN}/${delGiorno.length} fatte ›</a></div>
  ${delGiorno.length ? `<div class="barra"><span style="width:${(fatteN / delGiorno.length) * 100}%"></span></div>` : ""}
  ${prossime.length ? `<ul class="timeline">${prossime.map((v) => `<li><span class="ora">${esc(v.ora)}</span><div class="voce ${v.tipo}"><b>${esc(v.titolo)}</b>${v.dettaglio ? `<br><span class="xs muted">${esc(v.dettaglio)}</span>` : ""}</div><button class="spunta" aria-pressed="false" aria-label="Segna come fatto" data-id="${v.id}">${icona("spunta", 18)}</button></li>`).join("")}</ul>` : `<p class="small muted">${delGiorno.length ? "Hai fatto tutto per oggi. Ottimo lavoro." : "Il calendario è vuoto."}</p>${delGiorno.length ? "" : `<button class="btn pieno" id="tipo">Crea la giornata tipo</button>`}`}</section>
  <section class="card stack-s"><div class="row between"><h3>Muscoli allenati</h3><button class="btn testo xs" id="ferma">Pausa</button></div>
  <div class="corpo-home">${corpo(liv)}</div>
  ${top.length ? `<div class="row wrap" style="gap:6px">${top.slice(0, 8).map(([m, n]) => `<span class="chip" style="min-height:28px">${NOMI[m]} <b class="mono">${Math.round(n)}</b></span>`).join("")}</div>` : ""}
  ${deboli.length && top.length ? `<p class="xs muted">Sotto le 5 serie: ${deboli.map((m) => NOMI[m]).join(", ")}.</p>` : `<p class="xs muted" style="text-align:center">Si azzera ogni lunedì · pieno = 10+ serie · metà = 5-9 · tenue = 1-4</p>`}</section>
  <section class="consiglio"><span class="etichetta">CONSIGLIO DEL GIORNO</span><h2>${esc(cTit)}</h2><p class="small">${esc(cTesto)}</p><div class="row between"><span class="xs muted">Dall'archivio · ${esc(cFonte)}</span><a class="xs" href="#assistente" id="chiedi">Approfondisci ›</a></div></section>
  <section class="azioni"><a href="#assistente">${icona("assistente", 22)}<span>Coach IA</span></a><a href="#dieta">${icona("dieta", 22)}<span>Pasto</span></a><a href="#allenamento">${icona("allenamento", 22)}<span>Schede</span></a><a href="#calendario">${icona("calendario", 22)}<span>Agenda</span></a></section>
  </main>`;
  $("#vai") && ($("#vai").onclick = () => allenamento.inizia(schedaOggi));
  $("#libero") && ($("#libero").onclick = () => allenamento.inizia({ id: null, nome: "Allenamento libero", esercizi: [] }));
  $("#chiedi").onclick = () => sessionStorage.setItem("testo_domanda", `Spiegami meglio: ${cTit}. ${cTesto}`);
  $("#notif") && ($("#notif").onclick = async () => { if (await attivaNotifiche()) oggi(el); });
  $("#tipo") && ($("#tipo").onclick = async () => { await creaGiornataTipo(); oggi(el); });
  $("#ferma").onclick = (e) => { const c = $("#corpo3d"); c?.classList.toggle("ferma"); e.target.textContent = c?.classList.contains("ferma") ? "Gira" : "Pausa"; };
  $$(".spunta", el).forEach((b) => (b.onclick = async () => { await prova(() => db.segnaFatto(b.dataset.id, ch.iso, true)); b.setAttribute("aria-pressed", "true"); setTimeout(() => oggi(el), 400); }));
}

avvio();
