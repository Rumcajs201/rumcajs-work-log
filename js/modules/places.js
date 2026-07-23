import { get, getAll, put, remove, STORES } from "../db/indexeddb.js";

function toRad(value){return value*Math.PI/180;}
function distanceMetres(a,b){
  const lat1=Number(a?.latitude),lon1=Number(a?.longitude),lat2=Number(b?.latitude),lon2=Number(b?.longitude);
  if(![lat1,lon1,lat2,lon2].every(Number.isFinite))return Infinity;
  const dLat=toRad(lat2-lat1),dLon=toRad(lon2-lon1);
  const h=Math.sin(dLat/2)**2+Math.cos(toRad(lat1))*Math.cos(toRad(lat2))*Math.sin(dLon/2)**2;
  return 6371000*2*Math.atan2(Math.sqrt(h),Math.sqrt(1-h));
}

export async function getSavedPlaces(){
  const items=await getAll(STORES.places);
  return items.sort((a,b)=>Number(b.favorite)-Number(a.favorite)||(b.lastUsedAt||0)-(a.lastUsedAt||0));
}

export async function searchSavedPlaces(query){
  const q=String(query||"").trim().toLocaleLowerCase();
  const items=await getSavedPlaces();
  if(!q)return items.slice(0,12);
  return items.filter(item=>`${item.name} ${item.address||""}`.toLocaleLowerCase().includes(q)).slice(0,12);
}

export async function findNearestSavedPlace(position,maxDistance=150){
  const places=await getSavedPlaces();
  let best=null;
  for(const place of places){
    const distance=distanceMetres(position,place.position);
    if(distance<=maxDistance&&(!best||distance<best.distance))best={place,distance};
  }
  return best;
}

export async function savePlace({name,address,position,locality,countryCode}){
  const cleanName=String(name||"").trim();
  if(!cleanName)throw new Error("Wpisz nazwę firmy lub miejsca.");
  if(!position||!Number.isFinite(Number(position.latitude))||!Number.isFinite(Number(position.longitude)))throw new Error("Brak prawidłowej lokalizacji GPS.");
  const now=Date.now();
  const id=`place-${cleanName.toLocaleLowerCase().replace(/[^a-z0-9ąćęłńóśźż]+/gi,"-").replace(/^-|-$/g,"")}-${Math.round(Number(position.latitude)*10000)}-${Math.round(Number(position.longitude)*10000)}`;
  const existing=await get(STORES.places,id);
  const record={
    id,name:cleanName,address:String(address||""),locality:locality||null,countryCode:countryCode||null,
    position:{latitude:Number(position.latitude),longitude:Number(position.longitude),accuracy:Number(position.accuracy||0)},
    favorite:Boolean(existing?.favorite),locked:Boolean(existing?.locked),visitCount:Number(existing?.visitCount||0),
    operationCounts:existing?.operationCounts||{},createdAt:existing?.createdAt||now,lastUsedAt:now,updatedAt:now
  };
  await put(STORES.places,record);
  return record;
}

export async function markPlaceUsed(place,type="visit"){
  const counts={...(place.operationCounts||{})};
  counts[type]=Number(counts[type]||0)+1;
  const updated={...place,visitCount:Number(place.visitCount||0)+1,operationCounts:counts,lastUsedAt:Date.now(),updatedAt:Date.now()};
  await put(STORES.places,updated);
  return updated;
}

export async function updatePlace(id,changes){
  const place=await get(STORES.places,id);
  if(!place)throw new Error("Nie znaleziono miejsca.");
  const updated={...place,...changes,id,updatedAt:Date.now()};
  await put(STORES.places,updated);
  return updated;
}

export async function deletePlace(id){
  const place=await get(STORES.places,id);
  if(!place)return;
  if(place.locked)throw new Error("To miejsce jest zablokowane przed usunięciem.");
  await remove(STORES.places,id);
}
