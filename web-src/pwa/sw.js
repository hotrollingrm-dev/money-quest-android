/* UAดิวะ! service worker — app shell offline; the page itself is network-first so updates arrive on the next open. */
const V = "uadiwa-v1";
const SHELL = ["/", "/manifest.webmanifest", "/icon-192.png", "/icon-512.png", "/vendor/fonts/nst-thai-400.woff2", "/vendor/fonts/nst-thai-700.woff2", "/vendor/fonts/nst-thai-800.woff2", "/vendor/fonts/chewy.woff2"];
self.addEventListener("install", e => { e.waitUntil(caches.open(V).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())); });
self.addEventListener("activate", e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== V).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener("fetch", e => {
  const r = e.request; if (r.method !== "GET" || new URL(r.url).origin !== location.origin) return;
  if (r.mode === "navigate") { e.respondWith(fetch(r).then(res => { const c = res.clone(); caches.open(V).then(x => x.put("/", c)); return res; }).catch(() => caches.match("/"))); return; }
  e.respondWith(caches.match(r).then(hit => hit || fetch(r).then(res => { if (res.ok && new URL(r.url).pathname.startsWith("/vendor/")) { const c = res.clone(); caches.open(V).then(x => x.put(r, c)); } return res; })));
});
