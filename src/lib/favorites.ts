// Favoritos del usuario (mock en localStorage). Solo guarda los IDs de
// las publicaciones — los datos completos siempre se traen frescos desde
// el backend real (fetchReport en lib/api.ts), nunca se duplican acá.
// No existe endpoint de favoritos todavía; cuando exista, esta es la
// única capa que cambia (GuardadosSection y PetDetailView no se tocan).

function storageKey(userId: string): string {
    return `favorites_${userId}`;
}

export async function getFavoriteIds(userId: string): Promise<string[]> {
    const raw = localStorage.getItem(storageKey(userId));
    if (!raw) return [];
    try {
        return JSON.parse(raw) as string[];
    } catch {
        return [];
    }
}

export async function addFavorite(userId: string, reportId: string): Promise<void> {
    const ids = await getFavoriteIds(userId);
    if (!ids.includes(reportId)) {
        localStorage.setItem(storageKey(userId), JSON.stringify([...ids, reportId]));
    }
}

export async function removeFavorite(userId: string, reportId: string): Promise<void> {
    const ids = await getFavoriteIds(userId);
    localStorage.setItem(storageKey(userId), JSON.stringify(ids.filter((id) => id !== reportId)));
}