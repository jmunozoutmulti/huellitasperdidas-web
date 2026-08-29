'use client';

import { showToast } from '@/components/global/Toast';

interface ModalBloquearUsuarioProps {
    isOpen: boolean;
    nombre: string;
    onClose: () => void;
    onConfirm: () => void;
}

export default function ModalBloquearUsuario({
    isOpen,
    nombre,
    onClose,
    onConfirm,
}: ModalBloquearUsuarioProps) {
    if (!isOpen) return null;

    return (
        <div className="app-modal open" id="modal-bloquear-usuario">
            <div className="app-modal-backdrop" onClick={onClose}></div>
            <div className="app-modal-card">
                <div className="app-modal-body">
                    <div className="app-modal-confirm-icon warning">
                        <i className="ti ti-ban"></i>
                    </div>
                    <div className="app-modal-confirm-text">
                        <h4>¿Bloquear a {nombre}?</h4>
                        <p>No podrá enviarte más mensajes y esta conversación se ocultará de tu bandeja.</p>
                    </div>
                </div>
                <div className="app-modal-footer">
                    <button type="button" className="btn-secondary" onClick={onClose}>
                        Cancelar
                    </button>
                    <button
                        type="button"
                        className="btn-danger-account"
                        onClick={() => {
                            onConfirm();
                            onClose();
                            showToast('Usuario bloqueado. Ya no podrá escribirte.', 'success');
                        }}
                    >
                        <i className="ti ti-ban"></i> Sí, bloquear
                    </button>
                </div>
            </div>
        </div>
    );
}