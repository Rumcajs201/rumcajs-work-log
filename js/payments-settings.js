import { get, put, STORES } from "./db/indexeddb.js";

const $ = selector => document.querySelector(selector);

const TEXT = {
  pl: { saved: "Ustawienia płatności zapisane" },
  en: { saved: "Payment settings saved" },
  de: { saved: "Zahlungseinstellungen gespeichert" },
  no: { saved: "Betalingsinnstillinger lagret" }
};

function language() {
  return document.documentElement.lang || "pl";
}

function toast(text) {
  const box = $("#toast");
  if (!box) return;
  box.textContent = text;
  box.classList.remove("hidden");
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => box.classList.add("hidden"), 2200);
}

function showView(name) {
  document.querySelectorAll(".view").forEach(view => {
    view.classList.toggle("active", view.id === `view-${name}`);
  });
  document.querySelectorAll(".nav-button").forEach(button => {
    button.classList.toggle("active", button.dataset.view === name);
  });
  window.scrollTo({ top: 0, behavior: "smooth" });
}

async function loadPayments() {
  const settings = await get(STORES.settings, "main") || {};
  $("#paymentHourlyRate").value = settings.hourlyRate ?? "";
  $("#paymentOvertimePercent").value = settings.overtimePercent ?? "";
  $("#paymentDailyMinutes").value = settings.dailyMinutes ?? "";
  $("#paymentNightStart").value = settings.nightStart ?? "22:00";
  $("#paymentNightEnd").value = settings.nightEnd ?? "06:00";
  $("#paymentNightPercent").value = settings.nightPercent ?? "";
}

async function savePayments(event) {
  event.preventDefault();
  const current = await get(STORES.settings, "main") || { id: "main" };
  await put(STORES.settings, {
    ...current,
    id: "main",
    hourlyRate: Number($("#paymentHourlyRate").value || 0),
    overtimePercent: Number($("#paymentOvertimePercent").value || 0),
    dailyMinutes: Number($("#paymentDailyMinutes").value || 0),
    nightStart: $("#paymentNightStart").value || "22:00",
    nightEnd: $("#paymentNightEnd").value || "06:00",
    nightPercent: Number($("#paymentNightPercent").value || 0),
    updatedAt: Date.now()
  });
  toast((TEXT[language()] || TEXT.pl).saved);
}

function bindGpsRadiusCompatibility() {
  const form = $("#settingsForm");
  const input = $("#gpsRadius");
  if (!form || !input) return;
  input.max = "1000";
  input.step = "10";
  form.addEventListener("submit", () => {
    const requested = Math.min(1000, Math.max(20, Number(input.value || 120)));
    setTimeout(async () => {
      const current = await get(STORES.settings, "main") || { id: "main" };
      await put(STORES.settings, { ...current, gpsRadius: requested, updatedAt: Date.now() });
      input.value = String(requested);
    }, 120);
  }, true);
}

function bind() {
  $("#openPaymentsButton")?.addEventListener("click", async () => {
    await loadPayments();
    showView("payments");
  });
  $("#closePaymentsButton")?.addEventListener("click", () => {
    document.querySelector('.nav-button[data-view="settings"]')?.click();
  });
  $("#paymentsForm")?.addEventListener("submit", savePayments);
  bindGpsRadiusCompatibility();
}

bind();