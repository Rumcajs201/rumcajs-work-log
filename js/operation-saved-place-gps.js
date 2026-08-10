import { get, STORES } from "./db/indexeddb.js";
import { getCurrentPosition } from "./modules/gps.js";
import { reverseGeocode } from "./modules/reverse-geocode.js";
import { findNearestSavedPlace, markPlaceUsed } from "./modules/places.js";

const $=s=>document.querySelector(s);
const TEXT={
  pl:{gps:"Ustal adres przez GPS",busy:"Ustalam adres…",done:"Miejsce rozpoznane",fail:"Nie udało się ustalić adresu"},
  en:{gps:"Get address by GPS",busy:"Finding address…",done:"Place recognized",fail:"Could not determine address"},
  de:{gps:"Adresse per GPS ermitteln",busy:"Adresse wird ermittelt…",done:"Ort erkannt",fail:"Adresse konnte nicht ermittelt werden"},
  no:{gps:"Finn adresse med GPS",busy:"Finner adresse…",done:"Sted gjenkjent",fail:"Kunne ikke finne adressen"}
};
const t=()=>TEXT[document.documentElement.lang||"pl"]||TEXT.pl;
let busy=false;
function toast(message){const box=$("#toast");if(!box)return;box.textContent=message;box.classList.remove("hidden");clearTimeout(toast.timer);toast.timer=setTimeout(()=>box.classList.add("hidden"),2800);}
async function detectSavedPlace(){
  if(busy)return;
  const button=$("#detectStoreButton"),input=$("#operationPlaceSearch");
  if(!button||!input)return;
  busy=true;button.disabled=true;button.textContent=t().busy;
  try{
    const position=await getCurrentPosition();
    const settings=await get(STORES.settings,"main")||{};
    const nearest=await findNearestSavedPlace(position,Number(settings.gpsRadius||150));
    if(nearest){
      const place=await markPlaceUsed(nearest.place,"gps-detect");
      input.value=place.name;
      if($("#selectedPlaceLabel"))$("#selectedPlaceLabel").textContent=place.name;
      if($("#selectedPlaceAddress"))$("#selectedPlaceAddress").textContent=place.address||"";
      $("#selectedPlaceBox")?.classList.remove("hidden");
      toast(t().done);
      return;
    }
    const address=await reverseGeocode(position,document.documentElement.lang||"pl");
    const formatted=String(address?.formattedAddress||"").trim();
    if(!formatted)throw new Error(t().fail);
    input.value=formatted;
    if($("#selectedPlaceLabel"))$("#selectedPlaceLabel").textContent=formatted;
    if($("#selectedPlaceAddress"))$("#selectedPlaceAddress").textContent=address?.localityLine||"";
    $("#selectedPlaceBox")?.classList.remove("hidden");
    toast(t().done);
  }catch(error){console.error(error);toast(error?.message||t().fail);}
  finally{busy=false;button.disabled=false;button.textContent=t().gps;}
}
window.addEventListener("click",event=>{
  const button=event.target.closest?.("#detectStoreButton");
  if(!button)return;
  event.preventDefault();event.stopPropagation();event.stopImmediatePropagation();
  detectSavedPlace();
},true);
