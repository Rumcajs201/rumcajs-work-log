const STORES_URLS = [
  "https://rumcajs201.github.io/europris-dostawa/stores.json",
  "https://raw.githubusercontent.com/Rumcajs201/europris-dostawa/main/stores.json"
];

let storesCache = null;

export async function loadStores() {
  if (storesCache) return storesCache;

  let lastError = null;
  for (const url of STORES_URLS) {
    try {
      const response = await fetch(url, { cache: "no-store" });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      storesCache = data.map(store => ({
        ...store,
        number: Number(store.number),
        latitude: Number(store.latitude),
        longitude: Number(store.longitude)
      }));
      return storesCache;
    } catch (error) {
      lastError = error;
    }
  }

  throw new Error(`Nie udało się pobrać bazy sklepów: ${lastError?.message || "nieznany błąd"}`);
}

export function searchStores(stores, query, limit = 8) {
  const text = String(query || "").trim().toLocaleLowerCase("pl-PL");
  if (!text) return [];

  return stores
    .filter(store => {
      const number = String(store.number);
      const name = String(store.name || "").toLocaleLowerCase("pl-PL");
      const address = String(store.address || "").toLocaleLowerCase("pl-PL");
      return number.includes(text) || name.includes(text) || address.includes(text);
    })
    .slice(0, limit);
}

function distanceMeters(lat1, lon1, lat2, lon2) {
  const earthRadius = 6371000;
  const toRad = value => value * Math.PI / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * earthRadius * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function findNearestStore(stores, position) {
  if (!position) return null;
  let nearest = null;

  for (const store of stores) {
    if (!Number.isFinite(store.latitude) || !Number.isFinite(store.longitude)) continue;
    const distance = distanceMeters(position.latitude, position.longitude, store.latitude, store.longitude);
    if (!nearest || distance < nearest.distance) nearest = { store, distance };
  }

  return nearest;
}

export function storeLabel(store) {
  return store ? `${store.number} — ${store.name}` : "";
}
