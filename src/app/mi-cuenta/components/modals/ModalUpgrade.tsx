'use client';

import { useState, useEffect } from 'react';
import { showToast } from '@/components/global/Toast';
import { fetchReport, type ReportDetail } from '@/lib/api';
import { upgradeReport, ReportsApiError } from '@/lib/reportsApi';
import { getPackages, type PackageOption } from '@/lib/packagesApi';
import { getCountryByAbbr } from '@/lib/countries';

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
    const [isLoading, setIsLoading] = useState(true);

    const [step, setStep] = useState<1 | 2>(1);
    const [val, setVal] = useState('');
    const [paymentMethod, setPaymentMethod] = useState<'card' | 'yape'>('card');
    const [acceptTerms, setAcceptTerms] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);

    useEffect(() => {
        if (!isOpen || !id) return;
        setStep(1);
        setVal('');
        setPaymentMethod('card');
        setAcceptTerms(false);
        setPub(null);
        setPackages([]);
        setIsLoading(true);

        fetchReport(id).then(async (report) => {
            setPub(report);
            if (report.country) {
                const [pkgs, country] = await Promise.all([
                    getPackages(report.country),
                    getCountryByAbbr(report.country),
                ]);
                const paidPackages = pkgs.filter((p) => p.price > 0);
                setPackages(paidPackages);
                setCurrencySymbol(country?.currencySymbol ?? '');
                setVal(paidPackages[0]?.slug ?? '');
            }
            setIsLoading(false);
        });
    }, [isOpen, id]);

    if (!isOpen) return null;

    if (isLoading) {
        return (
            <div className="planes-modal-overlay">
                <div className="planes-modal-backdrop" onClick={onClose}></div>
                <div className="planes-modal-card wide">
                    <div className="admin-info-box info-box-revision">
                        <i className="ti ti-loader"></i>
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
                                <i className="ti ti-broadcast"></i> Pasar a plan de pago
                            </span>
                        </div>
                        <button type="button" className="planes-modal-close" onClick={onClose}>
                            <i className="ti ti-x"></i>
                        </button>
                    </div>
                    <div className="admin-info-box">
                        <i className="ti ti-info-circle"></i>
                        <p>Este país aún no está configurado para esta función. Vuelve más tarde.</p>
                    </div>
                </div>
            </div>
        );
    }

    const planActual = packages.find((p) => p.slug === val) ?? packages[0];

    const handlePagar = async () => {
        setIsProcessing(true);
        try {
            await upgradeReport(id, val);
            onClose();
            onUpgraded();
            showToast('Tu aviso pasó a revisión con el nuevo plan.', 'success');
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
                            <i className="ti ti-broadcast"></i> Pasar a plan de pago
                        </span>
                    </div>
                    <button type="button" className="planes-modal-close" onClick={onClose}>
                        <i className="ti ti-x"></i>
                    </button>
                </div>

                {step === 1 && (
                    <div id="upgrade-modal-step-1">
                        <div className="upgrade-map-preview">
                            <div className="upgrade-map-box">
                                <div className="upgrade-map-ring-base"></div>
                                <div className={`upgrade-map-ring-growth level-${packages.findIndex((p) => p.slug === val) + 1}`}></div>
                                <div className="upgrade-map-pin">
                                    <i className="fa-solid fa-street-view"></i>
                                </div>
                            </div>
                            <p className="upgrade-map-caption">
                                <i className="ti ti-users"></i>
                                Tu aviso llegará a <b>+{planActual?.adsMetaAudience?.toLocaleString('es-PE') ?? '0'}</b> personas en la <b>zona de perdida</b>
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
                                                    <i className="ti ti-bolt"></i> Máxima Difusión
                                                </span>
                                            )}
                                            <div className="row-plan">
                                                <div className="plan-info">
                                                    <h4><u>Plan</u> {pkg.name}</h4>
                                                    <p className="plan-scope" dangerouslySetInnerHTML={{ __html: descriptionHtml }} />
                                                </div>
                                                <div className="plan-card">
                                                    <div className="plan-price"><i>{currencySymbol}</i> {pkg.price}</div>
                                                    <span>/ <i className="fa-regular fa-credit-card"></i> Pago único</span>
                                                </div>
                                            </div>
                                            <div className="row-data-plan">
                                                {pkg.channels.length > 0 && (
                                                    <div className="plan-features-list">
                                                        {pkg.channels.map((ch) => (
                                                            <span key={ch} className={`plan-feature-tag btn-${ch}`}>
                                                                {ch === 'facebook' && <i className="fa-brands fa-facebook"></i>}
                                                                {ch === 'instagram' && <i className="fa-brands fa-instagram"></i>}
                                                                {ch === 'tiktok' && <i className="fa-brands fa-tiktok"></i>}
                                                                {ch === 'messenger' && <i className="fa-brands fa-facebook-messenger"></i>}
                                                                {' '}{ch.charAt(0).toUpperCase() + ch.slice(1)}
                                                            </span>
                                                        ))}
                                                    </div>
                                                )}
                                                <div className="attributes-plan">
                                                    <ul>
                                                        <li><i className="ti ti-broadcast"></i><b>{pkg.days} días</b> de difusión</li>
                                                        {pkg.includesRefund && (
                                                            <li>
                                                                <div className="tooltip-wrap">
                                                                    <i className="ti ti-help tooltip-trigger"></i>
                                                                    <span className="tooltip-box">
                                                                        <i className="ti ti-info-circle"></i> Si encuentras a tu mascota antes, te <b>devolvemos</b> los días restantes del plan.
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
                                <i className="ti ti-info-circle"></i> Tu aviso mantiene su fecha de publicación original
                            </div>
                            <button type="button" className="btn-publish" onClick={() => setStep(2)}>
                                Continuar <i className="ti ti-chevron-right"></i>
                            </button>
                        </div>
                    </div>
                )}

                {step === 2 && (
                    <div id="upgrade-modal-step-2">
                        <div className="modal-summary">
                            <div className="planes-modal-summary-bar">
                                <div className="planes-summary-body">
                                    <span className="planes-summary-label">Plan seleccionado</span>
                                    <h5>{planActual?.name}</h5>
                                </div>
                                <div className="planes-summary-price">{currencySymbol} {planActual?.price}</div>
                            </div>

                            <div className="payment-gateway-box">
                                <h4>
                                    <i className="fa-solid fa-shield-halved"></i> Checkout Seguro (Mercado Pago)
                                </h4>

                                <div className="payment-methods-tabs">
                                    <button
                                        type="button"
                                        className={`pay-tab-btn ${paymentMethod === 'card' ? 'active' : ''}`}
                                        onClick={() => setPaymentMethod('card')}
                                    >
                                        <i className="fa-solid fa-credit-card"></i> Tarjeta de Crédito/Débito
                                    </button>
                                    <button
                                        type="button"
                                        className={`pay-tab-btn ${paymentMethod === 'yape' ? 'active' : ''}`}
                                        onClick={() => setPaymentMethod('yape')}
                                    >
                                        <i className="fa-solid fa-mobile-screen-button"></i> Yape
                                    </button>
                                </div>

                                <div className="payment-methods-content">
                                    <div className={`pay-method-panel ${paymentMethod === 'card' ? 'active' : ''}`}>
                                        <div className="groups-payment form-group">
                                            <label className="form-label">Número de tarjeta</label>
                                            <input type="text" className="form-input" placeholder="0000 0000 0000 0000" />
                                        </div>
                                        <div className="groups-payment grid-2col">
                                            <div className="form-group">
                                                <label className="form-label">Expiración</label>
                                                <input type="text" className="form-input" placeholder="MM/AA" />
                                            </div>
                                            <div className="form-group">
                                                <label className="form-label">CVV</label>
                                                <input type="password" className="form-input" placeholder="000" />
                                            </div>
                                        </div>
                                        <div className="form-group">
                                            <label className="form-label">Nombre en tarjeta</label>
                                            <input type="text" className="form-input" />
                                        </div>
                                    </div>

                                    <div className={`pay-method-panel ${paymentMethod === 'yape' ? 'active' : ''}`}>
                                        <div className="yape-mock-wrapper">
                                            <p>Escanea desde la app Yape o ingresa tu código de aprobación:</p>
                                            <div className="yape-qr-box">
                                                <i className="fa-solid fa-qrcode"></i>
                                                <span>QR HUELLITAS PERÚ</span>
                                            </div>
                                            <div className="form-group">
                                                <label className="form-label">Código de aprobación Yape (6 dígitos)</label>
                                                <input type="text" className="form-input" placeholder="000000" />
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="terms-acceptance-box">
                                    <label className="terms-checkbox-label">
                                        <input
                                            type="checkbox"
                                            className="terms-checkbox-input"
                                            checked={acceptTerms}
                                            onChange={(e) => setAcceptTerms(e.target.checked)}
                                        />
                                        <span className="terms-checkbox-custom"><i className="fa-solid fa-check"></i></span>
                                        <span className="terms-checkbox-text">
                                            Acepto los <a href="/terminos-y-condiciones" target="_blank">Términos y Condiciones</a> del servicio.
                                        </span>
                                    </label>
                                </div>
                            </div>
                        </div>

                        <div className="planes-modal-actions">
                            <button type="button" className="btn-secondary" onClick={() => setStep(1)}>
                                <i className="ti ti-chevron-left"></i> Volver
                            </button>
                            <button
                                type="button"
                                className="btn-publish"
                                disabled={!acceptTerms || isProcessing}
                                onClick={handlePagar}
                            >
                                {isProcessing ? 'Procesando...' : 'Pagar y Activar'}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}