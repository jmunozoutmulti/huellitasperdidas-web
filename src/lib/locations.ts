const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000';

export interface LocationNode {
    id: number;
    name: string;
    children?: LocationNode[];
}

function mapDistrict(raw: any): LocationNode {
    return { id: raw.id, name: raw.name };
}

function mapProvince(raw: any): LocationNode {
    return {
        id: raw.id,
        name: raw.name,
        children: Array.isArray(raw.districts) ? raw.districts.map(mapDistrict) : undefined,
    };
}

function mapTerritory(raw: any): LocationNode {
    return {
        id: raw.id,
        name: raw.department,
        children: Array.isArray(raw.provinces) ? raw.provinces.map(mapProvince) : undefined,
    };
}

// Caché por país — cada país se pide una sola vez, se navega en memoria
// después de eso (departamento → provincias → distritos ya vienen anidados
// en la misma respuesta).
const cache = new Map<string, LocationNode[]>();
const pendingFetches = new Map<string, Promise<LocationNode[]>>();

export async function getTerritoryTree(countryCode: string): Promise<LocationNode[]> {
    if (cache.has(countryCode)) return cache.get(countryCode)!;
    if (pendingFetches.has(countryCode)) return pendingFetches.get(countryCode)!;

    const promise = fetch(`${API_BASE}/v1/territories?country_code=${countryCode}`)
        .then((res) => {
            if (!res.ok) throw new Error(`API error: ${res.status}`);
            return res.json();
        })
        .then((data: any[]) => {
            const tree = data.map(mapTerritory);
            cache.set(countryCode, tree);
            return tree;
        })
        .finally(() => {
            pendingFetches.delete(countryCode);
        });

    pendingFetches.set(countryCode, promise);
    return promise;
}

export async function getLevel1Options(countryCode: string): Promise<{ value: string; label: string }[]> {
    const tree = await getTerritoryTree(countryCode);
    return tree.map((n) => ({ value: n.name, label: n.name }));
}

export async function getLevel2Options(countryCode: string, level1: string): Promise<{ value: string; label: string }[]> {
    if (!level1) return [];
    const tree = await getTerritoryTree(countryCode);
    const node = tree.find((n) => n.name === level1);
    return (node?.children ?? []).map((n) => ({ value: n.name, label: n.name }));
}

export async function getLevel3Options(
    countryCode: string,
    level1: string,
    level2: string
): Promise<{ value: string; label: string }[]> {
    if (!level1 || !level2) return [];
    const tree = await getTerritoryTree(countryCode);
    const l1 = tree.find((n) => n.name === level1);
    const l2 = l1?.children?.find((n) => n.name === level2);
    return (l2?.children ?? []).map((n) => ({ value: n.name, label: n.name }));
}