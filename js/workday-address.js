import { get, STORES } from "./db/indexeddb.js";
import { getDay, saveDay } from "./modules/workdays.js";
import { getActiveOperation } from "./modules/operations.js";
import { getCurrentPosition } from "./modules/gps.js";
import { reverseGeocode } from "./modules/reverse-geocode.js";
import { dateId, clock, roundStart, roundEnd } from "./modules/time.js";
import { getLanguage } from "./i18n.js";

const $ = selector => document.querySelector(selector);

const TEXT = {
  pl: { locating: "Ustalam dokładny adres…", startSaved: "Rozpoczęcie pracy zapisane", endSaved: "Zakończenie pracy zapisane", noAddress: "Nie udało się pobrać adresu. Czas został zapisany bez adresu.", finishOperation: "Najpierw zakończ aktywny załadunek lub rozładunek." },
  en: { locating: "Finding the exact address…", startSaved: "Work start saved", endSaved: "Work end saved", noAddress: "The address could not be retrieved. Time was saved without an address.", finishOperation: "Finish the active loading or unloading operation first." },
  de: { locating: "Genaue Adresse wird ermittelt…", startSaved: "Arbeitsbeginn gespeichert", endSaved: "Arbeitsende gespeichert", noAddress: "Die Adresse konnte nicht ermittelt werden. Die Zeit wurde ohne Adresse gespeichert.", finishOperation: "Bitte zuerst den aktiven Be- oder Entladevorgang beenden." },
  no: { locating: "Finner nøyaktig adresse…", startSaved: "Arbeidsstart lagret", endSaved: "Arbeidsslutt lagret", noAddress: "Adressen kunne ikke hentes. Tiden ble lagret uten adresse.", finishOperation: "Avslutt aktiv lasting eller lossing først." }
};

function ui() { return TEXT[getLanguage?.() || document.documentElement.lang || "pl"] || TEXT.pl; }

function toast(message) {
  const box = $("#toast");
  if (!box) return;
  box.textContent = message;
  box.classList.remove("hidden");
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => box.classList.add("hidden"), 3000);
}

async function locateAddress() {
  const position = await getCurrentPosition();
  try {
    const address = await reverseGeocode(position, getLanguage?.() || "pl");
    return { position, address: address.formattedAddress };
  } catch (error) {
    console.error(error);
    return { position, address: null };
  }
}

async function startWork(event) {
  event.preventDefault();
  event.stopImmediatePropagation();
  const button = event.currentTarget;
  button.disabled = true;
  const t = ui();
  toast(t.locating);
  const now = new Date();
  const id = dateId(now);
  const [settings, existing] = await Promise.all([
    get(STORES.settings, "main"),
    getDay(id)
  ]);
  let location = { position: null, address: null };
  try { location = await locateAddress(); } catch (error) { console.error(error); }
  await saveDay({
    ...existing,
    id,
    date: id,
    dayType: existing?.dayType ?? "work",
    driverName: existing?.driverName || settings?.defaultDriverName || "",
    truckId: existing?.truckId || settings?.defaultTruckId || "",
    detectedStartTime: clock(now),
    finalStartTime: roundStart(now),
    finalEndTime: null,
    startPosition: location.position ?? existing?.startPosition ?? null,
    startAddress: location.address ?? existing?.startAddress ?? null,
    manuallyAdjusted: false
  });
  toast(location.address ? `${t.startSaved}: ${location.address}` : t.noAddress);
  setTimeout(() => location.reload(), 350);
}

async function stopWork(event) {
  event.preventDefault();
  event.stopImmediatePropagation();
  const t = ui();
  const active = await getActiveOperation(dateId());
  if (active) return toast(t.finishOperation);
  const button = event.currentTarget;
  button.disabled = true;
  toast(t.locating);
  const now = new Date();
  const existing = await getDay(dateId(now));
  let location = { position: null, address: null };
  try { location = await locateAddress(); } catch (error) { console.error(error); }
  await saveDay({
    ...existing,
    detectedEndTime: clock(now),
    finalEndTime: roundEnd(now),
    endPosition: location.position ?? existing?.endPosition ?? null,
    endAddress: location.address ?? existing?.endAddress ?? null,
    manuallyAdjusted: false
  });
  toast(location.address ? `${t.endSaved}: ${location.address}` : t.noAddress);
  setTimeout(() => location.reload(), 350);
}

async function renderAddresses() {
  const day = await getDay(dateId());
  const start = $("#homeStartPosition");
  const end = $("#homeEndPosition");
  if (start && day?.startAddress) start.textContent = day.startAddress;
  if (end && day?.endAddress) end.textContent = day.endAddress;
}

function boot() {
  $("#startWorkButton")?.addEventListener("click", startWork, true);
  $("#stopWorkButton")?.addEventListener("click", stopWork, true);
  renderAddresses().catch(console.error);
  const home = $("#view-home");
  if (home) new MutationObserver(() => renderAddresses().catch(console.error)).observe(home, { childList: true, subtree: true });
}

boot();