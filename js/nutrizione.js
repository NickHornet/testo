// Calcoli: fabbisogno, nutrienti del giorno, consigli su integratori, giornata tipo.
let ALIMENTI = null;
export const CAMPI = ["id", "n", "cat", "kcal", "p", "cho", "zu", "fi", "gr", "sat", "sale", "vd", "b12", "vc", "ca", "fe", "mg", "k"];

export async function alimenti() {
  if (ALIMENTI) return ALIMENTI;
  const r = await fetch("dati/alimenti.json");
  const j = await r.json();
  ALIMENTI = j.righe.map((row) => Object.fromEntries(j.campi.map((c, i) => [c, row[i]])));
  ALIMENTI.mappa = new Map(ALIMENTI.map((a) => [a.id, a]));
  return ALIMENTI;
}
const norm = (s) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
const ALIAS = [[/fiocchi di latte|cottage/, "formaggio fresco granulato"], [/\bwhey\b|proteine in polvere|proteine del siero/, "proteine polvere"], [/\buova\b|\buovo intero\b/, "uovo intero"], [/\balbumi\b/, "albume"], [/\bpetto di pollo\b/, "pollo petto"]];
export function cerca(lista, q) {
  let qq = norm(q); for (const [re, s] of ALIAS) qq = qq.replace(re, s);
  const parole = qq.split(/\s+/).filter(Boolean);
  if (!parole.length) return [];
  return lista.filter((a) => { const n = norm(a.n); return parole.every((p) => n.includes(p)); })
    .sort((a, b) => norm(a.n).indexOf(parole[0]) - norm(b.n).indexOf(parole[0]) || a.n.length - b.n.length)
    .slice(0, 40);
}

export function eta(p) { return new Date().getFullYear() - (p?.anno_nascita || 1995); }

// Mifflin-St Jeor × attività, poi obiettivo
export function fabbisogno(p) {
  if (!p?.peso_kg || !p?.altezza_cm) return null;
  const a = eta(p), w = +p.peso_kg, h = +p.altezza_cm;
  const bmr = 10 * w + 6.25 * h - 5 * a + (p.sesso === "donna" ? -161 : 5);
  const att = Math.min(1.75, 1.4 + 0.05 * (+p.allenamenti_sett || 0));
  const mant = bmr * att;
  const fattore = { massa: 1.1, forza: 1.05, definizione: 0.8, mantenimento: 1 }[p.obiettivo] ?? 1;
  const kcal = Math.round(mant * fattore / 10) * 10;
  const gkg = { massa: 1.8, forza: 1.8, definizione: 2.2, mantenimento: 1.6 }[p.obiettivo] ?? 1.6;
  const p_g = Math.round(w * gkg);
  const gr = Math.round(kcal * 0.25 / 9);
  const cho = Math.max(0, Math.round((kcal - p_g * 4 - gr * 9) / 4));
  return { bmr: Math.round(bmr), mantenimento: Math.round(mant), kcal, p: p_g, gr, cho, gkg, att };
}

// Riferimenti: OMS (zuccheri, saturi, sale, fibre) e D-A-CH (vitamine e minerali), adulti
export function riferimenti(p, f) {
  const donna = p?.sesso === "donna";
  const kcal = f?.kcal || (donna ? 2000 : 2500);
  return {
    kcal, p: f?.p || 0, cho: f?.cho || 0, gr: f?.gr || 0,
    zu: Math.round(kcal * 0.10 / 4), sat: Math.round(kcal * 0.10 / 9), sale: 5, fi: 30,
    vd: 20, b12: 4, vc: donna ? 95 : 110, ca: 1000, fe: donna && eta(p) < 51 ? 16 : 11, mg: donna ? 300 : 350, k: 4000,
  };
}
export function somma(righe, mappa) {
  const t = Object.fromEntries(CAMPI.slice(3).map((c) => [c, 0]));
  for (const r of righe) {
    const a = mappa.get(r.alimento); if (!a) continue;
    const f = r.grammi / 100;
    for (const c of CAMPI.slice(3)) t[c] += (+a[c] || 0) * f;
  }
  return t;
}

const hm = (s) => { const [h, m] = String(s || "0:0").split(":").map(Number); return h * 60 + (m || 0); };
const fmt = (min) => { min = ((Math.round(min / 5) * 5) % 1440 + 1440) % 1440; return String(Math.floor(min / 60)).padStart(2, "0") + ":" + String(min % 60).padStart(2, "0"); };
export { hm, fmt };

export function giorniAllenamento(n) {
  return ({ 1: [3], 2: [1, 4], 3: [1, 3, 5], 4: [1, 2, 4, 5], 5: [1, 2, 3, 5, 6], 6: [1, 2, 3, 4, 5, 6], 7: [1, 2, 3, 4, 5, 6, 0] })[n] || [];
}

// Integratori e vitamine: consigli facoltativi, ognuno con quantità, orario, motivo e fonti
export function consigliIntegratori(p) {
  const out = [];
  const sveglia = hm(p?.sveglia || "07:00");
  const colazione = fmt(sveglia + 30);
  const pranzo = p?.pausa_pranzo || "12:30";
  const mese = new Date().getMonth() + 1;
  const peso = +p?.peso_kg || 75;
  if (["massa", "forza", "mantenimento", "definizione"].includes(p?.obiettivo || "massa"))
    out.push({ id: "creatina", titolo: "Creatina monoidrato", qty: "3-5 g", ora: colazione, stelle: "★★★", perche: "L'integratore con più prove per forza e massa muscolare. L'orario non conta: conta prenderla ogni giorno.", avviso: "", fonte: "ISSN 2017 · Integratori" });
  if (mese >= 10 || mese <= 3)
    out.push({ id: "vitd", titolo: "Vitamina D", qty: "800 UI (20 µg)", ora: colazione, stelle: "★★☆", perche: "Da ottobre a marzo in Svizzera il sole non basta per produrla. Si assorbe meglio con un pasto.", avviso: "Dosi più alte solo dopo gli esami del sangue.", fonte: "Tomlinson 2015 · D-A-CH" });
  if ((+p?.pesce_sett || 0) < 2)
    out.push({ id: "omega3", titolo: p?.vegano ? "Omega-3 (olio di alghe)" : "Omega-3 (olio di pesce)", qty: "≈ 1 g EPA+DHA · 3-4 capsule secondo l'etichetta", ora: pranzo, stelle: "★☆☆", perche: "Mangi pesce meno di 2 volte a settimana. Sui muscoli l'effetto è molto piccolo: è soprattutto un aiuto per la salute in generale.", avviso: "Se prendi anticoagulanti chiedi prima al medico.", fonte: "Santo André 2023" });
  if (p?.vegano)
    out.push({ id: "b12", titolo: "Vitamina B12", qty: "secondo il riferimento D-A-CH (4 µg/giorno)", ora: colazione, stelle: "★★★", perche: "Con un'alimentazione vegana la B12 manca quasi del tutto: è necessaria.", avviso: "Falla controllare ogni tanto dal medico.", fonte: "D-A-CH" });
  if (p?.caffeina_ok !== false && (+p?.allenamenti_sett || 0) > 0)
    out.push({ id: "caffeina", titolo: "Caffeina prima dell'allenamento", qty: `≈ ${Math.round(peso * 3 / 10) * 10} mg (3 mg/kg) · 2-3 caffè`, ora: fmt(hm(p?.ora_allenamento || "18:00") - 45), giorni: giorniAllenamento(+p?.allenamenti_sett), stelle: "★★★", perche: "Aumenta un po' forza e potenza, 30-60 minuti prima.", avviso: "Mai oltre 400 mg al giorno. Se dormi male o ti alleni la sera tardi, evitala.", fonte: "ISSN 2021" });
  return out;
}
export const DA_EVITARE = [
  { titolo: "Vitamine C ed E ad alte dosi", perche: "Possono frenare gli adattamenti all'allenamento.", fonte: "Bjørnsen 2016" },
  { titolo: "Ferro senza esami", perche: "Senza carenza non serve e in eccesso fa male: solo se lo indica il medico.", fonte: "Rubeor 2018" },
  { titolo: "Multivitaminico se mangi in modo vario", perche: "Non migliora prestazione né salute se non hai carenze.", fonte: "Heffernan 2019" },
];

// Giornata tipo costruita sugli orari della persona
export function giornataTipo(p) {
  const f = fabbisogno(p);
  const all = giorniAllenamento(+p.allenamenti_sett || 0);
  const riposo = [0, 1, 2, 3, 4, 5, 6].filter((g) => !all.includes(g));
  const sveglia = hm(p.sveglia || "07:00"), letto = hm(p.a_letto || "23:00");
  const ora_all = hm(p.ora_allenamento || "18:00");
  const pranzo = hm(p.pausa_pranzo || "12:30");
  const colazione = sveglia + 30;
  const kcal = f?.kcal, prot = f?.p;
  const quota = (q) => (kcal ? ` · circa ${Math.round(kcal * q / 10) * 10} kcal, ${Math.round(prot * q)} g di proteine` : "");
  const v = [];
  const tutti = [1, 2, 3, 4, 5, 6, 0];
  v.push({ giorni: tutti, ora: fmt(colazione), tipo: "pasto", titolo: "Colazione", dettaglio: "Proteine + carboidrati: es. yogurt greco, fiocchi d'avena, frutta" + quota(0.22) });
  if (pranzo - colazione > 240) v.push({ giorni: tutti, ora: fmt((colazione + pranzo) / 2), tipo: "pasto", titolo: "Spuntino", dettaglio: "Es. ricotta o skyr con frutta e frutta secca" + quota(0.12) });
  v.push({ giorni: tutti, ora: fmt(pranzo), tipo: "pasto", titolo: "Pranzo", dettaglio: "Carne, pesce, uova o legumi + riso/pasta/patate + verdura" + quota(0.28) });
  if (all.length) {
    v.push({ giorni: all, ora: fmt(ora_all - 90), tipo: "pasto", titolo: "Pre-allenamento", dettaglio: "Carboidrati facili e poche fibre: es. pane e miele, banana" + quota(0.1) });
    v.push({ giorni: all, ora: fmt(ora_all), tipo: "allenamento", titolo: "Allenamento", dettaglio: "Apri la scheda del giorno in Allenamento", anticipo_min: 30 });
    const cena = Math.min(ora_all + 90, letto - 120);
    v.push({ giorni: all, ora: fmt(cena), tipo: "pasto", titolo: "Cena (dopo l'allenamento)", dettaglio: "Almeno 30-40 g di proteine + carboidrati per recuperare" + quota(0.28) });
  }
  if (riposo.length) v.push({ giorni: riposo, ora: fmt(Math.min(19 * 60 + 30, letto - 150)), tipo: "pasto", titolo: "Cena", dettaglio: "Giorno di riposo: stesse proteine, un po' meno carboidrati" + quota(0.28) });
  v.push({ giorni: tutti, ora: fmt(letto), tipo: "recupero", titolo: "A letto", dettaglio: "Obiettivo 7-9 ore di sonno per recuperare", anticipo_min: 30 });
  return v.map((x) => ({ promemoria: true, anticipo_min: 0, origine: "giornata", ...x }));
}
