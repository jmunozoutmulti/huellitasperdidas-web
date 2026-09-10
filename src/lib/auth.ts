export interface AuthUser {
    id: string;
    email: string;
    name: string;
    last_name_paterno?: string;
    last_name_materno?: string;
    phone?: string;
    region?: string; // departamento
    province?: string;
    district?: string;
    avatar?: string; // foto de perfil en base64 (mock, sin subir a servidor real)
    country?: string; // 'PE', 'MX', etc. — código de countries.ts
}

const TOKEN_KEY = 'accessToken';
const DETECTED_COUNTRY_KEY = 'detectedCountry';

// El backend real usa JWT Bearer — no hay cookies de sesión. Este token se
// guarda aparte del resto de los datos del usuario, y debe mandarse en el
// header Authorization de cualquier llamada autenticada futura.
export function saveAccessToken(token: string) {
    localStorage.setItem(TOKEN_KEY, token);
}

export function getAccessToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
}

export function clearAccessToken() {
    localStorage.removeItem(TOKEN_KEY);
}

// País detectado ANTES de que exista una cuenta — es el único dato que se
// captura sin login (vía el servicio de detección, aún pendiente de elegir).
// Vive separado del usuario a propósito: tiene que existir incluso para
// visitantes sin sesión, para poder filtrar Explorar por país.
export function saveDetectedCountry(country: string) {
    localStorage.setItem(DETECTED_COUNTRY_KEY, country);
}

export function getDetectedCountry(): string | null {
    if (typeof window === 'undefined') return null; // se ejecuta también en el servidor (SSR) — ahí no existe localStorage
    return localStorage.getItem(DETECTED_COUNTRY_KEY);
}