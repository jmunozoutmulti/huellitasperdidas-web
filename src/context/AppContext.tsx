'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { showToast } from '@/components/global/Toast';
import { AuthUser, saveAccessToken, getAccessToken, clearAccessToken, saveDetectedCountry, getDetectedCountry } from '@/lib/auth';
import { detectCountry } from '@/lib/detectCountry';
import { loginUser, registerUser, getMe, updateMe, deleteMe, uploadAvatar, deleteAvatar, loginWithGoogleToken, AuthApiError } from '@/lib/authApi';
import { getMyCentinela } from '@/lib/centinelaApi';

interface AppContextType {
    isDarkMode: boolean;
    toggleTheme: (isDark?: boolean) => void;
    detectedCountry: string | null;
    isCountryDetectionDone: boolean;
    isAuthModalOpen: boolean;
    authModalInitialMode: 'login' | 'register' | 'recover' | 'forgot' | 'reset' | 'verify';
    authModalResetToken: string | null;
    openAuthModal: (options?: { mode?: 'login' | 'register' | 'recover' | 'forgot' | 'reset' | 'verify'; token?: string }) => void;
    closeAuthModal: () => void;
    isLoggedIn: boolean;
    currentUser: AuthUser | null;
    login: (email: string, password: string) => Promise<void>;
    register: (email: string, password: string, name: string) => Promise<string>;
    loginWithGoogle: (idToken: string) => Promise<void>;
    logout: () => void;
    usuarioTienePublicacionActiva: boolean;
    centinelaEstaActivo: boolean;
    setCentinelaEstaActivo: (value: boolean) => void;
    isAuthChecked: boolean;
    updateCurrentUser: (patch: Partial<AuthUser>) => void;
    updateProfile: (patch: { name?: string; last_name_paterno?: string; last_name_materno?: string; phone?: string; country?: string; region?: string; province?: string; district?: string; password?: string; current_password?: string }) => Promise<void>;
    updateAvatar: (avatarDataUrl: string | null) => Promise<void>;
    deleteAccount: (password: string) => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
    const [isDarkMode, setIsDarkMode] = useState(false);
    const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
    const [authModalInitialMode, setAuthModalInitialMode] = useState<'login' | 'register' | 'recover' | 'forgot' | 'reset' | 'verify'>('login');
    const [authModalResetToken, setAuthModalResetToken] = useState<string | null>(null);
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
    const [isAuthChecked, setIsAuthChecked] = useState(false);

    const [usuarioTienePublicacionActiva] = useState(false);
    const [centinelaEstaActivo, setCentinelaEstaActivo] = useState(false);

    const [detectedCountry, setDetectedCountry] = useState<string | null>(null);
    const [isCountryDetectionDone, setIsCountryDetectionDone] = useState(false);

    useEffect(() => {
        const savedTheme = localStorage.getItem('theme');
        const isDark = savedTheme === 'dark';
        setIsDarkMode(isDark);
        document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');

        const existing = getDetectedCountry();
        if (existing) {
            setDetectedCountry(existing);
            setIsCountryDetectionDone(true);
        } else {
            detectCountry().then((country) => {
                saveDetectedCountry(country);
                setDetectedCountry(country);
                setIsCountryDetectionDone(true);
            });
        }

        async function restoreSession() {
            const token = getAccessToken();

            if (!token) {
                setIsAuthChecked(true);
                return;
            }

            try {
                const apiUser = await getMe();
                const user: AuthUser = {
                    id: apiUser.id,
                    email: apiUser.email,
                    name: apiUser.name,
                    last_name_paterno: apiUser.last_name_paterno || '',
                    last_name_materno: apiUser.last_name_materno || '',
                    phone: apiUser.phone || '',
                    country: apiUser.country || getDetectedCountry() || null,
                    region: apiUser.region || '',
                    province: apiUser.province || '',
                    district: apiUser.district || '',
                    avatar: apiUser.avatar || '',
                    hasPassword: apiUser.has_password,
                };
                setCurrentUser(user);
                setIsLoggedIn(true);
                backfillDetectedCountry(apiUser.country);
                refreshCentinelaStatus();
            } catch (err) {
                if (err instanceof AuthApiError && err.status === 401) {
                    clearAccessToken();
                }
            } finally {
                setIsAuthChecked(true);
            }
        }

        restoreSession();
    }, []);

    // Si cualquier llamada autenticada (authFetch) detecta que el token ya no sirve, esto reacciona al instante 
    useEffect(() => {
        const handleUnauthorized = () => {
            setCurrentUser(null);
            setIsLoggedIn(false);
            showToast('Tu sesión expiró. Inicia sesión de nuevo.', 'info');
        };
        window.addEventListener('auth:unauthorized', handleUnauthorized);
        return () => window.removeEventListener('auth:unauthorized', handleUnauthorized);
    }, []);

    const toggleTheme = (overrideIsDark?: boolean) => {
        const newDarkState = overrideIsDark !== undefined ? overrideIsDark : !isDarkMode;
        setIsDarkMode(newDarkState);
        document.documentElement.setAttribute('data-theme', newDarkState ? 'dark' : 'light');
        localStorage.setItem('theme', newDarkState ? 'dark' : 'light');
    };

    const openAuthModal = (options?: { mode?: 'login' | 'register' | 'recover' | 'forgot' | 'reset' | 'verify'; token?: string }) => {
        setAuthModalInitialMode(options?.mode || 'login');
        setAuthModalResetToken(options?.token || null);
        setIsAuthModalOpen(true);
    };
    const closeAuthModal = () => {
        setIsAuthModalOpen(false);
        setAuthModalInitialMode('login');
        setAuthModalResetToken(null);
    };

    const login = async (email: string, password: string) => {
        const res = await loginUser(email, password);
        const apiUser = res.user;

        const user: AuthUser = {
            id: apiUser.id,
            email: apiUser.email,
            name: apiUser.name,
            last_name_paterno: apiUser.last_name_paterno || '',
            last_name_materno: apiUser.last_name_materno || '',
            phone: apiUser.phone || '',
            country: apiUser.country || getDetectedCountry() || null,
            region: apiUser.region || '',
            province: apiUser.province || '',
            district: apiUser.district || '',
            avatar: apiUser.avatar || '',
            hasPassword: apiUser.has_password,
        };

        saveAccessToken(res.access_token);
        setCurrentUser(user);
        setIsLoggedIn(true);
        backfillDetectedCountry(apiUser.country);
        refreshCentinelaStatus();
        closeAuthModal();
        showToast('¡Bienvenido de vuelta!', 'success');
    };

    // Registro real. No inicia sesión — el backend exige verificar el correo primero.
    const register = async (email: string, password: string, name: string) => {
        const res = await registerUser(email, password, name, getDetectedCountry());
        return res.message;
    };

    // Login/registro real con Google — el backend decide solo si es cuenta nueva o existente. 
    const loginWithGoogle = async (idToken: string) => {
        const res = await loginWithGoogleToken(idToken, getDetectedCountry());
        const apiUser = res.user;

        const user: AuthUser = {
            id: apiUser.id,
            email: apiUser.email,
            name: apiUser.name,
            last_name_paterno: apiUser.last_name_paterno || '',
            last_name_materno: apiUser.last_name_materno || '',
            phone: apiUser.phone || '',
            country: apiUser.country || getDetectedCountry() || null,
            region: apiUser.region || '',
            province: apiUser.province || '',
            district: apiUser.district || '',
            avatar: apiUser.avatar || '',
            hasPassword: apiUser.has_password,
        };

        saveAccessToken(res.access_token);
        setCurrentUser(user);
        setIsLoggedIn(true);
        backfillDetectedCountry(apiUser.country);
        refreshCentinelaStatus();
        closeAuthModal();
        showToast('¡Bienvenido de vuelta!', 'success');
    };

    const logout = () => {
        clearAccessToken();
        setCurrentUser(null);
        setIsLoggedIn(false);
        setCentinelaEstaActivo(false);
        showToast('Sesión cerrada', 'info');
    };

    const updateCurrentUser = (patch: Partial<AuthUser>) => {
        setCurrentUser((prev) => {
            if (!prev) return prev;
            return { ...prev, ...patch };
        });
    };

    const refreshCentinelaStatus = async () => {
        try {
            const data = await getMyCentinela();
            setCentinelaEstaActivo(!!data?.activo);
        } catch {
            // silencioso — sin esto, el ícono simplemente no aparece
        }
    };

    // Completa el país en el backend cuando la cuenta no lo tiene guardado
    const backfillDetectedCountry = (currentCountry: string | null) => {
        if (currentCountry) return;
        const detected = getDetectedCountry();
        if (!detected) return;
        updateProfile({ country: detected }).catch((err) => {
            console.warn('No se pudo guardar el país detectado:', err instanceof Error ? err.message : err);
        });
    };

    // Guarda cambios de perfil de verdad en el backend 
    const updateProfile = async (patch: {
        name?: string;
        last_name_paterno?: string;
        last_name_materno?: string;
        phone?: string;
        country?: string;
        region?: string;
        province?: string;
        district?: string;
        password?: string;
        current_password?: string;
    }) => {
        const apiUser = await updateMe(patch);
        setCurrentUser((prev) => {
            if (!prev) return prev;
            const updated: AuthUser = {
                ...prev,
                name: apiUser.name,
                last_name_paterno: apiUser.last_name_paterno || '',
                last_name_materno: apiUser.last_name_materno || '',
                phone: apiUser.phone || '',
                country: apiUser.country || null,
                region: apiUser.region || '',
                province: apiUser.province || '',
                district: apiUser.district || '',
                avatar: apiUser.avatar || '',
                hasPassword: apiUser.has_password,
            };
            return updated;
        });
    };

    // Sube o quita el avatar por separado — PUT /me ya no lo acepta desde
    // que existen estos 2 endpoints dedicados.
    const updateAvatar = async (avatarDataUrl: string | null) => {
        const apiUser = avatarDataUrl ? await uploadAvatar(avatarDataUrl) : await deleteAvatar();
        setCurrentUser((prev) => {
            if (!prev) return prev;
            return { ...prev, avatar: apiUser.avatar || '' };
        });
    };

    // Borra la cuenta de verdad — requiere la contraseña como confirmación
    // de identidad (el backend la exige, ver deleteMe).
    const deleteAccount = async (password: string) => {
        await deleteMe(password);
        clearAccessToken();
        setCurrentUser(null);
        setIsLoggedIn(false);
    };


    return (
        <AppContext.Provider
            value={{
                isDarkMode,
                toggleTheme,
                detectedCountry,
                isCountryDetectionDone,
                isAuthModalOpen,
                authModalInitialMode,
                authModalResetToken,
                openAuthModal,
                closeAuthModal,
                isLoggedIn,
                currentUser,
                login,
                register,
                loginWithGoogle,
                logout,
                usuarioTienePublicacionActiva,
                centinelaEstaActivo,
                setCentinelaEstaActivo,
                isAuthChecked,
                updateCurrentUser,
                updateProfile,
                updateAvatar,
                deleteAccount
            }}
        >
            {children}
        </AppContext.Provider>
    );
}

export function useApp() {
    const context = useContext(AppContext);
    if (!context) {
        throw new Error('useApp debe ser usado dentro de un AppProvider');
    }
    return context;
}