import { authFetch, authFetchJson, ApiError } from './authFetch';

export interface CreateReportPayload {
    report_type: string;
    package_slug?: string | null;
    pet_type?: string | null;
    title?: string | null;
    description?: string | null;
    country?: string | null;
    region?: string | null;
    province?: string | null;
    district?: string | null;
    address_hint?: string | null;
    lat?: number | null;
    lng?: number | null;
    event_date?: string | null;
    contact_name?: string | null;
    contact_phone?: string | null;
    contact_email?: string | null;
    contact_url?: string | null;
    has_video?: boolean;
    meta?: {
        sex?: string | null;
        is_neutered?: boolean | null;
        size?: string | null;
        breed?: string | null;
        color?: string | null;
        last_seen_location?: string | null;
        reward?: string | null;
        reward_visible?: boolean;
        age?: string | null;
        adoption_extras?: string | null;
        adoption_extras_visible?: boolean;
    };
}

export class ReportsApiError extends Error {
    status: number;
    constructor(status: number, message: string) {
        super(message);
        this.status = status;
    }
}

// Crea el aviso SIN fotos — el backend calcula precio/moneda/vencimiento
// solo con el package_slug, nunca confiar en el frontend para eso.
export async function createReport(payload: CreateReportPayload): Promise<any> {
    try {
        return await authFetchJson('/v1/reports', {
            method: 'POST',
            body: JSON.stringify(payload),
        });
    } catch (err) {
        if (err instanceof ApiError) throw new ReportsApiError(err.status, err.message);
        throw err;
    }
}

// Convierte un data URL (base64, lo que ya generan FileReader/canvas en
// el wizard) a un Blob real, para poder mandarlo como multipart/form-data.
export function dataUrlToBlob(dataUrl: string): Blob {
    const [header, base64] = dataUrl.split(',');
    const mimeMatch = header.match(/data:(.*?);base64/);
    const mime = mimeMatch ? mimeMatch[1] : 'image/jpeg';
    const binary = atob(base64);
    const array = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) array[i] = binary.charCodeAt(i);
    return new Blob([array], { type: mime });
}

// Sube una imagen a un aviso ya creado. La primera que se suba (sin
// isFlyer) se vuelve la portada automáticamente — el backend decide eso,
// no el frontend. isFlyer=true nunca compite por ser portada.
export async function uploadReportImage(
    reportId: string,
    imageDataUrl: string,
    isFlyer: boolean = false
): Promise<any> {
    const blob = dataUrlToBlob(imageDataUrl);
    const form = new FormData();
    const ext = blob.type.split('/')[1] || 'jpg';
    form.append('file', blob, `photo.${ext}`);

    const qs = isFlyer ? '?is_flyer=true' : '';
    const res = await authFetch(`/v1/reports/${reportId}/images${qs}`, {
        method: 'POST',
        body: form,
    });
    if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new ReportsApiError(res.status, data.detail || 'No pudimos subir la imagen.');
    }
    return res.json().catch(() => ({}));
}

// Igual que CreateReportPayload, pero sin los campos de ubicación — el
// backend ya confirmó que la ubicación es inmutable tras publicar. No
// incluir estos campos evita depender de que el backend los rechace.
export type UpdateReportPayload = Partial<Omit<CreateReportPayload, 'region' | 'province' | 'district' | 'address_hint'>>;

// Edición parcial — solo manda los campos que cambiaron. Si el aviso está
// 'active', el backend lo regresa automáticamente a 'pending_approval'.
export async function updateReport(reportId: string, payload: UpdateReportPayload): Promise<any> {
    try {
        return await authFetchJson(`/v1/reports/${reportId}`, {
            method: 'PUT',
            body: JSON.stringify(payload),
        });
    } catch (err) {
        if (err instanceof ApiError) throw new ReportsApiError(err.status, err.message);
        throw err;
    }
}

// Finaliza un aviso directo, sin pasar por revisión del admin.
// stopped_by_user queda en true del lado del backend automáticamente.
export async function stopReport(reportId: string): Promise<any> {
    try {
        return await authFetchJson(`/v1/reports/${reportId}/stop`, { method: 'POST' });
    } catch (err) {
        if (err instanceof ApiError) throw new ReportsApiError(err.status, err.message);
        throw err;
    }
}

// Solo funciona si el aviso ya venció. El backend calcula precio/moneda/
// nueva fecha de vencimiento. El aviso vuelve a pending_approval.
export async function reactivateReport(reportId: string, packageSlug: string): Promise<any> {
    try {
        return await authFetchJson(`/v1/reports/${reportId}/reactivate`, {
            method: 'POST',
            body: JSON.stringify({ package_slug: packageSlug }),
        });
    } catch (err) {
        if (err instanceof ApiError) throw new ReportsApiError(err.status, err.message);
        throw err;
    }
}

// Requiere un plan activo en el aviso. El aviso vuelve a pending_approval.
export async function purchaseExtraReach(reportId: string, radiusKm: number): Promise<any> {
    try {
        return await authFetchJson(`/v1/reports/${reportId}/extra-reach`, {
            method: 'POST',
            body: JSON.stringify({ radius_km: radiusKm }),
        });
    } catch (err) {
        if (err instanceof ApiError) throw new ReportsApiError(err.status, err.message);
        throw err;
    }
}

// Sube un aviso Gratis a un plan de pago. El backend calcula amount_paid/
// currency/expires_at solo — nunca los mandamos nosotros. Funciona sin
// importar el estado actual del aviso (activo, finalizado, en revisión).
export async function upgradeReport(reportId: string, packageSlug: string): Promise<any> {
    try {
        return await authFetchJson(`/v1/reports/${reportId}/upgrade`, {
            method: 'POST',
            body: JSON.stringify({ package_slug: packageSlug }),
        });
    } catch (err) {
        if (err instanceof ApiError) throw new ReportsApiError(err.status, err.message);
        throw err;
    }
}

// Suma días a expires_at (no lo reemplaza). El aviso vuelve a pending_approval.
export async function extendReportTime(reportId: string, extraDays: number): Promise<any> {
    try {
        return await authFetchJson(`/v1/reports/${reportId}/extend`, {
            method: 'POST',
            body: JSON.stringify({ extra_days: extraDays }),
        });
    } catch (err) {
        if (err instanceof ApiError) throw new ReportsApiError(err.status, err.message);
        throw err;
    }
}

export async function deleteReport(reportId: string): Promise<void> {
    const res = await authFetch(`/v1/reports/${reportId}`, { method: 'DELETE' });
    if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new ReportsApiError(res.status, data.detail || 'No pudimos eliminar el aviso.');
    }
}

export async function deleteReportImage(reportId: string, imageId: string): Promise<void> {
    const res = await authFetch(`/v1/reports/${reportId}/images/${imageId}`, { method: 'DELETE' });
    if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new ReportsApiError(res.status, data.detail || 'No pudimos eliminar la imagen.');
    }
}