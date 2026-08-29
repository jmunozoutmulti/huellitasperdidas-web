'use client';

import { useState, useEffect } from 'react';
import { showToast } from '@/components/global/Toast';
import { useApp } from '@/context/AppContext';
import { AuthApiError } from '@/lib/authApi';

interface ModalCambiarClaveProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function ModalCambiarClave({ isOpen, onClose }: ModalCambiarClaveProps) {
    const { updateProfile } = useApp();

    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showCurrent, setShowCurrent] = useState(false);
    const [showNew, setShowNew] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
            setShowCurrent(false);
            setShowNew(false);
            setIsSaving(false);
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const canSubmit =
        currentPassword.length > 0 &&
        newPassword.length >= 8 &&
        newPassword === confirmPassword;

    const handleConfirm = async () => {
        if (newPassword !== confirmPassword) {
            showToast('Las contraseñas nuevas no coinciden', 'error');
            return;
        }

        setIsSaving(true);
        try {
            await updateProfile({
                current_password: currentPassword,
                password: newPassword,
            });
            onClose();
            showToast('Tu contraseña se actualizó correctamente', 'success');
        } catch (err) {
            const message = err instanceof AuthApiError ? err.message : 'No pudimos cambiar tu contraseña. Intenta de nuevo.';
            showToast(message, 'error');
            setIsSaving(false);
        }
    };

    return (
        <div className="app-modal open" id="modal-cambiar-clave">
            <div className="app-modal-backdrop" onClick={onClose}></div>
            <div className="app-modal-card">
                <div className="app-modal-header">
                    <h3>Cambiar contraseña</h3>
                    <button type="button" className="app-modal-close" onClick={onClose}>
                        <i className="ti ti-x"></i>
                    </button>
                </div>
                <div className="app-modal-body">
                    <div className="form-group auth-password-group">
                        <label className="form-label">Contraseña actual</label>
                        <input
                            type={showCurrent ? 'text' : 'password'}
                            className="form-input auth-input"
                            value={currentPassword}
                            onChange={(e) => setCurrentPassword(e.target.value)}
                        />
                        <button
                            type="button"
                            className="auth-password-toggle"
                            onClick={() => setShowCurrent((v) => !v)}
                            aria-label={showCurrent ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                        >
                            <i className={showCurrent ? 'ti ti-eye-off' : 'ti ti-eye'}></i>
                        </button>
                    </div>

                    <div className="form-group auth-password-group">
                        <label className="form-label">Nueva contraseña</label>
                        <input
                            type={showNew ? 'text' : 'password'}
                            className="form-input auth-input"
                            placeholder="Mínimo 8 caracteres"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                        />
                        <button
                            type="button"
                            className="auth-password-toggle"
                            onClick={() => setShowNew((v) => !v)}
                            aria-label={showNew ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                        >
                            <i className={showNew ? 'ti ti-eye-off' : 'ti ti-eye'}></i>
                        </button>
                    </div>

                    <div className="form-group">
                        <label className="form-label">Confirmar nueva contraseña</label>
                        <input
                            type={showNew ? 'text' : 'password'}
                            className="form-input"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                        />
                    </div>
                </div>
                <div className="app-modal-footer">
                    <button type="button" className="btn-secondary" onClick={onClose}>
                        Cancelar
                    </button>
                    <button
                        type="button"
                        className="btn-publish"
                        disabled={!canSubmit || isSaving}
                        onClick={handleConfirm}
                    >
                        <i className="ti ti-device-floppy"></i> {isSaving ? 'Guardando...' : 'Guardar nueva contraseña'}
                    </button>
                </div>
            </div>
        </div>
    );
}
