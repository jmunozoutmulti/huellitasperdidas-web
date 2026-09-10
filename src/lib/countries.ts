const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000';

export interface Country {
    id: number;
    code: string; // 'PE'
    name: string; // 'Perú'
    currency: string | null; // 'PEN' — null si el país no está configurado en el admin todavía
    currencySymbol: string | null; // 'S/.'
    dialCode: string | null; // '+51'
    phoneDigits: number | null;
    locationLabels: [string, string, string] | null; // ['Departamento','Provincia','Distrito']
}

function mapCountry(raw: any): Country {
    return {
        id: raw.id,
        code: raw.code,
        name: raw.name,
        currency: raw.currency ?? null,
        currencySymbol: raw.currency_symbol ?? null,
        dialCode: raw.dial_code ?? null,
        phoneDigits: raw.phone_digits ?? null,
        locationLabels: raw.location_labels ?? null,
    };
}

// Caché simple en memoria — se pide una sola vez por carga de la app,
// cualquier componente que lo llame después reutiliza el mismo resultado.
let cachedCountries: Country[] | null = null;
let pendingFetch: Promise<Country[]> | null = null;

export async function getCountries(): Promise<Country[]> {
    if (cachedCountries) return cachedCountries;
    if (pendingFetch) return pendingFetch;

    pendingFetch = fetch(`${API_BASE}/v1/countries?with_territories=true`)
        .then((res) => {
            if (!res.ok) throw new Error(`API error: ${res.status}`);
            return res.json();
        })
        .then((data: any[]) => {
            cachedCountries = data.map(mapCountry);
            return cachedCountries;
        })
        .finally(() => {
            pendingFetch = null;
        });

    return pendingFetch;
}

// Versión síncrona — NO hace ninguna llamada de red, solo lee lo que ya
// está en caché. Úsala en lugares que se ejecutan muchas veces seguidas
// (como dentro de un .map()), donde no tiene sentido esperar una promesa
// por cada elemento. Requiere que getCountries() ya se haya llamado antes
// al menos una vez (el caché ya esté "caliente").
export function getCountryByAbbrSync(abbr: string): Country | null {
    if (!cachedCountries) return null;
    return cachedCountries.find((c) => c.code === abbr) ?? null;
}

export const DEFAULT_COUNTRY_CODE = 'PE';

export async function getCountryByAbbr(abbr: string): Promise<Country | null> {
    const countries = await getCountries();
    return countries.find((c) => c.code === abbr) ?? null;
}

export async function getDefaultCountry(): Promise<Country> {
    const countries = await getCountries();
    return countries.find((c) => c.code === DEFAULT_COUNTRY_CODE) ?? countries[0];
}