const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000';

export interface Country {
    id: number;
    code: string; // 'PE'
    name: string; // 'Perú'
    currency: string | null; // 'PEN' — null si el país no está configurado en el admin todavía
    currencySymbol: string | null; // 'S/.'
    dialCode: string | null; // '+51'
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
        locationLabels: raw.location_labels ?? null,
    };
}

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

export function getCountryByAbbrSync(abbr: string | null | undefined): Country | null {
    if (!abbr || !cachedCountries) return null;
    return cachedCountries.find((c) => c.code === abbr) ?? null;
}

const LOCALE_BY_COUNTRY: Record<string, string> = {
    PE: 'es-PE',
    MX: 'es-MX',
    CO: 'es-CO',
    CL: 'es-CL',
    UY: 'es-UY',
    EC: 'es-EC',
};

export function getLocaleForCountry(countryCode: string | null | undefined): string {
    return LOCALE_BY_COUNTRY[countryCode ?? ''] ?? 'es-PE';
}

export async function getCountryByAbbr(abbr: string | null | undefined): Promise<Country | null> {
    if (!abbr) return null;
    const countries = await getCountries();
    return countries.find((c) => c.code === abbr) ?? null;
}