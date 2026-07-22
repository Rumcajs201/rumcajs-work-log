export const dateId = (date = new Date()) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

export const clock = (date = new Date()) => `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;

export function roundStart(date = new Date()) {
  const rounded = new Date(date);
  rounded.setSeconds(0, 0);
  rounded.setMinutes(Math.floor(rounded.getMinutes() / 15) * 15);
  return clock(rounded);
}

export function roundEnd(date = new Date()) {
  const rounded = new Date(date);
  rounded.setSeconds(0, 0);
  const minute = rounded.getMinutes();
  const quarter = Math.floor(minute / 15) * 15;
  const offset = minute - quarter;
  let result = quarter + (offset > 5 ? 15 : 0);
  if (result >= 60) {
    rounded.setHours(rounded.getHours() + 1);
    result = 0;
  }
  rounded.setMinutes(result);
  return clock(rounded);
}

export function roundToNearestFive(date = new Date()) {
  const rounded = new Date(date);
  rounded.setSeconds(0, 0);
  let minutes = Math.round(rounded.getMinutes() / 5) * 5;
  if (minutes >= 60) {
    rounded.setHours(rounded.getHours() + 1);
    minutes = 0;
  }
  rounded.setMinutes(minutes);
  return clock(rounded);
}

export function minutesBetween(start, end, breakMinutes = 0) {
  if (!start || !end) return 0;
  const [startHour, startMinute] = start.split(":").map(Number);
  const [endHour, endMinute] = end.split(":").map(Number);
  let total = (endHour * 60 + endMinute) - (startHour * 60 + startMinute);
  if (total < 0) total += 1440;
  return Math.max(0, total - Number(breakMinutes || 0));
}

export function minutesText(value) {
  const minutes = Math.max(0, Math.round(value || 0));
  return `${Math.floor(minutes / 60)}:${String(minutes % 60).padStart(2, "0")}`;
}

export const saved = timestamp => timestamp
  ? new Intl.DateTimeFormat("pl-PL", { dateStyle: "medium", timeStyle: "medium" }).format(new Date(timestamp))
  : "Brak zapisów.";