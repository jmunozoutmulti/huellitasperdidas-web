// Precios de planes, por país. Los montos de países distintos a Perú son
// SIMULADOS (convertidos manualmente al tipo de cambio del 26 ago 2026,
// redondeados) — quedan listos para que el admin los reemplace por los
// reales cuando exista ese panel. Perú es el único con precios reales.
//
// Cuando exista GET /v1/plans en el backend, reemplazar getPlans()/getPlanById()
// por un fetch real — la firma (recibe countryAbbr) ya queda lista para eso.

export interface PlanConfig {
    id: string;
    nombre: string;
    dias: number;
    precio: number;
    radioKm: number;
    mapZoom: number;
}

const PLANS_BY_COUNTRY: Record<string, PlanConfig[]> = {
    PE: [
        { id: 'gratis', nombre: 'Gratis', dias: 0, precio: 0, radioKm: 0, mapZoom: 0 },
        { id: 'local', nombre: 'Plan Local', dias: 3, precio: 90, radioKm: 2, mapZoom: 12 },
        { id: 'amplio', nombre: 'Plan Amplio', dias: 6, precio: 180, radioKm: 4, mapZoom: 12 },
        { id: 'urgente', nombre: 'Plan Urgente', dias: 9, precio: 260, radioKm: 6, mapZoom: 12 },
    ],
    AR: [
        { id: 'gratis', nombre: 'Gratis', dias: 0, precio: 0, radioKm: 0, mapZoom: 0 },
        { id: 'local', nombre: 'Plan Local', dias: 3, precio: 41000, radioKm: 2, mapZoom: 12 },
        { id: 'amplio', nombre: 'Plan Amplio', dias: 6, precio: 82000, radioKm: 4, mapZoom: 12 },
        { id: 'urgente', nombre: 'Plan Urgente', dias: 9, precio: 118000, radioKm: 6, mapZoom: 12 },
    ],
    CL: [
        { id: 'gratis', nombre: 'Gratis', dias: 0, precio: 0, radioKm: 0, mapZoom: 0 },
        { id: 'local', nombre: 'Plan Local', dias: 3, precio: 25000, radioKm: 2, mapZoom: 12 },
        { id: 'amplio', nombre: 'Plan Amplio', dias: 6, precio: 50000, radioKm: 4, mapZoom: 12 },
        { id: 'urgente', nombre: 'Plan Urgente', dias: 9, precio: 72000, radioKm: 6, mapZoom: 12 },
    ],
    CO: [
        { id: 'gratis', nombre: 'Gratis', dias: 0, precio: 0, radioKm: 0, mapZoom: 0 },
        { id: 'local', nombre: 'Plan Local', dias: 3, precio: 82000, radioKm: 2, mapZoom: 12 },
        { id: 'amplio', nombre: 'Plan Amplio', dias: 6, precio: 164000, radioKm: 4, mapZoom: 12 },
        { id: 'urgente', nombre: 'Plan Urgente', dias: 9, precio: 236000, radioKm: 6, mapZoom: 12 },
    ],
    MX: [
        { id: 'gratis', nombre: 'Gratis', dias: 0, precio: 0, radioKm: 0, mapZoom: 0 },
        { id: 'local', nombre: 'Plan Local', dias: 3, precio: 455, radioKm: 2, mapZoom: 12 },
        { id: 'amplio', nombre: 'Plan Amplio', dias: 6, precio: 910, radioKm: 4, mapZoom: 12 },
        { id: 'urgente', nombre: 'Plan Urgente', dias: 9, precio: 1315, radioKm: 6, mapZoom: 12 },
    ],
    UY: [
        { id: 'gratis', nombre: 'Gratis', dias: 0, precio: 0, radioKm: 0, mapZoom: 0 },
        { id: 'local', nombre: 'Plan Local', dias: 3, precio: 1080, radioKm: 2, mapZoom: 12 },
        { id: 'amplio', nombre: 'Plan Amplio', dias: 6, precio: 2160, radioKm: 4, mapZoom: 12 },
        { id: 'urgente', nombre: 'Plan Urgente', dias: 9, precio: 3120, radioKm: 6, mapZoom: 12 },
    ],
    EC: [
        { id: 'gratis', nombre: 'Gratis', dias: 0, precio: 0, radioKm: 0, mapZoom: 0 },
        { id: 'local', nombre: 'Plan Local', dias: 3, precio: 27, radioKm: 2, mapZoom: 12 },
        { id: 'amplio', nombre: 'Plan Amplio', dias: 6, precio: 54, radioKm: 4, mapZoom: 12 },
        { id: 'urgente', nombre: 'Plan Urgente', dias: 9, precio: 78, radioKm: 6, mapZoom: 12 },
    ],
};

export function getPlans(countryAbbr: string = 'PE'): PlanConfig[] {
    return PLANS_BY_COUNTRY[countryAbbr] ?? PLANS_BY_COUNTRY['PE'];
}

export function getPlanById(id: string, countryAbbr: string = 'PE'): PlanConfig {
    const plans = getPlans(countryAbbr);
    return plans.find((p) => p.id === id) ?? plans[0];
}