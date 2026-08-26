import { get, STORES } from "./db/indexeddb.js";
import { getDay, saveDay } from "./modules/workdays.js";
import { getCurrentPosition } from "./modules/gps.js";
import { reverseGeocode } from "./modules/reverse-geocode.js";
import { findNearestSavedPlace, markPlaceUsed, savePlace } from "./modules/places.js";
import { dateId, clock } from "./modules/time.js";

const $=s=>document.querySelector(s);
let currentLocation=null;

const TEXT={
  pl:{truck:"Zmień ciągnik",set:"Zmień zestaw",oldTruck:"Dotychczasowy ciągnik",oldOdo:"Stan licznika starego ciągnika",newTruck:"Nowy ciągnik",newOdo:"Stan licznika nowego ciągnika",trailer:"Nowa naczepa / przyczepa",place:"Miejsce / własna nazwa",address:"Adres",gps:"Ustal przez GPS",gpsBusy:"Ustalam lokalizację…",remember:"Zapamiętaj tę nazwę dla tego miejsca",note:"Notatka (opcjonalnie)",save:"Zapisz",cancel:"Anuluj",saved:"Zmiana pojazdu zapisana",noDay:"Najpierw rozpocznij dzień pracy.",lower:"Stan końcowy starego ciągnika jest niższy od poprzedniego zapisu. Zapisać mimo to?"},
  en:{truck:"Change truck",set:"Change set",oldTruck:"Current truck",oldOdo:"Old truck final odometer",newTruck:"New truck",newOdo:"New truck starting odometer",trailer:"New trailer",place:"Place / custom name",address:"Address",gps:"Use GPS",gpsBusy:"Finding location…",remember:"Remember this name for this place",note:"Note (optional)",save:"Save",cancel:"Cancel",saved:"Vehicle change saved",noDay:"Start the workday first.",lower:"Old truck final odometer is lower than the previous value. Save anyway?"},
  de:{truck:"Fahrzeug wechseln",set:"Gespann wechseln",oldTruck:"Bisheriges Fahrzeug",oldOdo:"Endkilometerstand altes Fahrzeug",newTruck:"Neues Fahrzeug",newOdo:"Startkilometerstand neues Fahrzeug",trailer:"Neuer Anhänger",place:"Ort / eigener Name",address:"Adresse",gps:"Per GPS bestimmen",gpsBusy:"Standort wird ermittelt…",remember:"Diesen Namen für den Ort speichern",note:"Notiz (optional)",save:"Speichern",cancel:"Abbrechen",saved:"Fahrzeugwechsel gespeichert",noDay:"Starten Sie zuerst den Arbeitstag.",lower:"Endkilometerstand des alten Fahrzeugs ist niedriger. Trotzdem speichern?"},
  no:{truck:"Bytt bil",set:"Bytt vogntog",oldTruck:"Nåværende bil",oldOdo:"Sluttkilometer gammel bil",newTruck:"Ny bil",newOdo:"Startkilometer ny bil",trailer:"Ny henger",place:"Sted / eget navn",address:"Adresse",gps:"Finn med GPS",gpsBusy:"Finner posisjon…",remember:"Husk dette navnet for stedet",note:"Notat (valgfritt)",save:"Lagre",cancel:"Avbryt",saved:"Kjøretøybytte lagret",noDay:"Start arbeidsdagen først.",lower:"Sluttkilometer for gammel bil er lavere enn forrige verdi. Lagre likevel?"}
};

function t(){return TEXT[document.documentElement.lang||"pl"]||TEXT.pl;}
function toast(m){const b=$("#toast");if(!b)return;b.textContent=m;b.classList.remove("hidden");clearTimeout(toast.timer);toast.timer=setTimeout(()=>b.classList.add("hidden"),2600);}
async function settings(){return await get(STORES.settings,"main")||{};}

function ensureStyle(){
  if($("#truckChangeOdoStyle"))return;
  const s=document.createElement("style");s.id="truckChangeOdoStyle";
  s.textContent=`.truck-change-modal{position:fixed;inset:0;z-index:1600;background:rgba(0,0,0,.62);display:flex;align-items:center;justify-content:center;padding:14px}.truck-change-modal.hidden{display:none}.truck-change-dialog{width:min(100%,500px);max-height:92vh;overflow:auto;background:var(--card);border-radius:18px;padding:16px}.truck-change-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px}.truck-change-dialog label{display:block;margin-top:10px}.truck-change-dialog input,.truck-change-dialog textarea{width:100%;box-sizing:border-box}.truck-change-location{display:grid;grid-template-columns:1fr auto;gap:8px;align-items:end}.truck-change-actions{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:12px}.truck-change-current{background:var(--surface,#f5f5f5)}@media(max-width:430px){.truck-change-grid{grid-template-columns:1fr 1fr}}`;
  document.head.appendChild(s);
}

async function openChange(type){
  const day=await getDay(dateId());
  if(!day?.finalStartTime||day?.finalEndTime)return toast(t().noDay);
  ensureStyle();currentLocation=null;
  let modal=$("#truckChangeOdoModal");
  if(!modal){modal=document.createElement("div");modal.id="truckChangeOdoModal";modal.className="truck-change-modal hidden";document.body.appendChild(modal);}
  const currentTruck=day.truckId||"";
  const currentOdo=day.lastOdometer??day.endOdometer??day.startOdometer??"";
  const currentTrailer=day.trailerId||day.trailerNumber||"";
  modal.innerHTML=`<div class="truck-change-dialog"><h2>${type==="truck"?t().truck:t().set}</h2><div class="truck-change-grid"><label>${t().oldTruck}<input id="changeOldTruck" class="truck-change-current" value="${currentTruck}" readonly></label><label>${t().oldOdo}<input id="changeOldOdo" type="number" min="0" inputmode="numeric" value="${currentOdo}"></label><label>${t().newTruck}<input id="changeNewTruck" maxlength="30"></label><label>${t().newOdo}<input id="changeNewOdo" type="number" min="0" inputmode="numeric"></label></div>${type==="change"?`<label>${t().trailer}<input id="changeTrailer" maxlength="30" value="${currentTrailer}"></label>`:""}<div class="truck-change-location"><label>${t().place}<input id="changePlace" maxlength="80"></label><button id="changeGps" type="button">${t().gps}</button></div><label>${t().address}<input id="changeAddress" maxlength="180"></label><label style="display:flex;gap:8px;align-items:center"><input id="changeRemember" type="checkbox" style="width:auto"><span>${t().remember}</span></label><label>${t().note}<textarea id="changeNote" rows="3"></textarea></label><div class="truck-change-actions"><button id="changeSave" class="primary" type="button">${t().save}</button><button id="changeCancel" type="button">${t().cancel}</button></div></div>`;
  modal.classList.remove("hidden");
  $("#changeCancel").onclick=()=>modal.classList.add("hidden");
  $("#changeGps").onclick=detectLocation;
  $("#changeSave").onclick=()=>saveChange(type,day);
  modal.onclick=e=>{if(e.target===modal)modal.classList.add("hidden");};
}

async function detectLocation(){
  const b=$("#changeGps");if(!b||b.disabled)return;b.disabled=true;b.textContent=t().gpsBusy;
  try{
    const p=await getCurrentPosition();const s=await settings();const nearest=await findNearestSavedPlace(p,Number(s.gpsRadius||150));
    if(nearest){const used=await markPlaceUsed(nearest.place);currentLocation={position:p,address:used.address||used.name,placeName:used.name,placeId:used.id};$("#changePlace").value=used.name;$("#changeAddress").value=used.address||"";}
    else{const a=await reverseGeocode(p,document.documentElement.lang||"pl");currentLocation={position:p,address:a.formattedAddress,locality:a.locality,countryCode:a.countryCode};$("#changeAddress").value=a.formattedAddress;}
  }catch(e){console.error(e);toast(e.message||"GPS error");}
  finally{b.disabled=false;b.textContent=t().gps;}
}

async function saveChange(type,day){
  const oldRaw=$("#changeOldOdo").value.trim();const newRaw=$("#changeNewOdo").value.trim();
  const newTruck=$("#changeNewTruck").value.trim().toUpperCase();
  if(!newTruck)return $("#changeNewTruck").focus();
  if(oldRaw==="")return $("#changeOldOdo").focus();
  if(newRaw==="")return $("#changeNewOdo").focus();
  const oldOdo=Number(oldRaw.replace(/\s/g,"")),newOdo=Number(newRaw.replace(/\s/g,""));
  if(!Number.isFinite(oldOdo)||oldOdo<0)return $("#changeOldOdo").focus();
  if(!Number.isFinite(newOdo)||newOdo<0)return $("#changeNewOdo").focus();
  const previous=Number(day.lastOdometer);
  if(Number.isFinite(previous)&&oldOdo<previous&&!confirm(t().lower))return;
  let trailer=day.trailerId||day.trailerNumber||"";
  if(type==="change"){trailer=$("#changeTrailer").value.trim().toUpperCase();if(!trailer)return $("#changeTrailer").focus();}
  const placeName=$("#changePlace").value.trim(),typedAddress=$("#changeAddress").value.trim();
  const address=typedAddress||currentLocation?.address||null,note=$("#changeNote").value.trim();
  if($("#changeRemember").checked&&placeName&&currentLocation?.position){try{await savePlace({name:placeName,address:address||placeName,position:currentLocation.position,locality:currentLocation.locality||null,countryCode:currentLocation.countryCode||null});}catch(e){console.error(e);}}
  const events=[...(day.trailerEvents||[])];
  events.push({id:String(Date.now()),type,time:clock(),truckBefore:day.truckId||"",truckAfter:newTruck,trailerBefore:day.trailerId||day.trailerNumber||"",trailerAfter:trailer,odometerBefore:oldOdo,odometerAfter:newOdo,odometer:newOdo,address,placeName:placeName||null,position:currentLocation?.position||null,note,createdAt:Date.now()});
  await saveDay({...day,id:dateId(),date:dateId(),truckId:newTruck,trailerId:trailer,trailerNumber:trailer,trailerEvents:events,lastOdometer:newOdo});
  $("#truckChangeOdoModal").classList.add("hidden");toast(t().saved);document.dispatchEvent(new CustomEvent("vehicle-data-changed"));setTimeout(()=>location.reload(),180);
}

document.addEventListener("click",event=>{
  const b=event.target.closest('[data-trailer-action="truck"],[data-trailer-action="change"]');
  if(!b||b.disabled)return;
  event.preventDefault();event.stopPropagation();event.stopImmediatePropagation();
  openChange(b.dataset.trailerAction).catch(console.error);
},true);
