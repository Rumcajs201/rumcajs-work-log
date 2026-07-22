import { get, put, STORES } from "./db/indexeddb.js";

const $ = selector => document.querySelector(selector);

const TEXT = {
  pl: { label: "Przewoźnik", hansen: "Hansen & Jensen", others: "Inni przewoźnicy", saved: "Przewoźnik zapisany", billingCleared: "Dane rozliczeniowe zostały wyczyszczone" },
  en: { label: "Carrier", hansen: "Hansen & Jensen", others: "Other carriers", saved: "Carrier saved", billingCleared: "Billing data has been cleared" },
  de: { label: "Frachtführer", hansen: "Hansen & Jensen", others: "Andere Frachtführer", saved: "Frachtführer gespeichert", billingCleared: "Abrechnungsdaten wurden gelöscht" },
  no: { label: "Transportør", hansen: "Hansen & Jensen", others: "Andre transportører", saved: "Transportør lagret", billingCleared: "Lønnsdata er nullstilt" }
};

function language() { return document.documentElement.lang || "pl"; }
function ui() { return TEXT[language()] || TEXT.pl; }

function showNotice(text) {
  const toast = $("#toast");
  if (!toast) return;
  toast.textContent = text;
  toast.classList.remove("hidden");
  clearTimeout(showNotice.timer);
  showNotice.timer = setTimeout(() => toast.classList.add("hidden"), 2200);
}

function clearBillingInputs() {
  ["#hourlyRate", "#overtimePercent", "#dailyMinutes"].forEach(selector => {
    const input = $(selector);
    if (input) input.value = "";
  });
}

async function selectCarrier(carrierId) {
  const current = await get(STORES.settings, "main") || { id: "main" };
  const firstSwitchToOther = carrierId === "other" && current.carrierId !== "other";
  const switchingToOther = carrierId === "other";

  await put(STORES.settings, {
    ...current,
    id: "main",
    carrierId,
    defaultTruckId: firstSwitchToOther ? "" : (current.defaultTruckId || ""),
    hourlyRate: switchingToOther ? 0 : Number(current.hourlyRate || 0),
    overtimePercent: switchingToOther ? 0 : Number(current.overtimePercent || 0),
    dailyMinutes: switchingToOther ? 0 : Number(current.dailyMinutes || 0),
    updatedAt: Date.now()
  });

  if (firstSwitchToOther && $("#defaultTruckId")) $("#defaultTruckId").value = "";
  if (switchingToOther) clearBillingInputs();

  await renderCarrierContext();
  document.dispatchEvent(new CustomEvent("carrier-changed", { detail: { carrierId } }));
  showNotice(switchingToOther ? `${ui().saved}. ${ui().billingCleared}.` : ui().saved);
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
  const carrierId = settings?.carrierId || "hansen-jensen-halden";
  const t = ui();
  box.innerHTML = `<span id="carrierContextLabel">${t.label}</span><div class="carrier-choice-grid"><button type="button" class="carrier-choice ${carrierId === "hansen-jensen-halden" ? "active" : "inactive"}" data-carrier="hansen-jensen-halden">${t.hansen}</button><button type="button" class="carrier-choice ${carrierId === "other" ? "active" : "inactive"}" data-carrier="other">${t.others}</button></div>`;
  box.classList.remove("hidden");
  box.querySelectorAll("[data-carrier]").forEach(button => button.addEventListener("click", () => selectCarrier(button.dataset.carrier)));
}

function configureGpsRadius() {
  const input = $("#gpsRadius");
  if (!input) return;
  input.min = "20";
  input.max = "1000";
  input.step = "10";
}

async function preserveExtendedSettingsAfterSubmit(requestedGpsRadius, carrierId) {
  await new Promise(resolve => setTimeout(resolve, 120));
  const current = await get(STORES.settings, "main") || { id: "main" };
  await put(STORES.settings, {
    ...current,
    id: "main",
    carrierId,
    gpsRadius: Math.min(1000, Math.max(20, requestedGpsRadius)),
    updatedAt: Date.now()
  });
  await renderCarrierContext();
  document.dispatchEvent(new CustomEvent("carrier-changed", { detail: { carrierId } }));
}

function bind() {
  configureGpsRadius();
  renderCarrierContext().catch(console.error);

  $("#settingsForm")?.addEventListener("submit", async () => {
    const current = await get(STORES.settings, "main") || { id: "main" };
    const requestedGpsRadius = Number($("#gpsRadius")?.value || current.gpsRadius || 120);
    preserveExtendedSettingsAfterSubmit(requestedGpsRadius, current.carrierId || "hansen-jensen-halden").catch(console.error);
  }, true);

  $("#workProfile")?.addEventListener("change", () => setTimeout(() => renderCarrierContext().catch(console.error), 0));
  $("#language")?.addEventListener("change", () => setTimeout(() => renderCarrierContext().catch(console.error), 0));
}

bind();