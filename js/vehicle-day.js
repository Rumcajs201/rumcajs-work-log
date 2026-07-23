import { get, STORES } from "./db/indexeddb.js";
import { getDay, saveDay } from "./modules/workdays.js";
import { getOperationsForDay } from "./modules/operations.js";
import { dateId, clock } from "./modules/time.js";

const $ = selector => document.querySelector(selector);
let fleet = [];
let pendingStart = false;
let bypassStartGuard = false;

const TEXT = {
  pl: { title:"Pojazd dnia", vehicle:"Pojazd", place:"Ostatnie miejsce", since:"Praca od", profile:"Profil", choose:"Wybierz pojazd", change:"Zmień pojazd", prompt:"Którym pojazdem dzisiaj jedziesz?", search:"Wpisz lub wybierz numer rejestracyjny", save:"Zapisz pojazd", cancel:"Anuluj", saved:"Pojazd dnia zapisany", changed:"Zmiana pojazdu zapisana", history:"Zmiany pojazdu" },
  en: { title:"Vehicle of the day", vehicle:"Vehicle", place:"Last place", since:"Working since", profile:"Profile", choose:"Choose vehicle", change:"Change vehicle", prompt:"Which vehicle are you driving today?", search:"Enter or select registration", save:"Save vehicle", cancel:"Cancel", saved:"Vehicle saved", changed:"Vehicle change saved", history:"Vehicle changes" },
  de: { title:"Fahrzeug des Tages", vehicle:"Fahrzeug", place:"Letzter Ort", since:"Arbeit seit", profile:"Profil", choose:"Fahrzeug wählen", change:"Fahrzeug wechseln", prompt:"Welches Fahrzeug fahren Sie heute?", search:"Kennzeichen eingeben oder auswählen", save:"Fahrzeug speichern", cancel:"Abbrechen", saved:"Fahrzeug gespeichert", changed:"Fahrzeugwechsel gespeichert", history:"Fahrzeugwechsel" },
  no: { title:"Dagens kjøretøy", vehicle:"Kjøretøy", place:"Siste sted", since:"Arbeid fra", profile:"Profil", choose:"Velg kjøretøy", change:"Bytt kjøretøy", prompt:"Hvilket kjøretøy kjører du i dag?", search:"Skriv inn eller velg registreringsnummer", save:"Lagre kjøretøy", cancel:"Avbryt", saved:"Kjøretøy lagret", changed:"Kjøretøybytte lagret", history:"Kjøretøybytter" }
};
function ui(){return TEXT[document.documentElement.lang||"pl"]||TEXT.pl;}
function toast(text){const box=$("#toast");if(!box)return;box.textContent=text;box.classList.remove("hidden");clearTimeout(toast.timer);toast.timer=setTimeout(()=>box.classList.add("hidden"),2200);}
function esc(v){return String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}

async function loadFleet(){
  try{const response=await fetch("./data/hansen-jensen-halden-fleet.json",{cache:"no-store"});if(!response.ok)return;const data=await response.json();fleet=(data.vehicles||[]).filter(v=>v.status!=="inactive"&&v.registration).map(v=>String(v.registration).toUpperCase()).sort();}catch(error){console.error(error);fleet=[];}
}
function ensureUI(){
  if(!$("#vehicleDayCard")){
    const card=document.createElement("article");card.id="vehicleDayCard";card.className="vehicle-day-card";
    $("#view-home")?.prepend(card);
  }
  if(!$("#vehiclePicker")){
    const modal=document.createElement("div");modal.id="vehiclePicker";modal.className="vehicle-picker-overlay hidden";document.body.appendChild(modal);
  }
}
async function currentContext(){const [settings,day,ops]=await Promise.all([get(STORES.settings,"main"),getDay(dateId()),getOperationsForDay(dateId())]);const last=[...ops].sort((a,b)=>(b.startedAt||0)-(a.startedAt||0))[0];return{settings:settings||{},day,place:last?.place||day?.endAddress||day?.startAddress||"—"};}
async function renderCard(){
  ensureUI();const t=ui();const {settings,day,place}=await currentContext();const active=!!day?.finalStartTime&&!day?.finalEndTime;const changes=Array.isArray(day?.vehicleChanges)?day.vehicleChanges:[];
  $("#vehicleDayCard").innerHTML=`<small>${t.title.toUpperCase()}</small><div class="vehicle-day-grid"><div><span>${t.vehicle}</span><strong>${esc(day?.truckId||"—")}</strong></div><div><span>${t.place}</span><strong>${esc(place)}</strong></div><div><span>${t.since}</span><strong>${esc(day?.finalStartTime||"—")}</strong></div><div><span>${t.profile}</span><strong>${settings.workProfile==="europris"?"Europris":"Uniwersalny"}</strong></div></div><div class="vehicle-day-actions"><button id="vehicleChooseButton" type="button">${day?.truckId?t.change:t.choose}</button></div>${changes.length?`<div class="vehicle-change-list"><strong>${t.history}</strong>${changes.map(c=>`<div><span>${esc(c.time)}</span><b>${esc(c.from||"—")} → ${esc(c.to)}</b></div>`).join("")}</div>`:""}`;
  $("#vehicleChooseButton").onclick=()=>openPicker(false);
  $("#vehicleChooseButton").disabled=!!day?.finalEndTime&&!active;
}
function renderFleetList(query=""){
  const box=$("#vehiclePickerList");if(!box)return;const q=query.trim().toUpperCase().replace(/\s+/g,"");const matches=fleet.filter(r=>r.replace(/\s+/g,"").includes(q));box.innerHTML=matches.map(r=>`<button type="button" data-reg="${esc(r)}">${esc(r)}</button>`).join("");box.classList.toggle("hidden",matches.length===0);box.querySelectorAll("button").forEach(b=>b.onclick=()=>{$("#vehiclePickerInput").value=b.dataset.reg;box.classList.add("hidden");});
}
async function openPicker(fromStart){
  pendingStart=fromStart;ensureUI();const t=ui();const settings=await get(STORES.settings,"main")||{};const euroHansen=settings.workProfile==="europris"&&(settings.carrierId||"hansen-jensen-halden")==="hansen-jensen-halden";
  const box=$("#vehiclePicker");box.innerHTML=`<div class="vehicle-picker-card"><h2>${t.prompt}</h2><label>${t.search}<input id="vehiclePickerInput" maxlength="30" autocomplete="off"></label><div id="vehiclePickerList" class="vehicle-picker-list ${euroHansen?"":"hidden"}"></div><div class="button-row"><button id="vehiclePickerSave" class="primary" type="button">${t.save}</button><button id="vehiclePickerCancel" type="button">${t.cancel}</button></div></div>`;
  const input=$("#vehiclePickerInput");const day=await getDay(dateId());input.value=day?.truckId||settings.defaultTruckId||"";if(euroHansen){renderFleetList("");input.oninput=()=>renderFleetList(input.value);}$("#vehiclePickerSave").onclick=saveVehicle;$("#vehiclePickerCancel").onclick=closePicker;box.onclick=e=>{if(e.target===box)closePicker();};box.classList.remove("hidden");setTimeout(()=>input.focus(),50);
}
function closePicker(){pendingStart=false;$("#vehiclePicker")?.classList.add("hidden");}
async function saveVehicle(){
  const input=$("#vehiclePickerInput");const reg=input?.value.trim().toUpperCase();if(!reg)return input?.focus();const resumeStart=pendingStart;const id=dateId();const existing=await getDay(id);const changing=!!existing?.truckId&&existing.truckId!==reg&&!!existing?.finalStartTime&&!existing?.finalEndTime;const changes=Array.isArray(existing?.vehicleChanges)?[...existing.vehicleChanges]:[];if(changing)changes.push({time:clock(new Date()),from:existing.truckId,to:reg,createdAt:Date.now()});
  await saveDay({...existing,id,date:id,dayType:existing?.dayType||"work",truckId:reg,vehicleChanges:changes,manuallyAdjusted:existing?.manuallyAdjusted||false});
  closePicker();toast(changing?ui().changed:ui().saved);await renderCard();
  if(resumeStart){bypassStartGuard=true;$("#startWorkButton")?.click();setTimeout(()=>{bypassStartGuard=false;},0);}else{setTimeout(()=>location.reload(),220);}
}
async function guardStart(event){
  if(bypassStartGuard)return;const day=await getDay(dateId());if(day?.truckId)return;event.preventDefault();event.stopImmediatePropagation();openPicker(true).catch(console.error);
}
function boot(){ensureUI();loadFleet().then(renderCard).catch(console.error);$("#startWorkButton")?.addEventListener("click",guardStart,true);document.addEventListener("carrier-changed",()=>renderCard().catch(console.error));document.addEventListener("visibilitychange",()=>{if(!document.hidden)renderCard().catch(console.error);});}
boot();