import { getDay, saveDay } from "./modules/workdays.js";
import { dateId } from "./modules/time.js";
import { get, STORES } from "./db/indexeddb.js";

const $ = selector => document.querySelector(selector);
let bypass = false;
let open = false;

const TEXT = {
  pl:{title:"Zakończenie dnia",label:"Końcowy stan licznika",hint:"Początkowy stan licznika",distance:"Przejechano dzisiaj",save:"Zapisz i zakończ dzień",cancel:"Anuluj",lower:"Końcowy stan licznika nie może być niższy od początkowego."},
  en:{title:"Finish workday",label:"End odometer",hint:"Start odometer",distance:"Distance today",save:"Save and finish workday",cancel:"Cancel",lower:"End odometer cannot be lower than start odometer."},
  de:{title:"Arbeitstag beenden",label:"Kilometerstand Ende",hint:"Kilometerstand Start",distance:"Heute gefahren",save:"Speichern und Arbeitstag beenden",cancel:"Abbrechen",lower:"Der Endstand darf nicht niedriger als der Startstand sein."},
  no:{title:"Avslutt arbeidsdagen",label:"Kilometerstand slutt",hint:"Kilometerstand start",distance:"Kjørt i dag",save:"Lagre og avslutt dagen",cancel:"Avbryt",lower:"Sluttstanden kan ikke være lavere enn startstanden."}
};
const t=()=>TEXT[document.documentElement.lang||"pl"]||TEXT.pl;
function toast(message){const box=$("#toast");if(!box)return;box.textContent=message;box.classList.remove("hidden");clearTimeout(toast.timer);toast.timer=setTimeout(()=>box.classList.add("hidden"),2500);}
function ensureModal(){if($("#finishOdometerModal"))return;const modal=document.createElement("div");modal.id="finishOdometerModal";modal.className="finish-odometer-modal hidden";document.body.appendChild(modal);}
function closeModal(){const modal=$("#finishOdometerModal");if(modal)modal.classList.add("hidden");open=false;}
async function showModal(day){ensureModal();open=true;const modal=$("#finishOdometerModal");const start=Number(day.startOdometer);modal.innerHTML=`<div class="finish-odometer-dialog"><h2>${t().title}</h2><p class="muted">${t().hint}: <strong>${start} km</strong></p><label>${t().label}<input id="finishOdometerInput" type="number" min="${start}" step="1" inputmode="numeric" value="${day.endOdometer??""}"></label><p class="muted">${t().distance}: <strong id="finishOdometerDistance">—</strong></p><div class="button-row"><button id="finishOdometerSave" class="primary" type="button">${t().save}</button><button id="finishOdometerCancel" type="button">${t().cancel}</button></div></div>`;
modal.classList.remove("hidden");
const input=$("#finishOdometerInput");
const updateDistance=()=>{const end=Number(input.value);$("#finishOdometerDistance").textContent=Number.isFinite(end)&&end>=start?`${end-start} km`:"—";};
input.addEventListener("input",updateDistance);updateDistance();
$("#finishOdometerCancel").onclick=closeModal;
modal.onclick=e=>{if(e.target===modal)closeModal();};
$("#finishOdometerSave").onclick=async()=>{const raw=input.value.trim();const end=raw===""?null:Number(raw);if(end!=null&&(!Number.isFinite(end)||end<start)){toast(t().lower);input.focus();return;}const current=await getDay(dateId())||day;await saveDay({...current,endOdometer:end,lastOdometer:end??current.lastOdometer});closeModal();bypass=true;$("#stopWorkButton")?.click();setTimeout(()=>{bypass=false;},0);};
setTimeout(()=>input.focus(),40);
}
async function guardStop(event){if(bypass||open)return;const [settings,day]=await Promise.all([get(STORES.settings,"main"),getDay(dateId())]);if(settings?.workProfile!=="universal"||day?.startOdometer==null||day?.startOdometer==="")return;event.preventDefault();event.stopPropagation();event.stopImmediatePropagation();showModal(day).catch(error=>{open=false;console.error(error);});}
function style(){if($("#finishOdometerStyle"))return;const s=document.createElement("style");s.id="finishOdometerStyle";s.textContent=`.finish-odometer-modal{position:fixed;inset:0;z-index:1800;background:rgba(0,0,0,.62);display:flex;align-items:center;justify-content:center;padding:16px}.finish-odometer-modal.hidden{display:none}.finish-odometer-dialog{width:min(100%,460px);background:var(--card);border-radius:18px;padding:18px;box-shadow:0 20px 70px rgba(0,0,0,.4)}.finish-odometer-dialog input{width:100%;box-sizing:border-box;font-size:1.1rem}.finish-odometer-dialog .button-row{margin-top:16px}`;document.head.appendChild(s);}
style();ensureModal();$("#stopWorkButton")?.addEventListener("click",guardStop,true);
