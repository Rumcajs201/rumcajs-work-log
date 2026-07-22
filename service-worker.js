const CACHE = "rumcajs-work-log-v0.6.2-work-buttons-hotfix-1";
const ASSETS = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./css/app.css",
  "./css/saved-places.css",
  "./css/carrier-context.css",
  "./css/fleet-ui.css",
  "./css/operation-editor.css",
  "./js/app.js",
  "./js/i18n.js",
  "./js/language-switcher.js",
  "./js/history-search.js",
  "./js/carrier-context.js",
  "./js/fleet-ui.js",
  "./js/operation-editor.js",
  "./js/payments-settings.js",
  "./js/workday-address.js",
  "./js/config/app-config.js",
  "./js/db/indexeddb.js",
  "./js/modules/time.js",
  "./js/modules/workdays.js",
  "./js/modules/operations.js",
  "./js/modules/backup.js",
  "./js/modules/gps.js",
  "./js/modules/stores.js",
  "./js/modules/reverse-geocode.js",
  "./js/modules/places.js",
  "./data/carriers.json",
  "./data/hansen-jensen-halden-fleet.json"
];
self.addEventListener("install",event=>{event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(ASSETS)).then(()=>self.skipWaiting()));});
self.addEventListener("activate",event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim()));});
self.addEventListener("fetch",event=>{if(event.request.method!=="GET")return;event.respondWith(caches.match(event.request).then(cached=>cached||fetch(event.request).then(response=>{if(response&&response.status===200){const copy=response.clone();caches.open(CACHE).then(cache=>cache.put(event.request,copy));}return response;}).catch(()=>caches.match("./index.html"))));});