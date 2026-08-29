import { getCountryByAbbr } from './countries';

export interface GeocodeResult {
    lat: number;
    lng: number;
}

async function tryGeocode(address: string, apiKey: string, countryAbbr: string): Promise<GeocodeResult | null> {
    try {
        const region = countryAbbr.toLowerCase();
        const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&region=${region}&key=${apiKey}`;
        const res = await fetch(url);
        const data = await res.json();
        if (data.status !== 'OK' || data.results.length === 0) return null;
        const location = data.results[0].geometry.location;
        return { lat: location.lat, lng: location.lng };
    } catch {

        return null;
    }
}


/**
 * Ubica la posición yendo de lo general a lo específico:
 * Nivel 1 → + Nivel 2 → + Nivel 3 → + Dirección.
 * En cada paso, si Google encuentra algo, se guarda como respaldo;
 * si un paso más específico falla, se usa el resultado del paso anterior.
 */
export async function geocodeAddress(
    direccion: string,
    distrito: string,
    provincia: string,
    departamento: string,
    countryAbbr: string = 'PE'
): Promise<GeocodeResult | null> {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '';
    const countryName = getCountryByAbbr(countryAbbr).name;
    let bestResult: GeocodeResult | null = null;

    // 1. Nivel 1 (Departamento/Estado/Provincia/Región según el país)
    if (departamento) {
        const result = await tryGeocode(`${departamento}, ${countryName}`, apiKey, countryAbbr);
        if (result) bestResult = result;
    }

    // 2. Nivel 1 + Nivel 2
    if (provincia && departamento) {
        const result = await tryGeocode(`${provincia}, ${departamento}, ${countryName}`, apiKey, countryAbbr);
        if (result) bestResult = result;
    }

    // 3. Nivel 1 + Nivel 2 + Nivel 3
    if (distrito && provincia && departamento) {
        const result = await tryGeocode(`${distrito}, ${provincia}, ${departamento}, ${countryName}`, apiKey, countryAbbr);
        if (result) bestResult = result;
    }

    // 4. Todo + Dirección exacta
    if (direccion.trim() && distrito) {
        const result = await tryGeocode(
            `${direccion}, ${distrito}, ${provincia}, ${departamento}, ${countryName}`,
            apiKey,
            countryAbbr
        );
        if (result) bestResult = result;
    }

    return bestResult;
}

/**
 * Geocodifica un texto libre de ubicación (sin desglose de departamento/
 * provincia/distrito), usado en formularios simples como Avistamiento.
 */
export async function geocodeFreeText(query: string, countryAbbr: string = 'PE'): Promise<GeocodeResult | null> {
    if (!query.trim()) return null;

    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '';
    const countryName = getCountryByAbbr(countryAbbr).name;
    const region = countryAbbr.toLowerCase();

    try {
        const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(query + ', ' + countryName)}&region=${region}&key=${apiKey}`;
        const res = await fetch(url);
        const data = await res.json();
        if (data.status !== 'OK' || data.results.length === 0) return null;
        const location = data.results[0].geometry.location;
        return { lat: location.lat, lng: location.lng };
    } catch {
        return null;
    }
}

/**
 * Geocodificación inversa: convierte coordenadas en una dirección legible.
 * Se usa cuando el usuario arrastra el pin del mapa manualmente. No necesita
 * país — las coordenadas ya son universales, Google responde según dónde
 * caiga el pin, sin importar el país de la cuenta.
 */
export async function reverseGeocode(lat: number, lng: number): Promise<string | null> {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '';

    try {
        const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${apiKey}`;
        const res = await fetch(url);
        const data = await res.json();
        if (data.status !== 'OK' || data.results.length === 0) return null;
        return data.results[0].formatted_address;
    } catch {
        return null;
    }
}