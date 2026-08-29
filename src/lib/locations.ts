export interface LocationNode {
    name: string;
    children?: LocationNode[]; // undefined = nivel 3 (hoja, sin hijos)
}

export const LOCATIONS_BY_COUNTRY: Record<string, LocationNode[]> = {
    PE: [
        {
            name: 'Lima',
            children: [
                {
                    name: 'Lima',
                    children: [
                        { name: 'Miraflores' },
                        { name: 'San Isidro' },
                        { name: 'La Molina' },
                        { name: 'Santiago de Surco' },
                    ],
                },
                {
                    name: 'Huaral',
                    children: [{ name: 'Huaral' }],
                },
            ],
        },
    ],
    AR: [
        {
            name: 'Buenos Aires',
            children: [
                {
                    name: 'La Matanza',
                    children: [{ name: 'San Justo' }, { name: 'Ramos Mejía' }],
                },
            ],
        },
    ],
    CL: [
        {
            name: 'Metropolitana de Santiago',
            children: [
                {
                    name: 'Santiago',
                    children: [{ name: 'Providencia' }, { name: 'Las Condes' }],
                },
            ],
        },
    ],
    CO: [
        {
            name: 'Cundinamarca',
            children: [
                {
                    name: 'Bogotá D.C.',
                    children: [{ name: 'Chapinero' }, { name: 'Usaquén' }],
                },
            ],
        },
    ],
    MX: [
        {
            name: 'Ciudad de México',
            children: [
                {
                    name: 'Cuauhtémoc',
                    children: [{ name: 'Roma Norte' }, { name: 'Condesa' }],
                },
            ],
        },
    ],
    UY: [
        {
            name: 'Montevideo',
            children: [
                {
                    name: 'Municipio B',
                    children: [{ name: 'Cordón' }, { name: 'Centro' }],
                },
            ],
        },
    ],
    EC: [
        {
            name: 'Pichincha',
            children: [
                {
                    name: 'Quito',
                    children: [{ name: 'La Mariscal' }, { name: 'La Floresta' }],
                },
            ],
        },
    ],
};

function getTree(country: string): LocationNode[] {
    return LOCATIONS_BY_COUNTRY[country] ?? LOCATIONS_BY_COUNTRY['PE'];
}

export function getLevel1Options(country: string): { value: string; label: string }[] {
    return getTree(country).map((n) => ({ value: n.name, label: n.name }));
}

export function getLevel2Options(country: string, level1: string): { value: string; label: string }[] {
    const node = getTree(country).find((n) => n.name === level1);
    return (node?.children ?? []).map((n) => ({ value: n.name, label: n.name }));
}

export function getLevel3Options(country: string, level1: string, level2: string): { value: string; label: string }[] {
    const l1 = getTree(country).find((n) => n.name === level1);
    const l2 = l1?.children?.find((n) => n.name === level2);
    return (l2?.children ?? []).map((n) => ({ value: n.name, label: n.name }));
}