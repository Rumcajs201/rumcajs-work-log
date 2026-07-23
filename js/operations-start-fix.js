import { get, STORES } from "./db/indexeddb.js";
import { getDay } from "./modules/workdays.js";
import { getActiveOperation, startOperation } from "./modules/operations.js";
import { getCurrentPosition } from "./modules/gps.js";
import { reverseGeocode } from "./modules/reverse-geocode.js";
import { dateId, clock, roundToNearestFive } from "./modules/time.js";

const $ = selector => document.querySelector(selector);
let starting = false;

const TEXT = {
  pl: {
    gps: "Ustalam adres przez GPS…",
    noDay: "Najpierw rozpocznij dzień pracy.",
    dayEnded: "Dzień pracy został już zakończony.",
    active: "Najpierw zakończ trwającą operację.",
    gpsError: "Nie udało się ustalić adresu. Wpisz miejsce ręcznie albo spróbuj ponownie.",
    startedLoad: "Załadunek rozpoczęty",
    startedUnload: "Rozładunek rozpoczęty"
  },
  en: { gps:"Finding address by GPS…", noDay:"Start the workday first.", dayEnded:"The workday has already ended.", active:"Finish the active operation first.", gpsError:"The address could not be determined. Enter a place or try again.", startedLoad:"Loading started", startedUnload:"Unloading started" },
  de: { gps:"Adresse wird per GPS ermittelt…", noDay:"Starten Sie zuerst den Arbeitstag.", dayEnded:"Der Arbeitstag wurde bereits beendet.", active:"Beenden Sie zuerst den laufenden Vorgang.", gpsError:"Die Adresse konnte nicht ermittelt werden. Ort eingeben oder erneut versuchen.", startedLoad:"Beladung gestartet", startedUnload:"Entladung gestartet" },
  no: { gps:"Finner adresse med GPS…", noDay:"Start arbeidsdagen først.", dayEnded:"Arbeidsdagen er allerede avsluttet.", active:"Avslutt den aktive operasjonen først.", gpsError:"Adressen kunne ikke fastslås. Skriv inn sted eller prøv igjen.", startedLoad:"Lasting startet", startedUnload:"Lossing startet" }
};

function ui() { return TEXT[document.documentElement.lang || "pl"] || TEXT.pl; }
function toast(message) {
  const box = $("#toast");
  if (!box) return;
  box.textContent = message;
  box.classList.remove("hidden");
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => box.classList.add("hidden"), 3200);
}

async function startFromButton(type) {
  if (starting) return;
  starting = true;
  const unloadButton = $("#newUnloadButton");
  const loadButton = $("#newLoadButton");
  if (unloadButton) unloadButton.disabled = true;
  if (loadButton) loadButton.disabled = true;

  try {
    const day = await getDay(dateId());
    if (!day?.finalStartTime) return toast(ui().noDay);
    if (day.finalEndTime) return toast(ui().dayEnded);
    if (await getActiveOperation(dateId())) return toast(ui().active);

    const typed = $("#operationPlaceSearch")?.value.trim() || "";
    let position = null;
    let address = null;

    if (!typed) toast(ui().gps);
    try {
      position = await getCurrentPosition();
      if (!typed) address = await reverseGeocode(position, document.documentElement.lang || "pl");
    } catch (error) {
      console.error(error);
      if (!typed) return toast(ui().gpsError);
    }

    const place = typed || address?.formattedAddress;
    if (!place) return toast(ui().gpsError);

    const settings = await get(STORES.settings, "main") || {};
    const now = new Date();
    await startOperation({
      workdayId: dateId(),
      type,
      profile: settings.workProfile || "universal",
      place,
      storeAddress: address?.formattedAddress || null,
      locality: address?.locality || null,
      countryCode: address?.countryCode || null,
      detectedStartTime: clock(now),
      startTime: roundToNearestFive(now),
      position
    });

    toast(type === "unload" ? ui().startedUnload : ui().startedLoad);
    setTimeout(() => location.reload(), 180);
  } finally {
    starting = false;
    const currentDay = await getDay(dateId()).catch(() => null);
    const enabled = !!currentDay?.finalStartTime && !currentDay?.finalEndTime;
    if (unloadButton) unloadButton.disabled = !enabled;
    if (loadButton) loadButton.disabled = !enabled;
  }
}

function syncButtons() {
  getDay(dateId()).then(day => {
    const enabled = !!day?.finalStartTime && !day?.finalEndTime;
    const unload = $("#newUnloadButton");
    const load = $("#newLoadButton");
    if (unload && !starting) unload.disabled = !enabled;
    if (load && !starting) load.disabled = !enabled;
  }).catch(console.error);
}

document.addEventListener("click", event => {
  const button = event.target.closest("#newUnloadButton, #newLoadButton");
  if (button) {
    event.preventDefault();
    event.stopImmediatePropagation();
    startFromButton(button.id === "newUnloadButton" ? "unload" : "load").catch(error => {
      console.error(error);
      toast(error.message || ui().gpsError);
    });
    return;
  }
  const moduleButton = event.target.closest('[data-dashboard-view="operations"]');
  if (moduleButton) setTimeout(syncButtons, 50);
}, true);

document.addEventListener("visibilitychange", () => { if (!document.hidden) syncButtons(); });
setTimeout(syncButtons, 400);
