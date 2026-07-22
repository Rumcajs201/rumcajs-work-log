import { get, getAll, put, STORES } from "./db/indexeddb.js";

const $ = selector => document.querySelector(selector);
let currentOperationId = null;
let decorating = false;

const TEXT = {
  pl: { edit: "Edytuj", title: "Edycja operacji", place: "Miejsce", start: "Rozpoczęcie", end: "Zakończenie", quantity: "Palety / ilość", empty: "Puste palety", notes: "Notatki", save: "Zapisz zmiany", cancel: "Anuluj", saved: "Operacja została poprawiona" },
  en: { edit: "Edit", title: "Edit operation", place: "Place", start: "Start", end: "End", quantity: "Pallets / quantity", empty: "Empty pallets", notes: "Notes", save: "Save changes", cancel: "Cancel", saved: "Operation updated" },
  de: { edit: "Bearbeiten", title: "Vorgang bearbeiten", place: "Ort", start: "Beginn", end: "Ende", quantity: "Paletten / Menge", empty: "Leere Paletten", notes: "Notizen", save: "Änderungen speichern", cancel: "Abbrechen", saved: "Vorgang aktualisiert" },
  no: { edit: "Rediger", title: "Rediger operasjon", place: "Sted", start: "Start", end: "Slutt", quantity: "Paller / antall", empty: "Tomme paller", notes: "Merknader", save: "Lagre endringer", cancel: "Avbryt", saved: "Operasjonen er oppdatert" }
};

function ui() { return TEXT[document.documentElement.lang || "pl"] || TEXT.pl; }

function toast(text) {
  const box = $("#toast");
  if (!box) return;
  box.textContent = text;
  box.classList.remove("hidden");
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => box.classList.add("hidden"), 2200);
}

function ensureDialog() {
  if ($("#operationEditDialog")) return;
  const dialog = document.createElement("div");
  dialog.id = "operationEditDialog";
  dialog.className = "operation-edit-overlay hidden";
  document.body.appendChild(dialog);
}

async function openEditor(id) {
  const item = await get(STORES.operations, id);
  if (!item) return;
  currentOperationId = id;
  const t = ui();
  const box = $("#operationEditDialog");
  box.innerHTML = `<div class="operation-edit-card"><h2>${t.title}</h2>
    <label>${t.place}<input id="editOperationPlace" value="${escapeHtml(item.place || "")}"></label>
    <div class="two-cols"><label>${t.start}<input id="editOperationStart" type="time" step="300" value="${item.startTime || ""}"></label><label>${t.end}<input id="editOperationEnd" type="time" step="300" value="${item.endTime || ""}"></label></div>
    <div class="two-cols"><label>${t.quantity}<input id="editOperationQuantity" type="number" min="0" value="${item.pallets ?? ""}"></label><label id="editOperationEmptyLabel">${t.empty}<input id="editOperationEmpty" type="number" min="0" value="${item.emptyPallets ?? ""}"></label></div>
    <label>${t.notes}<textarea id="editOperationNotes" rows="3">${escapeHtml(item.notes || "")}</textarea></label>
    <div class="button-row"><button id="saveOperationEdit" class="primary" type="button">${t.save}</button><button id="cancelOperationEdit" type="button">${t.cancel}</button></div></div>`;
  $("#editOperationEmptyLabel").classList.toggle("hidden", item.type === "load");
  $("#saveOperationEdit").onclick = saveEditor;
  $("#cancelOperationEdit").onclick = closeEditor;
  box.onclick = event => { if (event.target === box) closeEditor(); };
  box.classList.remove("hidden");
}

function closeEditor() {
  currentOperationId = null;
  $("#operationEditDialog")?.classList.add("hidden");
}

async function saveEditor() {
  const item = await get(STORES.operations, currentOperationId);
  if (!item) return closeEditor();
  const quantityRaw = $("#editOperationQuantity").value;
  const emptyRaw = $("#editOperationEmpty").value;
  const updated = {
    ...item,
    place: $("#editOperationPlace").value.trim() || item.place,
    startTime: $("#editOperationStart").value || item.startTime,
    endTime: $("#editOperationEnd").value || null,
    pallets: quantityRaw === "" ? null : Math.max(0, Number(quantityRaw)),
    emptyPallets: item.type === "load" ? 0 : (emptyRaw === "" ? 0 : Math.max(0, Number(emptyRaw))),
    notes: $("#editOperationNotes").value.trim(),
    manuallyAdjusted: true,
    updatedAt: Date.now()
  };
  await put(STORES.operations, updated);
  closeEditor();
  toast(ui().saved);
  document.querySelector('.nav-button[data-view="home"]')?.click();
  setTimeout(() => location.reload(), 250);
}

function escapeHtml(value) {
  return String(value).replace(/[&<>'"]/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[char]));
}

async function decorateTimeline() {
  if (decorating) return;
  decorating = true;
  try {
    const timeline = $("#todayOperations");
    if (!timeline) return;
    const items = (await getAll(STORES.operations))
      .filter(item => item.workdayId === new Date().toISOString().slice(0, 10))
      .sort((a, b) => (a.startedAt || 0) - (b.startedAt || 0));
    [...timeline.querySelectorAll(".timeline-item")].forEach((row, index) => {
      const item = items[index];
      if (!item || row.querySelector(".operation-edit-button")) return;
      const button = document.createElement("button");
      button.type = "button";
      button.className = "operation-edit-button";
      button.textContent = ui().edit;
      button.onclick = () => openEditor(item.id);
      row.appendChild(button);
    });
  } finally {
    decorating = false;
  }
}

function boot() {
  ensureDialog();
  const timeline = $("#todayOperations");
  if (!timeline) return;
  new MutationObserver(() => decorateTimeline().catch(console.error)).observe(timeline, { childList: true, subtree: true });
  decorateTimeline().catch(console.error);
}

boot();