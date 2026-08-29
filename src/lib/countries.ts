// Tabla maestra de países soportados. Reemplaza a lib/phoneCountries.ts
// (que queda eliminado) — cualquier dato que dependa del país (teléfono,
// precios, ubicación) sale de acá, para no duplicar la lista en varios
// archivos.
//
//    (Perú, Argentina, Chile, Colombia, México, Ecuador)
//    confirmados; Uruguay usa "Localidad" como 3er nivel informal, ya
//    que oficialmente el país solo tiene 2 niveles de gobierno reales
//    — Departamento y Municipio — y los municipios ni cubren todo el
//    territorio).

export interface Country {
    abbr: string; // 'PE'
    name: string; // 'Perú'
    dialCode: string; // '+51'
    phoneDigits: number; // dígitos del número, sin el código de país
    currency: {
        code: string; // 'PEN'
        symbol: string; // 'S/.'
    };
    locationLabels: [string, string, string]; // [nivel1, nivel2, nivel3] — siempre 3
}

export const COUNTRIES: Country[] = [
    {
        abbr: 'PE',
        name: 'Perú',
        dialCode: '+51',
        phoneDigits: 9,
        currency: { code: 'PEN', symbol: 'S/.' },
        locationLabels: ['Departamento', 'Provincia', 'Distrito'],
    },
    {
        abbr: 'AR',
        name: 'Argentina',
        dialCode: '+54',
        phoneDigits: 10,
        currency: { code: 'ARS', symbol: '$' },
        locationLabels: ['Provincia', 'Partido', 'Localidad'],
    },
    {
        abbr: 'CL',
        name: 'Chile',
        dialCode: '+56',
        phoneDigits: 9,
        currency: { code: 'CLP', symbol: '$' },
        locationLabels: ['Región', 'Provincia', 'Comuna'],
    },
    {
        abbr: 'CO',
        name: 'Colombia',
        dialCode: '+57',
        phoneDigits: 10,
        currency: { code: 'COP', symbol: '$' },
        locationLabels: ['Departamento', 'Municipio', 'Corregimiento'],
    },
    {
        abbr: 'MX',
        name: 'México',
        dialCode: '+52',
        phoneDigits: 10,
        currency: { code: 'MXN', symbol: '$' },
        locationLabels: ['Estado', 'Municipio', 'Localidad'],
    },
    {
        abbr: 'UY',
        name: 'Uruguay',
        dialCode: '+598',
        phoneDigits: 8,
        currency: { code: 'UYU', symbol: '$' },
        locationLabels: ['Departamento', 'Municipio', 'Localidad'],
    },
    {
        abbr: 'EC',
        name: 'Ecuador',
        dialCode: '+593',
        phoneDigits: 9,
        currency: { code: 'USD', symbol: '$' },
        locationLabels: ['Provincia', 'Cantón', 'Parroquia'],
    },
];

export const DEFAULT_COUNTRY: Country = COUNTRIES.find((c) => c.abbr === 'PE')!;

export function getCountryByAbbr(abbr: string): Country {
    return COUNTRIES.find((c) => c.abbr === abbr) ?? DEFAULT_COUNTRY;
}

export function getCountryByDialCode(dialCode: string): Country | null {
    return COUNTRIES.find((c) => c.dialCode === dialCode) ?? null;
}
