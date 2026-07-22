const ENDPOINT = "https://api.bigdatacloud.net/data/reverse-geocode-client";

function clean(value) {
  return typeof value === "string" ? value.trim() : "";
}

function join(parts, separator = ", ") {
  return parts.map(clean).filter(Boolean).filter((value, index, array) => array.indexOf(value) === index).join(separator);
}

export async function reverseGeocode(position, language = "pl") {
  if (!position || !Number.isFinite(Number(position.latitude)) || !Number.isFinite(Number(position.longitude))) {
    throw new Error("Invalid GPS position.");
  }

  const url = new URL(ENDPOINT);
  url.searchParams.set("latitude", String(position.latitude));
  url.searchParams.set("longitude", String(position.longitude));
  url.searchParams.set("localityLanguage", language);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);

  try {
    const response = await fetch(url, {
      method: "GET",
      cache: "no-store",
      signal: controller.signal,
      headers: { "Accept": "application/json" }
    });
    if (!response.ok) throw new Error(`Reverse geocoding HTTP ${response.status}`);

    const data = await response.json();
    const locality = clean(data.locality) || clean(data.city) || clean(data.principalSubdivision);
    const postcode = clean(data.postcode);
    const country = clean(data.countryName);
    const road = clean(data.localityInfo?.administrative?.find(item => item.adminLevel === 10)?.name);
    const addressLine = clean(data.localityInfo?.informative?.find(item => item.description === "road")?.name);
    const street = addressLine || road;
    const localityLine = join([postcode, locality], " ");
    const formattedAddress = join([street, localityLine, country]);

    if (!formattedAddress) throw new Error("Address not available.");

    return {
      formattedAddress,
      street: street || null,
      postcode: postcode || null,
      locality: locality || null,
      country: country || null,
      countryCode: clean(data.countryCode) || null,
      localityLine
    };
  } finally {
    clearTimeout(timeout);
  }
}
