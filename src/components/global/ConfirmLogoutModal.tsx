'use client';
import { IconLogout } from '@tabler/icons-react';

interface ConfirmLogoutModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
}

export default function ConfirmLogoutModal({ isOpen, onClose, onConfirm }: ConfirmLogoutModalProps) {
    if (!isOpen) return null;

    return (
        <div className="app-modal open" id="modal-confirm-logout">
            <div className="app-modal-backdrop" onClick={onClose}></div>
            <div className="app-modal-card">
                <div className="app-modal-body">
                    <div className="app-modal-confirm-icon warning">
                        <IconLogout />
                    </div>
                    <div className="app-modal-confirm-text">
                        <h4>¿Cerrar sesión?</h4>
                        <p>Tendrás que volver a ingresar para publicar avisos y ver tus mensajes.</p>
                    </div>
                </div>
                <div className="app-modal-footer">
                    <button type="button" className="btn-secondary" onClick={onClose}>
                        Cancelar
                    </button>
                    <button type="button" className="btn-danger-account" onClick={onConfirm}>
                        <IconLogout /> Cerrar sesión
                    </button>
                </div>
            </div>
        </div>
    );
}