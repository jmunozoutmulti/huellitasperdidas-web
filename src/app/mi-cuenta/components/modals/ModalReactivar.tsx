'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { showToast } from '@/components/global/Toast';
import { fetchReport, type ReportDetail } from '@/lib/api';
import { reactivateReport, ReportsApiError } from '@/lib/reportsApi';
import { getPackages, type PackageOption } from '@/lib/packagesApi';
import { getCountryByAbbr } from '@/lib/countries';
import type { PaymentInfo } from '@/lib/paymentsApi';
import CheckoutPago from '@/components/checkout/CheckoutPago';
import {
    IconRefresh,
    IconX,
    IconInfoCircle,
    IconLoader,
    IconShieldCheck
} from '@tabler/icons-react';

interface ModalReactivarProps {
    isOpen: boolean;
    id: string;
    onClose: () => void;
    onReactivated: () => void;
}

export default function ModalReactivar({ isOpen, id, onClose, onReactivated }: ModalReactivarProps) {
    const [pub, setPub] = useState<ReportDetail | null>(null);
    const [pkg, setPkg] = useState<PackageOption | null>(null);
    const [currencySymbol, setCurrencySymbol] = useState('');
    const [currencyCode, setCurrencyCode] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [pendingPayment, setPendingPayment] = useState<PaymentInfo | null>(null);
    const idempotencyKeyRef = useRef<string | null>(null);

    useEffect(() => {
        if (!isOpen || !id) return;
        setPub(null);
        setPkg(null);
        setCurrencySymbol('');
        setCurrencyCode('');
        setPendingPayment(null);
        setIsLoading(true);
        idempotencyKeyRef.current = null;

        fetchReport(id).then(async (report) => {
            setPub(report);
            if (report.package_slug && report.country) {
                const [pkgs, country] = await Promise.all([
                    getPackages(report.country),
                    getCountryByAbbr(report.country),
                ]);
                const foundPkg = pkgs.find((p) => p.slug === report.package_slug) ?? null;
                setPkg(foundPkg);
                setCurrencySymbol(country?.currencySymbol ?? '');
                setCurrencyCode(country?.code !== 'PE' ? country?.currency ?? '' : '');

                if (!idempotencyKeyRef.current) {
                    idempotencyKeyRef.current = crypto.randomUUID();
                }
                try {
                    const { payment } = await reactivateReport(id, report.package_slug, idempotencyKeyRef.current);
                    if (payment) {
                        setPendingPayment(payment);
                    }
                } catch (err) {
                    const message = err instanceof ReportsApiError ? err.message : 'No pudimos cargar las opciones de pago.';
                    showToast(message, 'error');
                }
            }
            setIsLoading(false);
        }).catch((err) => {
            console.error('Error cargando datos para reactivar:', err);
            setIsLoading(false);
        });
    }, [isOpen, id]);

    const handlePaymentConfirmed = useCallback(() => {
        onClose();
        onReactivated();
        showToast('¡Pago confirmado! Tu aviso quedará activo en cuanto nuestro equipo lo revise.', 'success');
    }, [onClose, onReactivated]);

    const handlePaymentTimeout = useCallback(() => {
        onClose();
        onReactivated();
        showToast('Tu pago está siendo confirmado, puede tardar unos minutos. Revisa "Mis avisos" en un momento.', 'info');
    }, [onClose, onReactivated]);

    const handlePaymentCancelled = useCallback(() => {
        showToast('No pudimos procesar el pago. Puedes intentarlo de nuevo.', 'error');
    }, []);

    if (!isOpen) return null;

    return (
        <div className="planes-modal-overlay">
            <div className="planes-modal-backdrop" onClick={onClose}></div>
            <div className="planes-modal-card">
                <div className="planes-modal-header">
                    <div>
                        <span className="planes-modal-eyebrow">
                            <IconRefresh /> Reactivar anuncio
                        </span>
                    </div>
                    <button type="button" className="planes-modal-close" onClick={onClose}>
                        <IconX />
                    </button>
                </div>

                <div className="admin-info-box">
                    <IconInfoCircle />
                    <p>
                        Tu aviso se reactivará con los <b>mismos datos, fotos y plan</b> con los que fue publicado originalmente.
                    </p>
                </div>

                {isLoading || !pub || !pkg ? (
                    <div className="admin-info-box">
                        <IconLoader />
                        <p>Cargando opciones de pago...</p>
                    </div>
                ) : (
                    <div id="reactivar-modal-checkout">
                        <div className="modal-summary">
                            <div className="planes-modal-summary-bar">
                                <div className="planes-summary-body">
                                    <span className="planes-summary-label">Reactivas con</span>
                                    <h5>{pkg.name}</h5>
                                    <span>{pkg.days} días de difusión</span>
                                </div>
                                <div className="planes-summary-price">{currencySymbol} {pkg.price} {currencyCode}</div>
                            </div>

                            {/* Pasarela directa */}
                            {pendingPayment && (
                                <div className="payment-gateway-box">
                                    <h4>
                                        <IconShieldCheck /> Pago seguro
                                    </h4>
                                    <CheckoutPago
                                        payment={pendingPayment}
                                        reportId={id}
                                        country={pub.country}
                                        onConfirmed={handlePaymentConfirmed}
                                        onTimeout={handlePaymentTimeout}
                                        onCancelled={handlePaymentCancelled}
                                    />
                                    <span className='text-chat'>¿Problemas con tu pago? <a href="https://tawk.to/chat/6aba144ddff27f343f63f5c8/1k3jduk17?layout=modern" target='blank'>Escríbenos aquí</a> y te ayudamos.</span>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}