/* 沈度 v5 — Service Worker */
const CACHE = 'shendu-v7'

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll([
    './','./index.html','./style.css','./app.js','./manifest.json'
  ]).catch(() => {})))
  self.skipWaiting()
})

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(
    keys.filter(k => k !== CACHE).map(k => caches.delete(k))
  )))
  self.clients.claim()
})

self.addEventListener('fetch', e => {
  // network-first for HTML, cache-first for assets
  if(e.request.mode==='navigate'){
    e.respondWith(fetch(e.request).catch(()=>caches.match('./')))
  }else{
    e.respondWith(
      caches.match(e.request).then(cached => cached || fetch(e.request).then(res=>{
        if(res.ok){const clone=res.clone();caches.open(CACHE).then(c=>c.put(e.request,clone))}
        return res
      }))
    )
  }
})
