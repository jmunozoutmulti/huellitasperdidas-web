'use client';

import { useEffect, useRef, useState } from 'react';
import { exchangeImpersonationCode, AuthApiError } from '@/lib/authApi';
import { saveAccessToken } from '@/lib/auth';

const EXPIRED_MESSAGE = 'El enlace caducó o no es válido. Vuelve a abrirlo desde el panel de administración.';

export default function VerComoClient() {
    const [error, setError] = useState<string | null>(null);
    const hasStartedRef = useRef(false);

    useEffect(() => {
        // El código es de un solo uso: se evita canjearlo dos veces
        // (por ejemplo, porque React ejecuta los efectos dos veces en desarrollo).
        if (hasStartedRef.current) return;
        hasStartedRef.current = true;

        const code = new URLSearchParams(window.location.hash.slice(1)).get('code');

        // Se borra el código de la URL de inmediato, sin recargar,
        // para que no quede en el historial.
        window.history.replaceState(null, '', '/ver-como/');

        if (!code) {
            setError(EXPIRED_MESSAGE);
            return;
        }

        exchangeImpersonationCode(code)
            .then((res) => {
                saveAccessToken(res.access_token);
                // Recarga completa: la sesión se arma en AppContext al cargar la página.
                window.location.href = '/mi-cuenta/';
            })
            .catch((err) => {
                setError(
                    err instanceof AuthApiError && err.status === 401
                        ? EXPIRED_MESSAGE
                        : 'No pudimos abrir la cuenta. Vuelve a intentarlo desde el panel de administración.'
                );
            });
    }, []);

    return (
        <main
            style={{
                minHeight: '60vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '2em',
                textAlign: 'center',
            }}
        >
            {error ? (
                <p style={{ color: 'var(--text-red)', maxWidth: '30em' }}>{error}</p>
            ) : (
                <p>
                    <i className="icon-loading"></i> Abriendo la cuenta…
                </p>
            )}
        </main>
    );
}