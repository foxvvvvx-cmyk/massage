/* 沈度 v8 — Service Worker (pass-through, no cache) */
self.addEventListener('install',()=>{caches.keys().then(keys=>Promise.all(keys.map(k=>caches.delete(k))));self.skipWaiting()})
self.addEventListener('activate',()=>self.clients.claim())
self.addEventListener('fetch',e=>e.respondWith(fetch(e.request)))
