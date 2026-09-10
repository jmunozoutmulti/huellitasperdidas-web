'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { showToast } from '@/components/global/Toast';
import { AuthUser, saveAccessToken, getAccessToken, clearAccessToken, saveDetectedCountry, getDetectedCountry } from '@/lib/auth';
import { detectCountry } from '@/lib/detectCountry';
import { loginUser, registerUser, getMe, updateMe, deleteMe, uploadAvatar, deleteAvatar, loginWithGoogleToken, AuthApiError } from '@/lib/authApi';

interface AppContextType {
    isDarkMode: boolean;
    toggleTheme: (isDark?: boolean) => void;
    isAuthModalOpen: boolean;
    authModalInitialMode: 'login' | 'register' | 'recover' | 'forgot' | 'reset';
    authModalResetToken: string | null;
    openAuthModal: (options?: { mode?: 'login' | 'register' | 'recover' | 'forgot' | 'reset'; token?: string }) => void;
    closeAuthModal: () => void;
    isLoggedIn: boolean;
    currentUser: AuthUser | null;
    login: (email: string, password: string) => Promise<void>;
    register: (email: string, password: string, name: string) => Promise<string>;
    loginWithGoogle: (idToken: string) => Promise<void>;
    logout: () => void;
    usuarioTienePublicacionActiva: boolean;
    centinelaEstaActivo: boolean;
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
    const [authModalInitialMode, setAuthModalInitialMode] = useState<'login' | 'register' | 'recover' | 'forgot' | 'reset'>('login');
    const [authModalResetToken, setAuthModalResetToken] = useState<string | null>(null);
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
    const [isAuthChecked, setIsAuthChecked] = useState(false);

    const [usuarioTienePublicacionActiva] = useState(false);
    const [centinelaEstaActivo] = useState(false);

    useEffect(() => {
        const savedTheme = localStorage.getItem('theme');
        const isDark = savedTheme === 'dark';
        setIsDarkMode(isDark);
        document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');

        // País detectado — una sola vez por dispositivo (si ya hay uno
        // guardado, no se vuelve a pedir). Corre para cualquier visitante,
        // tenga sesión o no — es lo que filtra Explorar antes de que exista
        // una cuenta.
        if (!getDetectedCountry()) {
            detectCountry().then(saveDetectedCountry);
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
                    country: apiUser.country || getDetectedCountry() || 'PE',
                    region: apiUser.region || '',
                    province: apiUser.province || '',
                    district: apiUser.district || '',
                    avatar: apiUser.avatar || '',
                };
                setCurrentUser(user);
                setIsLoggedIn(true);
            } catch {
                // Token inválido o vencido — cerramos sesión en silencio,
                // sin mostrar ningún error (es un estado normal, no una falla).
                clearAccessToken();
            } finally {
                setIsAuthChecked(true);
            }
        }

        restoreSession();
    }, []);

    // Si cualquier llamada autenticada (authFetch) detecta que el token ya
    // no sirve, esto reacciona al instante — sin esto, la UI seguía
    // mostrando "logueado" hasta el próximo recargue de página.
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

    const openAuthModal = (options?: { mode?: 'login' | 'register' | 'recover' | 'forgot' | 'reset'; token?: string }) => {
        setAuthModalInitialMode(options?.mode || 'login');
        setAuthModalResetToken(options?.token || null);
        setIsAuthModalOpen(true);
    };
    const closeAuthModal = () => {
        setIsAuthModalOpen(false);
        setAuthModalInitialMode('login');
        setAuthModalResetToken(null);
    };

    // Login real contra el backend. Lanza el error (AuthApiError) para que
    // quien llame (AuthModal) decida cómo mostrarlo — por ejemplo, el caso
    // especial de "correo no verificado" viene con un mensaje específico.
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
            country: apiUser.country || getDetectedCountry() || 'PE',
            region: apiUser.region || '',
            province: apiUser.province || '',
            district: apiUser.district || '',
            avatar: apiUser.avatar || '',
        };

        saveAccessToken(res.access_token);
        setCurrentUser(user);
        setIsLoggedIn(true);
        closeAuthModal();
        showToast('¡Bienvenido de vuelta!', 'success');
    };

    // Registro real. No inicia sesión — el backend exige verificar el correo
    // primero. Devuelve el mensaje del backend para que AuthModal lo muestre.
    const register = async (email: string, password: string, name: string) => {
        const res = await registerUser(email, password, name);
        return res.message;
    };

    // Login/registro real con Google — el backend decide solo si es cuenta
    // nueva o existente. Manda el id_token de Google tal cual, sin decodificarlo
    // nosotros (eso lo hace el propio backend, que además lo valida).
    const loginWithGoogle = async (idToken: string) => {
        const res = await loginWithGoogleToken(idToken);
        const apiUser = res.user;

        const user: AuthUser = {
            id: apiUser.id,
            email: apiUser.email,
            name: apiUser.name,
            last_name_paterno: apiUser.last_name_paterno || '',
            last_name_materno: apiUser.last_name_materno || '',
            phone: apiUser.phone || '',
            country: apiUser.country || getDetectedCountry() || 'PE',
            region: apiUser.region || '',
            province: apiUser.province || '',
            district: apiUser.district || '',
            avatar: apiUser.avatar || '',
        };

        saveAccessToken(res.access_token);
        setCurrentUser(user);
        setIsLoggedIn(true);
        closeAuthModal();
        showToast('¡Bienvenido de vuelta!', 'success');
    };

    const logout = () => {
        clearAccessToken();
        setCurrentUser(null);
        setIsLoggedIn(false);
        showToast('Sesión cerrada', 'info');
    };

    const updateCurrentUser = (patch: Partial<AuthUser>) => {
        setCurrentUser((prev) => {
            if (!prev) return prev;
            return { ...prev, ...patch };
        });
    };

    // Guarda cambios de perfil de verdad en el backend — ya soporta todos
    // estos campos (name, apellidos, teléfono, país, ubicación, avatar).
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
                country: apiUser.country || 'PE',
                region: apiUser.region || '',
                province: apiUser.province || '',
                district: apiUser.district || '',
                avatar: apiUser.avatar || '',
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