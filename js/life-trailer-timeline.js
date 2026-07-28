import { getAll, STORES } from "./db/indexeddb.js";

const $ = selector => document.querySelector(selector);
const TEXT = {
  pl:{attach:"Podpięcie naczepy",drop:"Odstawienie naczepy",trailer:"Naczepa"},
  en:{attach:"Trailer attached",drop:"Trailer dropped",trailer:"Trailer"},
  de:{attach:"Anhänger angekuppelt",drop:"Anhänger abgestellt",trailer:"Anhänger"},
  no:{attach:"Henger koblet til",drop:"Henger satt fra",trailer:"Henger"}
};
const t = () => TEXT[document.documentElement.lang || "pl"] || TEXT.pl;
const esc = value => String(value ?? "").replace(/[&<>"']/g, char => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[char]));

let daysCache = null;

function dayId(card) {
  return (card.querySelector(".life-day-title strong")?.textContent || "").match(/\d{4}-\d{2}-\d{2}/)?.[0] || "";
}

function eventTime(node) {
  return (node.querySelector("time")?.textContent || "99:99").match(/\d{1,2}:\d{2}/)?.[0] || "99:99";
}

async function loadDays() {
  if (!daysCache) {
    const days = await getAll(STORES.workdays);
    daysCache = new Map(days.map(day => [day.id || day.date, day]));
  }
  return daysCache;
}

function detail(event) {
  const trailer = event.type === "drop" ? event.trailerBefore : event.trailerAfter;
  return [
    `${t().trailer}: ${trailer || "—"}`,
    event.placeName,
    event.address,
    event.note
  ].filter(Boolean).join(" • ");
}

async function decorateCard(card) {
  if (!card) return;
  const details = card.querySelector(".life-day-details");
  if (!details) return;

  const map = await loadDays();
  const day = map.get(dayId(card));
  if (!day) return;

  details.querySelectorAll("[data-life-trailer-event]").forEach(node => node.remove());

  for (const event of day.trailerEvents || []) {
    if (event.type !== "attach" && event.type !== "drop") continue;
    const row = document.createElement("div");
    row.className = `life-event ${event.type === "attach" ? "trailer-attach" : "trailer-drop"}`;
    row.dataset.lifeTrailerEvent = event.id || `${event.type}-${event.time || ""}`;
    row.innerHTML = `<time>${esc(event.time || "—")}</time><div><strong>${esc(event.type === "attach" ? t().attach : t().drop)}</strong><small>${esc(detail(event))}</small></div>`;
    details.appendChild(row);
  }

  const rows = [...details.children].filter(node => node.classList?.contains("life-event"));
  rows.sort((a,b) => eventTime(a).localeCompare(eventTime(b)));
  rows.forEach(row => details.appendChild(row));
}

function addStyle() {
  if ($("#lifeTrailerTimelineStyle")) return;
  const style = document.createElement("style");
  style.id = "lifeTrailerTimelineStyle";
  style.textContent = ".life-event.trailer-attach strong{color:#245aa8}.life-event.trailer-drop strong{color:#a55b00}";
  document.head.appendChild(style);
}

function boot() {
  addStyle();
  document.addEventListener("click", event => {
    const button = event.target.closest(".life-day-summary");
    if (!button) return;
    daysCache = null;
    setTimeout(() => decorateCard(button.closest(".life-day")).catch(console.error), 0);
  }, true);

  document.addEventListener("dashboard-view-opened", event => {
    if (event.detail !== "life") return;
    daysCache = null;
    setTimeout(() => document.querySelectorAll(".life-day").forEach(card => decorateCard(card).catch(console.error)), 250);
  });
}

boot();
