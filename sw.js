// T.E.S.T.O. – service worker: app anche senza rete, aggiornamenti automatici, notifiche
const VERSIONE = "testo-v1";
const BASE = ["./", "index.html", "css/app.css", "js/app.js", "js/ui.js", "js/db.js", "js/corpo.js", "js/nutrizione.js", "js/assistente.js",
  "js/allenamento.js", "js/calendario.js", "js/dieta.js", "js/chat.js", "js/documenti.js", "js/supabase.js", "js/config.js",
  "dati/esercizi.json", "dati/alimenti.json", "dati/archivio.json", "manifest.webmanifest", "icone/icona-192.png"];
self.addEventListener("install", (e) => { e.waitUntil(caches.open(VERSIONE).then((c) => c.addAll(BASE)).then(() => self.skipWaiting())); });
self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((k) => Promise.all(k.filter((x) => x !== VERSIONE).map((x) => caches.delete(x)))).then(() => self.clients.claim()));
});
// Prima la rete (così gli aggiornamenti arrivano subito), se manca la rete usa la copia salvata
self.addEventListener("fetch", (e) => {
  const u = new URL(e.request.url);
  if (e.request.method !== "GET" || u.origin !== location.origin) return;
  e.respondWith(fetch(e.request).then((r) => {
    if (r.ok) { const c = r.clone(); caches.open(VERSIONE).then((cc) => cc.put(e.request, c)); }
    return r;
  }).catch(() => caches.match(e.request, { ignoreSearch: true }).then((r) => r || caches.match("index.html"))));
});
self.addEventListener("push", (e) => {
  let d = {}; try { d = e.data.json(); } catch { d = { title: "T.E.S.T.O.", body: e.data?.text() || "Promemoria" }; }
  e.waitUntil(self.registration.showNotification(d.title || "T.E.S.T.O.", { body: d.body || "", icon: "icone/icona-192.png", badge: "icone/icona-192.png", tag: d.tag, data: { url: d.url || "./" } }));
});
self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  const url = new URL(e.notification.data?.url || "./", self.registration.scope).href;
  e.waitUntil(clients.matchAll({ type: "window", includeUncontrolled: true }).then((ws) => {
    for (const w of ws) { if ("focus" in w) { w.navigate(url); return w.focus(); } }
    return clients.openWindow(url);
  }));
});
