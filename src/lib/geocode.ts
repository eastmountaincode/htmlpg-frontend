export interface GeocodeResult {
  address: string;
  lat: number;
  lng: number;
}

interface NominatimPlace {
  display_name?: string;
  lat?: string;
  lon?: string;
}

export async function geocodeAddress(address: string): Promise<GeocodeResult | null> {
  const query = address.trim();
  if (!query) return null;

  const params = new URLSearchParams({
    q: query,
    format: "jsonv2",
    limit: "1",
  });

  const res = await fetch(`https://nominatim.openstreetmap.org/search?${params}`, {
    headers: {
      "User-Agent": "HTMLPG/1.0 (https://htmlpg.andrew-boylan.com)",
      "Accept-Language": "en",
    },
  });

  if (!res.ok) {
    throw new Error(`Geocoding failed (${res.status})`);
  }

  const places = (await res.json()) as NominatimPlace[];
  const place = places[0];
  if (!place?.lat || !place?.lon) return null;

  const lat = Number(place.lat);
  const lng = Number(place.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

  return {
    address: place.display_name || query,
    lat,
    lng,
  };
}
