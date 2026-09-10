'use client';

import { useState } from 'react';
import { showToast } from '@/components/global/Toast';

interface ModalEliminarAvisoProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => Promise<void>;
}

export default function ModalEliminarAviso({ isOpen, onClose, onConfirm }: ModalEliminarAvisoProps) {
    const [isProcessing, setIsProcessing] = useState(false);

    if (!isOpen) return null;

    const handleConfirm = async () => {
        setIsProcessing(true);
        try {
            await onConfirm();
            onClose();
            showToast('El anuncio fue eliminado permanentemente.', 'success');
        } catch (err) {
            showToast('No pudimos eliminar el anuncio. Intenta de nuevo.', 'error');
        } finally {
            setIsProcessing(false);
        }
    };

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
                        disabled={isProcessing}
                        onClick={handleConfirm}
                    >
                        <i className="ti ti-trash"></i> {isProcessing ? 'Eliminando...' : 'Sí, eliminar definitivamente'}
                    </button>
                </div>
            </div>
        </div>
    );
}