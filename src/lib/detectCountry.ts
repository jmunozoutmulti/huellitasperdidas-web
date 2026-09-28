// GeoLite2 de MaxMind
const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000';

export async function detectCountry(): Promise<string | null> {
    try {
        const res = await fetch(`${API_BASE}/v1/geo`);
        if (!res.ok) return null;
        const data = await res.json();
        return data.country || null;
    } catch {
        return null;
    }
}