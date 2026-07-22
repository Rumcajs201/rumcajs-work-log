import { getAll, STORES } from "./db/indexeddb.js";
import { getLanguage } from "./i18n.js";

const $ = selector => document.querySelector(selector);

const TEXT = {
  pl: { title: "Historia kierowcy", hint: "Szukaj po miejscu, pojeździe, naczepie, notatce lub dacie.", placeholder: "Np. Oslo, 123, naczepa 45, uszkodzenie…", search: "Szukaj", clear: "Wyczyść", noQuery: "Wpisz co najmniej 2 znaki.", noResults: "Nie znaleziono pasujących zapisów.", day: "Dzień", operation: "Operacja", truck: "Pojazd", trailer: "Naczepa", notes: "Notatki", unload: "Rozładunek", load: "Załadunek", ongoing: "trwa", results: "Wyniki" },
  en: { title: "Driver history", hint: "Search by place, vehicle, trailer, note or date.", placeholder: "E.g. Oslo, 123, trailer 45, damage…", search: "Search", clear: "Clear", noQuery: "Enter at least 2 characters.", noResults: "No matching records found.", day: "Day", operation: "Operation", truck: "Vehicle", trailer: "Trailer", notes: "Notes", unload: "Unloading", load: "Loading", ongoing: "ongoing", results: "Results" },
  de: { title: "Fahrerhistorie", hint: "Nach Ort, Fahrzeug, Auflieger, Notiz oder Datum suchen.", placeholder: "Z. B. Oslo, 123, Auflieger 45, Schaden…", search: "Suchen", clear: "Löschen", noQuery: "Mindestens 2 Zeichen eingeben.", noResults: "Keine passenden Einträge gefunden.", day: "Tag", operation: "Vorgang", truck: "Fahrzeug", trailer: "Auflieger", notes: "Notizen", unload: "Entladen", load: "Beladen", ongoing: "läuft", results: "Ergebnisse" },
  no: { title: "Sjåførhistorikk", hint: "Søk etter sted, kjøretøy, henger, notat eller dato.", placeholder: "F.eks. Oslo, 123, henger 45, skade…", search: "Søk", clear: "Tøm", noQuery: "Skriv minst 2 tegn.", noResults: "Ingen samsvarende registreringer.", day: "Dag", operation: "Operasjon", truck: "Kjøretøy", trailer: "Tilhenger", notes: "Merknader", unload: "Lossing", load: "Lasting", ongoing: "pågår", results: "Resultater" }
};

function text() {
  return TEXT[getLanguage?.() || "pl"] || TEXT.pl;
}

function normalized(value) {
  return String(value ?? "").toLocaleLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function searchable(values) {
  return normalized(values.filter(Boolean).join(" "));
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>'"]/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[char]));
}

function formatDate(id) {
  if (!id) return "—";
  const date = new Date(`${id}T12:00:00`);
  if (Number.isNaN(date.getTime())) return id;
  const locales = { pl: "pl-PL", en: "en-GB", de: "de-DE", no: "nb-NO" };
  return new Intl.DateTimeFormat(locales[getLanguage?.() || "pl"] || "pl-PL", { dateStyle: "medium" }).format(date);
}

async function runSearch() {
  const ui = text();
  const query = normalized($("#historyQuery").value.trim());
  const output = $("#historyResults");
  if (query.length < 2) {
    output.innerHTML = `<p class="muted">${ui.noQuery}</p>`;
    return;
  }

  const [days, operations] = await Promise.all([
    getAll(STORES.workdays),
    getAll(STORES.operations)
  ]);

  const dayMatches = days.filter(day => searchable([
    day.id, day.date, day.driverName, day.truckId, day.trailerNumber,
    day.notes, day.finalStartTime, day.finalEndTime
  ]).includes(query));

  const operationMatches = operations.filter(item => searchable([
    item.workdayId, item.type, item.place, item.storeNumber, item.storeName,
    item.storeAddress, item.notes, item.pallets, item.emptyPallets
  ]).includes(query));

  const results = [];
  for (const day of dayMatches) {
    results.push({ time: day.updatedAt || 0, html: `<article class="history-item"><small>${ui.day}</small><h3>${escapeHtml(formatDate(day.id || day.date))}</h3><p>${escapeHtml(day.finalStartTime || "—")} – ${escapeHtml(day.finalEndTime || "—")}</p><p><strong>${ui.truck}:</strong> ${escapeHtml(day.truckId || "—")} · <strong>${ui.trailer}:</strong> ${escapeHtml(day.trailerNumber || "—")}</p>${day.notes ? `<p><strong>${ui.notes}:</strong> ${escapeHtml(day.notes)}</p>` : ""}</article>` });
  }
  for (const item of operationMatches) {
    const type = item.type === "unload" ? ui.unload : ui.load;
    results.push({ time: item.startedAt || item.updatedAt || 0, html: `<article class="history-item"><small>${ui.operation}</small><h3>${escapeHtml(type)} · ${escapeHtml(item.place || "—")}</h3><p>${escapeHtml(formatDate(item.workdayId))} · ${escapeHtml(item.startTime || "—")} – ${escapeHtml(item.endTime || ui.ongoing)}</p>${item.storeAddress ? `<p>${escapeHtml(item.storeAddress)}</p>` : ""}${item.notes ? `<p><strong>${ui.notes}:</strong> ${escapeHtml(item.notes)}</p>` : ""}</article>` });
  }

  results.sort((a, b) => b.time - a.time);
  output.innerHTML = results.length
    ? `<p class="muted history-count">${ui.results}: ${results.length}</p>${results.map(item => item.html).join("")}`
    : `<p class="muted">${ui.noResults}</p>`;
}

function applyLabels() {
  const ui = text();
  $("#historyTitle").textContent = ui.title;
  $("#historyHint").textContent = ui.hint;
  $("#historyQuery").placeholder = ui.placeholder;
  $("#historySearchButton").textContent = ui.search;
  $("#historyClearButton").textContent = ui.clear;
}

function bind() {
  applyLabels();
  $("#historySearchButton").addEventListener("click", runSearch);
  $("#historyClearButton").addEventListener("click", () => {
    $("#historyQuery").value = "";
    $("#historyResults").innerHTML = "";
    $("#historyQuery").focus();
  });
  $("#historyQuery").addEventListener("keydown", event => {
    if (event.key === "Enter") runSearch();
  });
  document.querySelector('[data-view="history"]').addEventListener("click", applyLabels);
  $("#language").addEventListener("change", applyLabels);
}

bind();
