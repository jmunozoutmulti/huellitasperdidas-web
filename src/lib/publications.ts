import { getPlanById } from './plans';

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

// Días restantes hasta expires_at (redondeado hacia arriba). 0 si ya venció o si no tiene fecha.
export function getDiasRestantes(expiresAt: string | null): number {
    if (!expiresAt) return 0;
    const diffMs = new Date(expiresAt).getTime() - Date.now();
    if (diffMs <= 0) return 0;
    return Math.ceil(diffMs / 86400000);
}