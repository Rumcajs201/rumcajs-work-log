import { get, put, STORES } from "../db/indexeddb.js";
import { dateId, minutesBetween } from "./time.js";

export const getDay = (id = dateId()) => get(STORES.workdays, id);

export async function saveDay(workday) {
  const now = Date.now();
  const existing = await getDay(workday.id);
  const netMinutes = minutesBetween(workday.finalStartTime, workday.finalEndTime, workday.breakMinutes);

  const record = {
    id: workday.id,
    date: workday.date,
    dayType: workday.dayType ?? "work",
    driverName: String(workday.driverName ?? existing?.driverName ?? ""),
    detectedStartTime: workday.detectedStartTime ?? existing?.detectedStartTime ?? null,
    finalStartTime: workday.finalStartTime ?? null,
    detectedEndTime: workday.detectedEndTime ?? existing?.detectedEndTime ?? null,
    finalEndTime: workday.finalEndTime ?? null,
    startPosition: workday.startPosition ?? existing?.startPosition ?? null,
    endPosition: workday.endPosition ?? existing?.endPosition ?? null,
    startAddress: workday.startAddress ?? existing?.startAddress ?? null,
    endAddress: workday.endAddress ?? existing?.endAddress ?? null,
    manuallyAdjusted: Boolean(workday.manuallyAdjusted),
    breakMinutes: Number(workday.breakMinutes ?? 0),
    netMinutes,
    truckId: String(workday.truckId ?? ""),
    trailerNumber: workday.trailerNumber ? Number(workday.trailerNumber) : null,
    notes: String(workday.notes ?? ""),
    createdAt: existing?.createdAt ?? now,
    updatedAt: now
  };

  await put(STORES.workdays, record);
  await put(STORES.appState, {
    id: "current",
    activeWorkdayId: record.finalEndTime ? null : record.id,
    lastSavedAt: now
  });

  return record;
}

export const getState = () => get(STORES.appState, "current");