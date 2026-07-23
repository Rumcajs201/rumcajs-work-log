import { get, STORES } from "./db/indexeddb.js";
import { getDay, saveDay } from "./modules/workdays.js";
import { dateId, clock } from "./modules/time.js";

const $ = selector => document.querySelector(selector);
let fleet = [];
let pendingStart = false;
let bypassStartGuard = false;

const TEXT = {
  pl: { title:"Pojazd dnia", truck:"Samochód", trailer:"Naczepa / przyczepa", start:"Rozpoczęcie dnia", profile:"Profil", choose:"Wybierz zestaw", change:"Zmień zestaw", prompt:"Wybierz pojazd dnia", truckSearch:"Numer rejestracyjny samochodu", trailerSearch:"Numer rejestracyjny naczepy lub przyczepy (opcjonalnie)", save:"Zapisz zestaw", cancel:"Anuluj", saved:"Pojazd dnia zapisany", changed:"Zmiana zestawu zapisana", history:"Zmiany zestawu" },
  en: { title:"Vehicle of the day", truck:"Truck", trailer:"Trailer", start:"Start of day", profile:"Profile", choose:"Choose combination", change:"Change combination", prompt:"Choose today's vehicle", truckSearch:"Truck registration", trailerSearch:"Trailer registration (optional)", save:"Save combination", cancel:"Cancel", saved:"Vehicle saved", changed:"Vehicle combination changed", history:"Combination changes" },
  de: { title:"Fahrzeug des Tages", truck:"Fahrzeug", trailer:"Anhänger / Auflieger", start:"Tagesbeginn", profile:"Profil", choose:"Fahrzeugkombination wählen", change:"Fahrzeugkombination ändern", prompt:"Fahrzeug des Tages wählen", truckSearch:"Kennzeichen des Fahrzeugs", trailerSearch:"Kennzeichen des Anhängers/Aufliegers (optional)", save:"Kombination speichern", cancel:"Abbrechen", saved:"Fahrzeug gespeichert", changed:"Fahrzeugkombination geändert", history:"Fahrzeugwechsel" },
  no: { title:"Dagens kjøretøy", truck:"Bil", trailer:"Henger / semitrailer", start:"Start på dagen", profile:"Profil", choose:"Velg vogntog", change:"Bytt vogntog", prompt:"Velg dagens kjøretøy", truckSearch:"Bilens registreringsnummer", trailerSearch:"Hengerens registreringsnummer (valgfritt)", save:"Lagre vogntog", cancel:"Avbryt", saved:"Dagens kjøretøy lagret", changed:"Bytte av vogntog lagret", history:"Bytter av vogntog" }
};

function ui(){return TEXT[document.documentElement.lang||"pl"]||TEXT.pl;}
function toast(text){const box=$("#toast");if(!box)return;box.textContent=text;box.classList.remove("hidden");clearTimeout(toast.timer);toast.timer=setTimeout(()=>box.classList.add("hidden"),2200);}
function esc(v){return String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}

async function loadFleet(){
  try{
    const response=await fetch("./data/hansen-jensen-halden-fleet.json",{cache:"no-store"});
    if(!response.ok)return;
    const data=await response.json();
    fleet=(data.vehicles||[]).filter(v=>v.status!=="inactive"&&v.registration).map(v=>String(v.registration).toUpperCase()).sort();
  }catch(error){console.error(error);fleet=[];}
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

async function currentContext(){
  const [settings,day]=await Promise.all([get(STORES.settings,"main"),getDay(dateId())]);
  return {settings:settings||{},day};
}

function startDetails(day){
  const time=day?.finalStartTime||"—";
  const address=day?.startAddress||"—";
  return `<strong class="vehicle-day-start-time">${esc(time)}</strong><span class="vehicle-day-start-address">${esc(address)}</span>`;
}

async function renderCard(){
  ensureUI();
  const t=ui();
  const {settings,day}=await currentContext();
  const active=!!day?.finalStartTime&&!day?.finalEndTime;
  const changes=Array.isArray(day?.vehicleChanges)?day.vehicleChanges:[];
  const trailer=day?.trailerId||day?.trailerNumber||"—";
  const profile=settings.workProfile==="europris"?"Europris":"Uniwersalny";

  $("#vehicleDayCard").innerHTML=`
    <div class="vehicle-day-head"><small>${t.title.toUpperCase()}</small><span>${t.profile}: <strong>${esc(profile)}</strong></span></div>
    <div class="vehicle-day-grid">
      <div><span>${t.truck}</span><strong>${esc(day?.truckId||"—")}</strong></div>
      <div><span>${t.trailer}</span><strong>${esc(trailer)}</strong></div>
      <div class="vehicle-day-start"><span>${t.start}</span>${startDetails(day)}</div>
    </div>
    <div class="vehicle-day-actions"><button id="vehicleChooseButton" type="button">${day?.truckId?t.change:t.choose}</button></div>
    ${changes.length?`<div class="vehicle-change-list"><strong>${t.history}</strong>${changes.map(c=>`<div><span>${esc(c.time)}</span><b>${esc(c.fromTruck||c.from||"—")} / ${esc(c.fromTrailer||"—")} → ${esc(c.toTruck||c.to||"—")} / ${esc(c.toTrailer||"—")}</b></div>`).join("")}</div>`:""}`;

  $("#vehicleChooseButton").onclick=()=>openPicker(false);
  $("#vehicleChooseButton").disabled=!!day?.finalEndTime&&!active;
}

function renderFleetList(query=""){
  const box=$("#vehiclePickerList");if(!box)return;
  const q=query.trim().toUpperCase().replace(/\s+/g,"");
  const matches=fleet.filter(r=>r.replace(/\s+/g,"").includes(q));
  box.innerHTML=matches.map(r=>`<button type="button" data-reg="${esc(r)}">${esc(r)}</button>`).join("");
  box.classList.toggle("hidden",matches.length===0);
  box.querySelectorAll("button").forEach(b=>b.onclick=()=>{$("#vehiclePickerTruck").value=b.dataset.reg;box.classList.add("hidden");});
}

async function openPicker(fromStart){
  pendingStart=fromStart;ensureUI();
  const t=ui();
  const settings=await get(STORES.settings,"main")||{};
  const euroHansen=settings.workProfile==="europris"&&(settings.carrierId||"hansen-jensen-halden")==="hansen-jensen-halden";
  const day=await getDay(dateId());
  const box=$("#vehiclePicker");
  box.innerHTML=`<div class="vehicle-picker-card"><h2>${t.prompt}</h2>
    <label>${t.truckSearch}<input id="vehiclePickerTruck" maxlength="30" autocomplete="off"></label>
    <div id="vehiclePickerList" class="vehicle-picker-list ${euroHansen?"":"hidden"}"></div>
    <label>${t.trailerSearch}<input id="vehiclePickerTrailer" maxlength="30" autocomplete="off"></label>
    <div class="button-row"><button id="vehiclePickerSave" class="primary" type="button">${t.save}</button><button id="vehiclePickerCancel" type="button">${t.cancel}</button></div></div>`;

  const truckInput=$("#vehiclePickerTruck");
  truckInput.value=day?.truckId||settings.defaultTruckId||"";
  $("#vehiclePickerTrailer").value=day?.trailerId||day?.trailerNumber||"";
  if(euroHansen){renderFleetList("");truckInput.oninput=()=>renderFleetList(truckInput.value);}
  $("#vehiclePickerSave").onclick=saveVehicle;
  $("#vehiclePickerCancel").onclick=closePicker;
  box.onclick=e=>{if(e.target===box)closePicker();};
  box.classList.remove("hidden");
  setTimeout(()=>truckInput.focus(),50);
}

function closePicker(){pendingStart=false;$("#vehiclePicker")?.classList.add("hidden");}

async function saveVehicle(){
  const truck=$("#vehiclePickerTruck")?.value.trim().toUpperCase();
  const trailer=$("#vehiclePickerTrailer")?.value.trim().toUpperCase()||"";
  if(!truck)return $("#vehiclePickerTruck")?.focus();
  const resumeStart=pendingStart;
  const id=dateId();
  const existing=await getDay(id);
  const oldTrailer=String(existing?.trailerId||existing?.trailerNumber||"");
  const changing=!!existing?.finalStartTime&&!existing?.finalEndTime&&(existing?.truckId!==truck||oldTrailer!==trailer);
  const changes=Array.isArray(existing?.vehicleChanges)?[...existing.vehicleChanges]:[];
  if(changing)changes.push({time:clock(new Date()),fromTruck:existing?.truckId||"",fromTrailer:oldTrailer,toTruck:truck,toTrailer:trailer,createdAt:Date.now()});

  await saveDay({...existing,id,date:id,dayType:existing?.dayType||"work",truckId:truck,trailerId:trailer,vehicleChanges:changes,manuallyAdjusted:existing?.manuallyAdjusted||false});
  closePicker();toast(changing?ui().changed:ui().saved);await renderCard();
  if(resumeStart){bypassStartGuard=true;$("#startWorkButton")?.click();setTimeout(()=>{bypassStartGuard=false;},0);}else{setTimeout(()=>location.reload(),220);}
}

async function guardStart(event){
  if(bypassStartGuard)return;
  const day=await getDay(dateId());
  if(day?.truckId)return;
  event.preventDefault();event.stopImmediatePropagation();openPicker(true).catch(console.error);
}

function boot(){
  ensureUI();
  loadFleet().then(renderCard).catch(console.error);
  $("#startWorkButton")?.addEventListener("click",guardStart,true);
  document.addEventListener("carrier-changed",()=>renderCard().catch(console.error));
  document.addEventListener("visibilitychange",()=>{if(!document.hidden)renderCard().catch(console.error);});
}
boot();