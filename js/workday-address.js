import { getDay, saveDay } from "./modules/workdays.js";
import { getCurrentPosition } from "./modules/gps.js";
import { reverseGeocode } from "./modules/reverse-geocode.js";
import { dateId } from "./modules/time.js";
import { getLanguage } from "./i18n.js";

const $ = selector => document.querySelector(selector);

const TEXT = {
  pl: { locating: "Ustalam dokładny adres…", saved: "Adres zapisany", noAddress: "Nie udało się pobrać adresu. Czas pracy został zapisany prawidłowo." },
  en: { locating: "Finding the exact address…", saved: "Address saved", noAddress: "The address could not be retrieved. Work time was saved correctly." },
  de: { locating: "Genaue Adresse wird ermittelt…", saved: "Adresse gespeichert", noAddress: "Die Adresse konnte nicht ermittelt werden. Die Arbeitszeit wurde korrekt gespeichert." },
  no: { locating: "Finner nøyaktig adresse…", saved: "Adresse lagret", noAddress: "Adressen kunne ikke hentes. Arbeidstiden ble lagret riktig." }
};

function ui() {
  return TEXT[getLanguage?.() || document.documentElement.lang || "pl"] || TEXT.pl;
}

function toast(message) {
  const box = $("#toast");
  if (!box) return;
  box.textContent = message;
  box.classList.remove("hidden");
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => box.classList.add("hidden"), 3000);
}

async function waitForWorkdayState(kind, timeoutMs = 15000) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    const day = await getDay(dateId());
    if (kind === "start" && day?.finalStartTime) return day;
    if (kind === "end" && day?.finalEndTime) return day;
    await new Promise(resolve => setTimeout(resolve, 250));
  }
  return getDay(dateId());
}

async function addReadableAddress(kind) {
  const t = ui();
  toast(t.locating);

  try {
    const position = await getCurrentPosition();
    const address = await reverseGeocode(position, getLanguage?.() || "pl");
    const day = await waitForWorkdayState(kind);
    if (!day) return;

    const updated = await saveDay({
      ...day,
      startPosition: kind === "start" ? position : day.startPosition,
      endPosition: kind === "end" ? position : day.endPosition,
      startAddress: kind === "start" ? address.formattedAddress : day.startAddress,
      endAddress: kind === "end" ? address.formattedAddress : day.endAddress
    });

    renderAddresses(updated);
    toast(`${t.saved}: ${address.formattedAddress}`);
  } catch (error) {
    console.error(error);
    toast(t.noAddress);
  }
}

function renderAddresses(day) {
  const start = $("#homeStartPosition");
  const end = $("#homeEndPosition");
  if (start && day?.startAddress) start.textContent = day.startAddress;
  if (end && day?.endAddress) end.textContent = day.endAddress;
}

async function refreshAddresses() {
  renderAddresses(await getDay(dateId()));
}

function boot() {
  // Nie przechwytujemy już przycisków. Główna aplikacja zawsze zapisuje czas,
  // a ustalenie adresu działa niezależnie i nie może zablokować rozpoczęcia lub zakończenia pracy.
  $("#startWorkButton")?.addEventListener("click", () => {
    setTimeout(() => addReadableAddress("start"), 100);
  });

  $("#stopWorkButton")?.addEventListener("click", () => {
    setTimeout(() => addReadableAddress("end"), 100);
  });

  refreshAddresses().catch(console.error);
  const home = $("#view-home");
  if (home) {
    new MutationObserver(() => refreshAddresses().catch(console.error))
      .observe(home, { childList: true, subtree: true });
  }
}

boot();