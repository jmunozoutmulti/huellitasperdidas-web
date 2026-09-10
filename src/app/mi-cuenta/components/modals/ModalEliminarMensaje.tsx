'use client';

import { useState } from 'react';
import { showToast } from '@/components/global/Toast';
import { deleteConversation, MessagesApiError } from '@/lib/messagesApi';

interface ModalEliminarMensajeProps {
    isOpen: boolean;
    conversationId: string;
    onClose: () => void;
    onDeleted: () => void;
}

export default function ModalEliminarMensaje({
    isOpen,
    conversationId,
    onClose,
    onDeleted,
}: ModalEliminarMensajeProps) {
    const [isProcessing, setIsProcessing] = useState(false);

    if (!isOpen) return null;

    const handleConfirm = async () => {
        setIsProcessing(true);
        try {
            await deleteConversation(conversationId);
            onClose();
            onDeleted();
            showToast('Conversación eliminada.', 'success');
        } catch (err) {
            const message = err instanceof MessagesApiError ? err.message : 'No pudimos eliminar la conversación. Intenta de nuevo.';
            showToast(message, 'error');
        } finally {
            setIsProcessing(false);
        }
    };

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
                            Se borrará de tu bandeja. Si la otra persona te escribe de nuevo, volverá a aparecer.
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
                        <i className="ti ti-trash"></i> {isProcessing ? 'Eliminando...' : 'Sí, eliminar'}
                    </button>
                </div>
            </div>
        </div>
    );
}