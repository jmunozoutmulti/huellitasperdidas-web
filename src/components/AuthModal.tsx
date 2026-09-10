'use client';
import { useState, useEffect, ChangeEvent } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useApp } from '@/context/AppContext';
import { showToast } from '@/components/global/Toast';
import { AuthApiError, resendVerification, forgotPassword, resetPassword } from '@/lib/authApi';

type AuthMode = 'login' | 'register' | 'recover' | 'forgot' | 'reset';

interface AuthModalProps {
    onClose: () => void;
    initialMode?: AuthMode;
    resetToken?: string | null;
}

export default function AuthModal({ onClose, initialMode = 'login', resetToken = null }: AuthModalProps) {
    const { login, register, loginWithGoogle } = useApp();

    const [mode, setMode] = useState<AuthMode>(initialMode);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Login / Registro
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState('');
    const [showLoginPassword, setShowLoginPassword] = useState(false);
    const [showRegisterPassword, setShowRegisterPassword] = useState(false);

    // Reenviar verificación (cuenta sin verificar)
    const [recoverEmail, setRecoverEmail] = useState('');
    const [isSubmittingRecover, setIsSubmittingRecover] = useState(false);

    // Olvidé mi contraseña (cuenta ya verificada)
    const [forgotEmail, setForgotEmail] = useState('');
    const [isSubmittingForgot, setIsSubmittingForgot] = useState(false);

    // Restablecer contraseña (viene del link del correo, con token)
    const [newPassword, setNewPassword] = useState('');
    const [confirmNewPassword, setConfirmNewPassword] = useState('');
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [isSubmittingReset, setIsSubmittingReset] = useState(false);
    const [isResetDone, setIsResetDone] = useState(false);

    const handleGoogleCredential = async (response: { credential: string }) => {
        try {
            await loginWithGoogle(response.credential);
        } catch (err) {
            const message = err instanceof AuthApiError ? err.message : 'No pudimos iniciar sesión con Google. Intenta de nuevo.';
            showToast(message, 'error');
        }
    };

    useEffect(() => {
        const w = window as any;
        if (!w.google) return;

        w.google.accounts.id.initialize({
            client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
            callback: handleGoogleCredential,
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
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
            showToast(res.message, 'success');
        } catch (err) {
            const message = err instanceof AuthApiError ? err.message : 'No pudimos procesar la solicitud.';
            showToast(message, 'error');
        } finally {
            setIsSubmittingRecover(false);
        }
    };

    const handleForgotPassword = async () => {
        setIsSubmittingForgot(true);
        try {
            const res = await forgotPassword(forgotEmail);
            showToast(res.message, 'success');
            setForgotEmail('');
        } catch (err) {
            const message = err instanceof AuthApiError ? err.message : 'No pudimos procesar la solicitud.';
            showToast(message, 'error');
        } finally {
            setIsSubmittingForgot(false);
        }
    };

    const handleResetPassword = async () => {
        if (!resetToken) return;
        setIsSubmittingReset(true);
        try {
            await resetPassword(resetToken, newPassword);
            setIsResetDone(true);
            showToast('Tu contraseña fue actualizada correctamente.', 'success');
        } catch (err) {
            const message =
                err instanceof AuthApiError
                    ? err.message
                    : 'No pudimos restablecer tu contraseña. El enlace puede haber vencido.';
            showToast(message, 'error');
        } finally {
            setIsSubmittingReset(false);
        }
    };

    const canSubmitLogin = email.includes('@') && password.length >= 8;
    const canSubmitRegister = email.includes('@') && password.length >= 8 && name.trim().length > 0;
    const canSubmitReset = newPassword.length >= 8 && newPassword === confirmNewPassword;

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

                        <button type="button" className="auth-modal-link" onClick={() => setMode('forgot')} style={{ marginBottom: '0.75em' }}>
                            ¿Olvidaste tu contraseña?
                        </button>

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

                {/* ============ REENVIAR VERIFICACIÓN (cuenta sin verificar) ============ */}
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

                        <button type="button" className="auth-modal-link" onClick={() => setMode('forgot')}>
                            ¿Ya verificaste tu cuenta pero olvidaste tu contraseña?
                        </button>

                        <button type="button" className="auth-modal-link" onClick={() => setMode('login')}>
                            Volver a iniciar sesión
                        </button>
                    </div>
                )}

                {/* ============ OLVIDÉ MI CONTRASEÑA (cuenta ya verificada) ============ */}
                {mode === 'forgot' && (
                    <div className="auth-step active" data-auth-step="forgot">
                        <div className="auth-modal-icon">
                            <Image src="/images/logo.svg" alt="Huellas Perdidas" width={120} height={40} />
                        </div>
                        <h3 className="auth-modal-title">Restablece tu contraseña</h3>
                        <p className="auth-modal-desc">
                            Ingresa tu correo y te enviaremos un enlace para crear una contraseña nueva.
                        </p>

                        <div className="form-group">
                            <input
                                type="email"
                                className="form-input auth-input"
                                placeholder="email@example.com"
                                value={forgotEmail}
                                onChange={(e) => setForgotEmail(e.target.value)}
                            />
                        </div>

                        <button
                            type="button"
                            className="auth-btn auth-btn-primary"
                            disabled={!forgotEmail.includes('@') || isSubmittingForgot}
                            onClick={handleForgotPassword}
                        >
                            {isSubmittingForgot ? 'Enviando...' : 'Enviar enlace'}
                        </button>

                        <button type="button" className="auth-modal-link" onClick={() => setMode('recover')}>
                            ¿Nunca verificaste tu cuenta?
                        </button>

                        <button type="button" className="auth-modal-link" onClick={() => setMode('login')}>
                            Volver a iniciar sesión
                        </button>
                    </div>
                )}

                {/* ============ RESTABLECER CONTRASEÑA (llegó desde el link del correo) ============ */}
                {mode === 'reset' && (
                    <div className="auth-step active" data-auth-step="reset">
                        <div className="auth-modal-icon">
                            <Image src="/images/logo.svg" alt="Huellas Perdidas" width={120} height={40} />
                        </div>

                        {!resetToken ? (
                            <>
                                <h3 className="auth-modal-title">Enlace inválido</h3>
                                <p className="auth-modal-desc">
                                    Este enlace no es válido o está incompleto. Solicita uno nuevo.
                                </p>
                                <button type="button" className="auth-btn auth-btn-primary" onClick={() => setMode('forgot')}>
                                    Solicitar nuevo enlace
                                </button>
                            </>
                        ) : isResetDone ? (
                            <>
                                <h3 className="auth-modal-title">¡Listo!</h3>
                                <p className="auth-modal-desc">
                                    Tu contraseña fue actualizada. Ya puedes iniciar sesión con tu nueva contraseña.
                                </p>
                                <button
                                    type="button"
                                    className="auth-btn auth-btn-primary"
                                    onClick={() => {
                                        setIsResetDone(false);
                                        setMode('login');
                                    }}
                                >
                                    Iniciar sesión
                                </button>
                            </>
                        ) : (
                            <>
                                <h3 className="auth-modal-title">Crea tu nueva contraseña</h3>
                                <p className="auth-modal-desc">Este enlace vence en 1 hora desde que lo recibiste.</p>

                                <div className="form-auth">
                                    <div className="field-auth auth-password-group">
                                        <input
                                            type={showNewPassword ? 'text' : 'password'}
                                            className="auth-input"
                                            placeholder="Nueva contraseña (mínimo 8 caracteres)"
                                            value={newPassword}
                                            onChange={(e) => setNewPassword(e.target.value)}
                                        />
                                        <button
                                            type="button"
                                            className="auth-password-toggle"
                                            onClick={() => setShowNewPassword((v) => !v)}
                                            aria-label={showNewPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                                        >
                                            <i className={showNewPassword ? 'ti ti-eye-off' : 'ti ti-eye'}></i>
                                        </button>
                                    </div>
                                    <div className="field-auth">
                                        <input
                                            type={showNewPassword ? 'text' : 'password'}
                                            className="auth-input"
                                            placeholder="Confirma tu nueva contraseña"
                                            value={confirmNewPassword}
                                            onChange={(e) => setConfirmNewPassword(e.target.value)}
                                        />
                                    </div>
                                </div>

                                {confirmNewPassword && newPassword !== confirmNewPassword && (
                                    <p style={{ color: 'var(--brand-red)', fontSize: '0.85em', marginTop: '-0.5em', marginBottom: '0.5em' }}>
                                        Las contraseñas no coinciden.
                                    </p>
                                )}

                                <button
                                    type="button"
                                    className="auth-btn auth-btn-primary"
                                    disabled={!canSubmitReset || isSubmittingReset}
                                    onClick={handleResetPassword}
                                >
                                    {isSubmittingReset ? 'Guardando...' : 'Restablecer contraseña'}
                                </button>
                            </>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}