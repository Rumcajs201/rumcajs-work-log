import { get, put, STORES } from "./db/indexeddb.js";

const $ = selector => document.querySelector(selector);

const TEXT = {
  pl: {
    saved:"Ustawienia płatności zapisane", method:"Sposób wynagrodzenia", currency:"Waluta wynagrodzenia", gross:"Wszystkie kwoty wpisuj jako brutto.",
    hourly:"Stawka godzinowa", kilometer:"Stawka za kilometr", freight:"Stawka za fracht / kurs", daily:"Dniówka", monthly:"Stała pensja miesięczna", mixed:"Wynagrodzenie mieszane",
    hourlyRate:"Stawka brutto za godzinę", kilometerRate:"Stawka brutto za kilometr", freightRate:"Stawka brutto za fracht / kurs", dailyRate:"Stawka brutto za dzień", monthlyRate:"Miesięczne wynagrodzenie brutto",
    overtime:"Dodatek za nadgodziny (%)", dailyMinutes:"Norma dzienna w minutach", nightStart:"Początek godzin nocnych", nightEnd:"Koniec godzin nocnych", nightPercent:"Dodatek za godziny nocne (%)",
    saturday:"Dodatek za sobotę (%)", sunday:"Dodatek za niedzielę (%)", holiday:"Dodatek za święto (%)", minimumDaily:"Minimalna gwarancja dzienna brutto (opcjonalnie)",
    extraPoint:"Premia brutto za dodatkowy punkt (opcjonalnie)", pickupBonus:"Premia brutto za odbiór (opcjonalnie)", bonus:"Premia brutto (opcjonalnie)", diet:"Dieta brutto / dzień (opcjonalnie)",
    enableOvertime:"Rozliczaj nadgodziny", enableNight:"Rozliczaj godziny nocne", enableDiets:"Rozliczaj diety", enableBonus:"Rozliczaj premie", enableMileage:"Rozliczaj kilometrówkę",
    summary:"Podsumowanie ustawień", noRate:"Stawka nie została jeszcze wpisana", extras:"Aktywne dodatki", noExtras:"Brak włączonych dodatków", save:"Zapisz płatności", back:"Wróć do ustawień"
  },
  en: {saved:"Payment settings saved",method:"Payment method",currency:"Payment currency",gross:"Enter all amounts as gross.",hourly:"Hourly rate",kilometer:"Per kilometre",freight:"Per freight / trip",daily:"Daily rate",monthly:"Fixed monthly salary",mixed:"Mixed payment",hourlyRate:"Gross hourly rate",kilometerRate:"Gross rate per kilometre",freightRate:"Gross rate per freight / trip",dailyRate:"Gross daily rate",monthlyRate:"Gross monthly salary",overtime:"Overtime supplement (%)",dailyMinutes:"Daily standard in minutes",nightStart:"Night work starts",nightEnd:"Night work ends",nightPercent:"Night supplement (%)",saturday:"Saturday supplement (%)",sunday:"Sunday supplement (%)",holiday:"Holiday supplement (%)",minimumDaily:"Minimum gross daily guarantee (optional)",extraPoint:"Gross bonus per extra stop (optional)",pickupBonus:"Gross pickup bonus (optional)",bonus:"Gross bonus (optional)",diet:"Gross allowance per day (optional)",enableOvertime:"Calculate overtime",enableNight:"Calculate night work",enableDiets:"Calculate allowances",enableBonus:"Calculate bonuses",enableMileage:"Calculate mileage",summary:"Settings summary",noRate:"No rate entered yet",extras:"Enabled extras",noExtras:"No extras enabled",save:"Save payments",back:"Back to settings"},
  de: {saved:"Zahlungseinstellungen gespeichert",method:"Vergütungsart",currency:"Lohnwährung",gross:"Alle Beträge als Brutto eingeben.",hourly:"Stundenlohn",kilometer:"Kilometersatz",freight:"Fracht- / Tourensatz",daily:"Tagessatz",monthly:"Festes Monatsgehalt",mixed:"Gemischte Vergütung",hourlyRate:"Brutto-Stundenlohn",kilometerRate:"Brutto pro Kilometer",freightRate:"Brutto pro Fracht / Tour",dailyRate:"Brutto pro Tag",monthlyRate:"Brutto-Monatsgehalt",overtime:"Überstundenzuschlag (%)",dailyMinutes:"Tagesnorm in Minuten",nightStart:"Nachtarbeit ab",nightEnd:"Nachtarbeit bis",nightPercent:"Nachtzuschlag (%)",saturday:"Samstagszuschlag (%)",sunday:"Sonntagszuschlag (%)",holiday:"Feiertagszuschlag (%)",minimumDaily:"Brutto-Mindestgarantie pro Tag (optional)",extraPoint:"Brutto-Prämie je Zusatzstopp (optional)",pickupBonus:"Brutto-Abholprämie (optional)",bonus:"Brutto-Prämie (optional)",diet:"Brutto-Tagegeld pro Tag (optional)",enableOvertime:"Überstunden berechnen",enableNight:"Nachtarbeit berechnen",enableDiets:"Tagegelder berechnen",enableBonus:"Prämien berechnen",enableMileage:"Kilometervergütung berechnen",summary:"Zusammenfassung",noRate:"Noch kein Satz eingegeben",extras:"Aktive Zuschläge",noExtras:"Keine Zuschläge aktiviert",save:"Zahlungen speichern",back:"Zurück zu Einstellungen"},
  no: {saved:"Betalingsinnstillinger lagret",method:"Lønnsform",currency:"Lønnsvaluta",gross:"Alle beløp oppgis som brutto.",hourly:"Timelønn",kilometer:"Kilometergodtgjørelse",freight:"Betaling per frakt / tur",daily:"Dagsats",monthly:"Fast månedslønn",mixed:"Kombinert lønn",hourlyRate:"Brutto timelønn",kilometerRate:"Brutto per kilometer",freightRate:"Brutto per frakt / tur",dailyRate:"Brutto per dag",monthlyRate:"Brutto månedslønn",overtime:"Overtidstillegg (%)",dailyMinutes:"Dagsnorm i minutter",nightStart:"Nattarbeid fra",nightEnd:"Nattarbeid til",nightPercent:"Nattillegg (%)",saturday:"Lørdagstillegg (%)",sunday:"Søndagstillegg (%)",holiday:"Helligdagstillegg (%)",minimumDaily:"Brutto minimumsgaranti per dag (valgfritt)",extraPoint:"Brutto tillegg per ekstra stopp (valgfritt)",pickupBonus:"Brutto hentetillegg (valgfritt)",bonus:"Brutto bonus (valgfritt)",diet:"Brutto diett per dag (valgfritt)",enableOvertime:"Beregn overtid",enableNight:"Beregn nattarbeid",enableDiets:"Beregn diett",enableBonus:"Beregn bonus",enableMileage:"Beregn kilometergodtgjørelse",summary:"Sammendrag",noRate:"Ingen sats er registrert",extras:"Aktive tillegg",noExtras:"Ingen tillegg er aktivert",save:"Lagre betaling",back:"Tilbake til innstillinger"}
};

const CURRENCIES = ["NOK","PLN","EUR","SEK","DKK","GBP","CHF","USD"];
function language(){return document.documentElement.lang||"pl";}
function tr(){return TEXT[language()]||TEXT.pl;}
function toast(text){const box=$("#toast");if(!box)return;box.textContent=text;box.classList.remove("hidden");clearTimeout(toast.timer);toast.timer=setTimeout(()=>box.classList.add("hidden"),2200);}
function showView(name){document.querySelectorAll(".view").forEach(view=>view.classList.toggle("active",view.id===`view-${name}`));document.querySelectorAll(".nav-button").forEach(button=>button.classList.toggle("active",button.dataset.view===name));window.scrollTo({top:0,behavior:"smooth"});}
function num(id){return Number($(id)?.value||0);}
function checked(id){return Boolean($(id)?.checked);}
function field(label,id,step="0.01"){return `<label>${label}<input id="${id}" type="number" min="0" step="${step}" inputmode="decimal"></label>`;}
function toggle(label,id){return `<label class="payment-toggle"><input id="${id}" type="checkbox"><span>${label}</span></label>`;}
function money(value,currency){return value>0?`${new Intl.NumberFormat(language()==="pl"?"pl-PL":language()==="no"?"nb-NO":language()==="de"?"de-DE":"en-GB",{maximumFractionDigits:2}).format(value)} ${currency}`:null;}

function buildForm(){
  const t=tr(), form=$("#paymentsForm"); if(!form)return;
  form.innerHTML=`
    <div class="payment-top-grid">
      <label><strong>${t.method}</strong><select id="paymentMethod">
        <option value="hourly">${t.hourly}</option><option value="kilometer">${t.kilometer}</option><option value="freight">${t.freight}</option><option value="daily">${t.daily}</option><option value="monthly">${t.monthly}</option><option value="mixed">${t.mixed}</option>
      </select></label>
      <label><strong>${t.currency}</strong><select id="paymentCurrency">${CURRENCIES.map(c=>`<option value="${c}">${c}</option>`).join("")}</select></label>
    </div>
    <p class="muted payment-gross-note">${t.gross}</p>
    <div id="paymentMethodFields"></div>
    <div id="paymentOptions" class="payment-options">
      ${toggle(t.enableOvertime,"paymentEnableOvertime")}${toggle(t.enableNight,"paymentEnableNight")}${toggle(t.enableDiets,"paymentEnableDiets")}${toggle(t.enableBonus,"paymentEnableBonus")}${toggle(t.enableMileage,"paymentEnableMileage")}
    </div>
    <div id="paymentSummary" class="payment-summary"></div>
    <div class="button-row"><button class="primary" type="submit">${t.save}</button><button id="closePaymentsButton" type="button">${t.back}</button></div>`;
  $("#paymentMethod").addEventListener("change",()=>{renderMethodFields();updateSummary();});
  $("#paymentCurrency").addEventListener("change",updateSummary);
  form.addEventListener("input",updateSummary);
  form.addEventListener("change",updateSummary);
  $("#closePaymentsButton").addEventListener("click",()=>document.querySelector('.nav-button[data-view="settings"]')?.click());
}

function renderMethodFields(){
  const t=tr(), method=$("#paymentMethod")?.value||"hourly", box=$("#paymentMethodFields"); if(!box)return;
  const commonHourly=`${field(t.hourlyRate,"paymentHourlyRate")}${field(t.overtime,"paymentOvertimePercent","1")}${field(t.dailyMinutes,"paymentDailyMinutes","15")}<div class="two-cols"><label>${t.nightStart}<input id="paymentNightStart" type="time" step="900"></label><label>${t.nightEnd}<input id="paymentNightEnd" type="time" step="900"></label></div>${field(t.nightPercent,"paymentNightPercent","1")}${field(t.saturday,"paymentSaturdayPercent","1")}${field(t.sunday,"paymentSundayPercent","1")}${field(t.holiday,"paymentHolidayPercent","1")}`;
  const templates={
    hourly:commonHourly,
    kilometer:`${field(t.kilometerRate,"paymentKilometerRate")}${field(t.minimumDaily,"paymentMinimumDaily")}`,
    freight:`${field(t.freightRate,"paymentFreightRate")}${field(t.extraPoint,"paymentExtraPointRate")}${field(t.pickupBonus,"paymentPickupBonus")}`,
    daily:`${field(t.dailyRate,"paymentDailyRate")}`,
    monthly:`${field(t.monthlyRate,"paymentMonthlyRate")}${field(t.bonus,"paymentBonus")}${field(t.diet,"paymentDietRate")}`,
    mixed:`${commonHourly}${field(t.kilometerRate,"paymentKilometerRate")}${field(t.freightRate,"paymentFreightRate")}${field(t.dailyRate,"paymentDailyRate")}${field(t.monthlyRate,"paymentMonthlyRate")}${field(t.bonus,"paymentBonus")}${field(t.diet,"paymentDietRate")}`
  };
  box.innerHTML=templates[method]||templates.hourly;
}

function updateSummary(){
  const box=$("#paymentSummary"); if(!box)return;
  const t=tr(), method=$("#paymentMethod")?.value||"hourly", currency=$("#paymentCurrency")?.value||"NOK";
  const methodNames={hourly:t.hourly,kilometer:t.kilometer,freight:t.freight,daily:t.daily,monthly:t.monthly,mixed:t.mixed};
  const primary={hourly:money(num("#paymentHourlyRate"),currency),kilometer:money(num("#paymentKilometerRate"),currency),freight:money(num("#paymentFreightRate"),currency),daily:money(num("#paymentDailyRate"),currency),monthly:money(num("#paymentMonthlyRate"),currency),mixed:null}[method];
  const extras=[];
  if(checked("#paymentEnableOvertime"))extras.push(t.enableOvertime);
  if(checked("#paymentEnableNight"))extras.push(t.enableNight);
  if(checked("#paymentEnableDiets"))extras.push(t.enableDiets);
  if(checked("#paymentEnableBonus"))extras.push(t.enableBonus);
  if(checked("#paymentEnableMileage"))extras.push(t.enableMileage);
  box.innerHTML=`<small>${t.summary.toUpperCase()}</small><strong>${methodNames[method]} • ${currency}</strong><span>${primary||t.noRate}</span><span><b>${t.extras}:</b> ${extras.length?extras.join(", "):t.noExtras}</span>`;
}

function applyValues(settings){
  const values={
    paymentHourlyRate:settings.hourlyRate,paymentOvertimePercent:settings.overtimePercent,paymentDailyMinutes:settings.dailyMinutes,paymentNightStart:settings.nightStart??"22:00",paymentNightEnd:settings.nightEnd??"06:00",paymentNightPercent:settings.nightPercent,
    paymentSaturdayPercent:settings.saturdayPercent,paymentSundayPercent:settings.sundayPercent,paymentHolidayPercent:settings.holidayPercent,paymentKilometerRate:settings.kilometerRate,paymentMinimumDaily:settings.minimumDailyGross,paymentFreightRate:settings.freightRate,paymentExtraPointRate:settings.extraPointRate,paymentPickupBonus:settings.pickupBonus,paymentDailyRate:settings.dailyRate,paymentMonthlyRate:settings.monthlyRate,paymentBonus:settings.bonusGross,paymentDietRate:settings.dietRateGross
  };
  Object.entries(values).forEach(([id,value])=>{const el=$("#"+id);if(el&&value!=null)el.value=value;});
  const checks={paymentEnableOvertime:settings.enableOvertime,paymentEnableNight:settings.enableNight,paymentEnableDiets:settings.enableDiets,paymentEnableBonus:settings.enableBonus,paymentEnableMileage:settings.enableMileage};
  Object.entries(checks).forEach(([id,value])=>{const el=$("#"+id);if(el)el.checked=Boolean(value);});
}

async function loadPayments(){
  const settings=await get(STORES.settings,"main")||{};
  buildForm();
  $("#paymentMethod").value=settings.paymentMethod||"hourly";
  $("#paymentCurrency").value=CURRENCIES.includes(settings.paymentCurrency)?settings.paymentCurrency:"NOK";
  renderMethodFields();
  applyValues(settings);
  updateSummary();
}

async function savePayments(event){
  event.preventDefault();
  const current=await get(STORES.settings,"main")||{id:"main"};
  const data={
    ...current,id:"main",paymentMethod:$("#paymentMethod")?.value||"hourly",paymentCurrency:$("#paymentCurrency")?.value||"NOK",
    hourlyRate:num("#paymentHourlyRate"),overtimePercent:num("#paymentOvertimePercent"),dailyMinutes:num("#paymentDailyMinutes"),nightStart:$("#paymentNightStart")?.value||"22:00",nightEnd:$("#paymentNightEnd")?.value||"06:00",nightPercent:num("#paymentNightPercent"),
    saturdayPercent:num("#paymentSaturdayPercent"),sundayPercent:num("#paymentSundayPercent"),holidayPercent:num("#paymentHolidayPercent"),kilometerRate:num("#paymentKilometerRate"),minimumDailyGross:num("#paymentMinimumDaily"),freightRate:num("#paymentFreightRate"),extraPointRate:num("#paymentExtraPointRate"),pickupBonus:num("#paymentPickupBonus"),dailyRate:num("#paymentDailyRate"),monthlyRate:num("#paymentMonthlyRate"),bonusGross:num("#paymentBonus"),dietRateGross:num("#paymentDietRate"),
    enableOvertime:checked("#paymentEnableOvertime"),enableNight:checked("#paymentEnableNight"),enableDiets:checked("#paymentEnableDiets"),enableBonus:checked("#paymentEnableBonus"),enableMileage:checked("#paymentEnableMileage"),updatedAt:Date.now()
  };
  await put(STORES.settings,data);toast(tr().saved);updateSummary();
}

function ensureStyle(){if($("#paymentDynamicStyle"))return;const style=document.createElement("style");style.id="paymentDynamicStyle";style.textContent=`#view-payments .card{border-top:4px solid #d59b27}.payment-top-grid{display:grid;grid-template-columns:2fr 1fr;gap:10px}.payment-gross-note{padding:10px 12px;border-radius:10px;background:#fff3cd;border:1px solid #edcf75;color:#684f00}.payment-options{display:grid;grid-template-columns:1fr;gap:8px;margin:14px 0}.payment-toggle{display:flex!important;align-items:center;gap:10px;padding:11px 12px;border:1px solid var(--line);border-radius:12px;background:var(--card)}.payment-toggle input{width:auto!important;margin:0}#paymentMethod,#paymentCurrency{font-weight:700;border:2px solid #d59b27}.payment-summary{display:flex;flex-direction:column;gap:5px;padding:13px 14px;margin:14px 0;border-radius:14px;background:#eef6ff;border:1px solid #9cc5ef}.payment-summary small{color:#245b8d}.payment-summary strong{font-size:1.05rem}.payment-summary span{font-size:.85rem;color:var(--muted)}@media(max-width:420px){.payment-top-grid{grid-template-columns:1fr}}`;document.head.appendChild(style);}
function bindGpsRadiusCompatibility(){const form=$("#settingsForm"),input=$("#gpsRadius");if(!form||!input)return;input.max="1000";input.step="10";form.addEventListener("submit",()=>{const requested=Math.min(1000,Math.max(20,Number(input.value||120)));setTimeout(async()=>{const current=await get(STORES.settings,"main")||{id:"main"};await put(STORES.settings,{...current,gpsRadius:requested,updatedAt:Date.now()});input.value=String(requested);},120);},true);}
function bind(){ensureStyle();$("#openPaymentsButton")?.addEventListener("click",async()=>{await loadPayments();showView("payments");});$("#paymentsForm")?.addEventListener("submit",savePayments);bindGpsRadiusCompatibility();}
bind();