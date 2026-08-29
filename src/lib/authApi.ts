import { authFetch, authFetchJson, ApiError } from './authFetch';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000';

export interface AuthApiUser {
    id: string;
    email: string;
    name: string;
    last_name_paterno: string | null;
    last_name_materno: string | null;
    phone: string;
    is_email_verified: boolean;
    country: string | null;
    region: string | null;
    province: string | null;
    district: string | null;
    avatar: string | null;
}

export interface LoginResponse {
    access_token: string;
    token_type: string;
    user: AuthApiUser;
}

export class AuthApiError extends Error {
    status: number;
    constructor(status: number, message: string) {
        super(message);
        this.status = status;
    }
}

export async function registerUser(email: string, password: string, name: string): Promise<{ message: string }> {
    const res = await fetch(`${API_BASE}/v1/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            email,
            password,
            name,
            // El backend no soporta apellidos/teléfono opcionales en el registro
            // desde el frontend todavía por decisión de producto — se completan
            // después, desde Mi Cuenta. Confirmado que el endpoint acepta '' vacío.
            last_name_paterno: '',
            last_name_materno: '',
            phone: '',
        }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
        throw new AuthApiError(res.status, data.detail || 'No pudimos crear tu cuenta.');
    }
    return data;
}

export async function loginUser(email: string, password: string): Promise<LoginResponse> {
    const res = await fetch(`${API_BASE}/v1/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
        // El backend distingue "correo no verificado" con este mensaje exacto —
        // el caller (AuthModal) lo puede detectar leyendo err.message.
        throw new AuthApiError(res.status, data.detail || 'No pudimos iniciar sesión.');
    }
    return data;
}

// Devuelve siempre el mismo mensaje genérico, exista o no la cuenta, esté o
// no verificada — es a propósito (evita que alguien use este endpoint para
// adivinar qué correos están registrados). El frontend no debe intentar
// distinguir casos que el backend no distingue.
export async function resendVerification(email: string): Promise<{ message: string }> {
    const res = await fetch(`${API_BASE}/v1/auth/resend-verification`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
        throw new AuthApiError(res.status, data.detail || 'No pudimos procesar la solicitud.');
    }
    return data;
}

// Valida el token guardado y trae los datos actuales del usuario — se usa
// para restaurar sesión al recargar la página, ya que no podemos volver a
// hacer login sin la contraseña (nunca se guarda). Usa authFetch, que ya
// agrega el token guardado automáticamente.
export async function getMe(): Promise<AuthApiUser> {
    try {
        return await authFetchJson<AuthApiUser>('/v1/auth/me', { method: 'GET' });
    } catch (err) {
        if (err instanceof ApiError) throw new AuthApiError(err.status, err.message);
        throw err;
    }
}

// Confirmado: el backend soporta estos 9 campos (más password/current_password
// para cambio de clave, que no se maneja acá — ver ModalCambiarClave si se
// retoma).
export interface UpdateMePayload {
    name?: string;
    last_name_paterno?: string;
    last_name_materno?: string;
    phone?: string;
    country?: string;
    region?: string;
    province?: string;
    district?: string;
    avatar?: string;
    password?: string;
    current_password?: string;
}

export async function updateMe(payload: UpdateMePayload): Promise<AuthApiUser> {
    // Si el payload incluye current_password, es un cambio de clave — ahí un
    // 401 probablemente significa "esa no es tu contraseña actual", no que
    // el token esté vencido. No debe disparar un cierre de sesión global
    // (mismo criterio que deleteMe).
    const isPasswordChange = !!payload.current_password;
    try {
        return await authFetchJson<AuthApiUser>(
            '/v1/auth/me',
            {
                method: 'PUT',
                body: JSON.stringify(payload),
            },
            { skipAuthErrorHandling: isPasswordChange }
        );
    } catch (err) {
        if (err instanceof ApiError) throw new AuthApiError(err.status, err.message);
        throw err;
    }
}

// Borrado suave e inmediato (confirmado: deleted_at se pone al instante,
// no hay periodo de gracia con cuenta regresiva). Requiere la contraseña
// actual como confirmación de identidad — sin eso, el backend rechaza
// la solicitud con 422.
export async function deleteMe(password: string): Promise<void> {
    const res = await authFetch(
        '/v1/auth/me',
        {
            method: 'DELETE',
            body: JSON.stringify({ password }),
        },
        { skipAuthErrorHandling: true }
    );
    if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new AuthApiError(res.status, data.detail || 'No pudimos eliminar tu cuenta.');
    }
}