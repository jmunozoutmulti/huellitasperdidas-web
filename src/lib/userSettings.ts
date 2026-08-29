// Configuración de notificaciones del usuario (mock en localStorage).
// Cuando exista GET/PUT /v1/users/me/settings, esta capa se reemplaza
// por llamadas reales al API, sin tocar AjustesSection.tsx ni page.tsx.

export interface UserSettings {
    notification_mode: 'email' | 'whatsapp';
    notification_types: {
        lost: boolean;
        found: boolean;
        sighting: boolean;
        adoption: boolean;
    };
}

export const DEFAULT_USER_SETTINGS: UserSettings = {
    notification_mode: 'email',
    notification_types: {
        lost: true,
        found: true,
        sighting: false,
        adoption: false,
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