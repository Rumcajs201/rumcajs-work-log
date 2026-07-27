import { get, STORES } from "./db/indexeddb.js";
import { getDay, saveDay } from "./modules/workdays.js";
import { dateId } from "./modules/time.js";

const $ = selector => document.querySelector(selector);
const TEXT = {
  pl:{start:"Stan licznika początkowy",end:"Stan licznika końcowy",distance:"Przejechano dzisiaj",km:"km",saved:"Stan licznika zapisany",lower:"Licznik końcowy jest niższy od początkowego."},
  en:{start:"Start odometer",end:"End odometer",distance:"Distance today",km:"km",saved:"Odometer saved",lower:"End odometer is lower than start odometer."},
  de:{start:"Kilometerstand Start",end:"Kilometerstand Ende",distance:"Heute gefahren",km:"km",saved:"Kilometerstand gespeichert",lower:"Der Endstand ist niedriger als der Startstand."},
  no:{start:"Kilometerstand start",end:"Kilometerstand slutt",distance:"Kjørt i dag",km:"km",saved:"Kilometerstand lagret",lower:"Sluttstanden er lavere enn startstanden."}
};
const t=()=>TEXT[document.documentElement.lang||"pl"]||TEXT.pl;
function toast(message){const box=$("#toast");if(!box)return;box.textContent=message;box.classList.remove("hidden");clearTimeout(toast.timer);toast.timer=setTimeout(()=>box.classList.add("hidden"),2200);}
function numberValue(id){const raw=$(id)?.value?.trim();if(!raw)return null;const n=Number(raw.replace(/\s/g,""));return Number.isFinite(n)&&n>=0?n:null;}
function distanceText(start,end){return start!=null&&end!=null&&end>=start?`${end-start} ${t().km}`:"—";}
async function render(){
  const view=$("#view-workday");if(!view)return;
  view.querySelectorAll(".workday-odometer-tile").forEach(node=>node.remove());
  const settings=await get(STORES.settings,"main")||{};
  if(settings.workProfile!=="universal")return;
  const day=await getDay(dateId());
  const firstCard=view.querySelector("article.card");if(!firstCard)return;
  const locations=firstCard.querySelectorAll(".location-box");
  const startTile=document.createElement("label");
  startTile.className="workday-odometer-tile";
  startTile.innerHTML=`<span>${t().start}</span><div><input id="workdayStartOdometer" type="number" min="0" step="1" inputmode="numeric" value="${day?.startOdometer??""}"><small>${t().km}</small></div>`;
  const endTile=document.createElement("label");
  endTile.className="workday-odometer-tile";
  endTile.innerHTML=`<span>${t().end}</span><div><input id="workdayEndOdometer" type="number" min="0" step="1" inputmode="numeric" value="${day?.endOdometer??""}"><small>${t().km}</small></div><b>${t().distance}: <strong id="workdayDistance">${distanceText(day?.startOdometer??null,day?.endOdometer??null)}</strong></b>`;
  if(locations.length>=2){locations[0].after(startTile);locations[1].after(endTile);}else{firstCard.append(startTile,endTile);}
  async function save(){
    const current=await getDay(dateId())||{id:dateId(),date:dateId(),dayType:"work"};
    const start=numberValue("#workdayStartOdometer"),end=numberValue("#workdayEndOdometer");
    if(start!=null&&end!=null&&end<start){toast(t().lower);return;}
    await saveDay({...current,startOdometer:start,endOdometer:end,lastOdometer:end??start??current.lastOdometer});
    const distance=$("#workdayDistance");if(distance)distance.textContent=distanceText(start,end);
    toast(t().saved);
  }
  $("#workdayStartOdometer")?.addEventListener("change",save);
  $("#workdayEndOdometer")?.addEventListener("change",save);
}
function style(){if($("#workdayOdometerStyle"))return;const s=document.createElement("style");s.id="workdayOdometerStyle";s.textContent=`.workday-odometer-tile{display:block;margin:6px 0 10px;padding:8px 10px;border:1px solid var(--line);border-radius:11px;background:rgba(55,125,209,.06)}.workday-odometer-tile>span{display:block;font-size:.78rem;color:var(--muted);margin-bottom:4px}.workday-odometer-tile>div{display:flex;align-items:center;gap:6px}.workday-odometer-tile input{min-width:0;width:100%;padding:7px 8px}.workday-odometer-tile small{white-space:nowrap}.workday-odometer-tile b{display:block;margin-top:5px;font-size:.78rem;font-weight:500;color:var(--muted)}.workday-odometer-tile b strong{color:var(--text)}`;document.head.appendChild(s);}
style();
document.addEventListener("dashboard-view-opened",event=>{if(event.detail==="workday")setTimeout(()=>render().catch(console.error),120);});
document.addEventListener("vehicle-data-changed",()=>setTimeout(()=>render().catch(console.error),120));
setTimeout(()=>render().catch(console.error),500);
