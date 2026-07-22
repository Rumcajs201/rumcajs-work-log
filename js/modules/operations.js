import { get, getAll, put, STORES } from "../db/indexeddb.js";

export async function getOperationsForDay(workdayId) {
  const all = await getAll(STORES.operations);
  return all.filter(item => item.workdayId === workdayId).sort((a, b) => (a.startedAt || 0) - (b.startedAt || 0));
}

export async function getActiveOperation(workdayId) {
  const items = await getOperationsForDay(workdayId);
  return items.find(item => !item.endTime) ?? null;
}

export async function startOperation(data) {
  const now = Date.now();
  const operation = {
    id: `operation-${now}`,
    workdayId: data.workdayId,
    type: data.type,
    profile: data.profile ?? null,
    place: data.place,
    placeId: data.placeId ?? null,
    storeNumber: data.storeNumber ?? null,
    storeName: data.storeName ?? null,
    storeAddress: data.storeAddress ?? null,
    locality: data.locality ?? null,
    countryCode: data.countryCode ?? null,
    startTime: data.startTime,
    detectedStartTime: data.detectedStartTime,
    endTime: null,
    detectedEndTime: null,
    pallets: null,
    emptyPallets: null,
    notes: "",
    position: data.position ?? null,
    startedAt: now,
    endedAt: null,
    updatedAt: now
  };
  await put(STORES.operations, operation);
  return operation;
}

export async function finishOperation(id, data) {
  const operation = await get(STORES.operations, id);
  if (!operation) throw new Error("Nie znaleziono aktywnej operacji.");

  const pallets = Number(data.pallets);
  if (!Number.isFinite(pallets) || pallets < 0) throw new Error("Wpisz prawidłową liczbę palet.");

  const emptyValue = data.emptyPallets === "" || data.emptyPallets == null ? 0 : Number(data.emptyPallets);
  if (!Number.isFinite(emptyValue) || emptyValue < 0) throw new Error("Wpisz prawidłową liczbę pustych palet.");

  const updated = {
    ...operation,
    endTime: data.endTime,
    detectedEndTime: data.detectedEndTime,
    pallets,
    emptyPallets: operation.type === "unload" ? emptyValue : 0,
    notes: String(data.notes || ""),
    endedAt: Date.now(),
    updatedAt: Date.now()
  };
  await put(STORES.operations, updated);
  return updated;
}