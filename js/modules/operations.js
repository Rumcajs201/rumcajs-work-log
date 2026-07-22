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
    place: data.place,
    startTime: data.startTime,
    detectedStartTime: data.detectedStartTime,
    endTime: null,
    detectedEndTime: null,
    pallets: Number(data.pallets || 0),
    emptyPallets: data.type === "unload" ? Number(data.emptyPallets || 0) : 0,
    notes: String(data.notes || ""),
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
  const updated = {
    ...operation,
    endTime: data.endTime,
    detectedEndTime: data.detectedEndTime,
    endedAt: Date.now(),
    updatedAt: Date.now()
  };
  await put(STORES.operations, updated);
  return updated;
}
