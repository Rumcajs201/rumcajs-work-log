import { APP_CONFIG } from "./config/app-config.js";

const $ = selector => document.querySelector(selector);
const SEEN_KEY = "rumcajs-driver-journal-info-v1";
const LOGO_URL = "https://rumcajs201.github.io/europris-dostawy/icons/icon-192.png";

const TEXT = {
  pl: {
    info:"Informacje", title:"Osobisty dziennik kierowcy", author:"Wykonał Rumcajs", beta:"Wersja próbna — aplikacja jest w trakcie budowy", body:"Aplikacja jest obecnie rozwijana i testowana. Niektóre funkcje mogą się zmieniać, a podczas testów mogą pojawić się błędy. Przed ważnym użyciem sprawdzaj zapisane dane i regularnie wykonuj kopię bezpieczeństwa.", future:"Po pełnym dopracowaniu aplikacja może w przyszłości stać się płatna. Jeżeli zasady korzystania się zmienią, informacja zostanie przedstawiona użytkownikowi przed ich zastosowaniem.", privacy:"Nie wpisuj haseł, danych kart, kodów dostępu ani innych poufnych informacji w notatkach.", feedback:"Uwagi i propozycje", feedbackText:"Masz pomysł, zauważyłeś błąd albo chcesz zaproponować usprawnienie? Napisz bezpośrednio do Rumcajsa.", email:"Wyślij wiadomość e-mail", accept:"Rozumiem — przejdź do aplikacji", close:"Zamknij", version:"Wersja"
  },
  en: {
    info:"Information", title:"Driver's personal journal", author:"Created by Rumcajs", beta:"Test version — the application is under development", body:"The application is currently being developed and tested. Some functions may change and errors may occur during testing. Check important records and make regular backups.", future:"After full development, the application may become paid in the future. If the terms of use change, users will be informed before the changes apply.", privacy:"Do not enter passwords, payment-card data, access codes or other confidential information in notes.", feedback:"Comments and suggestions", feedbackText:"Found an error or have an improvement idea? Contact Rumcajs directly.", email:"Send an email", accept:"I understand — open the application", close:"Close", version:"Version"
  },
  de: {
    info:"Informationen", title:"Persönliches Fahrertagebuch", author:"Erstellt von Rumcajs", beta:"Testversion — die Anwendung befindet sich im Aufbau", body:"Die Anwendung wird derzeit entwickelt und getestet. Funktionen können sich ändern und während der Tests können Fehler auftreten. Prüfen Sie wichtige Einträge und erstellen Sie regelmäßig Sicherungskopien.", future:"Nach vollständiger Fertigstellung kann die Anwendung künftig kostenpflichtig werden. Änderungen der Nutzungsbedingungen werden vor ihrem Inkrafttreten angezeigt.", privacy:"Keine Passwörter, Kartendaten, Zugangscodes oder andere vertrauliche Informationen in Notizen eintragen.", feedback:"Hinweise und Vorschläge", feedbackText:"Fehler gefunden oder eine Idee? Schreiben Sie direkt an Rumcajs.", email:"E-Mail senden", accept:"Verstanden — Anwendung öffnen", close:"Schließen", version:"Version"
  },
  no: {
    info:"Informasjon", title:"Førerens personlige dagbok", author:"Laget av Rumcajs", beta:"Testversjon — appen er under utvikling", body:"Appen utvikles og testes fortsatt. Funksjoner kan bli endret, og feil kan forekomme under testingen. Kontroller viktige registreringer og ta sikkerhetskopi regelmessig.", future:"Når appen er ferdig utviklet, kan den bli en betalt tjeneste. Ved endringer i bruksvilkårene blir brukeren informert før de trer i kraft.", privacy:"Ikke skriv passord, kortopplysninger, adgangskoder eller annen konfidensiell informasjon i notater.", feedback:"Kommentarer og forslag", feedbackText:"Har du funnet en feil eller har et forslag? Send en melding direkte til Rumcajs.", email:"Send e-post", accept:"Jeg forstår — åpne appen", close:"Lukk", version:"Versjon"
  }
};

function lang(){return TEXT[document.documentElement.lang] ? document.documentElement.lang : "pl";}
function t(){return TEXT[lang()];}
function escapeHtml(value){return String(value??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}

function ensureStyle(){
  if($("#appInfoStyle")) return;
  const style=document.createElement("style");
  style.id="appInfoStyle";
  style.textContent=`.app-info-button{display:flex;align-items:center;justify-content:center;gap:6px;min-height:36px;padding:6px 10px;border-radius:11px;font-size:.78rem}.app-info-overlay{position:fixed;inset:0;z-index:2500;background:rgba(0,0,0,.7);display:flex;align-items:center;justify-content:center;padding:14px}.app-info-overlay.hidden{display:none}.app-info-dialog{width:min(100%,540px);max-height:92vh;overflow:auto;background:var(--card);color:var(--text);border-radius:20px;padding:18px;box-shadow:0 24px 80px rgba(0,0,0,.5)}.app-info-brand{display:flex;align-items:center;gap:12px;margin-bottom:12px}.app-info-brand img{width:62px;height:62px;border-radius:14px;object-fit:cover}.app-info-brand h2{margin:0 0 3px}.app-info-brand strong,.app-info-brand small{display:block}.app-info-beta{padding:10px 12px;border-radius:12px;background:#fff3cd;color:#664d03;font-weight:800;margin:12px 0}.app-info-dialog p{line-height:1.45}.app-info-feedback{padding:12px;border:1px solid var(--line);border-radius:14px;margin:14px 0}.app-info-feedback h3{margin:0 0 6px}.app-info-feedback a{display:flex;justify-content:center;align-items:center;min-height:44px;margin-top:10px;border-radius:12px;background:var(--main);color:var(--mainText);font-weight:800;text-decoration:none}.app-info-actions{display:flex;gap:8px}.app-info-actions button{flex:1}`;
  document.head.appendChild(style);
}

function ensureModal(){
  let modal=$("#appInfoModal");
  if(modal) return modal;
  modal=document.createElement("div");
  modal.id="appInfoModal";
  modal.className="app-info-overlay hidden";
  document.body.appendChild(modal);
  return modal;
}

export function openAppInformation(firstRun=false){
  ensureStyle();
  const modal=ensureModal(), x=t();
  const subject=encodeURIComponent("Osobisty Dziennik Kierowcy — uwaga lub propozycja");
  const body=encodeURIComponent(`Wersja aplikacji: ${APP_CONFIG.version}\n\nOpis uwagi lub propozycji:\n`);
  modal.innerHTML=`<div class="app-info-dialog" role="dialog" aria-modal="true" aria-label="${escapeHtml(x.info)}"><div class="app-info-brand"><img src="${LOGO_URL}" alt="Rumcajs"><div><h2>${escapeHtml(x.title)}</h2><strong>${escapeHtml(x.author)}</strong><small>${escapeHtml(x.version)} ${escapeHtml(APP_CONFIG.version)}</small></div></div><div class="app-info-beta">${escapeHtml(x.beta)}</div><p>${escapeHtml(x.body)}</p><p>${escapeHtml(x.future)}</p><p><strong>${escapeHtml(x.privacy)}</strong></p><div class="app-info-feedback"><h3>${escapeHtml(x.feedback)}</h3><p>${escapeHtml(x.feedbackText)}</p><a href="mailto:${APP_CONFIG.contactEmail}?subject=${subject}&body=${body}">${escapeHtml(x.email)}: ${escapeHtml(APP_CONFIG.contactEmail)}</a></div><div class="app-info-actions"><button id="appInfoClose" class="primary" type="button">${escapeHtml(firstRun?x.accept:x.close)}</button></div></div>`;
  modal.classList.remove("hidden");
  const close=()=>{modal.classList.add("hidden");if(firstRun)localStorage.setItem(SEEN_KEY,"1");};
  $("#appInfoClose").onclick=close;
  modal.onclick=e=>{if(!firstRun&&e.target===modal)close();};
}

function addInfoButton(){
  if($("#appInfoButton"))return;
  const target=$(".language-control")||$(".topbar-row");
  if(!target)return;
  const button=document.createElement("button");
  button.id="appInfoButton";
  button.className="app-info-button";
  button.type="button";
  button.innerHTML=`ⓘ <span>${escapeHtml(t().info)}</span>`;
  button.onclick=()=>openAppInformation(false);
  target.parentElement?.insertBefore(button,target);
}

function applySharedLogo(){
  document.querySelectorAll('.brand-rumcajs img').forEach(img=>{img.src=LOGO_URL;img.onerror=null;});
}

function boot(){
  ensureStyle();ensureModal();
  setTimeout(()=>{addInfoButton();applySharedLogo();if(!localStorage.getItem(SEEN_KEY))openAppInformation(true);},500);
  document.addEventListener("dashboard-view-opened",()=>setTimeout(applySharedLogo,30));
}
boot();
