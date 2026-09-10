'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { verifyEmail, AuthApiError } from '@/lib/authApi';
import { useApp } from '@/context/AppContext';

function VerifyEmailContent() {
    const searchParams = useSearchParams();
    const token = searchParams.get('token');
    const { openAuthModal } = useApp();

    const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
    const [errorMessage, setErrorMessage] = useState('');

    useEffect(() => {
        if (!token) {
            setStatus('error');
            setErrorMessage('Este enlace no es válido o está incompleto.');
            return;
        }

        verifyEmail(token)
            .then(() => setStatus('success'))
            .catch((err) => {
                setStatus('error');
                setErrorMessage(
                    err instanceof AuthApiError ? err.message : 'No pudimos verificar tu correo. El enlace puede haber vencido.'
                );
            });
    }, [token]);

    return (
        <div className="auth-standalone-card">
            <div className="auth-modal-icon">
                <Image src="/images/logo.svg" alt="Huellas Perdidas" width={120} height={40} />
            </div>

            {status === 'loading' && (
                <>
                    <h3 className="auth-modal-title">Verificando tu correo...</h3>
                    <p className="auth-modal-desc">Esto solo toma un momento.</p>
                </>
            )}

            {status === 'success' && (
                <>
                    <h3 className="auth-modal-title">¡Cuenta verificada!</h3>
                    <p className="auth-modal-desc">Tu correo fue confirmado correctamente. Ya puedes iniciar sesión.</p>
                    <button
                        type="button"
                        className="auth-btn auth-btn-primary"
                        onClick={() => openAuthModal({ mode: 'login' })}
                    >
                        Iniciar sesión
                    </button>
                </>
            )}

            {status === 'error' && (
                <>
                    <h3 className="auth-modal-title">No pudimos verificar tu cuenta</h3>
                    <p className="auth-modal-desc">{errorMessage}</p>
                    <button
                        type="button"
                        className="auth-btn auth-btn-primary"
                        onClick={() => openAuthModal({ mode: 'recover' })}
                    >
                        Reenviar enlace de verificación
                    </button>
                </>
            )}

            <Link href="/" className="auth-modal-link" style={{ display: 'block', textAlign: 'center', marginTop: '1em' }}>
                Volver al inicio
            </Link>
        </div>
    );
}

export default function VerifyEmailPage() {
    return (
        <main className="main-content" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '80vh' }}>
            <Suspense fallback={<div>Cargando...</div>}>
                <VerifyEmailContent />
            </Suspense>
        </main>
    );
}