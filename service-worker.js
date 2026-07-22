const CACHE = "rumcajs-work-log-v0.4.2-smart-location-1";
const ASSETS = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./css/app.css",
  "./js/app.js",
  "./js/i18n.js",
  "./js/language-switcher.js",
  "./js/config/app-config.js",
  "./js/db/indexeddb.js",
  "./js/modules/time.js",
  "./js/modules/workdays.js",
  "./js/modules/operations.js",
  "./js/modules/backup.js",
  "./js/modules/gps.js",
  "./js/modules/stores.js",
  "./js/modules/reverse-geocode.js"
];
self.addEventListener("install",event=>{event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(ASSETS)).then(()=>self.skipWaiting()));});
self.addEventListener("activate",event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim()));});
self.addEventListener("fetch",event=>{if(event.request.method!=="GET")return;event.respondWith(caches.match(event.request).then(cached=>cached||fetch(event.request).then(response=>{if(response&&response.status===200){const copy=response.clone();caches.open(CACHE).then(cache=>cache.put(event.request,copy));}return response;}).catch(()=>caches.match("./index.html"))));});
