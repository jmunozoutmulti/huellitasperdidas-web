const STORAGE_KEY = 'viewedReports';

function getViewedIds(): string[] {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    try {
        return JSON.parse(raw) as string[];
    } catch {
        return [];
    }
}

export function hasViewedReport(id: string): boolean {
    return getViewedIds().includes(id);
}

export function markReportViewed(id: string) {
    const ids = getViewedIds();
    if (!ids.includes(id)) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify([...ids, id]));
    }
}