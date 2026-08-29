'use client';

import { useState, useEffect } from 'react';
import { showToast } from '@/components/global/Toast';

interface ModalReportarUsuarioProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function ModalReportarUsuario({ isOpen, onClose }: ModalReportarUsuarioProps) {
    const [motivo, setMotivo] = useState('');

    useEffect(() => {
        if (isOpen) setMotivo('');
    }, [isOpen]);

    if (!isOpen) return null;

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
                        onClick={() => {
                            if (!motivo.trim()) {
                                showToast('Cuéntanos brevemente el motivo del reporte', 'warning');
                                return;
                            }
                            onClose();
                            showToast('Reporte enviado. Nuestro equipo lo revisará.', 'success');
                        }}
                    >
                        <i className="ti ti-flag"></i> Enviar reporte
                    </button>
                </div>
            </div>
        </div>
    );
}