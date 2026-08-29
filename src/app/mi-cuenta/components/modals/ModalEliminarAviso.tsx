'use client';

import { showToast } from '@/components/global/Toast';

interface ModalEliminarAvisoProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
}

export default function ModalEliminarAviso({ isOpen, onClose, onConfirm }: ModalEliminarAvisoProps) {
    if (!isOpen) return null;

    return (
        <div className="app-modal open" id="modal-eliminar-aviso">
            <div className="app-modal-backdrop" onClick={onClose}></div>
            <div className="app-modal-card">
                <div className="app-modal-body">
                    <div className="app-modal-confirm-icon danger">
                        <i className="ti ti-trash"></i>
                    </div>
                    <div className="app-modal-confirm-text">
                        <h4>¿Eliminar este anuncio?</h4>
                        <p>
                            Se borrará de forma <b>permanente</b>, junto con sus fotos, estadísticas e historial. Esta acción no se puede deshacer.
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
                        id="btn-confirmar-eliminar-aviso"
                        onClick={() => {
                            onConfirm();
                            onClose();
                            showToast('El anuncio fue eliminado permanentemente.', 'success');
                        }}
                    >
                        <i className="ti ti-trash"></i> Sí, eliminar definitivamente
                    </button>
                </div>
            </div>
        </div>
    );
}