import { getAccessToken, clearAuthUser, clearAccessToken } from './auth';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000';

export class ApiError extends Error {
    status: number;
    constructor(status: number, message: string) {
        super(message);
        this.status = status;
    }
}

// Wrapper de fetch que agrega el header Authorization automáticamente,
// leyendo el token guardado — para no repetir esa lógica en cada archivo
// que necesite hablar con el backend real.
//
// skipAuthErrorHandling: algunos endpoints usan 401 para algo que NO es
// "tu sesión ya no sirve" — por ejemplo, DELETE /v1/auth/me devuelve 401
// cuando la CONTRASEÑA que mandaste está mal, no porque el token esté
// vencido. Pasa true ahí para que no dispare un cierre de sesión global
// por error.
export async function authFetch(
    path: string,
    options: RequestInit = {},
    config: { skipAuthErrorHandling?: boolean } = {}
): Promise<Response> {
    const token = getAccessToken();
    const headers = new Headers(options.headers);
    if (!headers.has('Content-Type') && options.body) {
        headers.set('Content-Type', 'application/json');
    }
    if (token) {
        headers.set('Authorization', `Bearer ${token}`);
    }

    const res = await fetch(`${API_BASE}${path}`, { ...options, headers });

    if (res.status === 401 && !config.skipAuthErrorHandling) {
        // Token inválido o vencido — limpiamos la sesión guardada, y avisamos
        // a React (vía este evento) para que actualice el estado al instante.
        // Sin esto, la UI seguía "creyendo" que había sesión hasta el próximo
        // recargue, y cualquier llamada siguiente fallaba con "Token requerido"
        // sin que el usuario entendiera por qué.
        clearAuthUser();
        clearAccessToken();
        if (typeof window !== 'undefined') {
            window.dispatchEvent(new Event('auth:unauthorized'));
        }
    }

    return res;
}

// Variante que ya parsea el JSON y lanza ApiError si la respuesta no fue ok —
// para no repetir ese try/catch en cada función que use authFetch.
export async function authFetchJson<T>(
    path: string,
    options: RequestInit = {},
    config: { skipAuthErrorHandling?: boolean } = {}
): Promise<T> {
    const res = await authFetch(path, options, config);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
        throw new ApiError(res.status, data.detail || 'Ocurrió un error con la solicitud.');
    }
    return data as T;
}