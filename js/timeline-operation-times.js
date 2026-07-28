import { getAll, STORES } from "./db/indexeddb.js";

const $ = selector => document.querySelector(selector);

function parseMinutes(time) {
  if (!/^\d{1,2}:\d{2}$/.test(String(time || ""))) return null;
  const [hours, minutes] = String(time).split(":").map(Number);
  return hours * 60 + minutes;
}

function durationText(startTime, endTime) {
  const start = parseMinutes(startTime);
  const end = parseMinutes(endTime);
  if (start == null || end == null) return "";
  let minutes = end - start;
  if (minutes < 0) minutes += 24 * 60;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (hours && rest) return `${hours} h ${rest} min`;
  if (hours) return `${hours} h`;
  return `${rest} min`;
}

function dayIdFromCard(card) {
  const text = card.querySelector(".life-day-title strong")?.textContent || "";
  return text.match(/\d{4}-\d{2}-\d{2}/)?.[0] || "";
}

async function decorateOperationTimes() {
  const rows = $("#lifeRows");
  if (!rows) return;

  const operations = await getAll(STORES.operations);
  const byDay = new Map();

  for (const operation of operations) {
    const dayId = operation.workdayId || operation.date;
    if (!dayId) continue;
    if (!byDay.has(dayId)) byDay.set(dayId, []);
    byDay.get(dayId).push(operation);
  }

  for (const list of byDay.values()) {
    list.sort((a, b) => String(a.startTime || "").localeCompare(String(b.startTime || "")));
  }

  rows.querySelectorAll(".life-day").forEach(card => {
    const dayId = dayIdFromCard(card);
    const dayOperations = byDay.get(dayId) || [];
    const eventNodes = [...card.querySelectorAll(".life-event.load, .life-event.unload")];

    eventNodes.forEach((eventNode, index) => {
      const operation = dayOperations[index];
      if (!operation) return;

      const time = eventNode.querySelector("time");
      const details = eventNode.querySelector("div");
      if (!time || !details) return;

      const start = operation.startTime || "—";
      const end = operation.endTime || "";
      time.innerHTML = `<span>${start}</span>${end ? `<small>${end}</small>` : ""}`;
      time.classList.toggle("operation-time-range", Boolean(end));

      details.querySelector(".operation-duration")?.remove();
      if (end) {
        const duration = durationText(start, end);
        if (duration) {
          const durationNode = document.createElement("small");
          durationNode.className = "operation-duration";
          durationNode.textContent = `⏱ ${duration}`;
          details.appendChild(durationNode);
        }
      }
    });
  });
}

function addStyle() {
  if ($("#timelineOperationTimesStyle")) return;
  const style = document.createElement("style");
  style.id = "timelineOperationTimesStyle";
  style.textContent = `
    .life-event time.operation-time-range {
      display: flex;
      flex-direction: column;
      gap: 2px;
      line-height: 1.05;
    }
    .life-event time.operation-time-range small {
      font-size: .78rem;
      color: var(--muted);
      font-weight: 700;
    }
    .life-event .operation-duration {
      color: var(--muted);
      font-weight: 700;
    }
  `;
  document.head.appendChild(style);
}

function scheduleDecoration() {
  clearTimeout(scheduleDecoration.timer);
  scheduleDecoration.timer = setTimeout(() => decorateOperationTimes().catch(console.error), 80);
}

function boot() {
  addStyle();
  document.addEventListener("dashboard-view-opened", event => {
    if (event.detail === "life") scheduleDecoration();
  });

  const observer = new MutationObserver(() => {
    if ($("#view-life")?.classList.contains("active")) scheduleDecoration();
  });
  observer.observe(document.body, { childList: true, subtree: true });
}

boot();
