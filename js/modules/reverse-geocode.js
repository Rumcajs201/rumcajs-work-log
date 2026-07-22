const NOMINATIM_ENDPOINT = "https://nominatim.openstreetmap.org/reverse";
const BIGDATA_ENDPOINT = "https://api.bigdatacloud.net/data/reverse-geocode-client";

function clean(value) {
  return typeof value === "string" ? value.trim() : "";
}

function join(parts, separator = ", ") {
  return parts
    .map(clean)
    .filter(Boolean)
    .filter((value, index, array) => array.indexOf(value) === index)
    .join(separator);
}

function validPosition(position) {
  return position &&
    Number.isFinite(Number(position.latitude)) &&
    Number.isFinite(Number(position.longitude));
}

function cityFromAddress(address = {}) {
  return clean(address.city) ||
    clean(address.town) ||
    clean(address.village) ||
    clean(address.municipality) ||
    clean(address.hamlet) ||
    clean(address.county);
}

async function fetchJson(url, timeoutMs = 10000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      method: "GET",
      cache: "no-store",
      signal: controller.signal,
      headers: { "Accept": "application/json" }
    });
    if (!response.ok) throw new Error(`Reverse geocoding HTTP ${response.status}`);
    return response.json();
  } finally {
    clearTimeout(timeout);
  }
}

async function reverseWithNominatim(position, language) {
  const url = new URL(NOMINATIM_ENDPOINT);
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("lat", String(position.latitude));
  url.searchParams.set("lon", String(position.longitude));
  url.searchParams.set("zoom", "18");
  url.searchParams.set("addressdetails", "1");
  url.searchParams.set("layer", "address");
  url.searchParams.set("accept-language", language);

  const data = await fetchJson(url);
  const address = data.address || {};
  const road = clean(address.road) || clean(address.pedestrian) || clean(address.residential) || clean(address.path);
  const houseNumber = clean(address.house_number);
  const street = join([road, houseNumber], " ");
  const locality = cityFromAddress(address);
  const postcode = clean(address.postcode);
  const country = clean(address.country);
  const localityLine = join([postcode, locality], " ");
  const formattedAddress = join([street, localityLine, country]);

  if (!formattedAddress) throw new Error("Address not available.");

  return {
    formattedAddress,
    street: street || null,
    road: road || null,
    houseNumber: houseNumber || null,
    postcode: postcode || null,
    locality: locality || null,
    country: country || null,
    countryCode: clean(address.country_code).toUpperCase() || null,
    localityLine
  };
}

async function reverseWithBigDataCloud(position, language) {
  const url = new URL(BIGDATA_ENDPOINT);
  url.searchParams.set("latitude", String(position.latitude));
  url.searchParams.set("longitude", String(position.longitude));
  url.searchParams.set("localityLanguage", language);

  const data = await fetchJson(url);
  const locality = clean(data.locality) || clean(data.city) || clean(data.principalSubdivision);
  const postcode = clean(data.postcode);
  const country = clean(data.countryName);
  const road = clean(data.localityInfo?.informative?.find(item =>
    ["road", "street", "route"].includes(String(item.description || "").toLowerCase())
  )?.name);
  const localityLine = join([postcode, locality], " ");
  const formattedAddress = join([road, localityLine, country]);

  if (!formattedAddress) throw new Error("Address not available.");

  return {
    formattedAddress,
    street: road || null,
    road: road || null,
    houseNumber: null,
    postcode: postcode || null,
    locality: locality || null,
    country: country || null,
    countryCode: clean(data.countryCode) || null,
    localityLine
  };
}

export async function reverseGeocode(position, language = "pl") {
  if (!validPosition(position)) throw new Error("Invalid GPS position.");

  try {
    return await reverseWithNominatim(position, language);
  } catch (primaryError) {
    console.warn("Detailed reverse geocoding failed; using fallback.", primaryError);
    return reverseWithBigDataCloud(position, language);
  }
}
