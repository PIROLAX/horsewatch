/*
 * HorseWatch - app/sw.js
 * Version : 1.0.0 (2026-11-21)
 * Service worker optionnel : met en cache l'appli et Leaflet pour un fonctionnement hors ligne
 * (les tuiles de carte deja vues restent aussi disponibles). A deposer a cote de HorseWatch-app-x.y.z.html.
 * Changer CACHE a chaque nouvelle version de l'appli.
 */
const CACHE = "horsewatch-1.0.0";
const CORE = ["./", "./HorseWatch-app-1.0.0.html", "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css", "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"];
const MAX_TILES = 1500;

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => Promise.all(CORE.map(u => c.add(u).catch(() => {})))).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k.startsWith("horsewatch-") && k !== CACHE && k !== "horsewatch-tiles").map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});
self.addEventListener("fetch", e => {
  const url = new URL(e.request.url);
  if (e.request.method !== "GET") return;
  if (url.hostname.endsWith("tile.openstreetmap.org")) {          /* tuiles : cache d'abord, quota borne */
    e.respondWith(caches.open("horsewatch-tiles").then(async c => {
      const hit = await c.match(e.request);
      if (hit) return hit;
      const r = await fetch(e.request);
      if (r.ok) { c.put(e.request, r.clone()); c.keys().then(ks => { for (let i = 0; i < ks.length - MAX_TILES; i++) c.delete(ks[i]); }); }
      return r;
    }));
    return;
  }
  /* appli : reseau d'abord (pour recevoir les mises a jour), cache si hors ligne */
  e.respondWith(fetch(e.request).then(r => {
    if (r.ok && (url.origin === location.origin || url.hostname === "unpkg.com")) { const cl = r.clone(); caches.open(CACHE).then(c => c.put(e.request, cl)); }
    return r;
  }).catch(() => caches.match(e.request, { ignoreSearch: true }).then(r => r || caches.match("./HorseWatch-app-1.0.0.html"))));
});
