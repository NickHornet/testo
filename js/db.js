// Accesso ai dati: Supabase (online) oppure modalità prova sul dispositivo.
const CFG = window.TESTO_CONFIG || {};
export const ONLINE = !!(CFG.supabaseUrl && CFG.supabaseKey && window.supabase);
export const VERSIONE_TESTI = "0.1-test";

let sb = null;
if (ONLINE) {
  sb = window.supabase.createClient(CFG.supabaseUrl, CFG.supabaseKey, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
  });
}

function err(e) { if (e) throw new Error(traduci(e.message || String(e))); }
function traduci(m) {
  const t = {
    "Invalid login credentials": "Email o password non corretti.",
    "User already registered": "Esiste già un account con questa email.",
    "Email not confirmed": "Conferma prima l'email: controlla la posta.",
    "Password should be at least": "La password deve avere almeno 8 caratteri.",
  };
  for (const k in t) if (m.includes(k)) return t[k];
  return m;
}
const oggiISO = () => new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Zurich" });

// ---------- modalità prova (localStorage) ----------
const L = {
  k: (n) => "testo_" + n,
  get(n, d) { try { return JSON.parse(localStorage.getItem(this.k(n))) ?? d; } catch { return d; } },
  set(n, v) { try { localStorage.setItem(this.k(n), JSON.stringify(v)); } catch {} },
};
const uid = () => (crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random());

// ---------- account ----------
export async function utente() {
  if (!ONLINE) return L.get("utente", null);
  const { data } = await sb.auth.getSession();
  return data.session?.user ?? null;
}
export function quandoCambiaAccesso(cb) {
  if (ONLINE) sb.auth.onAuthStateChange((ev, s) => cb(ev, s?.user ?? null));
}
export async function registrati(email, password) {
  if (!ONLINE) { const u = { id: "prova", email }; L.set("utente", u); return { user: u, session: true }; }
  const { data, error } = await sb.auth.signUp({ email, password, options: { emailRedirectTo: location.origin + location.pathname } });
  err(error);
  return { user: data.user, session: !!data.session };
}
export async function accedi(email, password) {
  if (!ONLINE) { const u = L.get("utente", null) || { id: "prova", email }; L.set("utente", u); return u; }
  const { data, error } = await sb.auth.signInWithPassword({ email, password });
  err(error); return data.user;
}
export async function esci() { if (ONLINE) await sb.auth.signOut(); else L.set("utente", null); }
export async function resetPassword(email) {
  if (!ONLINE) return;
  const { error } = await sb.auth.resetPasswordForEmail(email, { redirectTo: location.origin + location.pathname + "#nuova-password" });
  err(error);
}
export async function nuovaPassword(pw) {
  if (!ONLINE) return;
  const { error } = await sb.auth.updateUser({ password: pw }); err(error);
}

// ---------- generico ----------
async function lista(tab, filtro = (q) => q, ordine) {
  if (!ONLINE) return L.get(tab, []);
  let q = sb.from(tab).select("*");
  q = filtro(q);
  if (ordine) q = q.order(ordine.col, { ascending: ordine.asc ?? true });
  const { data, error } = await q; err(error); return data;
}
async function inserisci(tab, riga) {
  if (!ONLINE) {
    const r = { id: riga.id ?? uid(), creato: new Date().toISOString(), ...riga };
    L.set(tab, [...L.get(tab, []), r]); return r;
  }
  const { data, error } = await sb.from(tab).insert(riga).select().single(); err(error); return data;
}
async function aggiorna(tab, id, campi) {
  if (!ONLINE) { L.set(tab, L.get(tab, []).map((r) => (r.id === id ? { ...r, ...campi } : r))); return; }
  const { error } = await sb.from(tab).update(campi).eq("id", id); err(error);
}
async function elimina(tab, id) {
  if (!ONLINE) { L.set(tab, L.get(tab, []).filter((r) => r.id !== id)); return; }
  const { error } = await sb.from(tab).delete().eq("id", id); err(error);
}

// ---------- profilo e consensi ----------
export async function profilo() {
  if (!ONLINE) return L.get("profilo", null);
  const u = await utente(); if (!u) return null;
  const { data, error } = await sb.from("profili").select("*").eq("user_id", u.id).maybeSingle(); err(error); return data;
}
export async function salvaProfilo(p) {
  if (!ONLINE) { L.set("profilo", { ...(L.get("profilo", {}) || {}), ...p }); return; }
  const u = await utente();
  const { error } = await sb.from("profili").upsert({ ...p, user_id: u.id, aggiornato: new Date().toISOString() });
  if (error?.code === "23505") throw new Error("Questo username è già usato da un'altra persona: scegline un altro.");
  if (error?.code === "23514" && /username/.test(error.message)) throw new Error("Username non valido: 3-20 caratteri, solo lettere, numeri, _ e punto.");
  err(error);
}
export async function consensi() {
  const r = await lista("consensi", (q) => q, { col: "creato", asc: true });
  const ultimo = {};
  for (const c of r) ultimo[c.tipo] = c;
  return ultimo;
}
export async function storicoConsensi() { return lista("consensi", (q) => q, { col: "creato", asc: false }); }
export async function daiConsenso(tipo, accettato) {
  return inserisci("consensi", { tipo, accettato, versione: VERSIONE_TESTI });
}

// ---------- calendario ----------
export const voci = () => lista("calendario", (q) => q, { col: "ora" });
export const aggiungiVoce = (v) => inserisci("calendario", v);
export const modificaVoce = (id, c) => aggiorna("calendario", id, c);
export const eliminaVoce = (id) => elimina("calendario", id);
export async function fatti(dalla, alla) {
  if (!ONLINE) return L.get("fatti", []).filter((f) => f.data >= dalla && f.data <= alla);
  const { data, error } = await sb.from("fatti").select("*").gte("data", dalla).lte("data", alla); err(error); return data;
}
export async function segnaFatto(voce_id, data, fatto) {
  if (!ONLINE) {
    const f = L.get("fatti", []).filter((x) => !(x.voce_id === voce_id && x.data === data));
    if (fatto) f.push({ voce_id, data }); L.set("fatti", f); return;
  }
  if (fatto) { const { error } = await sb.from("fatti").upsert({ voce_id, data }); err(error); }
  else { const { error } = await sb.from("fatti").delete().eq("voce_id", voce_id).eq("data", data); err(error); }
}

// ---------- allenamento ----------
export const schede = () => lista("schede", (q) => q, { col: "creato" });
export const salvaScheda = (s) => (s.id && !String(s.id).startsWith("nuova") ? aggiorna("schede", s.id, { nome: s.nome, giorno: s.giorno, esercizi: s.esercizi }) : inserisci("schede", { nome: s.nome, giorno: s.giorno, esercizi: s.esercizi }));
export const eliminaScheda = (id) => elimina("schede", id);
export const iniziaSessione = (s) => inserisci("sessioni", s);
export const chiudiSessione = (id) => aggiorna("sessioni", id, { fine: new Date().toISOString() });
export const eliminaSessione = (id) => elimina("sessioni", id);
export const modificaSessione = (id, c) => aggiorna("sessioni", id, c);
export async function sessioniRecenti(n = 10) {
  if (!ONLINE) return L.get("sessioni", []).slice(-n).reverse();
  const { data, error } = await sb.from("sessioni").select("*").order("inizio", { ascending: false }).limit(n); err(error); return data;
}
export async function aggiungiSerie(r) { return inserisci("serie", r); }
export async function eliminaSerie(id) { return elimina("serie", id); }
export async function modificaSerie(id, c) { return aggiorna("serie", id, c); }
export async function serieDellaSessione(sid) {
  if (!ONLINE) return L.get("serie", []).filter((s) => s.sessione_id === sid);
  const { data, error } = await sb.from("serie").select("*").eq("sessione_id", sid).order("numero"); err(error); return data;
}
// ultima volta che hai fatto questo esercizio (in un'altra sessione)
export async function ultimaVolta(esercizio, escludiSessione) {
  let righe;
  if (!ONLINE) righe = L.get("serie", []).filter((s) => s.esercizio === esercizio && s.sessione_id !== escludiSessione).sort((a, b) => (a.creato < b.creato ? 1 : -1));
  else {
    const { data, error } = await sb.from("serie").select("*").eq("esercizio", esercizio).neq("sessione_id", escludiSessione || "00000000-0000-0000-0000-000000000000").order("creato", { ascending: false }).limit(20);
    err(error); righe = data;
  }
  if (!righe.length) return [];
  const sid = righe[0].sessione_id;
  return righe.filter((r) => r.sessione_id === sid).sort((a, b) => a.numero - b.numero);
}
// istruzioni in italiano: prima dal telefono, poi dalla tabella condivisa, altrimenti le traduce il server (una volta per tutti)
export async function traduzione(esercizio) {
  const k = "tr_" + esercizio; const c = L.get(k, null); if (c) return c;
  if (!ONLINE) return null;
  const { data } = await sb.from("traduzioni").select("testo").eq("esercizio", esercizio).maybeSingle();
  let testo = data?.testo;
  if (!testo) { const r = await sb.functions.invoke("assistente?traduci=1", { body: { esercizio } }); testo = r.data?.testo; }
  if (Array.isArray(testo) && testo.length) { L.set(k, testo); return testo; }
  return null;
}
export async function serieDal(dataISO) {
  if (!ONLINE) return L.get("serie", []).filter((s) => s.creato >= dataISO);
  const { data, error } = await sb.from("serie").select("esercizio,creato,kg,ripetizioni").gte("creato", dataISO); err(error); return data;
}

// ---------- diario alimentare ----------
export async function diario(data) {
  if (!ONLINE) return L.get("diario", []).filter((d) => d.data === data);
  const { data: r, error } = await sb.from("diario").select("*").eq("data", data).order("creato"); err(error); return r;
}
export const aggiungiAlimento = (r) => inserisci("diario", r);
export const eliminaAlimento = (id) => elimina("diario", id);

// ---------- notifiche ----------
export async function salvaPush(sub) {
  const j = sub.toJSON();
  if (!ONLINE) { L.set("push", j); return; }
  const u = await utente();
  const { error } = await sb.from("push").upsert({ endpoint: j.endpoint, p256dh: j.keys.p256dh, auth: j.keys.auth, user_id: u.id }); err(error);
}
export async function rimuoviPush(endpoint) {
  if (!ONLINE) { L.set("push", null); return; }
  const { error } = await sb.from("push").delete().eq("endpoint", endpoint); err(error);
}

// ---------- assistente ----------
export async function chiediAssistente(corpo) {
  if (!ONLINE) {
    await new Promise((r) => setTimeout(r, 900));
    return { testo: "**Modalità prova.** L'assistente risponde davvero quando l'app è collegata al server (Supabase e IA).\n\nNel frattempo puoi provare tutto il resto: profilo, calendario, allenamenti e diario." };
  }
  const { data, error } = await sb.functions.invoke("assistente", { body: corpo });
  if (error) {
    let msg = "L'assistente non risponde. Riprova tra poco.";
    try { const j = await error.context.json(); if (j.errore) msg = j.errore + (j.dettaglio ? ` (${String(j.dettaglio).slice(0, 160)})` : ""); } catch {}
    throw new Error(msg);
  }
  return data;
}

// ---------- privacy ----------
export async function esportaTutto() {
  const tabelle = ["profili", "consensi", "calendario", "fatti", "schede", "sessioni", "serie", "diario"];
  const out = { esportato: new Date().toISOString(), app: "T.E.S.T.O." };
  if (!ONLINE) { for (const t of tabelle) out[t] = L.get(t === "profili" ? "profilo" : t, null); return out; }
  for (const t of tabelle) { const { data } = await sb.from(t).select("*"); out[t] = data; }
  return out;
}
export async function eliminaAccount() {
  if (!ONLINE) { Object.keys(localStorage).filter((k) => k.startsWith("testo_")).forEach((k) => localStorage.removeItem(k)); return; }
  const { error } = await sb.rpc("elimina_account"); err(error);
  await sb.auth.signOut();
}
export { oggiISO };
