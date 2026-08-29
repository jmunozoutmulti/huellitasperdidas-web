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
    country?: string; // 'PE', 'MX', etc. — código de countries.ts. Simulado por ahora (sin servicio real de detección aún); default 'PE' al crear la cuenta.
}

const STORAGE_KEY = 'authUser';
const TOKEN_KEY = 'accessToken';

export function saveAuthUser(user: AuthUser) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
}

export function getAuthUser(): AuthUser | null {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    try {
        return JSON.parse(raw) as AuthUser;
    } catch {
        return null;
    }
}

export function clearAuthUser() {
    localStorage.removeItem(STORAGE_KEY);
}

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