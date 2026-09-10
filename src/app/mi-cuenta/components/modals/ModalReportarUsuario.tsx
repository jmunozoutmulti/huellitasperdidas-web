'use client';

import { useState, useEffect } from 'react';
import { showToast } from '@/components/global/Toast';
import { reportUser, MessagesApiError } from '@/lib/messagesApi';

interface ModalReportarUsuarioProps {
    isOpen: boolean;
    userId: string;
    conversationId?: string;
    onClose: () => void;
}

export default function ModalReportarUsuario({ isOpen, userId, conversationId, onClose }: ModalReportarUsuarioProps) {
    const [motivo, setMotivo] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setMotivo('');
            setIsProcessing(false);
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const handleEnviar = async () => {
        if (!motivo.trim()) {
            showToast('Cuéntanos brevemente el motivo del reporte', 'warning');
            return;
        }
        setIsProcessing(true);
        try {
            await reportUser(userId, motivo.trim(), conversationId);
            onClose();
            showToast('Reporte enviado. Nuestro equipo lo revisará.', 'success');
        } catch (err) {
            const message = err instanceof MessagesApiError ? err.message : 'No pudimos enviar el reporte. Intenta de nuevo.';
            showToast(message, 'error');
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className="app-modal open" id="modal-reportar-usuario">
            <div className="app-modal-backdrop" onClick={onClose}></div>
            <div className="app-modal-card">
                <div className="app-modal-header">
                    <h3>Reportar usuario</h3>
                    <button type="button" className="app-modal-close" onClick={onClose}>
                        <i className="ti ti-x"></i>
                    </button>
                </div>
                <div className="app-modal-body">
                    <div className="form-group">
                        <label className="form-label">Explica los motivos del reporte</label>
                        <textarea
                            className="form-textarea"
                            rows={4}
                            placeholder="Describe qué ocurrió..."
                            value={motivo}
                            onChange={(e) => setMotivo(e.target.value)}
                        ></textarea>
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
                        onClick={handleEnviar}
                    >
                        <i className="ti ti-flag"></i> {isProcessing ? 'Enviando...' : 'Enviar reporte'}
                    </button>
                </div>
            </div>
        </div>
    );
}