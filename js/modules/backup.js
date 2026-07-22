import { getAll, clear, put, STORES, DB_NAME, DB_VERSION } from "../db/indexeddb.js";

export async function exportDB() {
  const data = {
    format: "rumcajs-work-log-backup",
    exportedAt: new Date().toISOString(),
    dbName: DB_NAME,
    dbVersion: DB_VERSION,
    workdays: await getAll(STORES.workdays),
    operations: await getAll(STORES.operations),
    settings: await getAll(STORES.settings),
    appState: await getAll(STORES.appState),
    places: await getAll(STORES.places)
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `rumcajs-work-log-${new Date().toISOString().slice(0, 10)}.json`;
  link.click();
  URL.revokeObjectURL(url);
}

export async function importDB(file) {
  const data = JSON.parse(await file.text());
  if (data.format !== "rumcajs-work-log-backup") throw new Error("To nie jest kopia Rumcajs Work Log.");
  await put(STORES.backups, {
    id: `before-import-${Date.now()}`,
    createdAt: Date.now(),
    payload: {
      workdays: await getAll(STORES.workdays),
      operations: await getAll(STORES.operations),
      settings: await getAll(STORES.settings),
      appState: await getAll(STORES.appState),
      places: await getAll(STORES.places)
    }
  });
  for (const store of [STORES.workdays, STORES.operations, STORES.settings, STORES.appState, STORES.places]) await clear(store);
  for (const item of data.workdays ?? []) await put(STORES.workdays, item);
  for (const item of data.operations ?? []) await put(STORES.operations, item);
  for (const item of data.settings ?? []) await put(STORES.settings, item);
  for (const item of data.appState ?? []) await put(STORES.appState, item);
  for (const item of data.places ?? []) await put(STORES.places, item);
}