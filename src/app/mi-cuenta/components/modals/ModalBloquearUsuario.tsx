'use client';

import { useState } from 'react';
import { showToast } from '@/components/global/Toast';
import { blockUser, unblockUser, MessagesApiError } from '@/lib/messagesApi';

interface ModalBloquearUsuarioProps {
    isOpen: boolean;
    userId: string;
    nombre: string;
    isBlocked: boolean;
    onClose: () => void;
    onBlocked: () => void;
}

export default function ModalBloquearUsuario({
    isOpen,
    userId,
    nombre,
    isBlocked,
    onClose,
    onBlocked,
}: ModalBloquearUsuarioProps) {
    const [isProcessing, setIsProcessing] = useState(false);

    if (!isOpen) return null;

    const handleConfirm = async () => {
        setIsProcessing(true);
        try {
            if (isBlocked) {
                await unblockUser(userId);
                showToast('Usuario desbloqueado.', 'success');
            } else {
                await blockUser(userId);
                showToast('Usuario bloqueado. Ya no podrá escribirte.', 'success');
            }
            onClose();
            onBlocked();
        } catch (err) {
            const message = err instanceof MessagesApiError ? err.message : 'No pudimos completar la acción. Intenta de nuevo.';
            showToast(message, 'error');
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className="app-modal open" id="modal-bloquear-usuario">
            <div className="app-modal-backdrop" onClick={onClose}></div>
            <div className="app-modal-card">
                <div className="app-modal-body">
                    <div className="app-modal-confirm-icon warning">
                        <i className="ti ti-ban"></i>
                    </div>
                    <div className="app-modal-confirm-text">
                        <h4>{isBlocked ? `¿Desbloquear a ${nombre}?` : `¿Bloquear a ${nombre}?`}</h4>
                        <p>
                            {isBlocked
                                ? 'Podrá volver a enviarte mensajes.'
                                : 'No podrá enviarte más mensajes. La conversación seguirá visible en tu bandeja.'}
                        </p>
                    </div>
                </div>
                <div className="app-modal-footer">
                    <button type="button" className="btn-secondary" onClick={onClose}>
                        Cancelar
                    </button>
                    <button
                        type="button"
                        className="btn-danger-account"
                        disabled={isProcessing}
                        onClick={handleConfirm}
                    >
                        <i className="ti ti-ban"></i>{' '}
                        {isProcessing ? 'Procesando...' : isBlocked ? 'Sí, desbloquear' : 'Sí, bloquear'}
                    </button>
                </div>
            </div>
        </div>
    );
}