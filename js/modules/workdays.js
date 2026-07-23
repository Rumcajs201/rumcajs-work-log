import { get, put, STORES } from "../db/indexeddb.js";
import { dateId, minutesBetween } from "./time.js";

export const getDay = (id = dateId()) => get(STORES.workdays, id);

const owns = (object, key) => Object.prototype.hasOwnProperty.call(object, key);
const valueOrExisting = (workday, existing, key, fallback = null) =>
  owns(workday, key) ? workday[key] : (existing?.[key] ?? fallback);

export async function saveDay(workday) {
  const now = Date.now();
  const existing = await getDay(workday.id);

  // Explicit null must clear a previous value. Using ?? here caused a finished
  // workday to remain finished even after pressing "Start work" again.
  const finalStartTime = valueOrExisting(workday, existing, "finalStartTime");
  const finalEndTime = valueOrExisting(workday, existing, "finalEndTime");
  const breakMinutes = Number(valueOrExisting(workday, existing, "breakMinutes", 0) || 0);
  const netMinutes = minutesBetween(finalStartTime, finalEndTime, breakMinutes);

  const record = {
    id: workday.id,
    date: valueOrExisting(workday, existing, "date", workday.id),
    dayType: valueOrExisting(workday, existing, "dayType", "work"),
    driverName: String(valueOrExisting(workday, existing, "driverName", "") ?? ""),
    detectedStartTime: valueOrExisting(workday, existing, "detectedStartTime"),
    finalStartTime,
    detectedEndTime: valueOrExisting(workday, existing, "detectedEndTime"),
    finalEndTime,
    startPosition: valueOrExisting(workday, existing, "startPosition"),
    endPosition: valueOrExisting(workday, existing, "endPosition"),
    startAddress: valueOrExisting(workday, existing, "startAddress"),
    endAddress: valueOrExisting(workday, existing, "endAddress"),
    startOdometer: valueOrExisting(workday, existing, "startOdometer"),
    endOdometer: valueOrExisting(workday, existing, "endOdometer"),
    lastOdometer: valueOrExisting(workday, existing, "lastOdometer"),
    manuallyAdjusted: Boolean(valueOrExisting(workday, existing, "manuallyAdjusted", false)),
    breakMinutes,
    netMinutes,
    truckId: String(valueOrExisting(workday, existing, "truckId", "") ?? ""),
    trailerId: String(valueOrExisting(workday, existing, "trailerId", "") ?? ""),
    vehicleChanges: owns(workday, "vehicleChanges")
      ? (Array.isArray(workday.vehicleChanges) ? workday.vehicleChanges : [])
      : (existing?.vehicleChanges || []),
    trailerEvents: owns(workday, "trailerEvents")
      ? (Array.isArray(workday.trailerEvents) ? workday.trailerEvents : [])
      : (existing?.trailerEvents || []),
    trailerNumber: valueOrExisting(workday, existing, "trailerNumber"),
    notes: String(valueOrExisting(workday, existing, "notes", "") ?? ""),
    createdAt: existing?.createdAt ?? now,
    updatedAt: now
  };

  await put(STORES.workdays, record);
  await put(STORES.appState, {
    id: "current",
    activeWorkdayId: record.finalStartTime && !record.finalEndTime ? record.id : null,
    lastSavedAt: now
  });
  return record;
}

export const getState = () => get(STORES.appState, "current");
