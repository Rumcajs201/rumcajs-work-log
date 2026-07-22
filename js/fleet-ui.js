import { get, put, STORES } from "./db/indexeddb.js";

const $ = selector => document.querySelector(selector);
let registrations = [];

async function loadFleet() {
  const response = await fetch("./data/hansen-jensen-halden-fleet.json", { cache: "no-store" });
  if (!response.ok) throw new Error(`Fleet HTTP ${response.status}`);
  const data = await response.json();
  registrations = (data.vehicles || [])
    .filter(item => item.status !== "inactive" && item.registration)
    .map(item => String(item.registration).toUpperCase())
    .sort((a, b) => a.localeCompare(b));
}

function renderList(box, input, query = "") {
  const normalized = query.trim().toUpperCase().replace(/\s+/g, "");
  const matches = registrations.filter(registration =>
    registration.replace(/\s+/g, "").includes(normalized)
  );
  box.innerHTML = matches.map(registration =>
    `<button type="button" data-registration="${registration}">${registration}</button>`
  ).join("");
  box.classList.toggle("hidden", matches.length === 0);
  box.querySelectorAll("button").forEach(button => {
    button.addEventListener("click", () => {
      input.value = button.dataset.registration;
      input.dispatchEvent(new Event("input", { bubbles: true }));
      input.dispatchEvent(new Event("change", { bubbles: true }));
      box.classList.add("hidden");
    });
  });
}

function enhanceInput(input) {
  if (!input || input.dataset.fleetEnhanced === "1") return;
  input.dataset.fleetEnhanced = "1";

  const wrapper = document.createElement("div");
  wrapper.className = "fleet-input-wrapper";
  input.parentNode.insertBefore(wrapper, input);
  wrapper.appendChild(input);

  const toggle = document.createElement("button");
  toggle.type = "button";
  toggle.className = "fleet-toggle";
  toggle.setAttribute("aria-label", "Rozwiń listę ciężarówek");
  toggle.textContent = "▾";
  wrapper.appendChild(toggle);

  const list = document.createElement("div");
  list.className = "fleet-list hidden";
  wrapper.appendChild(list);

  toggle.addEventListener("click", event => {
    event.stopPropagation();
    if (toggle.classList.contains("hidden")) return;
    if (!list.classList.contains("hidden")) {
      list.classList.add("hidden");
      return;
    }
    renderList(list, input, "");
  });

  input.addEventListener("input", () => {
    if (toggle.classList.contains("hidden")) return;
    renderList(list, input, input.value);
  });

  document.addEventListener("click", event => {
    if (!wrapper.contains(event.target)) list.classList.add("hidden");
  });
}

async function applyFleetVisibility() {
  const settings = await get(STORES.settings, "main");
  const europris = (settings?.workProfile || "europris") === "europris";
  [$("#defaultTruckId"), $("#truckId")].forEach(input => {
    if (!input) return;
    enhanceInput(input);
    const wrapper = input.closest(".fleet-input-wrapper");
    wrapper?.querySelector(".fleet-toggle")?.classList.toggle("hidden", !europris);
    wrapper?.querySelector(".fleet-list")?.classList.add("hidden");
  });
}

async function saveProfileAndStayInSettings(event) {
  event.stopImmediatePropagation();
  const current = await get(STORES.settings, "main") || { id: "main" };
  await put(STORES.settings, {
    ...current,
    id: "main",
    workProfile: event.target.value,
    updatedAt: Date.now()
  });
  sessionStorage.setItem("rumcajs-restore-view", "settings");
  location.reload();
}

function restoreView() {
  if (sessionStorage.getItem("rumcajs-restore-view") !== "settings") return;
  sessionStorage.removeItem("rumcajs-restore-view");
  requestAnimationFrame(() => {
    document.querySelector('.nav-button[data-view="settings"]')?.click();
  });
}

async function boot() {
  await loadFleet();
  enhanceInput($("#defaultTruckId"));
  enhanceInput($("#truckId"));
  await applyFleetVisibility();

  const profile = $("#workProfile");
  profile?.addEventListener("change", saveProfileAndStayInSettings, true);
  restoreView();
}

boot().catch(console.error);
