const DYNAMIC_VIEWS = new Set(["history", "stats", "life", "vehicles", "transport"]);

function activateView(name) {
  const view = document.getElementById(`view-${name}`);
  if (!view) return false;

  document.querySelectorAll(".view").forEach(item => {
    item.classList.toggle("active", item === view);
  });
  document.querySelectorAll(".nav-button").forEach(button => {
    button.classList.toggle("active", button.dataset.view === name);
  });
  window.scrollTo({ top: 0, behavior: "auto" });
  return true;
}

function activateWhenReady(name, attempt = 0) {
  if (activateView(name)) return;
  if (attempt >= 10) {
    console.error(`Nie udało się utworzyć widoku: ${name}`);
    return;
  }
  setTimeout(() => activateWhenReady(name, attempt + 1), 40);
}

document.addEventListener("dashboard-view-opened", event => {
  const name = event.detail;
  if (!DYNAMIC_VIEWS.has(name)) return;
  // Widoki archiwum są tworzone dopiero po pierwszym otwarciu. Poczekaj na
  // zakończenie odczytu IndexedDB, a następnie uaktywnij nowo utworzoną sekcję.
  queueMicrotask(() => activateWhenReady(name));
});
