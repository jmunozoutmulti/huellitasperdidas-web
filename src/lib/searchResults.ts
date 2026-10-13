import { PetData, allPets } from './pets';

export interface SearchResult {
    pet: PetData;
    matchPercent: number;
}

// Mock: cuando exista la API real, esto se reemplaza por
// la respuesta del endpoint de búsqueda (que ya debería traer
// el pet + su matchPercent calculado por el backend).
export function getMockSearchResults(): SearchResult[] {
    const matchById: Record<string, number> = {
        'benji-14': 94,
        'perrito-asustado-7': 81,
        'gata-carey-collar-morado-2': 81,
        'ext-facebook-1': 87,
        'ext-instagram-1': 87,
        'ext-tiktok-1': 74,
        'max-adopcion-1': 91,
        'ext-google-1': 79,
    };

    return Object.entries(matchById)
        .map(([id, matchPercent]) => {
            const pet = allPets.find((p) => p.id === id);
            return pet ? { pet, matchPercent } : null;
        })
        .filter((r): r is SearchResult => r !== null);
}