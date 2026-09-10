'use client';

import { useState, useEffect } from 'react';
import { showToast } from '@/components/global/Toast';
import { fetchReport, type ReportDetail } from '@/lib/api';
import { purchaseExtraReach, ReportsApiError } from '@/lib/reportsApi';
import { getPackages, type PackageOption, type ReachOption } from '@/lib/packagesApi';
import { getCountryByAbbr } from '@/lib/countries';

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
    const [isLoading, setIsLoading] = useState(true);

    const [step, setStep] = useState<1 | 2>(1);
    const [radiusKm, setRadiusKm] = useState<number | null>(null);
    const [paymentMethod, setPaymentMethod] = useState<'card' | 'yape'>('card');
    const [acceptTerms, setAcceptTerms] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);

    useEffect(() => {
        if (!isOpen || !id) return;
        setStep(1);
        setRadiusKm(null);
        setPaymentMethod('card');
        setAcceptTerms(false);
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
                setRadiusKm(foundPkg?.reachOptions[0]?.radiusKm ?? null);
            }
            setIsLoading(false);
        });
    }, [isOpen, id]);

    if (!isOpen) return null;

    if (isLoading) {
        return (
            <div id="alcance-modal-overlay" className="planes-modal-overlay">
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

    if (!currencySymbol || !pkg || pkg.reachOptions.length === 0) {
        return (
            <div id="alcance-modal-overlay" className="planes-modal-overlay">
                <div className="planes-modal-backdrop" onClick={onClose}></div>
                <div className="planes-modal-card">
                    <div className="planes-modal-header">
                        <div>
                            <span className="planes-modal-eyebrow">
                                <i className="ti ti-trending-up"></i> Llegar a más personas
                            </span>
                        </div>
                        <button type="button" className="planes-modal-close" onClick={onClose}>
                            <i className="ti ti-x"></i>
                        </button>
                    </div>
                    <div className="admin-info-box">
                        <i className="ti ti-info-circle"></i>
                        <p>Este plan todavía no tiene opciones de alcance extra configuradas para tu país. Vuelve más tarde.</p>
                    </div>
                </div>
            </div>
        );
    }

    const tier: ReachOption | undefined = pkg.reachOptions.find((t) => t.radiusKm === radiusKm) ?? pkg.reachOptions[0];

    const handlePagar = async () => {
        if (!tier) return;
        setIsProcessing(true);
        try {
            await purchaseExtraReach(id, tier.radiusKm);
            onClose();
            onPurchased();
            showToast('¡Listo! Validaremos la solicitud y ampliaremos el alcance de tu aviso.', 'success');
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
                            <i className="ti ti-trending-up"></i> Llegar a más personas
                        </span>
                    </div>
                    <button type="button" className="planes-modal-close" onClick={onClose}>
                        <i className="ti ti-x"></i>
                    </button>
                </div>

                {step === 1 && tier && (
                    <div id="alcance-modal-step-1">
                        <div className="alcance-radar-preview">
                            <div className="alcance-radar-box">
                                <div className="alcance-radar-ring-base"></div>
                                <div className={`alcance-radar-ring-growth level-${pkg.reachOptions.findIndex((t) => t.radiusKm === tier.radiusKm) + 1}`}></div>

                                <div className="alcance-radar-center">
                                    <div className="alcance-radar-pin">
                                        <i className="fa-solid fa-street-view"></i>
                                    </div>
                                    <span className="badge-plan badge-plan-radar">
                                        <span className="status-pulse"></span> Anuncio
                                    </span>
                                </div>
                            </div>
                            <p className="alcance-radar-caption">
                                <i className="ti ti-trending-up"></i>
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
                                                <i className="ti ti-radar-2"></i>
                                            </div>
                                            <span className="zona-km">{t.radiusKm} km</span>
                                            <span className="zona-reach">
                                                {t.estimatedReach && (
                                                    <>
                                                        Hasta <b>{Number(t.estimatedReach).toLocaleString('es-PE')}</b> personas
                                                    </>
                                                )}
                                            </span>
                                        </div>
                                        <div className="zona-precio">
                                            <span><i>{currencySymbol}</i> {t.price}</span>
                                        </div>
                                    </div>
                                </label>
                            ))}
                        </div>

                        <div className="planes-modal-actions">
                            <div className="text-modal">
                                <i className="ti ti-radar"></i> El alcance se suma a tu plan actual
                            </div>
                            <button type="button" className="btn-publish" onClick={() => setStep(2)}>
                                Continuar <i className="ti ti-chevron-right"></i>
                            </button>
                        </div>
                    </div>
                )}

                {step === 2 && tier && (
                    <div id="alcance-modal-step-2">
                        <div className="modal-summary">
                            <div className="planes-modal-summary-bar">
                                <div className="planes-summary-body">
                                    <span className="planes-summary-label">Alcance seleccionado</span>
                                    <h5>{tier.radiusKm} km adicionales</h5>
                                </div>
                                <div className="planes-summary-price">{currencySymbol} {tier.price}</div>
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
                                        <span className="terms-checkbox-custom">
                                            <i className="fa-solid fa-check"></i>
                                        </span>
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
        </div >
    );
}