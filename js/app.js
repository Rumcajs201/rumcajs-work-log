import { openDB, get, put, getAll, STORES } from "./db/indexeddb.js";
import { dateId, clock, roundStart, roundEnd, roundToNearestFive, saved, minutesText } from "./modules/time.js";
import { getDay, saveDay, getState } from "./modules/workdays.js";
import { exportDB, importDB } from "./modules/backup.js";
import { getCurrentPosition, formatPosition } from "./modules/gps.js";
import { getOperationsForDay, getActiveOperation, startOperation, finishOperation } from "./modules/operations.js";
import { loadStores, searchStores, findNearestStore, storeLabel } from "./modules/stores.js";
import { APP_CONFIG, PROFILE_LABELS } from "./config/app-config.js";

const $ = selector => document.querySelector(selector);
const $$ = selector => [...document.querySelectorAll(selector)];
let currentDay = null;
let currentMonth = new Date();
let stores = [];
let selectedStore = null;
let activeSettings = null;

const defaults = {
  id: "main",
  workProfile: APP_CONFIG.defaultProfile,
  language: APP_CONFIG.defaultLanguage,
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
  }
  activeSettings = { ...defaults, ...settings };
  return activeSettings;
}

function profileDescription(profile) {
  return profile === "europris"
    ? "Baza sklepów Europris, wyszukiwanie po numerze i nazwie oraz wykrywanie najbliższego sklepu przez GPS."
    : "Tryb dla dowolnego kierowcy. Miejsca wpisujesz samodzielnie; baza Europris nie jest używana.";
}

function applyProfileUI() {
  const profile = activeSettings?.workProfile || APP_CONFIG.defaultProfile;
  const europris = profile === "europris";
  $("#activeProfileBadge").textContent = PROFILE_LABELS[profile] || profile;
  $("#operationPlaceSearch").placeholder = europris
    ? "Numer lub nazwa sklepu / firmy"
    : "Nazwa firmy, magazynu lub adres";
  $("#detectStoreButton").classList.toggle("hidden", !europris);
  if (!europris) {
    selectedStore = null;
    $("#storeSuggestions").classList.add("hidden");
    $("#selectedPlaceBox").classList.add("hidden");
  }
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
  $("#newUnloadButton").disabled = !started || ended;
  $("#newLoadButton").disabled = !started || ended;
  $("#detectStoreButton").disabled = !started || ended;
  applyProfileUI();
}

async function refresh() {
  currentDay = await getDay();
  const state = await getState();
  renderHome();
  $("#lastSaved").textContent = saved(state?.lastSavedAt || currentDay?.updatedAt);
  await renderOperations();
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
  const active = await getActiveOperation(dateId());
  if (active) return toast("Najpierw zakończ aktywny załadunek lub rozładunek.");
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

function clearSelectedPlace() {
  selectedStore = null;
  $("#selectedPlaceBox").classList.add("hidden");
  $("#selectedPlaceLabel").textContent = "";
  $("#selectedPlaceAddress").textContent = "";
}

function chooseStore(store) {
  selectedStore = store;
  $("#operationPlaceSearch").value = storeLabel(store);
  $("#storeSuggestions").classList.add("hidden");
  $("#selectedPlaceLabel").textContent = storeLabel(store);
  $("#selectedPlaceAddress").textContent = store.address || "";
  $("#selectedPlaceBox").classList.remove("hidden");
}

function renderStoreSuggestions(query) {
  if (activeSettings?.workProfile !== "europris") return;
  const matches = searchStores(stores, query);
  const box = $("#storeSuggestions");
  if (!matches.length) {
    box.classList.add("hidden");
    box.innerHTML = "";
    return;
  }
  box.innerHTML = matches.map(store => `<button type="button" data-store-number="${store.number}"><strong>${store.number} — ${store.name}</strong><span>${store.address || ""}</span></button>`).join("");
  box.classList.remove("hidden");
  box.querySelectorAll("button").forEach(button => {
    button.onclick = () => chooseStore(stores.find(store => store.number === Number(button.dataset.storeNumber)));
  });
}

async function detectNearestStore() {
  if (activeSettings?.workProfile !== "europris") return toast("W profilu uniwersalnym wpisz nazwę miejsca ręcznie.");
  if (!stores.length) return toast("Baza sklepów nie jest jeszcze dostępna.");
  const position = await capturePosition("wyszukiwanie sklepu");
  if (!position) return;
  const nearest = findNearestStore(stores, position);
  if (!nearest) return toast("Nie znaleziono sklepu.");
  chooseStore(nearest.store);
  const radius = Number(activeSettings?.gpsRadius || 120);
  if (nearest.distance <= radius) toast(`Wykryto: ${storeLabel(nearest.store)} • ${Math.round(nearest.distance)} m`);
  else toast(`Najbliższy sklep jest ${Math.round(nearest.distance)} m od Ciebie.`);
}

function selectedPlaceData() {
  const typed = $("#operationPlaceSearch").value.trim();
  if (selectedStore && activeSettings?.workProfile === "europris") {
    return {
      place: storeLabel(selectedStore),
      storeNumber: selectedStore.number,
      storeName: selectedStore.name,
      storeAddress: selectedStore.address,
      profile: "europris"
    };
  }
  if (typed) return { place: typed, storeNumber: null, storeName: null, storeAddress: null, profile: activeSettings?.workProfile || "universal" };
  return null;
}

async function startSelectedOperation(type) {
  const place = selectedPlaceData();
  if (!place) return toast("Wybierz albo wpisz miejsce operacji.");
  const existing = await getActiveOperation(dateId());
  if (existing) return toast("Jedna operacja jest już rozpoczęta.");
  const now = new Date();
  const position = await capturePosition(type === "unload" ? "rozładunek" : "załadunek");
  await startOperation({ workdayId: dateId(), type, ...place, detectedStartTime: clock(now), startTime: roundToNearestFive(now), position });
  toast(`${type === "unload" ? "Rozładunek" : "Załadunek"} rozpoczęty: ${roundToNearestFive(now)}`);
  clearSelectedPlace();
  $("#operationPlaceSearch").value = "";
  await renderOperations();
}

function openFinishForm(active) {
  $("#finishOperationForm").classList.remove("hidden");
  $("#finishEmptyPalletsLabel").classList.toggle("hidden", active.type === "load");
  $("#finishPallets").value = "";
  $("#finishEmptyPallets").value = "";
  $("#finishNotes").value = "";
  $("#finishPallets").focus();
}

async function confirmFinishOperation() {
  const active = await getActiveOperation(dateId());
  if (!active) return;
  if ($("#finishPallets").value === "") return toast("Wpisz liczbę palet lub ilość ładunku.");
  const now = new Date();
  try {
    await finishOperation(active.id, {
      detectedEndTime: clock(now),
      endTime: roundToNearestFive(now),
      pallets: $("#finishPallets").value,
      emptyPallets: $("#finishEmptyPallets").value,
      notes: $("#finishNotes").value.trim()
    });
    $("#finishOperationForm").classList.add("hidden");
    toast(`Operacja zakończona: ${roundToNearestFive(now)}`);
    await renderOperations();
  } catch (error) {
    toast(error.message);
  }
}

async function renderOperations() {
  const items = await getOperationsForDay(dateId());
  const active = items.find(item => !item.endTime);
  $("#activeOperationBox").classList.toggle("hidden", !active);
  $("#operationSelector").classList.toggle("hidden", Boolean(active));
  if (active) {
    $("#activeOperationTitle").textContent = `${active.type === "unload" ? "Rozładunek" : "Załadunek"}: ${active.place}`;
    $("#activeOperationTime").textContent = `Od ${active.startTime}`;
  } else {
    $("#finishOperationForm").classList.add("hidden");
  }
  $("#todayOperations").innerHTML = items.length
    ? items.map(item => `<div class="timeline-item"><strong>${item.type === "unload" ? "Rozładunek" : "Załadunek"}: ${item.place}</strong><span>${item.startTime} – ${item.endTime || "trwa"}${item.endTime ? ` • ilość: ${item.pallets ?? 0}` : ""}${item.type === "unload" && item.endTime ? ` • puste: ${item.emptyPallets ?? 0}` : ""}</span>${item.notes ? `<span>${item.notes}</span>` : ""}</div>`).join("")
    : '<p class="muted">Brak operacji w tym dniu.</p>';
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
  if (trailer && (Number(trailer) < 1 || Number(trailer) > 999)) return toast("Naczepa musi mieć numer 1–999.");
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
  for (let n = 1; n <= daysInMonth; n++) {
    const id = `${year}-${String(month + 1).padStart(2, "0")}-${String(n).padStart(2, "0")}`;
    const day = workdays.find(item => item.id === id);
    const net = day?.netMinutes || 0;
    const extra = Math.max(0, net - settings.dailyMinutes);
    if (day?.dayType === "work" && net > 0) days++;
    total += net;
    overtime += extra;
    gross += (Math.max(0, net - extra) / 60) * settings.hourlyRate + (extra / 60) * settings.hourlyRate * (1 + settings.overtimePercent / 100);
    const date = new Date(year, month, n);
    const row = document.createElement("div");
    row.className = `day-row ${day ? "" : "empty-day"}`;
    row.innerHTML = `<button type="button" data-date="${id}"><div class="day-date"><strong>${String(n).padStart(2, "0")}</strong><span>${new Intl.DateTimeFormat("pl-PL", { weekday: "short" }).format(date)}</span></div><div class="day-details"><strong>${day?.dayType === "work" ? "Praca" : day?.dayType || "Brak wpisu"}</strong><span>${day?.finalStartTime || "—"} – ${day?.finalEndTime || "—"} • ${day?.truckId || "bez auta"}</span></div><div class="day-hours">${minutesText(net)}</div></button>`;
    rows.appendChild(row);
  }
  rows.querySelectorAll("button").forEach(button => button.addEventListener("click", () => loadDayForm(button.dataset.date)));
  $("#totalHours").textContent = minutesText(total);
  $("#totalDays").textContent = String(days);
  $("#totalOvertime").textContent = minutesText(overtime);
  $("#totalGross").textContent = `${gross.toFixed(0)} NOK`;
}

async function loadSettings() {
  const s = await ensureSettings();
  $("#workProfile").value = s.workProfile;
  $("#profileDescription").textContent = profileDescription(s.workProfile);
  $("#defaultDriverName").value = s.defaultDriverName;
  $("#defaultTruckId").value = s.defaultTruckId;
  $("#hourlyRate").value = s.hourlyRate;
  $("#overtimePercent").value = s.overtimePercent;
  $("#dailyMinutes").value = s.dailyMinutes;
  $("#gpsRadius").value = s.gpsRadius;
}

async function saveSettings(event) {
  event.preventDefault();
  await put(STORES.settings, {
    id: "main",
    workProfile: $("#workProfile").value,
    language: activeSettings?.language || APP_CONFIG.defaultLanguage,
    defaultDriverName: $("#defaultDriverName").value.trim(),
    defaultTruckId: $("#defaultTruckId").value.trim(),
    hourlyRate: Number($("#hourlyRate").value || 0),
    overtimePercent: Number($("#overtimePercent").value || 0),
    dailyMinutes: Number($("#dailyMinutes").value || 0),
    gpsRadius: Math.min(120, Math.max(20, Number($("#gpsRadius").value || 120))),
    updatedAt: Date.now()
  });
  await ensureSettings();
  clearSelectedPlace();
  $("#operationPlaceSearch").value = "";
  applyProfileUI();
  toast(`Profil zapisany: ${PROFILE_LABELS[activeSettings.workProfile]}`);
  await refresh();
}

function bindEvents() {
  $$(".nav-button").forEach(button => button.onclick = () => setView(button.dataset.view));
  $("#startWorkButton").onclick = startWork;
  $("#stopWorkButton").onclick = stopWork;
  $("#editTodayButton").onclick = () => loadDayForm();
  $("#operationPlaceSearch").oninput = event => {
    selectedStore = null;
    $("#selectedPlaceBox").classList.add("hidden");
    renderStoreSuggestions(event.target.value);
  };
  $("#detectStoreButton").onclick = detectNearestStore;
  $("#newUnloadButton").onclick = () => startSelectedOperation("unload");
  $("#newLoadButton").onclick = () => startSelectedOperation("load");
  $("#finishOperationButton").onclick = async () => {
    const active = await getActiveOperation(dateId());
    if (active) openFinishForm(active);
  };
  $("#confirmFinishOperationButton").onclick = confirmFinishOperation;
  $("#cancelFinishOperationButton").onclick = () => $("#finishOperationForm").classList.add("hidden");
  $("#cancelEditButton").onclick = () => setView("home");
  $("#dayForm").onsubmit = saveDayForm;
  $("#settingsForm").onsubmit = saveSettings;
  $("#workProfile").onchange = event => $("#profileDescription").textContent = profileDescription(event.target.value);
  $("#previousMonth").onclick = () => { currentMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1); renderCalendar(); };
  $("#nextMonth").onclick = () => { currentMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1); renderCalendar(); };
  $("#exportButton").onclick = exportDB;
  $("#importInput").onchange = async event => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      await importDB(file);
      await ensureSettings();
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
  $("#appVersion").textContent = `v${APP_CONFIG.version}`;
  if (activeSettings.workProfile === "europris") {
    try {
      stores = await loadStores();
    } catch (error) {
      console.error(error);
      toast("Baza sklepów uruchomi się po odzyskaniu internetu.");
    }
  }
  applyProfileUI();
  await refresh();
  if ("serviceWorker" in navigator) navigator.serviceWorker.register("./service-worker.js").catch(console.error);
}

boot().catch(error => {
  console.error(error);
  toast("Błąd uruchamiania aplikacji.");
});
