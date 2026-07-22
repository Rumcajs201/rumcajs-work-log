import { openDB, get, put, STORES } from "./db/indexeddb.js";

const LANGUAGES = Object.freeze({
  pl: { flag: "🇵🇱", short: "PL", name: "Polski" },
  en: { flag: "🇬🇧", short: "EN", name: "English" },
  de: { flag: "🇩🇪", short: "DE", name: "Deutsch" },
  no: { flag: "🇳🇴", short: "NO", name: "Norsk" }
});

const button = document.querySelector("#languageButton");
const menu = document.querySelector("#languageMenu");
const flag = document.querySelector("#languageFlag");
const shortName = document.querySelector("#languageShort");
const hiddenSelect = document.querySelector("#language");

function updateButton(language) {
  const selected = LANGUAGES[language] || LANGUAGES.pl;
  flag.textContent = selected.flag;
  shortName.textContent = selected.short;
  button.setAttribute("aria-label", selected.name);
  if (hiddenSelect) hiddenSelect.value = language;
}

function closeMenu() {
  menu.classList.add("hidden");
  button.setAttribute("aria-expanded", "false");
}

async function saveLanguage(language) {
  if (!LANGUAGES[language]) return;
  const settings = (await get(STORES.settings, "main")) || { id: "main" };
  await put(STORES.settings, {
    ...settings,
    id: "main",
    language,
    updatedAt: Date.now()
  });
  updateButton(language);
  closeMenu();
  location.reload();
}

async function initialize() {
  await openDB();
  const settings = await get(STORES.settings, "main");
  updateButton(settings?.language || "pl");

  button.addEventListener("click", event => {
    event.stopPropagation();
    const willOpen = menu.classList.contains("hidden");
    menu.classList.toggle("hidden", !willOpen);
    button.setAttribute("aria-expanded", String(willOpen));
  });

  menu.querySelectorAll("[data-language]").forEach(option => {
    option.addEventListener("click", () => saveLanguage(option.dataset.language));
  });

  document.addEventListener("click", event => {
    if (!menu.contains(event.target) && !button.contains(event.target)) closeMenu();
  });

  document.addEventListener("keydown", event => {
    if (event.key === "Escape") closeMenu();
  });
}

initialize().catch(error => console.error("Language switcher:", error));