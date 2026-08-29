'use client';

import { useState, useEffect } from 'react';
import { showToast } from '@/components/global/Toast';
import {
    getPublicationById,
    stopPublication,
    planLabel,
    isPaidPlan,
    getDiasRestantes,
    calculateRefund,
    type MockPublication,
} from '@/lib/publications';

interface ModalDetenerProps {
    isOpen: boolean;
    id: string;
    onClose: () => void;
    onStopped: () => void;
}

export default function ModalDetener({ isOpen, id, onClose, onStopped }: ModalDetenerProps) {
    const [pub, setPub] = useState<MockPublication | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);

    useEffect(() => {
        if (!isOpen || !id) return;
        setPub(null);
        getPublicationById(id).then(setPub);
    }, [isOpen, id]);

    if (!isOpen) return null;

    const paid = pub ? isPaidPlan(pub.plan) : false;
    const diasRestantes = pub ? getDiasRestantes(pub.expires_at) : 0;
    const montoReembolso = pub ? calculateRefund(pub) : 0;
    const planNombre = pub ? planLabel(pub.plan) : '';

    const handleConfirm = async () => {
        setIsProcessing(true);
        await stopPublication(id);
        setIsProcessing(false);
        onClose();
        onStopped();
        showToast('El anuncio fue detenido correctamente.', 'success');
    };

    return (
        <div className="app-modal open" id="modal-detener">
            <div className="app-modal-backdrop" onClick={onClose}></div>
            <div className="app-modal-card">
                <div className="app-modal-body">
                    <div className="app-modal-confirm-icon warning">
                        <i className="ti ti-ban"></i>
                    </div>
                    <div className="app-modal-confirm-text">
                        <h4>¿Detener este anuncio?</h4>
                        <p>Se dejará de mostrar de inmediato en el buscador y las redes conectadas.</p>
                    </div>

                    {!pub ? (
                        <div className="admin-info-box">
                            <i className="ti ti-loader"></i>
                            <p>Cargando datos del aviso...</p>
                        </div>
                    ) : paid ? (
                        <div className="admin-info-box" id="detener-reembolso-box">
                            <i className="fa-regular fa-credit-card"></i>
                            <p>
                                Te quedan <b>{diasRestantes}</b> días sin usar de tu{' '}
                                <b>{planNombre}</b>. Te reembolsaremos{' '}
                                <b>S/. {montoReembolso}</b> a tu método de pago original.
                            </p>
                        </div>
                    ) : (
                        <div className="admin-info-box" id="detener-sin-reembolso-box">
                            <i className="ti ti-info-circle"></i>
                            <p>Este anuncio no tiene un plan de pago activo, así que no aplica reembolso.</p>
                        </div>
                    )}
                </div>
                <div className="app-modal-footer">
                    <button type="button" className="btn-secondary" onClick={onClose}>
                        Cancelar
                    </button>
                    <button
                        type="button"
                        className="btn-danger-account"
                        id="btn-confirmar-detener"
                        disabled={!pub || isProcessing}
                        onClick={handleConfirm}
                    >
                        <i className="ti ti-ban"></i> {isProcessing ? 'Deteniendo...' : 'Sí, detener anuncio'}
                    </button>
                </div>
            </div>
        </div>
    );
}