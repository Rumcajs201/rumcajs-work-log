import { get, put, STORES } from "./db/indexeddb.js";

const $ = selector => document.querySelector(selector);

const LABELS = {
  pl: "Przewoźnik",
  en: "Carrier",
  de: "Frachtführer",
  no: "Transportør"
};

const PROFILE_SAVED = {
  pl: "Profil zapisany automatycznie",
  en: "Profile saved automatically",
  de: "Profil automatisch gespeichert",
  no: "Profil lagret automatisk"
};

async function loadRegistry() {
  const response = await fetch("./data/carriers.json", { cache: "no-store" });
  if (!response.ok) throw new Error(`Carrier registry HTTP ${response.status}`);
  return response.json();
}

async function loadFleet() {
  const response = await fetch("./data/hansen-jensen-halden-fleet.json", { cache: "no-store" });
  if (!response.ok) throw new Error(`Fleet HTTP ${response.status}`);
  return response.json();
}

function currentLanguage() {
  return document.documentElement.lang || "pl";
}

function showNotice(text) {
  const toast = $("#toast");
  if (!toast) return;
  toast.textContent = text;
  toast.classList.remove("hidden");
  clearTimeout(showNotice.timer);
  showNotice.timer = setTimeout(() => toast.classList.add("hidden"), 1800);
}

async function currentProfile() {
  const settings = await get(STORES.settings, "main");
  return settings?.workProfile || "europris";
}

async function renderCarrierContext() {
  const box = $("#carrierContext");
  if (!box) return;

  const profile = await currentProfile();
  if (profile !== "europris") {
    box.classList.add("hidden");
    return;
  }

  const registry = await loadRegistry();
  const carrierId = registry.defaultCarrierByProfile?.europris;
  const carrier = registry.carriers?.find(item => item.id === carrierId);
  if (!carrier) {
    box.classList.add("hidden");
    return;
  }

  $("#carrierContextLabel").textContent = LABELS[currentLanguage()] || LABELS.pl;
  $("#carrierContextName").textContent = carrier.displayName;
  box.classList.remove("hidden");
}

function ensureFleetDatalist() {
  let list = $("#hansenFleetRegistrations");
  if (!list) {
    list = document.createElement("datalist");
    list.id = "hansenFleetRegistrations";
    document.body.appendChild(list);
  }
  return list;
}

async function applyFleetSuggestions() {
  const profile = await currentProfile();
  const inputs = [$("#defaultTruckId"), $("#truckId")].filter(Boolean);

  if (profile !== "europris") {
    inputs.forEach(input => input.removeAttribute("list"));
    return;
  }

  const fleet = await loadFleet();
  const registrations = (fleet.vehicles || [])
    .filter(vehicle => vehicle.status !== "retired")
    .map(vehicle => String(vehicle.registration || "").trim())
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b));

  const list = ensureFleetDatalist();
  list.innerHTML = registrations.map(registration => `<option value="${registration}"></option>`).join("");
  inputs.forEach(input => {
    input.setAttribute("list", list.id);
    input.setAttribute("autocomplete", "off");
  });
}

async function saveProfileImmediately(value) {
  const existing = await get(STORES.settings, "main") || { id: "main" };
  await put(STORES.settings, {
    ...existing,
    id: "main",
    workProfile: value,
    updatedAt: Date.now()
  });
  showNotice(PROFILE_SAVED[currentLanguage()] || PROFILE_SAVED.pl);
  setTimeout(() => window.location.reload(), 220);
}

function bind() {
  Promise.all([
    renderCarrierContext(),
    applyFleetSuggestions()
  ]).catch(console.error);

  $("#settingsForm")?.addEventListener("submit", () => {
    setTimeout(() => {
      renderCarrierContext().catch(console.error);
      applyFleetSuggestions().catch(console.error);
    }, 50);
  });

  $("#workProfile")?.addEventListener("change", event => {
    event.target.disabled = true;
    saveProfileImmediately(event.target.value).catch(error => {
      console.error(error);
      event.target.disabled = false;
    });
  });

  $("#language")?.addEventListener("change", () => {
    setTimeout(() => renderCarrierContext().catch(console.error), 0);
  });
}

bind();
