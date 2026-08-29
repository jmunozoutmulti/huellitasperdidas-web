'use client';
import { useState, useEffect, ChangeEvent } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useApp } from '@/context/AppContext';
import { showToast } from '@/components/global/Toast';
import { AuthApiError, resendVerification } from '@/lib/authApi';

interface AuthModalProps {
    onClose: () => void;
}

type AuthMode = 'login' | 'register' | 'recover';

export default function AuthModal({ onClose }: AuthModalProps) {
    const { login, register, loginWithGoogle } = useApp();

    const [mode, setMode] = useState<AuthMode>('login');
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Login / Registro
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState('');
    const [showLoginPassword, setShowLoginPassword] = useState(false);
    const [showRegisterPassword, setShowRegisterPassword] = useState(false);

    // Recuperar cuenta
    const [recoverEmail, setRecoverEmail] = useState('');
    const [isSubmittingRecover, setIsSubmittingRecover] = useState(false);

    const handleGoogleCredential = (response: { credential: string }) => {
        const base64Url = response.credential.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(
            atob(base64)
                .split('')
                .map((c) => '%' + c.charCodeAt(0).toString(16).padStart(2, '0'))
                .join('')
        );
        const payload = JSON.parse(jsonPayload);

        loginWithGoogle({
            email: payload.email,
            name: payload.given_name || payload.name,
            last_name_paterno: payload.family_name || '',
        });
    };

    useEffect(() => {
        const w = window as any;
        if (!w.google) return;

        w.google.accounts.id.initialize({
            client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
            callback: handleGoogleCredential,
        });
    }, []);

    const handleLogin = async () => {
        setIsSubmitting(true);
        try {
            await login(email, password);
        } catch (err) {
            const message = err instanceof AuthApiError ? err.message : 'No pudimos iniciar sesión. Intenta de nuevo.';
            showToast(message, 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleRegister = async () => {
        setIsSubmitting(true);
        try {
            const message = await register(email, password, name);
            showToast(message, 'success');
            setMode('login');
            setPassword('');
        } catch (err) {
            const message = err instanceof AuthApiError ? err.message : 'No pudimos crear tu cuenta. Intenta de nuevo.';
            showToast(message, 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleResendVerification = async () => {
        setIsSubmittingRecover(true);
        try {
            const res = await resendVerification(recoverEmail);
            // El backend siempre devuelve el mismo mensaje genérico a propósito
            // (no revela si el correo existe o ya está verificado) — se muestra
            // tal cual, sin que el frontend intente adivinar cuál caso fue.
            showToast(res.message, 'success');
        } catch (err) {
            const message = err instanceof AuthApiError ? err.message : 'No pudimos procesar la solicitud.';
            showToast(message, 'error');
        } finally {
            setIsSubmittingRecover(false);
        }
    };

    const canSubmitLogin = email.includes('@') && password.length >= 8;
    const canSubmitRegister = email.includes('@') && password.length >= 8 && name.trim().length > 0;

    return (
        <div className="app-modal open" id="modal-auth">
            <div className="app-modal-backdrop" onClick={onClose}></div>
            <div className="app-modal-card auth-modal-card">
                <button
                    type="button"
                    className="app-modal-close auth-modal-close"
                    data-close-modal
                    onClick={onClose}
                >
                    <i className="ti ti-x"></i>
                </button>

                {/* ============ LOGIN ============ */}
                {mode === 'login' && (
                    <div className="auth-step active" data-auth-step="login">
                        <div className="auth-modal-icon">
                            <Image src="/images/logo.svg" alt="Huellas Perdidas" width={120} height={40} />
                        </div>
                        <h3 className="auth-modal-title">Inicia sesión</h3>
                        <p className="auth-modal-desc">
                            Al continuar, aceptas nuestros{' '}
                            <Link href="/terminos-y-condiciones" target="_blank">Términos</Link>{' '}
                            y nuestra{' '}
                            <Link href="/privacidad" target="_blank">Política de Privacidad</Link>.
                        </p>
                        <div className="form-auth ">
                            <div className="field-auth">
                                <input
                                    type="email"
                                    className=" auth-input"
                                    placeholder="Correo electrónico"
                                    value={email}
                                    onChange={(e: ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
                                />
                            </div>
                            <div className="field-auth auth-password-group">
                                <input
                                    type={showLoginPassword ? 'text' : 'password'}
                                    className="auth-input"
                                    placeholder="Contraseña"
                                    value={password}
                                    onChange={(e: ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
                                />
                                <button
                                    type="button"
                                    className="auth-password-toggle"
                                    onClick={() => setShowLoginPassword((v) => !v)}
                                    aria-label={showLoginPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                                >
                                    <i className={showLoginPassword ? 'ti ti-eye-off' : 'ti ti-eye'}></i>
                                </button>
                            </div>
                        </div>
                        <button
                            type="button"
                            className="auth-btn auth-btn-primary"
                            disabled={!canSubmitLogin || isSubmitting}
                            onClick={handleLogin}
                        >
                            {isSubmitting ? 'Ingresando...' : 'Iniciar sesión'}
                        </button>

                        <button type="button" className="auth-modal-link" onClick={() => setMode('register')}>
                            ¿No tienes cuenta? <b>Regístrate</b>
                        </button>

                        <div className="auth-modal-actions">
                            <button
                                type="button"
                                className="auth-btn auth-btn-google"
                                id="btn-auth-google"
                                onClick={() => {
                                    const w = window as any;
                                    w.google?.accounts.id.prompt();
                                }}
                            >
                                <i></i> Continuar con Google
                            </button>
                        </div>

                        <button type="button" className="auth-modal-link" onClick={() => setMode('recover')}>
                            ¿No consigues iniciar sesión?
                        </button>
                    </div>
                )}

                {/* ============ REGISTRO ============ */}
                {mode === 'register' && (
                    <div className="auth-step active" data-auth-step="register">
                        <div className="auth-modal-icon">
                            <Image src="/images/logo.svg" alt="Huellas Perdidas" width={120} height={40} />
                        </div>
                        <h3 className="auth-modal-title">Crea tu cuenta</h3>
                        <p className="auth-modal-desc">
                            Al continuar, aceptas nuestros{' '}
                            <Link href="/terminos-y-condiciones" target="_blank">Términos</Link>{' '}
                            y nuestra{' '}
                            <Link href="/privacidad" target="_blank">Política de Privacidad</Link>.
                        </p>

                        <div className="form-auth">
                            <div className="field-auth">
                                <input
                                    type="text"
                                    className="auth-input"
                                    placeholder="Nombre"
                                    value={name}
                                    onChange={(e: ChangeEvent<HTMLInputElement>) => setName(e.target.value)}
                                />
                            </div>
                            <div className="field-auth">
                                <input
                                    type="email"
                                    className="auth-input"
                                    placeholder="Correo electrónico"
                                    value={email}
                                    onChange={(e: ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
                                />
                            </div>
                            <div className="field-auth auth-password-group">
                                <input
                                    type={showRegisterPassword ? 'text' : 'password'}
                                    className="auth-input"
                                    placeholder="Contraseña (mínimo 8 caracteres)"
                                    value={password}
                                    onChange={(e: ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
                                />
                                <button
                                    type="button"
                                    className="auth-password-toggle"
                                    onClick={() => setShowRegisterPassword((v) => !v)}
                                    aria-label={showRegisterPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                                >
                                    <i className={showRegisterPassword ? 'ti ti-eye-off' : 'ti ti-eye'}></i>
                                </button>
                            </div>
                        </div>

                        <button
                            type="button"
                            className="auth-btn auth-btn-primary"
                            disabled={!canSubmitRegister || isSubmitting}
                            onClick={handleRegister}
                        >
                            {isSubmitting ? 'Creando cuenta...' : 'Crear cuenta'}
                        </button>

                        <button type="button" className="auth-modal-link" onClick={() => setMode('login')}>
                            ¿Ya tienes cuenta? Inicia sesión
                        </button>
                    </div>
                )}

                {/* ============ RECUPERAR CUENTA ============ */}
                {mode === 'recover' && (
                    <div className="auth-step active" data-auth-step="recover">
                        <div className="auth-modal-icon">
                            <Image src="/images/logo.svg" alt="Huellas Perdidas" width={120} height={40} />
                        </div>
                        <h3 className="auth-modal-title">Recupera tu cuenta</h3>
                        <p className="auth-modal-desc">
                            Si tu cuenta existe y no está verificada, te enviaremos un enlace
                            de verificación a tu correo.
                        </p>

                        <div className="form-group">
                            <input
                                type="email"
                                className="form-input auth-input"
                                placeholder="email@example.com"
                                value={recoverEmail}
                                onChange={(e) => setRecoverEmail(e.target.value)}
                            />
                        </div>

                        <button
                            type="button"
                            className="auth-btn auth-btn-primary"
                            disabled={!recoverEmail.includes('@') || isSubmittingRecover}
                            onClick={handleResendVerification}
                        >
                            {isSubmittingRecover ? 'Enviando...' : 'Enviar enlace de verificación'}
                        </button>

                        <button type="button" className="auth-modal-link" onClick={() => setMode('login')}>
                            Volver a iniciar sesión
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}