import { authFetch, authFetchJson } from './authFetch';
import type { AnalyzeImageResult } from './api';

export interface CentinelaWatch {
    id: string;
    query_text: string | null;
    district: string | null;
    image_features: AnalyzeImageResult | null;
    image_url: string | null;
    report_type: string | null;
    pet_type: string | null;
    report_id: string | null;
    activo: boolean;
    last_checked_at: string | null;
    created_at: string;
    updated_at: string;
}

export interface CentinelaMatch {
    id: string;
    report_id: string;
    score: number | null;
    visto: boolean;
    created_at: string;
}

export interface CreateCentinelaPayload {
    query_text?: string | null;
    district?: string | null;
    image_features?: AnalyzeImageResult | null;
    image_base64?: string | null;
    report_type?: string | null;
    pet_type?: string | null;
    report_id?: string | null;
}

// Crea o reemplaza el único Centinela del usuario con los criterios actuales.
// Es un reemplazo total: si no se manda image_base64, una foto guardada
// antes se borra (así lo confirmó backend).
export async function createOrReplaceCentinela(payload: CreateCentinelaPayload): Promise<CentinelaWatch> {
    return authFetchJson<CentinelaWatch>('/v1/users/me/centinela', {
        method: 'POST',
        body: JSON.stringify(payload),
    });
}

// Apaga el Centinela sin borrar los criterios guardados.
export async function turnOffCentinela(): Promise<void> {
    await authFetch('/v1/users/me/centinela', { method: 'DELETE' });
}

// Estado actual del Centinela del usuario, o null si nunca creó uno.
export async function getMyCentinela(): Promise<CentinelaWatch | null> {
    return authFetchJson<CentinelaWatch | null>('/v1/users/me/centinela', { method: 'GET' });
}

// Hallazgos pendientes (o todos, si se omite `visto`).
export async function getCentinelaMatches(visto?: boolean): Promise<CentinelaMatch[]> {
    const qs = visto === undefined ? '' : `?visto=${visto}`;
    return authFetchJson<CentinelaMatch[]>(`/v1/users/me/centinela/matches${qs}`, { method: 'GET' });
}

// Marca un hallazgo como visto (al mostrarlo o descartarlo).
export async function markCentinelaMatchVisto(id: string): Promise<CentinelaMatch> {
    return authFetchJson<CentinelaMatch>(`/v1/users/me/centinela/matches/${id}/visto`, { method: 'POST' });
}