/* 沈度 v5 — Service Worker */
const CACHE = 'shendu-v5.3'

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll([
    '/','/index.html','/style.css','/app.js','/manifest.json'
  ]).catch(() => {})))
  self.skipWaiting()
})

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(
    keys.map(k => caches.delete(k))
  )))
  self.clients.claim()
})

self.addEventListener('fetch', e => {
  e.respondWith(
    caches.match(e.request, {ignoreSearch:true}).then(cached => cached || fetch(e.request))
  )
})
