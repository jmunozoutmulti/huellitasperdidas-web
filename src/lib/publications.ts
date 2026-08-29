// Publicaciones mock (localStorage), con la forma real de ReportCreate del backend.
// Cuando exista un endpoint público de creación, esta capa se reemplaza por
// llamadas reales al API, sin tener que tocar los formularios que la usan.

import { getPlanById } from './plans';

export interface MockPublication {
    id: string;
    user_id: string;
    report_type: string; // lost | found | adoption | sighting
    pet_type: string | null;
    title: string | null;
    description: string | null;
    country: string | null;
    region: string | null; // departamento
    province: string | null; // provincia
    district: string | null; // distrito
    address_hint: string | null;
    event_date: string | null;
    contact_name: string | null;
    contact_phone: string | null;
    contact_email: string | null;
    status: string; // pending_review | approved | rejected | finished
    sex: string | null;
    is_neutered: boolean | null;
    size: string | null;
    breed: string | null;
    color: string | null;
    reward: number | null;
    reward_visible: boolean;
    age: string | null;
    adoption_extras: string | null;
    adoption_extras_visible: boolean;
    reach_facebook: boolean;
    reach_instagram: boolean;
    images: string[]; // fotos en base64 (mock, sin subir a servidor real)
    created_at: string;
    plan: string; // gratis | local | amplio | urgente — no existe en el backend, es propio de tu sistema
    lat: number | null;
    lng: number | null;
    flyer_image: string | null;

    // --- NUEVOS (mock, propios del frontend hasta que el backend los trackee) ---
    rejection_reason: string | null; // solo aplica si status = 'rejected'
    expires_at: string | null; // ISO date, para "Quedan X días" y para pasar a 'finished'
    amount_paid: number | null; // snapshot del monto real pagado; null si plan = 'gratis'. No se deriva del plan porque el precio puede cambiar y esto es lo que el usuario pagó de verdad ese momento.
    stopped_by_user: boolean; // true si el usuario lo detuvo manualmente (status pasa a 'finished' igual, pero cambia el mensaje mostrado)

    statistics: {
        views: number;
        shares: number;
        comments_count: number; // solo el conteo; el contenido de cada comentario vive aparte
    };

    // Analítica de difusión pagada (vendrá de un endpoint de analítica real; por ahora arranca en 0)
    statistics_ads: {
        reach_actual: number; // alcance real (personas alcanzadas)
        reach_projected: number; // alcance proyectado según el plan
        impressions: number; // veces que se mostró el aviso
        clicks: number; // clicks totales
        frequency: number; // veces mostrado por persona, en promedio
    };

    extra_reach: string | null; // tier de alcance extra comprado en ModalAlcance ('5km'|'10km'|'20km'|'50km'), null si no compró ninguno
}

const STORAGE_KEY = 'mockPublications';

function getAllPublications(): MockPublication[] {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    try {
        return JSON.parse(raw) as MockPublication[];
    } catch {
        return [];
    }
}

function saveAllPublications(pubs: MockPublication[]) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(pubs));
}

export async function createPublication(
    data: Omit<
        MockPublication,
        | 'id'
        | 'created_at'
        | 'status'
        | 'statistics'
        | 'rejection_reason'
        | 'expires_at'
        | 'amount_paid'
        | 'stopped_by_user'
        | 'statistics_ads'
        | 'extra_reach'
    >
): Promise<MockPublication> {
    const newPub: MockPublication = {
        ...data,
        id: crypto.randomUUID(),
        status: 'pending_review',
        created_at: new Date().toISOString(),
        statistics: {
            views: 0,
            shares: 0,
            comments_count: 0,
        },
        rejection_reason: null,
        expires_at: null,
        amount_paid: null,
        stopped_by_user: false,
        statistics_ads: {
            reach_actual: 0,
            reach_projected: 0,
            impressions: 0,
            clicks: 0,
            frequency: 0,
        },
        extra_reach: null,
    };

    const all = getAllPublications();
    all.push(newPub);
    saveAllPublications(all);

    return newPub;
}

export async function getMyPublications(userId: string): Promise<MockPublication[]> {
    return getAllPublications().filter((p) => p.user_id === userId);
}

export async function deletePublication(id: string): Promise<void> {
    const all = getAllPublications().filter((p) => p.id !== id);
    saveAllPublications(all);
}

export async function getPublicationById(id: string): Promise<MockPublication | null> {
    return getAllPublications().find((p) => p.id === id) ?? null;
}

export async function updatePublication(
    id: string,
    data: Partial<Omit<MockPublication, 'id' | 'user_id' | 'created_at'>>
): Promise<MockPublication | null> {
    const all = getAllPublications();
    const idx = all.findIndex((p) => p.id === id);
    if (idx === -1) return null;

    all[idx] = {
        ...all[idx],
        ...data,
        // merge profundo — data.statistics/statistics_ads pueden venir parciales,
        // y un spread superficial borraría el resto de campos del sub-objeto
        statistics: { ...all[idx].statistics, ...(data.statistics ?? {}) },
        statistics_ads: { ...all[idx].statistics_ads, ...(data.statistics_ads ?? {}) },
        status: 'pending_review', // toda edición/reactivación vuelve a revisión
        rejection_reason: null, // limpia el motivo de rechazo anterior, si tenía
    };

    saveAllPublications(all);
    return all[idx];
}

// Detiene manualmente un anuncio de pago aprobado. status -> 'finished',
// igual que si hubiera vencido solo, pero stopped_by_user=true cambia
// el mensaje que ve el usuario en la tab Finalizadas.
export async function stopPublication(id: string): Promise<MockPublication | null> {
    const all = getAllPublications();
    const idx = all.findIndex((p) => p.id === id);
    if (idx === -1) return null;

    all[idx] = {
        ...all[idx],
        status: 'finished',
        stopped_by_user: true,
    };

    saveAllPublications(all);
    return all[idx];
}

// Comprar más alcance (radio) sobre un plan de pago ya activo. NO usa
// updatePublication a propósito: esto no debe reenviar el aviso a revisión,
// ya está aprobado y difundiéndose — solo se amplía el radio.
export async function purchaseExtraReach(id: string, tier: string): Promise<MockPublication | null> {
    const all = getAllPublications();
    const idx = all.findIndex((p) => p.id === id);
    if (idx === -1) return null;

    all[idx] = { ...all[idx], extra_reach: tier };
    saveAllPublications(all);
    return all[idx];
}

// Amplía el tiempo de difusión de un plan de pago ya activo, sumando días
// a la fecha de vencimiento actual. NO usa updatePublication a propósito
// (mismo criterio que purchaseExtraReach): esto no debe reenviar el aviso
// a revisión, ya está aprobado y difundiéndose.
export async function extendExpiration(id: string, diasAdicionales: number): Promise<MockPublication | null> {
    const all = getAllPublications();
    const idx = all.findIndex((p) => p.id === id);
    if (idx === -1) return null;

    const base = all[idx].expires_at ? new Date(all[idx].expires_at as string) : new Date();
    base.setDate(base.getDate() + diasAdicionales);

    all[idx] = { ...all[idx], expires_at: base.toISOString() };
    saveAllPublications(all);
    return all[idx];
}

// ==========================================
// ⚠️ SOLO DESARROLLO — BORRAR cuando exista el endpoint real de
// aprobación/rechazo del admin. Sirve para simular que el status
// de un aviso cambió (como lo haría el backend), y así poder probar
// las 4 tabs de Mi Cuenta sin tener el panel de admin todavía.
// ==========================================
export function devSetStatus(
    id: string,
    status: 'pending_review' | 'approved' | 'rejected' | 'finished',
    extra?: { rejection_reason?: string; expires_at?: string; amount_paid?: number }
) {
    const all = getAllPublications();
    const updated = all.map((p) => {
        if (p.id !== id) return p;
        return {
            ...p,
            status,
            rejection_reason: status === 'rejected' ? extra?.rejection_reason ?? p.rejection_reason ?? 'Motivo de prueba (dev)' : p.rejection_reason,
            expires_at: extra?.expires_at ?? p.expires_at,
            amount_paid: extra?.amount_paid ?? p.amount_paid,
        };
    });
    saveAllPublications(updated);
}

// ==========================================
// HELPERS DE TRADUCCIÓN (solo para texto visible al usuario)
// El dato (report_type, plan) se queda en el idioma/slug que espera
// el backend real. Estas funciones NO se usan para armar clases CSS
// ni data-tipo — solo para el texto que lee la persona en pantalla.
// ==========================================

export function reportTypeLabel(reportType: string): string {
    const map: Record<string, string> = {
        lost: 'Perdido',
        found: 'Encontrado',
        adoption: 'Adopción',
        sighting: 'Avistamiento',
    };
    return map[reportType] ?? reportType;
}

export function planLabel(plan: string, country: string = 'PE'): string {
    return getPlanById(plan, country).nombre;
}

// Cualquier plan que no sea gratis recibe el mismo tratamiento visual
// y funcional (badge premium, menú con Estadísticas/Detener, botón
// "Llegar a más personas", "Quedan X días" clickeable → ModalTiempo).
export function isPaidPlan(plan: string): boolean {
    return plan !== 'gratis';
}

// Días restantes hasta expires_at (redondeado hacia arriba). 0 si ya venció o si no tiene fecha.
export function getDiasRestantes(expiresAt: string | null): number {
    if (!expiresAt) return 0;
    const diffMs = new Date(expiresAt).getTime() - Date.now();
    if (diffMs <= 0) return 0;
    return Math.ceil(diffMs / 86400000);
}


// Un aviso de pago está "por vencer" cuando quedan ≤20% de los días totales
// del plan (redondeado hacia arriba). Ej: Plan Local (4 días) → avisa con
// 1 día o menos; Plan Urgente (10 días) → avisa con 2 días o menos.
export function isExpiringSoon(pub: MockPublication): boolean {
    if (!isPaidPlan(pub.plan)) return false;
    const plan = getPlanById(pub.plan, pub.country || 'PE');
    if (plan.dias === 0) return false;
    const umbral = Math.ceil(plan.dias * 0.2);
    return getDiasRestantes(pub.expires_at) <= umbral;
}

// Reembolso al detener un anuncio de pago antes de tiempo:
// 50% del monto pagado, prorrateado por los días que quedan / días totales del plan.
// Ej: pagó 90 en Plan Local (4 días), quedan 2 días → (90 * 0.5 / 4) * 2 = 22.5
export function calculateRefund(pub: MockPublication): number {
    if (!pub.amount_paid || pub.amount_paid <= 0) return 0;
    const plan = getPlanById(pub.plan, pub.country || 'PE');
    if (plan.dias === 0) return 0;

    const diasRestantes = getDiasRestantes(pub.expires_at);
    const montoBase = pub.amount_paid * 0.5;
    const tarifaDiaria = montoBase / plan.dias;

    return Math.round(tarifaDiaria * diasRestantes);
}