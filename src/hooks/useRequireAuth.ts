'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useApp } from '@/context/AppContext';

// Protege una página: si ya terminó de revisar la sesión (isAuthChecked)
// y no hay usuario logueado, redirige a Home y abre el modal de login.
//
// Mientras isAuthChecked es false, no hace nada — esto evita expulsar por
// error a alguien que SÍ está logueado, solo porque el chequeo inicial de
// AppContext (que lee localStorage dentro de un useEffect) todavía no
// terminó de correr.
//
// Uso: dentro de cualquier página que deba exigir sesión, en la primera
// línea del componente:
//   useRequireAuth();

export function useRequireAuth() {
    const { isLoggedIn, isAuthChecked, openAuthModal } = useApp();
    const router = useRouter();

    useEffect(() => {
        if (isAuthChecked && !isLoggedIn) {
            router.replace('/');
            openAuthModal();
        }
    }, [isAuthChecked, isLoggedIn, router, openAuthModal]);
}