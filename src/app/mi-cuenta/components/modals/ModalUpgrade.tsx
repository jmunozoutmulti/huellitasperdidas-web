'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { showToast } from '@/components/global/Toast';
import { fetchReport, type ReportDetail } from '@/lib/api';
import { upgradeReport, ReportsApiError } from '@/lib/reportsApi';
import { getPackages, type PackageOption } from '@/lib/packagesApi';
import { getCountryByAbbr, getLocaleForCountry } from '@/lib/countries';
import type { PaymentInfo } from '@/lib/paymentsApi';
import CheckoutPago from '@/components/checkout/CheckoutPago';
import {
    IconLoader,
    IconBroadcast,
    IconX,
    IconInfoCircle,
    IconUsers,
    IconBolt,
    IconCameraSearch,
    IconHelp,
    IconCheck,
    IconShieldCheck,
    IconCreditCard,
    IconBrandFacebook,
    IconBrandInstagram,
    IconBrandTiktok,
    IconBrandMessenger,
    IconCurrentLocation
} from '@tabler/icons-react';


interface ModalUpgradeProps {
    isOpen: boolean;
    id: string;
    onClose: () => void;
    onUpgraded: () => void;
}

export default function ModalUpgrade({ isOpen, id, onClose, onUpgraded }: ModalUpgradeProps) {
    const [pub, setPub] = useState<ReportDetail | null>(null);
    const [packages, setPackages] = useState<PackageOption[]>([]);
    const [currencySymbol, setCurrencySymbol] = useState('');
    const [currencyCode, setCurrencyCode] = useState('');
    const [isLoading, setIsLoading] = useState(true);

    const [step, setStep] = useState<1 | 2>(1);
    const [val, setVal] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [pendingPayment, setPendingPayment] = useState<PaymentInfo | null>(null);
    const idempotencyKeyRef = useRef<string | null>(null);

    useEffect(() => {
        if (!isOpen || !id) return;
        let isCancelled = false;
        setStep(1);
        setVal('');
        setPendingPayment(null);
        idempotencyKeyRef.current = null;
        setPub(null);
        setPackages([]);
        setIsLoading(true);

        fetchReport(id).then(async (report) => {
            if (isCancelled) return;
            setPub(report);
            if (report.country) {
                const [pkgs, country] = await Promise.all([
                    getPackages(report.country),
                    getCountryByAbbr(report.country),
                ]);
                if (isCancelled) return;
                const paidPackages = pkgs.filter((p) => p.price > 0);
                setPackages(paidPackages);
                setCurrencySymbol(country?.currencySymbol ?? '');
                setCurrencyCode(country?.code !== 'PE' ? country?.currency ?? '' : '');
                setVal(paidPackages[0]?.slug ?? '');
            }
            setIsLoading(false);
        }).catch((err) => {
            if (isCancelled) return;
            console.error('Error cargando datos para upgrade:', err);
            setIsLoading(false);
        });

        return () => {
            isCancelled = true;
        };
    }, [isOpen, id]);

    const handlePaymentConfirmed = useCallback(() => {
        onClose();
        onUpgraded();
        showToast('¡Pago confirmado! Tu aviso quedará activo en cuanto nuestro equipo lo revise.', 'success');
    }, [onClose, onUpgraded]);

    const handlePaymentTimeout = useCallback(() => {
        onClose();
        onUpgraded();
        showToast('Tu pago está siendo confirmado, puede tardar unos minutos. Revisa "Mis avisos" en un momento.', 'info');
    }, [onClose, onUpgraded]);

    const handlePaymentCancelled = useCallback(() => {
        showToast('No pudimos procesar el pago. Puedes intentarlo de nuevo.', 'error');
    }, []);

    if (!isOpen) return null;

    if (isLoading) {
        return (
            <div className="planes-modal-overlay">
                <div className="planes-modal-backdrop" onClick={onClose}></div>
                <div className="planes-modal-card wide">
                    <div className="admin-info-box info-box-revision">
                        <IconLoader />
                        <p>Cargando...</p>
                    </div>
                </div>
            </div>
        );
    }

    if (!currencySymbol || packages.length === 0) {
        return (
            <div className="planes-modal-overlay">
                <div className="planes-modal-backdrop" onClick={onClose}></div>
                <div className="planes-modal-card wide">
                    <div className="planes-modal-header">
                        <div>
                            <span className="planes-modal-eyebrow">
                                <IconBroadcast /> Pasar a plan de pago
                            </span>
                        </div>
                        <button type="button" className="planes-modal-close" onClick={onClose}>
                            <IconX />
                        </button>
                    </div>
                    <div className="admin-info-box">
                        <IconInfoCircle />
                        <p>Este país aún no está configurado para esta función. Vuelve más tarde.</p>
                    </div>
                </div>
            </div>
        );
    }

    const planActual = packages.find((p) => p.slug === val) ?? packages[0];

    const handlePagar = async () => {
        if (!idempotencyKeyRef.current) {
            idempotencyKeyRef.current = crypto.randomUUID();
        }
        setIsProcessing(true);
        try {
            const { payment } = await upgradeReport(id, val, idempotencyKeyRef.current);
            if (payment) {
                setPendingPayment(payment);
                setStep(2);
            } else {
                onClose();
                onUpgraded();
                showToast('Tu aviso pasó a revisión con el nuevo plan.', 'success');
            }
        } catch (err) {
            const message = err instanceof ReportsApiError ? err.message : 'No pudimos cambiar el plan de tu aviso. Intenta de nuevo.';
            showToast(message, 'error');
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className="planes-modal-overlay">
            <div className="planes-modal-backdrop" onClick={onClose}></div>
            <div className="planes-modal-card wide">
                <div className="planes-modal-header">
                    <div>
                        <span className="planes-modal-eyebrow">
                            <IconBroadcast /> Pasar a plan de pago
                        </span>
                    </div>
                    <button type="button" className="planes-modal-close" onClick={onClose}>
                        <IconX />
                    </button>
                </div>

                {/* PASO 1: SELECCIÓN DE PLAN */}
                {step === 1 && (
                    <div id="upgrade-modal-step-1">
                        <div className="upgrade-map-preview">
                            <div className="upgrade-map-box">
                                <div className="upgrade-map-ring-base"></div>
                                <div className={`upgrade-map-ring-growth level-${packages.findIndex((p) => p.slug === val) + 1}`}></div>
                                <div className="upgrade-map-pin">
                                    <IconCurrentLocation />
                                </div>
                            </div>
                            <p className="upgrade-map-caption">
                                <IconUsers />
                                Tu aviso llegará a <b>+{planActual?.adsMetaAudience?.toLocaleString(getLocaleForCountry(pub?.country)) ?? '0'}</b> personas en la <b>zona de perdida</b>
                            </p>
                        </div>

                        <div className="plans-stack upgrade-plans-stack">
                            {packages.map((pkg) => {
                                const isUrgente = pkg.slug === 'urgente';
                                const descriptionHtml = pkg.description.replace(/\n/g, '<br/>');
                                return (
                                    <label key={pkg.slug} className={`plan-item-label ${isUrgente ? 'option-dominant-wrapper' : ''}`}>
                                        <input
                                            type="radio"
                                            name="upgrade-plan"
                                            value={pkg.slug}
                                            checked={val === pkg.slug}
                                            onChange={(e) => setVal(e.target.value)}
                                        />
                                        <div className={`plan-item ${isUrgente ? 'plan-item-premium' : ''}`}>
                                            {isUrgente && (
                                                <span className="tag-info">
                                                    <IconBolt /> Máxima Difusión
                                                </span>
                                            )}
                                            <div className="row-plan">
                                                <div className="plan-info">
                                                    <h4><u>Plan</u> {pkg.name}</h4>
                                                    <p className="plan-scope" dangerouslySetInnerHTML={{ __html: descriptionHtml }} />
                                                </div>
                                                <div className="plan-card">
                                                    <div className="plan-price"><i>{currencySymbol}</i> {pkg.price} {currencyCode}</div>
                                                    <span>/ <IconCreditCard /> Pago único</span>
                                                </div>
                                            </div>
                                            <div className="row-data-plan">
                                                {pkg.channels.length > 0 && (
                                                    <div className="plan-features-list">
                                                        {pkg.channels.map((ch) => (
                                                            <span key={ch} className={`plan-feature-tag btn-${ch}`}>
                                                                {ch === 'facebook' && <IconBrandFacebook />}
                                                                {ch === 'instagram' && <IconBrandInstagram />}
                                                                {ch === 'tiktok' && <IconBrandTiktok />}
                                                                {ch === 'messenger' && <IconBrandMessenger />}
                                                                {' '}{ch.charAt(0).toUpperCase() + ch.slice(1)}
                                                            </span>
                                                        ))}
                                                    </div>
                                                )}
                                                <div className="attributes-plan">
                                                    <ul>
                                                        <li><IconBroadcast /><b>{pkg.days} días</b> de difusión</li>
                                                        {pkg.centinela && (
                                                            <li>
                                                                <IconCameraSearch /> Incluye <b>Centinela IA</b> 24/7
                                                            </li>
                                                        )}
                                                        {pkg.includesRefund && (
                                                            <li>
                                                                <div className="tooltip-wrap">
                                                                    <IconHelp className="tooltip-trigger" />
                                                                    <span className="tooltip-box">
                                                                        <IconInfoCircle /> Si encuentras a tu mascota antes, te <b>devolvemos</b> los días restantes del plan.
                                                                    </span>
                                                                </div> Incluye <b><u>reembolso</u></b>
                                                            </li>
                                                        )}
                                                    </ul>
                                                </div>
                                            </div>
                                        </div>
                                    </label>
                                );
                            })}
                        </div>

                        <div className="planes-modal-actions">
                            <div className="text-modal">
                                <IconInfoCircle /> Tu aviso mantiene su fecha de publicación original
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
                {step === 2 && pendingPayment && (
                    <div id="upgrade-modal-step-2">
                        <div className="modal-summary">
                            <div className="planes-modal-summary-bar">
                                <div className="planes-summary-body">
                                    <span className="planes-summary-label">Plan seleccionado</span>
                                    <h5>{planActual?.name}</h5>
                                </div>
                                <div className="planes-summary-price">{currencySymbol} {planActual?.price} {currencyCode}</div>
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