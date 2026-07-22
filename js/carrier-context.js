import { get, STORES } from "./db/indexeddb.js";

const $ = selector => document.querySelector(selector);

const LABELS = {
  pl: "Przewoźnik",
  en: "Carrier",
  de: "Frachtführer",
  no: "Transportør"
};

async function loadRegistry() {
  const response = await fetch("./data/carriers.json", { cache: "no-store" });
  if (!response.ok) throw new Error(`Carrier registry HTTP ${response.status}`);
  return response.json();
}

function currentLanguage() {
  return document.documentElement.lang || "pl";
}

async function renderCarrierContext() {
  const box = $("#carrierContext");
  if (!box) return;

  const settings = await get(STORES.settings, "main");
  const profile = settings?.workProfile || "europris";
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

function bind() {
  renderCarrierContext().catch(console.error);
  $("#settingsForm")?.addEventListener("submit", () => setTimeout(() => renderCarrierContext().catch(console.error), 50));
  $("#workProfile")?.addEventListener("change", () => setTimeout(() => renderCarrierContext().catch(console.error), 0));
  $("#language")?.addEventListener("change", () => setTimeout(() => renderCarrierContext().catch(console.error), 0));
}

bind();
