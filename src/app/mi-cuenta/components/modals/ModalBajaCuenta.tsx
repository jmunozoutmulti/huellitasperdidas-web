'use client';

import { useState, useEffect } from 'react';
import { showToast } from '@/components/global/Toast';
import { useApp } from '@/context/AppContext';
import { AuthApiError } from '@/lib/authApi';

interface ModalBajaCuentaProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function ModalBajaCuenta({ isOpen, onClose }: ModalBajaCuentaProps) {
    const { deleteAccount } = useApp();
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setPassword('');
            setShowPassword(false);
            setIsDeleting(false);
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const handleConfirm = async () => {
        setIsDeleting(true);
        try {
            await deleteAccount(password);
            onClose();
            showToast('Tu cuenta ha sido eliminada. Si fue un error, contáctanos para restaurarla.', 'warning');
        } catch (err) {
            const message = err instanceof AuthApiError ? err.message : 'No pudimos eliminar tu cuenta. Intenta de nuevo.';
            showToast(message, 'error');
            setIsDeleting(false);
        }
    };

    return (
        <div className="app-modal open" id="modal-baja-cuenta">
            <div className="app-modal-backdrop" onClick={onClose}></div>
            <div className="app-modal-card">
                <div className="app-modal-body">
                    <div className="app-modal-confirm-text">
                        <h4>¿Seguro que quieres eliminar tu cuenta?</h4>
                        <p>Se eliminarán todos tus datos, publicaciones e historial de forma permanente.</p>
                    </div>
                    <div className="form-group auth-password-group">
                        <label className="form-label">
                            Escribe tu contraseña para confirmar
                        </label>
                        <input
                            type={showPassword ? 'text' : 'password'}
                            className="form-input auth-input"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                        />
                        <button
                            type="button"
                            className="auth-password-toggle"
                            onClick={() => setShowPassword((v) => !v)}
                            aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                        >
                            <i className={showPassword ? 'ti ti-eye-off' : 'ti ti-eye'}></i>
                        </button>
                    </div>
                </div>
                <div className="app-modal-footer">
                    <button type="button" className="btn-secondary" onClick={onClose}>
                        Cancelar
                    </button>
                    <button
                        type="button"
                        className="btn-danger-account"
                        disabled={password.length === 0 || isDeleting}
                        onClick={handleConfirm}
                    >
                        <i className="ti ti-trash"></i> {isDeleting ? 'Eliminando...' : 'Sí, eliminar mi cuenta'}
                    </button>
                </div>
            </div>
        </div>
    );
}