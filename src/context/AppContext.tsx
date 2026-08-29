'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { showToast } from '@/components/global/Toast';
import { AuthUser, saveAuthUser, clearAuthUser, saveAccessToken, getAccessToken, clearAccessToken } from '@/lib/auth';
import { loginUser, registerUser, getMe, updateMe, deleteMe, AuthApiError } from '@/lib/authApi';

interface AppContextType {
    isDarkMode: boolean;
    toggleTheme: (isDark?: boolean) => void;
    isAuthModalOpen: boolean;
    openAuthModal: () => void;
    closeAuthModal: () => void;
    isLoggedIn: boolean;
    currentUser: AuthUser | null;
    login: (email: string, password: string) => Promise<void>;
    register: (email: string, password: string, name: string) => Promise<string>;
    // Google no tiene endpoint real confirmado todavía (pendiente con backend) —
    // sigue siendo 100% local/mock mientras tanto.
    loginWithGoogle: (data: { email: string; name: string; last_name_paterno?: string }) => void;
    logout: () => void;
    usuarioTienePublicacionActiva: boolean;
    centinelaEstaActivo: boolean;
    isAuthChecked: boolean;
    updateCurrentUser: (patch: Partial<AuthUser>) => void;
    updateProfile: (patch: { name?: string; last_name_paterno?: string; last_name_materno?: string; phone?: string; country?: string; region?: string; province?: string; district?: string; avatar?: string; password?: string; current_password?: string }) => Promise<void>;
    deleteAccount: (password: string) => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
    const [isDarkMode, setIsDarkMode] = useState(false);
    const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
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
                    country: apiUser.country || 'PE',
                    region: apiUser.region || '',
                    province: apiUser.province || '',
                    district: apiUser.district || '',
                    avatar: apiUser.avatar || '',
                };
                saveAuthUser(user);
                setCurrentUser(user);
                setIsLoggedIn(true);
            } catch {
                // Token inválido o vencido — cerramos sesión en silencio,
                // sin mostrar ningún error (es un estado normal, no una falla).
                clearAuthUser();
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

    const openAuthModal = () => setIsAuthModalOpen(true);
    const closeAuthModal = () => setIsAuthModalOpen(false);

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
            country: apiUser.country || 'PE',
            region: apiUser.region || '',
            province: apiUser.province || '',
            district: apiUser.district || '',
            avatar: apiUser.avatar || '',
        };

        saveAccessToken(res.access_token);
        saveAuthUser(user);
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

    // Google sigue siendo 100% local — no hay endpoint real confirmado
    // todavía. No genera access_token real, no debería usarse para llamadas
    // autenticadas reales al backend hasta que esto se resuelva.
    const loginWithGoogle = (data: { email: string; name: string; last_name_paterno?: string }) => {
        const user: AuthUser = {
            id: crypto.randomUUID(),
            email: data.email,
            name: data.name,
            last_name_paterno: data.last_name_paterno || '',
            last_name_materno: '',
            phone: '',
            country: 'PE',
            region: '',
            province: '',
            district: '',
            avatar: '',
        };

        saveAuthUser(user);
        setCurrentUser(user);
        setIsLoggedIn(true);
        closeAuthModal();
        showToast('¡Bienvenido de vuelta!', 'success');
    };

    const logout = () => {
        clearAuthUser();
        clearAccessToken();
        setCurrentUser(null);
        setIsLoggedIn(false);
        showToast('Sesión cerrada', 'info');
    };

    const updateCurrentUser = (patch: Partial<AuthUser>) => {
        setCurrentUser((prev) => {
            if (!prev) return prev;
            const updated = { ...prev, ...patch };
            saveAuthUser(updated);
            return updated;
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
        avatar?: string;
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
            saveAuthUser(updated);
            return updated;
        });
    };

    // Borra la cuenta de verdad — requiere la contraseña como confirmación
    // de identidad (el backend la exige, ver deleteMe).
    const deleteAccount = async (password: string) => {
        await deleteMe(password);
        clearAuthUser();
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