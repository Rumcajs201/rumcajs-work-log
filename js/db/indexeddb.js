const params = new URLSearchParams(window.location.search);
const IS_UNIVERSAL_DISTRIBUTION = params.get("variant") === "universal";
const DB_NAME = IS_UNIVERSAL_DISTRIBUTION ? "rumcajs-work-log-universal-v1" : "rumcajs-work-log";
const DB_VERSION = 4;

export const STORES = {
  workdays: "workdays",
  operations: "operations",
  settings: "settings",
  appState: "appState",
  backups: "backups",
  places: "places"
};

let dbPromise;

function seedUniversalSettings(db) {
  if (!IS_UNIVERSAL_DISTRIBUTION) return Promise.resolve();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.settings, "readwrite");
    const store = tx.objectStore(STORES.settings);
    const request = store.get("main");

    request.onsuccess = () => {
      if (!request.result) {
        store.put({
          id: "main",
          workProfile: "universal",
          language: "pl",
          defaultDriverName: "",
          defaultTruckId: "",
          hourlyRate: 0,
          overtimePercent: 0,
          dailyMinutes: 480,
          gpsRadius: 120,
          paymentMethod: "hourly",
          paymentCurrency: "NOK",
          kilometerRate: 0,
          freightRate: 0,
          dailyRate: 0,
          monthlyRate: 0,
          minimumDailyGross: 0,
          extraPointRate: 0,
          pickupBonus: 0,
          bonusGross: 0,
          dietRateGross: 0,
          nightPercent: 0,
          nightFixed: 0,
          saturdayPercent: 0,
          saturdayFixed: 0,
          sundayPercent: 0,
          sundayFixed: 0,
          holidayPercent: 0,
          holidayFixed: 0,
          enableOvertime: false,
          enableNight: false,
          enableDiets: false,
          enableBonus: false,
          enableMileage: false,
          updatedAt: Date.now()
        });
      }
    };

    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

export function openDB() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      for (const name of Object.values(STORES)) {
        if (!db.objectStoreNames.contains(name)) db.createObjectStore(name, { keyPath: "id" });
      }
    };
    request.onsuccess = async () => {
      try {
        await seedUniversalSettings(request.result);
        resolve(request.result);
      } catch (error) {
        reject(error);
      }
    };
    request.onerror = () => reject(request.error);
  });
  return dbPromise;
}

export async function put(store, value) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, "readwrite");
    tx.objectStore(store).put(value);
    tx.oncomplete = () => resolve(value);
    tx.onerror = () => reject(tx.error);
  });
}

export async function get(store, key) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const request = db.transaction(store).objectStore(store).get(key);
    request.onsuccess = () => resolve(request.result ?? null);
    request.onerror = () => reject(request.error);
  });
}

export async function getAll(store) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const request = db.transaction(store).objectStore(store).getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function remove(store, key) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, "readwrite");
    tx.objectStore(store).delete(key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function clear(store) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, "readwrite");
    tx.objectStore(store).clear();
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export { DB_NAME, DB_VERSION };