import { openDB, get, put, getAll, STORES } from "./db/indexeddb.js";
import { dateId, clock, roundStart, roundEnd, saved, minutesText } from "./modules/time.js";
import { getDay, saveDay, getState } from "./modules/workdays.js";
import { exportDB, importDB } from "./modules/backup.js";
import { getCurrentPosition, formatPosition } from "./modules/gps.js";

const $ = selector => document.querySelector(selector);
const $$ = selector => [...document.querySelectorAll(selector)];

let currentDay = null;
let currentMonth = new Date();

const defaults = {
  id: "main",
  defaultDriverName: "Andrzej Osowski",
  defaultTruckId: "",
  hourlyRate: 225,
  overtimePercent: 40,
  dailyMinutes: 480,
  gpsRadius: 120,
  updatedAt: Date.now()
};

function toast(text) {
  $("#toast").textContent = text;
  $("#toast").classList.remove("hidden");
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => $("#toast").classList.add("hidden"), 3000);
}

function setView(name) {
  $$(".view").forEach(view => view.classList.toggle("active", view.id === `view-${name}`));
  $$(".nav-button").forEach(button => button.classList.toggle("active", button.dataset.view === name));
  if (name === "calendar") renderCalendar();
  if (name === "settings") loadSettings();
}

function updateConnection() {
  $("#connectionStatus").textContent = navigator.onLine ? "Online • dane lokalne" : "Offline • dane lokalne";
}

async function ensureSettings() {
  let settings = await get(STORES.settings, "main");
  if (!settings) {
    settings = defaults;
    await put(STORES.settings, settings);
  } else {
    settings = { ...defaults, ...settings };
  }
  return settings;
}

function renderHome() {
  const started = Boolean(currentDay?.finalStartTime);
  const ended = Boolean(currentDay?.finalEndTime);

  $("#homeDriver").textContent = currentDay?.driverName || "—";
  $("#homeStart").textContent = currentDay?.finalStartTime || "—";
  $("#homeEnd").textContent = currentDay?.finalEndTime || "—";
  $("#homeTruck").textContent = currentDay?.truckId || "—";
  $("#homeTrailer").textContent = currentDay?.trailerNumber || "—";
  $("#homeNet").textContent = minutesText(currentDay?.netMinutes || 0);
  $("#homeStartPosition").textContent = formatPosition(currentDay?.startPosition);
  $("#homeEndPosition").textContent = formatPosition(currentDay?.endPosition);
  $("#startWorkButton").disabled = started && !ended;
  $("#stopWorkButton").disabled = !started || ended;
  $("#dayBadge").textContent = !started ? "Nie rozpoczęto" : ended ? "Zakończono" : "W trakcie";
}

async function refresh() {
  currentDay = await getDay();
  const state = await getState();
  renderHome();
  $("#lastSaved").textContent = saved(state?.lastSavedAt || currentDay?.updatedAt);
}

async function capturePosition(label) {
  try {
    toast(`Pobieram GPS: ${label}…`);
    return await getCurrentPosition();
  } catch (error) {
    toast(`${error.message} Czas zapisano bez GPS.`);
    return null;
  }
}

async function startWork() {
  const settings = await ensureSettings();
  const now = new Date();
  const id = dateId();
  const position = await capturePosition("rozpoczęcie pracy");

  currentDay = await saveDay({
    ...currentDay,
    id,
    date: id,
    dayType: currentDay?.dayType ?? "work",
    driverName: currentDay?.driverName || settings.defaultDriverName,
    truckId: currentDay?.truckId || settings.defaultTruckId,
    detectedStartTime: clock(now),
    finalStartTime: roundStart(now),
    finalEndTime: null,
    startPosition: position ?? currentDay?.startPosition ?? null,
    manuallyAdjusted: false
  });

  toast(`Start zapisany: ${currentDay.finalStartTime}`);
  await refresh();
}

async function stopWork() {
  const now = new Date();
  const position = await capturePosition("zakończenie pracy");

  currentDay = await saveDay({
    ...currentDay,
    detectedEndTime: clock(now),
    finalEndTime: roundEnd(now),
    endPosition: position ?? currentDay?.endPosition ?? null,
    manuallyAdjusted: false
  });

  toast(`Koniec zapisany: ${currentDay.finalEndTime}`);
  await refresh();
}

async function loadDayForm(id = dateId()) {
  const day = await getDay(id);
  const settings = await ensureSettings();
  $("#workDate").value = id;
  $("#dayType").value = day?.dayType ?? "work";
  $("#driverName").value = day?.driverName ?? settings.defaultDriverName;
  $("#startTime").value = day?.finalStartTime ?? "";
  $("#endTime").value = day?.finalEndTime ?? "";
  $("#truckId").value = day?.truckId ?? settings.defaultTruckId;
  $("#trailerNumber").value = day?.trailerNumber ?? "";
  $("#breakMinutes").value = day?.breakMinutes ?? 0;
  $("#notes").value = day?.notes ?? "";
  $("#dayFormTitle").textContent = new Intl.DateTimeFormat("pl-PL", { dateStyle: "full" }).format(new Date(`${id}T12:00:00`));
  setView("day");
}

async function saveDayForm(event) {
  event.preventDefault();
  const trailer = $("#trailerNumber").value.trim();
  if (trailer && (Number(trailer) < 1 || Number(trailer) > 999)) {
    toast("Naczepa musi mieć numer 1–999.");
    return;
  }

  const id = $("#workDate").value;
  await saveDay({
    ...(await getDay(id)),
    id,
    date: id,
    dayType: $("#dayType").value,
    driverName: $("#driverName").value.trim(),
    finalStartTime: $("#startTime").value || null,
    finalEndTime: $("#endTime").value || null,
    truckId: $("#truckId").value.trim(),
    trailerNumber: trailer ? Number(trailer) : null,
    breakMinutes: Number($("#breakMinutes").value || 0),
    notes: $("#notes").value.trim(),
    manuallyAdjusted: true
  });

  toast("Dzień zapisany.");
  await refresh();
  setView("calendar");
}

async function renderCalendar() {
  const settings = await ensureSettings();
  const workdays = await getAll(STORES.workdays);
  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const rows = $("#monthRows");
  rows.innerHTML = "";
  $("#calendarTitle").textContent = new Intl.DateTimeFormat("pl-PL", { month: "long", year: "numeric" }).format(currentMonth);

  let total = 0;
  let days = 0;
  let overtime = 0;
  let gross = 0;
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  for (let dayNumber = 1; dayNumber <= daysInMonth; dayNumber++) {
    const id = `${year}-${String(month + 1).padStart(2, "0")}-${String(dayNumber).padStart(2, "0")}`;
    const day = workdays.find(item => item.id === id);
    const net = day?.netMinutes || 0;
    const extra = Math.max(0, net - settings.dailyMinutes);

    if (day?.dayType === "work" && net > 0) days++;
    total += net;
    overtime += extra;
    gross += (Math.max(0, net - extra) / 60) * settings.hourlyRate;
    gross += (extra / 60) * settings.hourlyRate * (1 + settings.overtimePercent / 100);

    const date = new Date(year, month, dayNumber);
    const row = document.createElement("div");
    row.className = `day-row ${day ? "" : "empty-day"}`;
    row.innerHTML = `<button type="button" data-date="${id}"><div class="day-date"><strong>${String(dayNumber).padStart(2, "0")}</strong><span>${new Intl.DateTimeFormat("pl-PL", { weekday: "short" }).format(date)}</span></div><div class="day-details"><strong>${day?.dayType === "work" ? "Praca" : day?.dayType || "Brak wpisu"}</strong><span>${day?.finalStartTime || "—"} – ${day?.finalEndTime || "—"} • ${day?.truckId || "bez auta"}</span></div><div class="day-hours">${minutesText(net)}</div></button>`;
    rows.appendChild(row);
  }

  rows.querySelectorAll("button").forEach(button => button.addEventListener("click", () => loadDayForm(button.dataset.date)));
  $("#totalHours").textContent = minutesText(total);
  $("#totalDays").textContent = String(days);
  $("#totalOvertime").textContent = minutesText(overtime);
  $("#totalGross").textContent = `${gross.toFixed(0)} NOK`;
}

async function loadSettings() {
  const settings = await ensureSettings();
  $("#defaultDriverName").value = settings.defaultDriverName;
  $("#defaultTruckId").value = settings.defaultTruckId;
  $("#hourlyRate").value = settings.hourlyRate;
  $("#overtimePercent").value = settings.overtimePercent;
  $("#dailyMinutes").value = settings.dailyMinutes;
  $("#gpsRadius").value = settings.gpsRadius;
}

async function saveSettings(event) {
  event.preventDefault();
  await put(STORES.settings, {
    id: "main",
    defaultDriverName: $("#defaultDriverName").value.trim(),
    defaultTruckId: $("#defaultTruckId").value.trim(),
    hourlyRate: Number($("#hourlyRate").value || 0),
    overtimePercent: Number($("#overtimePercent").value || 0),
    dailyMinutes: Number($("#dailyMinutes").value || 0),
    gpsRadius: Math.min(120, Math.max(20, Number($("#gpsRadius").value || 120))),
    updatedAt: Date.now()
  });
  toast("Ustawienia zapisane.");
}

function bindEvents() {
  $$(".nav-button").forEach(button => button.onclick = () => setView(button.dataset.view));
  $("#startWorkButton").onclick = startWork;
  $("#stopWorkButton").onclick = stopWork;
  $("#editTodayButton").onclick = () => loadDayForm();
  $("#cancelEditButton").onclick = () => setView("home");
  $("#dayForm").onsubmit = saveDayForm;
  $("#settingsForm").onsubmit = saveSettings;
  $("#previousMonth").onclick = () => { currentMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1); renderCalendar(); };
  $("#nextMonth").onclick = () => { currentMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1); renderCalendar(); };
  $("#exportButton").onclick = exportDB;
  $("#importInput").onchange = async event => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      await importDB(file);
      toast("Kopia zaimportowana.");
      await refresh();
      await renderCalendar();
    } catch (error) {
      toast(error.message);
    }
    event.target.value = "";
  };
  addEventListener("online", updateConnection);
  addEventListener("offline", updateConnection);
}

async function boot() {
  updateConnection();
  bindEvents();
  await openDB();
  await ensureSettings();
  await refresh();
  if ("serviceWorker" in navigator) navigator.serviceWorker.register("./service-worker.js").catch(console.error);
}

boot().catch(error => {
  console.error(error);
  toast("Błąd uruchamiania aplikacji.");
});
