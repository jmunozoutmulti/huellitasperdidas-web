'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { showToast } from '@/components/global/Toast';
import { fetchReport, type ReportDetail } from '@/lib/api';
import { extendReportTime, ReportsApiError } from '@/lib/reportsApi';
import { getPackages, type PackageOption, type ExtensionOption } from '@/lib/packagesApi';
import { getCountryByAbbr, getLocaleForCountry } from '@/lib/countries';
import type { PaymentInfo } from '@/lib/paymentsApi';
import CheckoutPago from '@/components/checkout/CheckoutPago';

interface ModalTiempoProps {
    isOpen: boolean;
    id: string;
    onClose: () => void;
    onExtended: () => void;
}

export default function ModalTiempo({ isOpen, id, onClose, onExtended }: ModalTiempoProps) {
    const [pub, setPub] = useState<ReportDetail | null>(null);
    const [pkg, setPkg] = useState<PackageOption | null>(null);
    const [currencySymbol, setCurrencySymbol] = useState('');
    const [currencyCode, setCurrencyCode] = useState('');
    const [isLoading, setIsLoading] = useState(true);

    const [step, setStep] = useState<1 | 2>(1);
    const [extraDays, setExtraDays] = useState<number | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [pendingPayment, setPendingPayment] = useState<PaymentInfo | null>(null);
    const idempotencyKeyRef = useRef<string | null>(null);

    useEffect(() => {
        if (!isOpen || !id) return;
        setStep(1);
        setExtraDays(null);
        setPendingPayment(null);
        idempotencyKeyRef.current = null;
        setPub(null);
        setPkg(null);
        setIsLoading(true);

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
                setExtraDays(foundPkg?.extensionOptions[0]?.extraDays ?? null);
            }
            setIsLoading(false);
        }).catch((err) => {
            console.error('Error cargando datos para extender tiempo:', err);
            setIsLoading(false);
        });
    }, [isOpen, id]);

    const handlePaymentConfirmed = useCallback(() => {
        onClose();
        onExtended();
        showToast('¡Pago confirmado! Tu aviso quedará activo en cuanto nuestro equipo lo revise.', 'success');
    }, [onClose, onExtended]);

    const handlePaymentTimeout = useCallback(() => {
        onClose();
        onExtended();
        showToast('Tu pago está siendo confirmado, puede tardar unos minutos. Revisa "Mis avisos" en un momento.', 'info');
    }, [onClose, onExtended]);

    const handlePaymentCancelled = useCallback(() => {
        showToast('No pudimos procesar el pago. Puedes intentarlo de nuevo.', 'error');
    }, []);

    if (!isOpen) return null;

    if (isLoading) {
        return (
            <div className="planes-modal-overlay">
                <div className="planes-modal-backdrop" onClick={onClose}></div>
                <div className="planes-modal-card">
                    <div className="admin-info-box info-box-revision">
                        <i className="ti ti-loader"></i>
                        <p>Cargando...</p>
                    </div>
                </div>
            </div>
        );
    }

    if (!currencySymbol || !pkg || pkg.extensionOptions.length === 0) {
        return (
            <div className="planes-modal-overlay">
                <div className="planes-modal-backdrop" onClick={onClose}></div>
                <div className="planes-modal-card">
                    <div className="planes-modal-header">
                        <div>
                            <span className="planes-modal-eyebrow">
                                <i className="ti ti-history"></i> Ampliar tiempo del aviso
                            </span>
                        </div>
                        <button type="button" className="planes-modal-close" onClick={onClose}>
                            <i className="ti ti-x"></i>
                        </button>
                    </div>
                    <div className="admin-info-box">
                        <i className="ti ti-info-circle"></i>
                        <p>Este plan todavía no tiene opciones de tiempo adicional configuradas para tu país. Vuelve más tarde.</p>
                    </div>
                </div>
            </div>
        );
    }

    const tier: ExtensionOption | undefined = pkg.extensionOptions.find((t) => t.extraDays === extraDays) ?? pkg.extensionOptions[0];

    const fechaVence = pub?.expires_at ? new Date(pub.expires_at) : new Date();
    const fechaNueva = new Date(fechaVence);
    fechaNueva.setDate(fechaVence.getDate() + (tier?.extraDays ?? 0));

    const opcionesCorta: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' };
    const opcionesLarga: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long' };
    const locale = getLocaleForCountry(pub?.country);
    const fechaVenceCorta = fechaVence.toLocaleDateString(locale, opcionesCorta).replace('.', '');
    const fechaNuevaCorta = fechaNueva.toLocaleDateString(locale, opcionesCorta).replace('.', '');
    const fechaNuevaLarga = fechaNueva.toLocaleDateString(locale, opcionesLarga);

    const handlePagar = async () => {
        if (!tier) return;
        if (!idempotencyKeyRef.current) {
            idempotencyKeyRef.current = crypto.randomUUID();
        }
        setIsProcessing(true);
        try {
            const { payment } = await extendReportTime(id, tier.extraDays, idempotencyKeyRef.current);
            if (payment) {
                setPendingPayment(payment);
                setStep(2);
            } else {
                onClose();
                onExtended();
                showToast('¡Listo! Registramos tu solicitud. Validaremos y aprobaremos la extensión.', 'success');
            }
        } catch (err) {
            const message = err instanceof ReportsApiError ? err.message : 'No pudimos procesar tu compra. Intenta de nuevo.';
            showToast(message, 'error');
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className="planes-modal-overlay">
            <div className="planes-modal-backdrop" onClick={onClose}></div>
            <div className="planes-modal-card">
                <div className="planes-modal-header">
                    <div>
                        <span className="planes-modal-eyebrow">
                            <i className="ti ti-history"></i> Ampliar tiempo del aviso
                        </span>
                    </div>
                    <button type="button" className="planes-modal-close" onClick={onClose}>
                        <i className="ti ti-x"></i>
                    </button>
                </div>

                {/* PASO 1: SELECCIÓN */}
                {step === 1 && tier && (
                    <div id="tiempo-modal-step-1">
                        <div className="tiempo-timeline-preview">
                            <div className="tiempo-timeline-track">
                                <div className="tiempo-timeline-base"></div>
                                <div className={`tiempo-timeline-growth level-${pkg.extensionOptions.findIndex((t) => t.extraDays === tier.extraDays) + 1}`}></div>

                                <div className="tiempo-timeline-point point-hoy">
                                    <span className="tiempo-timeline-dot dot-hoy"></span>
                                    <span className="tiempo-timeline-label">Hoy</span>
                                </div>

                                <div className="tiempo-timeline-point point-vence">
                                    <span className="tiempo-timeline-dot dot-vence"></span>
                                    <span className="tiempo-timeline-label">
                                        Vencía<br /><b>{fechaVenceCorta}</b>
                                    </span>
                                </div>

                                <div className={`tiempo-timeline-point point-nueva level-${pkg.extensionOptions.findIndex((t) => t.extraDays === tier.extraDays) + 1}`}>
                                    <span className="tiempo-timeline-dot dot-nueva"></span>
                                    <span className="tiempo-timeline-label label-nueva">
                                        Nueva fecha<br /><b>{fechaNuevaCorta}</b>
                                    </span>
                                </div>
                            </div>

                            <p className="tiempo-timeline-caption">
                                <i className="ti ti-history"></i>
                                Tu aviso seguirá activo hasta el <b>{fechaNuevaLarga}</b>{' '}
                                <b>(+{tier.extraDays} días adicionales)</b>
                            </p>
                        </div>

                        <div className="zona-options-grid">
                            {pkg.extensionOptions.map((t) => (
                                <label key={t.extraDays} className="zona-option-label">
                                    <input
                                        type="radio"
                                        name="tiempo-extra"
                                        value={t.extraDays}
                                        checked={extraDays === t.extraDays}
                                        onChange={() => setExtraDays(t.extraDays)}
                                    />
                                    <div className="zona-option-item">
                                        <div className="zona-option-top">
                                            <div className="zona-icon">
                                                <i className="ti ti-calendar-plus animation-none"></i>
                                            </div>
                                            <span className="zona-km">+{t.extraDays} día{t.extraDays === 1 ? '' : 's'}</span>
                                        </div>
                                        <div className="zona-precio">
                                            <span><i>{currencySymbol}</i> {t.price} {currencyCode}</span>
                                        </div>
                                    </div>
                                </label>
                            ))}
                        </div>

                        <div className="planes-modal-actions">
                            <p className="tiempo-note">
                                <i className="ti ti-info-circle"></i> La ampliación mantiene activa la difusión.
                            </p>
                            <button
                                type="button"
                                className="btn-publish"
                                disabled={isProcessing}
                                onClick={handlePagar}
                            >
                                {isProcessing ? (
                                    'Procesando...'
                                ) : (
                                    <>
                                        <i className="ti ti-check"></i> Continuar
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                )}

                {/* PASO 2: PASARELA DE PAGO DIRECTA */}
                {step === 2 && tier && pendingPayment && (
                    <div id="tiempo-modal-step-2">
                        <div className="modal-summary">
                            <div className="planes-modal-summary-bar">
                                <div className="planes-summary-body">
                                    <span className="planes-summary-label">Tiempo seleccionado</span>
                                    <h5>+{tier.extraDays} día{tier.extraDays === 1 ? '' : 's'}</h5>
                                </div>
                                <div className="planes-summary-price">{currencySymbol} {tier.price} {currencyCode}</div>
                            </div>

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
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}