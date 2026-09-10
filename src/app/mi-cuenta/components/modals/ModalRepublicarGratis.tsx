'use client';

import { useState } from 'react';
import { showToast } from '@/components/global/Toast';
import { updateReport, ReportsApiError } from '@/lib/reportsApi';

interface ModalRepublicarGratisProps {
    isOpen: boolean;
    id: string;
    onClose: () => void;
    onRepublished: () => void;
    onConPlanDePago: (id: string) => void;
}

export default function ModalRepublicarGratis({
    isOpen,
    id,
    onClose,
    onRepublished,
    onConPlanDePago,
}: ModalRepublicarGratisProps) {
    const [isProcessing, setIsProcessing] = useState(false);

    if (!isOpen) return null;

    const handlePublicarGratis = async () => {
        setIsProcessing(true);
        try {
            // PUT vacío — confirmado con backend: alcanza para reabrir un
            // aviso finalizado (spam/resolved), lo manda a pending_approval
            // sin necesitar cambiar ningún campo.
            await updateReport(id, {});
            onClose();
            onRepublished();
            showToast('Tu aviso fue enviado a revisión nuevamente', 'info');
        } catch (err) {
            const message = err instanceof ReportsApiError ? err.message : 'No pudimos volver a publicar tu aviso. Intenta de nuevo.';
            showToast(message, 'error');
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className="app-modal open" id="modal-republicar-gratis">
            <div className="app-modal-backdrop" onClick={onClose}></div>
            <div className="app-modal-card">
                <div className="app-modal-body">
                    <div className="app-modal-confirm-icon warning">
                        <i className="ti ti-refresh"></i>
                    </div>
                    <div className="app-modal-confirm-text">
                        <h4>¿Volver a publicar este aviso?</h4>
                        <p>
                            Pasaron más de <b>6 meses</b> y tu aviso fue archivado de Explorar. Puedes republicarlo <b>gratis</b> — pasará de nuevo por revisión antes de mostrarse.
                        </p>
                    </div>

                    <div className="admin-info-box">
                        <i className="ti ti-bulb"></i>
                        <p>
                            ¿Buscas que llegue a <b>más personas</b> esta vez? Puedes activarlo directo con un plan de pago.
                        </p>
                    </div>
                </div>
                <div className="app-modal-footer" style={{ justifyContent: 'space-between' }}>
                    <button type="button" className="btn-secondary" onClick={onClose}>
                        Cancelar
                    </button>
                    <div style={{ display: 'flex', gap: '0.5em' }}>
                        <button
                            type="button"
                            className="btn-secondary"
                            onClick={() => {
                                onClose();
                                onConPlanDePago(id);
                            }}
                        >
                            <i className="ti ti-broadcast"></i> Con plan de pago
                        </button>
                        <button
                            type="button"
                            className="btn-publish"
                            disabled={isProcessing}
                            onClick={handlePublicarGratis}
                        >
                            <i className="ti ti-check"></i> {isProcessing ? 'Publicando...' : 'Publicar gratis'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}