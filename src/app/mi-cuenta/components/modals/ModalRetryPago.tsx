'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { showToast } from '@/components/global/Toast';
import { fetchReport, type ReportDetail } from '@/lib/api';
import { retryPayment, ReportsApiError } from '@/lib/reportsApi';
import type { PaymentInfo } from '@/lib/paymentsApi';
import CheckoutPago from '@/components/checkout/CheckoutPago';

interface ModalRetryPagoProps {
    isOpen: boolean;
    id: string;
    onClose: () => void;
    onPaid: () => void;
}

export default function ModalRetryPago({ isOpen, id, onClose, onPaid }: ModalRetryPagoProps) {
    const [pub, setPub] = useState<ReportDetail | null>(null);
    const [pendingPayment, setPendingPayment] = useState<PaymentInfo | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const idempotencyKeyRef = useRef<string | null>(null);

    useEffect(() => {
        if (!isOpen || !id) return;
        setPub(null);
        setPendingPayment(null);
        setIsLoading(true);
        idempotencyKeyRef.current = crypto.randomUUID();

        Promise.all([
            fetchReport(id),
            retryPayment(id, idempotencyKeyRef.current),
        ])
            .then(([report, { payment }]) => {
                setPub(report);
                setPendingPayment(payment);
            })
            .catch((err) => {
                const message = err instanceof ReportsApiError ? err.message : 'No pudimos generar un nuevo intento de pago.';
                showToast(message, 'error');
                onClose();
            })
            .finally(() => setIsLoading(false));
    }, [isOpen, id]);

    const handlePaymentConfirmed = useCallback(() => {
        onClose();
        onPaid();
        showToast('¡Pago confirmado! Tu aviso quedará activo en cuanto nuestro equipo lo revise.', 'success');
    }, [onClose, onPaid]);

    const handlePaymentTimeout = useCallback(() => {
        onClose();
        onPaid();
        showToast('Tu pago está siendo confirmado, puede tardar unos minutos. Revisa "Mis avisos" en un momento.', 'info');
    }, [onClose, onPaid]);

    const handlePaymentCancelled = useCallback(() => {
        showToast('No pudimos procesar el pago. Puedes intentarlo de nuevo.', 'error');
    }, []);

    if (!isOpen) return null;

    return (
        <div className="planes-modal-overlay">
            <div className="planes-modal-backdrop" onClick={onClose}></div>
            <div className="planes-modal-card" style={{ maxWidth: "40em" }}>
                <div className="planes-modal-header">
                    <div>
                        <span className="planes-modal-eyebrow">
                            <i className="ti ti-credit-card-pay"></i> Terminar de pagar
                        </span>
                    </div>
                    <button type="button" className="planes-modal-close" onClick={onClose}>
                        <i className="ti ti-x"></i>
                    </button>
                </div>

                {isLoading || !pendingPayment ? (
                    <div className="admin-info-box info-box-revision">
                        <i className="ti ti-loader"></i>
                        <p>Preparando tu pago...</p>
                    </div>
                ) : (
                    <div className="payment-gateway-box">
                        <h4>
                            <i className="fa-solid fa-shield-halved"></i> Pago seguro
                        </h4>
                        <CheckoutPago
                            payment={pendingPayment}
                            reportId={id}
                            country={pub?.country}
                            onConfirmed={handlePaymentConfirmed}
                            onTimeout={handlePaymentTimeout}
                            onCancelled={handlePaymentCancelled}
                        />
                        <span className='text-chat'>¿Problemas con tu pago? <a href="https://tawk.to/chat/6aba144ddff27f343f63f5c8/1k3jduk17?layout=modern" target='blank'>Escríbenos aquí</a> y te ayudamos.</span>
                    </div>
                )}
            </div>
        </div>
    );
}