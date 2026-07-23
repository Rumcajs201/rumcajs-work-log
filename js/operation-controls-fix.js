import { get, STORES } from "./db/indexeddb.js";
import { dateId, clock, roundToNearestFive } from "./modules/time.js";
import { getDay } from "./modules/workdays.js";
import { getActiveOperation, startOperation } from "./modules/operations.js";
import { getCurrentPosition } from "./modules/gps.js";
import { reverseGeocode } from "./modules/reverse-geocode.js";

const $ = selector => document.querySelector(selector);
let busy = false;
let detected = null;

const TEXT = {
  pl: { gps:"Ustal adres przez GPS", gpsBusy:"Ustalam adres…", gpsDone:"Adres został wpisany", gpsFail:"Nie udało się ustalić adresu", active:"Najpierw zakończ trwającą operację", noDay:"Najpierw rozpocznij dzień pracy", starting:"Pobieram lokalizację…", load:"Załadunek", unload:"Rozładunek", started:"Operacja rozpoczęta" },
  en: { gps:"Get address by GPS", gpsBusy:"Finding address…", gpsDone:"Address entered", gpsFail:"Could not determine address", active:"Finish the current operation first", noDay:"Start the workday first", starting:"Getting location…", load:"Loading", unload:"Unloading", started:"Operation started" },
  de: { gps:"Adresse per GPS ermitteln", gpsBusy:"Adresse wird ermittelt…", gpsDone:"Adresse eingetragen", gpsFail:"Adresse konnte nicht ermittelt werden", active:"Beenden Sie zuerst den laufenden Vorgang", noDay:"Starten Sie zuerst den Arbeitstag", starting:"Standort wird ermittelt…", load:"Beladung", unload:"Entladung", started:"Vorgang gestartet" },
  no: { gps:"Finn adresse med GPS", gpsBusy:"Finner adresse…", gpsDone:"Adressen er lagt inn", gpsFail:"Kunne ikke finne adressen", active:"Avslutt den aktive operasjonen først", noDay:"Start arbeidsdagen først", starting:"Finner posisjon…", load:"Lasting", unload:"Lossing", started:"Operasjon startet" }
};

function t(){ return TEXT[document.documentElement.lang || "pl"] || TEXT.pl; }
function toast(message){ const box=$("#toast"); if(!box)return; box.textContent=message; box.classList.remove("hidden"); clearTimeout(toast.timer); toast.timer=setTimeout(()=>box.classList.add("hidden"),2800); }

async function determineAddress(){
  const position = await getCurrentPosition();
  const address = await reverseGeocode(position, document.documentElement.lang || "pl");
  const formatted = String(address?.formattedAddress || "").trim();
  if(!formatted) throw new Error(t().gpsFail);
  detected = { position, address, formatted };
  return detected;
}

async function detectForForm(){
  if(busy)return;
  const button=$("#detectStoreButton");
  const input=$("#operationPlaceSearch");
  if(!button || !input)return;
  busy=true; button.disabled=true; button.textContent=t().gpsBusy;
  try{
    const result=await determineAddress();
    input.value=result.formatted;
    $("#selectedPlaceLabel") && ($("#selectedPlaceLabel").textContent=result.formatted);
    $("#selectedPlaceAddress") && ($("#selectedPlaceAddress").textContent=result.address?.localityLine || "");
    $("#selectedPlaceBox")?.classList.remove("hidden");
    toast(t().gpsDone);
  }catch(error){ console.error(error); toast(error?.message || t().gpsFail); }
  finally{ busy=false; button.disabled=false; button.textContent=t().gps; }
}

async function start(type){
  if(busy)return;
  const day=await getDay(dateId());
  if(!day?.finalStartTime || day?.finalEndTime) return toast(t().noDay);
  if(await getActiveOperation(dateId())) return toast(t().active);
  busy=true;
  const unload=$("#newUnloadButton"), load=$("#newLoadButton");
  if(unload)unload.disabled=true; if(load)load.disabled=true;
  try{
    let typed=String($("#operationPlaceSearch")?.value || "").trim();
    let result=detected;
    if(!typed){ toast(t().starting); result=await determineAddress(); typed=result.formatted; }
    else if(!result){ try{ result=await determineAddress(); }catch(error){ console.warn(error); } }
    const now=new Date();
    await startOperation({
      workdayId:dateId(), type,
      profile:(await get(STORES.settings,"main"))?.workProfile || null,
      place:typed,
      storeAddress:result?.formatted || (typed || null),
      locality:result?.address?.locality || null,
      countryCode:result?.address?.countryCode || null,
      detectedStartTime:clock(now), startTime:roundToNearestFive(now),
      position:result?.position || null
    });
    const activeBox=$("#activeOperationBox"), selector=$("#operationSelector");
    if(activeBox){ activeBox.classList.remove("hidden"); $("#activeOperationTitle").textContent=`${type==="unload"?t().unload:t().load}: ${typed}`; $("#activeOperationTime").textContent=roundToNearestFive(now); }
    selector?.classList.add("hidden");
    toast(`${t().started}: ${roundToNearestFive(now)}`);
    detected=null;
  }catch(error){ console.error(error); toast(error?.message || t().gpsFail); }
  finally{ busy=false; if(unload)unload.disabled=false; if(load)load.disabled=false; }
}

function capture(event){
  const button=event.target.closest("#detectStoreButton,#newUnloadButton,#newLoadButton");
  if(!button)return;
  event.preventDefault(); event.stopPropagation(); event.stopImmediatePropagation();
  if(button.id==="detectStoreButton") detectForForm();
  else start(button.id==="newUnloadButton"?"unload":"load");
}

document.addEventListener("click", capture, true);

function refreshLabels(){ const b=$("#detectStoreButton"); if(b && !busy)b.textContent=t().gps; }
new MutationObserver(refreshLabels).observe(document.body,{childList:true,subtree:true});
refreshLabels();
