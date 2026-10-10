import { authFetch, authFetchJson, ApiError } from './authFetch';
import type { ReportDetail } from './api';
import type { PaymentInfo } from './paymentsApi';

export interface ReportWithPayment {
    report: ReportDetail;
    payment: PaymentInfo;
}

export interface CreateReportResponse {
    report: ReportDetail;
    payment: PaymentInfo | null;
}

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

export async function createReport(payload: CreateReportPayload, idempotencyKey?: string): Promise<CreateReportResponse> {
    try {
        return await authFetchJson(
            '/v1/reports',
            { method: 'POST', body: JSON.stringify(payload) },
            { idempotencyKey }
        );
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
    isFlyer: boolean = false,
    isCover?: boolean
): Promise<any> {
    const blob = dataUrlToBlob(imageDataUrl);
    const form = new FormData();
    const ext = blob.type.split('/')[1] || 'jpg';
    form.append('file', blob, `photo.${ext}`);

    const params = new URLSearchParams();
    if (isFlyer) params.set('is_flyer', 'true');
    if (isCover !== undefined) params.set('is_cover', String(isCover));
    const qs = params.toString() ? `?${params}` : '';
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

export async function reactivateReport(reportId: string, packageSlug: string, idempotencyKey?: string): Promise<ReportWithPayment> {
    try {
        return await authFetchJson(
            `/v1/reports/${reportId}/reactivate`,
            { method: 'POST', body: JSON.stringify({ package_slug: packageSlug }) },
            { idempotencyKey }
        );
    } catch (err) {
        if (err instanceof ApiError) throw new ReportsApiError(err.status, err.message);
        throw err;
    }
}


export async function purchaseExtraReach(reportId: string, radiusKm: number, idempotencyKey?: string): Promise<ReportWithPayment> {
    try {
        return await authFetchJson(
            `/v1/reports/${reportId}/extra-reach`,
            { method: 'POST', body: JSON.stringify({ radius_km: radiusKm }) },
            { idempotencyKey }
        );
    } catch (err) {
        if (err instanceof ApiError) throw new ReportsApiError(err.status, err.message);
        throw err;
    }
}

export async function upgradeReport(reportId: string, packageSlug: string, idempotencyKey?: string): Promise<ReportWithPayment> {
    try {
        return await authFetchJson(
            `/v1/reports/${reportId}/upgrade`,
            { method: 'POST', body: JSON.stringify({ package_slug: packageSlug }) },
            { idempotencyKey }
        );
    } catch (err) {
        if (err instanceof ApiError) throw new ReportsApiError(err.status, err.message);
        throw err;
    }
}

// Reintenta un pago fallido — genera un payment_id/preference_id nuevo
// para el mismo aviso/plan/monto. Un payment_id que ya falló no se puede
// "resucitar": Mercado Pago cachea la respuesta contra el mismo id.
export async function retryPayment(reportId: string, idempotencyKey?: string): Promise<ReportWithPayment> {
    try {
        return await authFetchJson(
            `/v1/reports/${reportId}/retry-payment`,
            { method: 'POST' },
            { idempotencyKey }
        );
    } catch (err) {
        if (err instanceof ApiError) throw new ReportsApiError(err.status, err.message);
        throw err;
    }
}

// Suma días a expires_at (no lo reemplaza). La extensión NO se aplica
// todavía — recién cuando el webhook confirme el pago.
export async function extendReportTime(reportId: string, extraDays: number, idempotencyKey?: string): Promise<ReportWithPayment> {
    try {
        return await authFetchJson(
            `/v1/reports/${reportId}/extend`,
            { method: 'POST', body: JSON.stringify({ extra_days: extraDays }) },
            { idempotencyKey }
        );
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