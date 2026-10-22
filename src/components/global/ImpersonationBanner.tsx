'use client';

import { useEffect } from 'react';
import { IconEye, IconLogout } from '@tabler/icons-react';
import { useApp } from '@/context/AppContext';

export default function ImpersonationBanner() {
    const { impersonatedBy, currentUser, logout } = useApp();
    const isActive = !!impersonatedBy;

    // Mientras se muestra el aviso, el header baja para no quedar debajo.
    useEffect(() => {
        document.body.classList.toggle('is-impersonating', isActive);
        return () => document.body.classList.remove('is-impersonating');
    }, [isActive]);

    if (!isActive) return null;

    const userName = currentUser?.name || currentUser?.email || 'este usuario';

    const handleExit = () => {
        logout();
        // La pestaña la abrió el admin, así que normalmente se puede cerrar.
        window.close();
        // Si el navegador no la cierra, se lleva al inicio.
        setTimeout(() => {
            window.location.href = '/';
        }, 300);
    };

    return (
        <div className="impersonation-banner" role="status">
            <IconEye />
            <p className="impersonation-banner-text">
                <span className="impersonation-banner-full">
                    Estás viendo la cuenta de <b>{userName}</b> como administrador ({impersonatedBy}). Modo solo lectura.
                </span>
                <span className="impersonation-banner-short">
                    Cuenta de <b>{userName}</b> · Solo lectura
                </span>
            </p>
            <button type="button" className="impersonation-banner-exit" onClick={handleExit}>
                <IconLogout /> Salir
            </button>
        </div>
    );
}