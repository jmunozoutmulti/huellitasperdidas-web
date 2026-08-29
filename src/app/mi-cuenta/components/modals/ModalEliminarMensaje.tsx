'use client';

import { showToast } from '@/components/global/Toast';

interface ModalEliminarMensajeProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
}

export default function ModalEliminarMensaje({
    isOpen,
    onClose,
    onConfirm,
}: ModalEliminarMensajeProps) {
    if (!isOpen) return null;

    return (
        <div className="app-modal open" id="modal-eliminar-mensaje">
            <div className="app-modal-backdrop" onClick={onClose}></div>
            <div className="app-modal-card">
                <div className="app-modal-body">
                    <div className="app-modal-confirm-icon danger">
                        <i className="ti ti-trash"></i>
                    </div>
                    <div className="app-modal-confirm-text">
                        <h4>¿Eliminar esta conversación?</h4>
                        <p>
                            Se borrará de tu bandeja de forma <b>permanente</b>. Esta acción no se puede deshacer.
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
                        onClick={() => {
                            onConfirm();
                            onClose();
                            showToast('Conversación eliminada.', 'success');
                        }}
                    >
                        <i className="ti ti-trash"></i> Sí, eliminar
                    </button>
                </div>
            </div>
        </div>
    );
}