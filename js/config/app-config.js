export const APP_CONFIG = Object.freeze({
  version: "0.14.0",
  availableProfiles: ["europris", "universal"],
  defaultProfile: "europris",
  allowProfileChange: true,
  defaultCarrierByProfile: { europris: "hansen-jensen-halden" },
  availableLanguages: ["pl", "en", "de", "no"],
  defaultLanguage: "pl",
  contactEmail: "rumcajs.worklog@gmail.com",
  feedbackSubjectPrefixes: ["BUG", "POMYSŁ", "PYTANIE"]
});