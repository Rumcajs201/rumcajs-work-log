import { getDay, saveDay } from "./modules/workdays.js";
import { dateId } from "./modules/time.js";

const $ = selector => document.querySelector(selector);
let editing = false;

const TEXT = {
  pl:{editTruck:"Zmień numer samochodu",editTrailer:"Zmień numer naczepy / przyczepy",truck:"Numer rejestracyjny samochodu",trailer:"Numer naczepy / przyczepy",solo:"Pozostaw puste, jeżeli jedziesz solo",save:"Zapisz",cancel:"Anuluj",saved:"Numer zapisany"},
  en:{editTruck:"Change vehicle registration",editTrailer:"Change trailer registration",truck:"Vehicle registration",trailer:"Trailer registration",solo:"Leave empty when driving solo",save:"Save",cancel:"Cancel",saved:"Registration saved"},
  de:{editTruck:"Fahrzeugkennzeichen ändern",editTrailer:"Anhängerkennzeichen ändern",truck:"Fahrzeugkennzeichen",trailer:"Anhängerkennzeichen",solo:"Leer lassen bei Solofahrt",save:"Speichern",cancel:"Abbrechen",saved:"Kennzeichen gespeichert"},
  no:{editTruck:"Endre registreringsnummer bil",editTrailer:"Endre registreringsnummer henger",truck:"Registreringsnummer bil",trailer:"Registreringsnummer henger",solo:"La stå tomt ved kjøring uten henger",save:"Lagre",cancel:"Avbryt",saved:"Registreringsnummer lagret"}
};
const t=()=>TEXT[document.documentElement.lang||"pl"]||TEXT.pl;
function toast(message){const box=$("#toast");if(!box)return;box.textContent=message;box.classList.remove("hidden");clearTimeout(toast.timer);toast.timer=setTimeout(()=>box.classList.add("hidden"),2200);}

function markDirectEdit(cell,type){
  if(!cell)return;
  cell.dataset.directEdit=type;
  cell.classList.add("direct-vehicle-edit");
  cell.setAttribute("role","button");
  cell.setAttribute("tabindex","0");
}

function arrange(){
  const view=$("#view-workday");
  if(!view)return;

  const workCard=view.querySelector("article.card:not(#journalToolsCard)");
  const vehicle=$("#vehicleDayCard");
  if(!workCard)return;

  // The standard workday card already contains vehicle, trailer, start/end,
  // locations and the start/finish buttons. Keep this single card visible.
  const summaryCells=workCard.querySelectorAll(".summary-grid > div");
  markDirectEdit(summaryCells[1],"truck");
  markDirectEdit(summaryCells[2],"trailer");

  // Trailer controls are created inside the legacy vehicle card. Move them to
  // the main workday card before hiding the duplicated legacy summary.
  const actions=$("#trailerEventActions");
  const history=$("#trailerEventHistory");
  if(actions&&actions.parentElement!==workCard)workCard.appendChild(actions);
  if(history&&history.parentElement!==workCard)workCard.appendChild(history);

  if(vehicle){
    vehicle.classList.add("workday-duplicate-hidden");
    vehicle.setAttribute("aria-hidden","true");
  }
}

function ensureModal(){
  if($("#directVehicleModal"))return;
  const modal=document.createElement("div");
  modal.id="directVehicleModal";
  modal.className="direct-vehicle-modal hidden";
  document.body.appendChild(modal);
}

async function openEditor(type){
  if(editing)return;
  editing=true;
  ensureModal();
  const day=await getDay(dateId())||{id:dateId(),date:dateId(),dayType:"work"};
  const trailer=day.trailerId||day.trailerNumber||"";
  const isTruck=type==="truck";
  const modal=$("#directVehicleModal");
  modal.innerHTML=`<div class="direct-vehicle-dialog"><h2>${isTruck?t().editTruck:t().editTrailer}</h2><label>${isTruck?t().truck:t().trailer}<input id="directVehicleInput" maxlength="30" autocomplete="off" value="${String(isTruck?day.truckId||"":trailer).replace(/"/g,"&quot;")}"></label>${isTruck?"":`<p class="muted">${t().solo}</p>`}<div class="button-row"><button id="directVehicleSave" class="primary" type="button">${t().save}</button><button id="directVehicleCancel" type="button">${t().cancel}</button></div></div>`;
  modal.classList.remove("hidden");
  const close=()=>{modal.classList.add("hidden");editing=false;};
  $("#directVehicleCancel").onclick=close;
  modal.onclick=e=>{if(e.target===modal)close();};
  $("#directVehicleSave").onclick=async()=>{
    const value=$("#directVehicleInput").value.trim().toUpperCase();
    if(isTruck&&!value){$("#directVehicleInput").focus();return;}
    const changes=Array.isArray(day.vehicleChanges)?[...day.vehicleChanges]:[];
    const oldTruck=day.truckId||"",oldTrailer=trailer;
    if(day.finalStartTime&&!day.finalEndTime){changes.push({time:new Date().toLocaleTimeString("pl-PL",{hour:"2-digit",minute:"2-digit"}),fromTruck:oldTruck,fromTrailer:oldTrailer,toTruck:isTruck?value:oldTruck,toTrailer:isTruck?oldTrailer:value,createdAt:Date.now(),source:"direct-edit"});}
    await saveDay({...day,truckId:isTruck?value:oldTruck,trailerId:isTruck?oldTrailer:value,trailerNumber:isTruck?day.trailerNumber:(value||null),vehicleChanges:changes});
    close();toast(t().saved);document.dispatchEvent(new CustomEvent("vehicle-data-changed"));setTimeout(()=>location.reload(),120);
  };
  setTimeout(()=>$("#directVehicleInput")?.focus(),30);
}

function ensureStyle(){
  if($("#workdayLayoutStyle"))return;
  const style=document.createElement("style");
  style.id="workdayLayoutStyle";
  style.textContent=`.workday-duplicate-hidden{display:none!important}.direct-vehicle-edit{cursor:pointer;position:relative;border:2px solid transparent!important}.direct-vehicle-edit:after{content:"✎";position:absolute;right:8px;top:7px;font-size:.85rem;opacity:.65}.direct-vehicle-edit:active{transform:scale(.98);border-color:#377dd1!important}.direct-vehicle-modal{position:fixed;inset:0;z-index:1700;background:rgba(0,0,0,.62);display:flex;align-items:center;justify-content:center;padding:16px}.direct-vehicle-modal.hidden{display:none}.direct-vehicle-dialog{width:min(100%,460px);background:var(--card);border-radius:18px;padding:18px;box-shadow:0 20px 70px rgba(0,0,0,.4)}.direct-vehicle-dialog input{width:100%;box-sizing:border-box;font-size:1.1rem;text-transform:uppercase}.direct-vehicle-dialog .button-row{margin-top:16px}#view-workday>article.card:first-of-type{border-top:4px solid #377dd1}`;
  document.head.appendChild(style);
}

function boot(){
  ensureStyle();ensureModal();setTimeout(arrange,300);
  document.addEventListener("vehicle-card-rendered",()=>setTimeout(arrange,0));
  document.addEventListener("dashboard-view-opened",event=>{if(event.detail==="workday")setTimeout(arrange,50);});
  document.addEventListener("click",event=>{const cell=event.target.closest("[data-direct-edit]");if(!cell)return;event.preventDefault();event.stopPropagation();openEditor(cell.dataset.directEdit).catch(error=>{editing=false;console.error(error);});},true);
  document.addEventListener("keydown",event=>{const cell=event.target.closest?.("[data-direct-edit]");if(cell&&(event.key==="Enter"||event.key===" ")){event.preventDefault();openEditor(cell.dataset.directEdit).catch(console.error);}});
}
boot();