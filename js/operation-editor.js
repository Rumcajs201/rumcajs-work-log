import { get, getAll, put, remove, STORES } from "./db/indexeddb.js";

const $ = selector => document.querySelector(selector);
let currentOperationId = null;
let decorating = false;

const TEXT = {
  pl: { edit: "Edytuj", title: "Edycja operacji", place: "Miejsce", start: "Rozpoczęcie", end: "Zakończenie", quantity: "Palety / ilość", empty: "Puste palety", notes: "Notatki", save: "Zapisz zmiany", cancel: "Anuluj", delete: "Usuń operację", confirmDelete: "Usunąć całą tę operację? Tej czynności nie można cofnąć.", saved: "Operacja została poprawiona", deleted: "Operacja została usunięta" },
  en: { edit: "Edit", title: "Edit operation", place: "Place", start: "Start", end: "End", quantity: "Pallets / quantity", empty: "Empty pallets", notes: "Notes", save: "Save changes", cancel: "Cancel", delete: "Delete operation", confirmDelete: "Delete this entire operation? This cannot be undone.", saved: "Operation updated", deleted: "Operation deleted" },
  de: { edit: "Bearbeiten", title: "Vorgang bearbeiten", place: "Ort", start: "Beginn", end: "Ende", quantity: "Paletten / Menge", empty: "Leere Paletten", notes: "Notizen", save: "Änderungen speichern", cancel: "Abbrechen", delete: "Vorgang löschen", confirmDelete: "Diesen Vorgang vollständig löschen? Dies kann nicht rückgängig gemacht werden.", saved: "Vorgang aktualisiert", deleted: "Vorgang gelöscht" },
  no: { edit: "Rediger", title: "Rediger operasjon", place: "Sted", start: "Start", end: "Slutt", quantity: "Paller / antall", empty: "Tomme paller", notes: "Merknader", save: "Lagre endringer", cancel: "Avbryt", delete: "Slett operasjon", confirmDelete: "Slette hele operasjonen? Dette kan ikke angres.", saved: "Operasjonen er oppdatert", deleted: "Operasjonen er slettet" }
};

function ui() { return TEXT[document.documentElement.lang || "pl"] || TEXT.pl; }
function localDateId() { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`; }

function ensureStyles() {
  if (document.querySelector('link[data-operation-editor="1"]')) return;
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = "./css/operation-editor.css";
  link.dataset.operationEditor = "1";
  document.head.appendChild(link);
  const style = document.createElement("style");
  style.textContent = `.operation-delete-button{margin-top:10px;width:100%;border:1px solid #b91c1c!important;background:#fff!important;color:#b91c1c!important;font-weight:700}.operation-delete-button:active{background:#fee2e2!important}`;
  document.head.appendChild(style);
}

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
    <div class="button-row"><button id="saveOperationEdit" class="primary" type="button">${t.save}</button><button id="cancelOperationEdit" type="button">${t.cancel}</button></div>
    <button id="deleteOperationEdit" class="operation-delete-button" type="button">${t.delete}</button></div>`;
  $("#editOperationEmptyLabel").classList.toggle("hidden", item.type === "load");
  $("#saveOperationEdit").onclick = saveEditor;
  $("#cancelOperationEdit").onclick = closeEditor;
  $("#deleteOperationEdit").onclick = deleteEditor;
  box.onclick = event => { if (event.target === box) closeEditor(); };
  box.classList.remove("hidden");
}

function closeEditor() { currentOperationId = null; $("#operationEditDialog")?.classList.add("hidden"); }

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
  setTimeout(() => location.reload(), 250);
}

async function deleteEditor() {
  const id = currentOperationId;
  if (!id || !confirm(ui().confirmDelete)) return;
  await remove(STORES.operations, id);
  closeEditor();
  toast(ui().deleted);
  setTimeout(() => location.reload(), 250);
}

function escapeHtml(value) { return String(value).replace(/[&<>'"]/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[char])); }

async function decorateTimeline() {
  if (decorating) return;
  decorating = true;
  try {
    const timeline = $("#todayOperations");
    if (!timeline) return;
    const items = (await getAll(STORES.operations)).filter(item => item.workdayId === localDateId()).sort((a, b) => (b.startedAt || 0) - (a.startedAt || 0));
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
  } finally { decorating = false; }
}

function boot() {
  ensureStyles();
  ensureDialog();
  const timeline = $("#todayOperations");
  if (!timeline) return;
  new MutationObserver(() => decorateTimeline().catch(console.error)).observe(timeline, { childList: true, subtree: true });
  decorateTimeline().catch(console.error);
}

boot();