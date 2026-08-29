// Historial de búsquedas recientes en Explorar. Vive en localStorage
// (como 'theme'), no en una cuenta — es una preferencia de este
// navegador/dispositivo, no requiere que el usuario haya iniciado sesión.

const STORAGE_KEY = 'recentSearches';
const MAX_ITEMS = 10;

export function getRecentSearches(): string[] {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    try {
        return JSON.parse(raw) as string[];
    } catch {
        return [];
    }
}

export function addRecentSearch(query: string) {
    const trimmed = query.trim();
    if (!trimmed) return;
    const existing = getRecentSearches().filter((s) => s.toLowerCase() !== trimmed.toLowerCase());
    const updated = [trimmed, ...existing].slice(0, MAX_ITEMS);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
}

export function removeRecentSearch(query: string) {
    const updated = getRecentSearches().filter((s) => s !== query);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
}