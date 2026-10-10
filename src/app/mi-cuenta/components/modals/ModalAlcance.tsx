'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { showToast } from '@/components/global/Toast';
import { fetchReport, type ReportDetail } from '@/lib/api';
import { purchaseExtraReach, ReportsApiError } from '@/lib/reportsApi';
import { getPackages, type PackageOption, type ReachOption } from '@/lib/packagesApi';
import { getCountryByAbbr, getLocaleForCountry } from '@/lib/countries';
import type { PaymentInfo } from '@/lib/paymentsApi';
import CheckoutPago from '@/components/checkout/CheckoutPago';
import {
    IconLoader,
    IconTrendingUp,
    IconX,
    IconInfoCircle,
    IconRadar2,
    IconRadar,
    IconCheck,
    IconShieldCheck,
    IconCurrentLocation
} from '@tabler/icons-react';

interface ModalAlcanceProps {
    isOpen: boolean;
    id: string;
    onClose: () => void;
    onPurchased: () => void;
}

export default function ModalAlcance({ isOpen, id, onClose, onPurchased }: ModalAlcanceProps) {
    const [pub, setPub] = useState<ReportDetail | null>(null);
    const [pkg, setPkg] = useState<PackageOption | null>(null);
    const [currencySymbol, setCurrencySymbol] = useState('');
    const [currencyCode, setCurrencyCode] = useState('');
    const [isLoading, setIsLoading] = useState(true);

    const [step, setStep] = useState<1 | 2>(1);
    const [radiusKm, setRadiusKm] = useState<number | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [pendingPayment, setPendingPayment] = useState<PaymentInfo | null>(null);
    const idempotencyKeyRef = useRef<string | null>(null);

    useEffect(() => {
        if (!isOpen || !id) return;
        let isCancelled = false;
        setStep(1);
        setRadiusKm(null);
        setPendingPayment(null);
        idempotencyKeyRef.current = null;
        setPub(null);
        setPkg(null);
        setIsLoading(true);

        fetchReport(id).then(async (report) => {
            if (isCancelled) return;
            setPub(report);
            if (report.package_slug && report.country) {
                const [pkgs, country] = await Promise.all([
                    getPackages(report.country),
                    getCountryByAbbr(report.country),
                ]);
                if (isCancelled) return;
                const foundPkg = pkgs.find((p) => p.slug === report.package_slug) ?? null;
                setPkg(foundPkg);
                setCurrencySymbol(country?.currencySymbol ?? '');
                setCurrencyCode(country?.code !== 'PE' ? country?.currency ?? '' : '');
                setRadiusKm(foundPkg?.reachOptions[0]?.radiusKm ?? null);
            }
            setIsLoading(false);
        }).catch((err) => {
            if (isCancelled) return;
            console.error('Error cargando datos para alcance:', err);
            setIsLoading(false);
        });

        return () => {
            isCancelled = true;
        };
    }, [isOpen, id]);

    const handlePaymentConfirmed = useCallback(() => {
        onClose();
        onPurchased();
        showToast('¡Pago confirmado! Tu aviso quedará activo en cuanto nuestro equipo lo revise.', 'success');
    }, [onClose, onPurchased]);

    const handlePaymentTimeout = useCallback(() => {
        onClose();
        onPurchased();
        showToast('Tu pago está siendo confirmado, puede tardar unos minutos. Revisa "Mis avisos" en un momento.', 'info');
    }, [onClose, onPurchased]);

    const handlePaymentCancelled = useCallback(() => {
        showToast('No pudimos procesar el pago. Puedes intentarlo de nuevo.', 'error');
    }, []);

    if (!isOpen) return null;

    if (isLoading) {
        return (
            <div id="alcance-modal-overlay" className="planes-modal-overlay">
                <div className="planes-modal-backdrop" onClick={onClose}></div>
                <div className="planes-modal-card">
                    <div className="admin-info-box info-box-revision">
                        <IconLoader />
                        <p>Cargando...</p>
                    </div>
                </div>
            </div>
        );
    }

    if (!currencySymbol || !pkg || pkg.reachOptions.length === 0) {
        return (
            <div id="alcance-modal-overlay" className="planes-modal-overlay">
                <div className="planes-modal-backdrop" onClick={onClose}></div>
                <div className="planes-modal-card">
                    <div className="planes-modal-header">
                        <div>
                            <span className="planes-modal-eyebrow">
                                <IconTrendingUp /> Llegar a más personas
                            </span>
                        </div>
                        <button type="button" className="planes-modal-close" onClick={onClose}>
                            <IconX />
                        </button>
                    </div>
                    <div className="admin-info-box">
                        <IconInfoCircle />
                        <p>Este plan todavía no tiene opciones de alcance extra configuradas para tu país. Vuelve más tarde.</p>
                    </div>
                </div>
            </div>
        );
    }

    const tier: ReachOption | undefined = pkg.reachOptions.find((t) => t.radiusKm === radiusKm) ?? pkg.reachOptions[0];

    const handlePagar = async () => {
        if (!tier) return;
        if (!idempotencyKeyRef.current) {
            idempotencyKeyRef.current = crypto.randomUUID();
        }
        setIsProcessing(true);
        try {
            const { payment } = await purchaseExtraReach(id, tier.radiusKm, idempotencyKeyRef.current);
            if (payment) {
                setPendingPayment(payment);
                setStep(2);
            } else {
                onClose();
                onPurchased();
                showToast('¡Listo! Validaremos la solicitud y ampliaremos el alcance de tu aviso.', 'success');
            }
        } catch (err) {
            const message = err instanceof ReportsApiError ? err.message : 'No pudimos procesar tu compra. Intenta de nuevo.';
            showToast(message, 'error');
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div id="alcance-modal-overlay" className="planes-modal-overlay">
            <div className="planes-modal-backdrop" onClick={onClose}></div>
            <div className="planes-modal-card">
                <div className="planes-modal-header">
                    <div>
                        <span className="planes-modal-eyebrow">
                            <IconTrendingUp /> Llegar a más personas
                        </span>
                    </div>
                    <button type="button" className="planes-modal-close" onClick={onClose}>
                        <IconX />
                    </button>
                </div>

                {/* PASO 1: SELECCIÓN DE ALCANCE */}
                {step === 1 && tier && (
                    <div id="alcance-modal-step-1">
                        <div className="alcance-radar-preview">
                            <div className="alcance-radar-box">
                                <div className="alcance-radar-ring-base"></div>
                                <div className={`alcance-radar-ring-growth level-${pkg.reachOptions.findIndex((t) => t.radiusKm === tier.radiusKm) + 1}`}></div>

                                <div className="alcance-radar-center">
                                    <div className="alcance-radar-pin">
                                        <IconCurrentLocation />
                                    </div>
                                    <span className="badge-plan badge-plan-radar">
                                        <span className="status-pulse"></span> Anuncio
                                    </span>
                                </div>
                            </div>
                            <p className="alcance-radar-caption">
                                <IconTrendingUp />
                                Incrementas tu alcance a un radio de <b>{tier.radiusKm} km</b>
                            </p>
                        </div>

                        <div className="zona-options-grid">
                            {pkg.reachOptions.map((t) => (
                                <label key={t.radiusKm} className="zona-option-label">
                                    <input
                                        type="radio"
                                        name="alcance-extra"
                                        value={t.radiusKm}
                                        checked={radiusKm === t.radiusKm}
                                        onChange={() => setRadiusKm(t.radiusKm)}
                                    />
                                    <div className="zona-option-item">
                                        <div className="zona-option-top">
                                            <div className="zona-icon">
                                                <IconRadar2 />
                                            </div>
                                            <span className="zona-km">{t.radiusKm} km</span>
                                            <span className="zona-reach">
                                                {t.estimatedReach && (
                                                    <>
                                                        Hasta <b>{Number(t.estimatedReach).toLocaleString(getLocaleForCountry(pub?.country))}</b> personas
                                                    </>
                                                )}
                                            </span>
                                        </div>
                                        <div className="zona-precio">
                                            <span><i>{currencySymbol}</i> {t.price} {currencyCode}</span>
                                        </div>
                                    </div>
                                </label>
                            ))}
                        </div>

                        <div className="planes-modal-actions">
                            <div className="text-modal">
                                <IconRadar /> El alcance se suma a tu plan actual
                            </div>
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
                                        <IconCheck /> Continuar
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                )}

                {/* PASO 2: PASARELA DE PAGO DIRECTA */}
                {step === 2 && tier && pendingPayment && (
                    <div id="alcance-modal-step-2">
                        <div className="modal-summary">
                            <div className="planes-modal-summary-bar">
                                <div className="planes-summary-body">
                                    <span className="planes-summary-label">Alcance seleccionado</span>
                                    <h5>{tier.radiusKm} km adicionales</h5>
                                </div>
                                <div className="planes-summary-price">{currencySymbol} {tier.price} {currencyCode}</div>
                            </div>

                            <div className="payment-gateway-box">
                                <h4>
                                    <IconShieldCheck /> Pago seguro
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