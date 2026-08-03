import "./reports-compact.js";

const $=s=>document.querySelector(s);
const lang=()=>document.documentElement.lang||"pl";
const TEXT={
  pl:{choose:"Wybierz miesiąc"},
  en:{choose:"Choose month"},
  de:{choose:"Monat wählen"},
  no:{choose:"Velg måned"}
};
const t=()=>TEXT[lang()]||TEXT.pl;

function monthValue(date=new Date()){
  return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,"0")}`;
}

function applyMonth(period,monthInput,query){
  const value=monthInput.value;
  if(!value)return;
  period.value="all";
  query.value=value;
  query.dataset.archiveMonthAuto="1";
  query.dispatchEvent(new Event("input",{bubbles:true}));
  period.value="month";
}

function enhanceArchive(){
  const period=$("#archivePeriod"),query=$("#archiveQuery");
  if(!period||!query||$("#archiveMonthChooser"))return false;
  const input=document.createElement("input");
  input.type="month";
  input.id="archiveMonthChooser";
  input.value=monthValue();
  input.setAttribute("aria-label",t().choose);
  input.title=t().choose;
  input.style.display=period.value==="month"?"block":"none";
  const toolbar=period.closest(".journal-toolbar")||period.parentElement;
  toolbar?.insertAdjacentElement("afterend",input);

  const originalChange=period.onchange;
  period.onchange=event=>{
    if(period.value==="month"){
      input.style.display="block";
      applyMonth(period,input,query);
      return;
    }
    input.style.display="none";
    if(query.dataset.archiveMonthAuto==="1"){
      query.value="";
      delete query.dataset.archiveMonthAuto;
    }
    originalChange?.call(period,event);
  };
  input.onchange=()=>applyMonth(period,input,query);
  return true;
}

function scheduleEnhance(){
  let tries=0;
  const timer=setInterval(()=>{
    tries++;
    if(enhanceArchive()||tries>20)clearInterval(timer);
  },50);
}

document.addEventListener("dashboard-view-opened",event=>{
  if(event.detail==="history")scheduleEnhance();
});
