/* Service worker Buget — face aplicația disponibilă offline după prima deschidere.
   Necesar ca PWA-ul instalat pe telefon să pornească și când GitHub Pages nu mai
   servește site-ul (de ex. după ce repo-ul redevine privat). */
"use strict";

const CACHE = "buget-v1";
const ASSETS = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./icon-192.png",
  "./icon-512.png",
  "./icon-512-maskable.png",
  "./apple-touch-icon.png",
];

self.addEventListener("install", e=>{
  e.waitUntil(
    caches.open(CACHE)
      .then(c=> c.addAll(ASSETS))
      .then(()=> self.skipWaiting())
  );
});

self.addEventListener("activate", e=>{
  e.waitUntil(
    caches.keys()
      .then(keys=> Promise.all(keys.filter(k=> k!==CACHE).map(k=> caches.delete(k))))
      .then(()=> self.clients.claim())
  );
});

/* Cache-first + reîmprospătare în fundal: pornește instant (și offline),
   dar preia versiunea nouă de pe server când există rețea. */
self.addEventListener("fetch", e=>{
  const req = e.request;
  if(req.method!=="GET") return;
  if(new URL(req.url).origin!==location.origin) return;

  e.respondWith(
    caches.match(req).then(hit=>{
      const fromNet = fetch(req).then(res=>{
        if(res && res.ok){
          const copy = res.clone();
          caches.open(CACHE).then(c=> c.put(req, copy));
        }
        return res;
      }).catch(()=>{
        // offline: cade pe cache, iar pentru navigări pe shell-ul aplicației
        if(hit) return hit;
        if(req.mode==="navigate") return caches.match("./index.html");
        return Response.error();
      });
      return hit || fromNet;
    })
  );
});
