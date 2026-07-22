import { get, put, STORES } from "./db/indexeddb.js";

const $ = selector => document.querySelector(selector);

const TEXT = {
  pl: { label: "Przewoźnik", hansen: "Hansen & Jensen", others: "Inni przewoźnicy", saved: "Przewoźnik zapisany" },
  en: { label: "Carrier", hansen: "Hansen & Jensen", others: "Other carriers", saved: "Carrier saved" },
  de: { label: "Frachtführer", hansen: "Hansen & Jensen", others: "Andere Frachtführer", saved: "Frachtführer gespeichert" },
  no: { label: "Transportør", hansen: "Hansen & Jensen", others: "Andre transportører", saved: "Transportør lagret" }
};

function language() { return document.documentElement.lang || "pl"; }
function ui() { return TEXT[language()] || TEXT.pl; }

function showNotice(text) {
  const toast = $("#toast");
  if (!toast) return;
  toast.textContent = text;
  toast.classList.remove("hidden");
  clearTimeout(showNotice.timer);
  showNotice.timer = setTimeout(() => toast.classList.add("hidden"), 1800);
}

async function selectCarrier(carrierId) {
  const current = await get(STORES.settings, "main") || { id: "main" };
  const firstSwitchToOther = carrierId === "other" && current.carrierId !== "other";
  await put(STORES.settings, {
    ...current,
    id: "main",
    carrierId,
    defaultTruckId: firstSwitchToOther ? "" : (current.defaultTruckId || ""),
    updatedAt: Date.now()
  });
  if (firstSwitchToOther && $("#defaultTruckId")) $("#defaultTruckId").value = "";
  await renderCarrierContext();
  document.dispatchEvent(new CustomEvent("carrier-changed", { detail: { carrierId } }));
  showNotice(ui().saved);
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

async function preserveCarrierAfterSettingsSave(carrierId) {
  setTimeout(async () => {
    const current = await get(STORES.settings, "main") || { id: "main" };
    await put(STORES.settings, { ...current, carrierId, updatedAt: Date.now() });
    await renderCarrierContext();
    document.dispatchEvent(new CustomEvent("carrier-changed", { detail: { carrierId } }));
  }, 80);
}

function bind() {
  renderCarrierContext().catch(console.error);
  $("#settingsForm")?.addEventListener("submit", async () => {
    const current = await get(STORES.settings, "main");
    preserveCarrierAfterSettingsSave(current?.carrierId || "hansen-jensen-halden").catch(console.error);
  }, true);
  $("#workProfile")?.addEventListener("change", () => setTimeout(() => renderCarrierContext().catch(console.error), 0));
  $("#language")?.addEventListener("change", () => setTimeout(() => renderCarrierContext().catch(console.error), 0));
}

bind();