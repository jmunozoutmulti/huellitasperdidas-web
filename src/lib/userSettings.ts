// Configuración de notificaciones del usuario (mock en localStorage).
// Cuando exista GET/PUT /v1/users/me/settings, esta capa se reemplaza
// por llamadas reales al API, sin tocar AjustesSection.tsx ni page.tsx.
//
// Solo hay correo (se quitó la opción WhatsApp) — si el usuario desactiva
// los 4 tipos, simplemente no se le manda ningún aviso.

export interface UserSettings {
    notification_types: {
        lost: boolean;
        found: boolean;
        sighting: boolean;
        adoption: boolean;
    };
}

export const DEFAULT_USER_SETTINGS: UserSettings = {
    notification_types: {
        lost: true,
        found: true,
        sighting: true,
        adoption: true,
    },
};

function storageKey(userId: string): string {
    return `userSettings_${userId}`;
}

export async function getUserSettings(userId: string): Promise<UserSettings> {
    const raw = localStorage.getItem(storageKey(userId));
    if (!raw) return DEFAULT_USER_SETTINGS;
    try {
        return JSON.parse(raw) as UserSettings;
    } catch {
        return DEFAULT_USER_SETTINGS;
    }
}

export async function saveUserSettings(userId: string, settings: UserSettings): Promise<void> {
    localStorage.setItem(storageKey(userId), JSON.stringify(settings));
}