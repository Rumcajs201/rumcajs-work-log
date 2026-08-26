import "../truck-change-odometer.js";

const params = new URLSearchParams(window.location.search);
const universalDistribution = params.get("variant") === "universal";

function applyUniversalDistributionUI() {
  if (!universalDistribution) return;

  document.documentElement.dataset.worklogVariant = "universal";

  const manifest = document.querySelector('link[rel="manifest"]');
  if (manifest) manifest.href = "./manifest-universal.webmanifest";

  const appleTitle = document.querySelector('meta[name="apple-mobile-web-app-title"]');
  if (appleTitle) appleTitle.content = "Work Log Universal";

  const profileSelect = document.getElementById("workProfile");
  if (profileSelect) {
    profileSelect.innerHTML = '<option value="universal">Uniwersalny</option>';
    profileSelect.value = "universal";
    profileSelect.disabled = true;
    const label = profileSelect.closest("label");
    if (label) label.style.display = "none";
  }

  const badge = document.getElementById("activeProfileBadge");
  if (badge) badge.textContent = "Uniwersalny";

  const carrier = document.getElementById("carrierContext");
  if (carrier) carrier.classList.add("hidden");
}

if (universalDistribution) {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", applyUniversalDistributionUI, { once: true });
  } else {
    queueMicrotask(applyUniversalDistributionUI);
  }
  document.addEventListener("dashboard-view-opened", applyUniversalDistributionUI);
  window.addEventListener("pageshow", applyUniversalDistributionUI);
}

export const APP_CONFIG = Object.freeze({
  version: "0.16.34",
  distribution: universalDistribution ? "universal" : "full",
  availableProfiles: universalDistribution ? ["universal"] : ["europris", "universal"],
  defaultProfile: universalDistribution ? "universal" : "europris",
  allowProfileChange: !universalDistribution,
  defaultCarrierByProfile: { europris: "hansen-jensen-halden" },
  availableLanguages: ["pl", "en", "de", "no"],
  defaultLanguage: "pl",
  contactEmail: "rumcajs.worklog@gmail.com",
  feedbackSubjectPrefixes: ["BUG", "POMYSŁ", "PYTANIE"]
});