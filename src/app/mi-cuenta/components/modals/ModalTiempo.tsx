'use client';

import { useState, useEffect } from 'react';
import { showToast } from '@/components/global/Toast';
import { fetchReport, type ReportDetail } from '@/lib/api';
import { extendReportTime, ReportsApiError } from '@/lib/reportsApi';
import { getPackages, type PackageOption, type ExtensionOption } from '@/lib/packagesApi';
import { getCountryByAbbr } from '@/lib/countries';

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
    const [isLoading, setIsLoading] = useState(true);

    const [step, setStep] = useState<1 | 2>(1);
    const [extraDays, setExtraDays] = useState<number | null>(null);
    const [paymentMethod, setPaymentMethod] = useState<'card' | 'yape'>('card');
    const [acceptTerms, setAcceptTerms] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);

    useEffect(() => {
        if (!isOpen || !id) return;
        setStep(1);
        setExtraDays(null);
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
                setExtraDays(foundPkg?.extensionOptions[0]?.extraDays ?? null);
            }
            setIsLoading(false);
        });
    }, [isOpen, id]);

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

    // Fecha de vencimiento real del aviso, no inventada
    const fechaVence = pub?.expires_at ? new Date(pub.expires_at) : new Date();
    const fechaNueva = new Date(fechaVence);
    fechaNueva.setDate(fechaVence.getDate() + (tier?.extraDays ?? 0));

    const opcionesCorta: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' };
    const opcionesLarga: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long' };
    const fechaVenceCorta = fechaVence.toLocaleDateString('es-PE', opcionesCorta).replace('.', '');
    const fechaNuevaCorta = fechaNueva.toLocaleDateString('es-PE', opcionesCorta).replace('.', '');
    const fechaNuevaLarga = fechaNueva.toLocaleDateString('es-PE', opcionesLarga);

    const handlePagar = async () => {
        if (!tier) return;
        setIsProcessing(true);
        try {
            await extendReportTime(id, tier.extraDays);
            onClose();
            onExtended();
            showToast('¡Listo! Registramos tu solicitud. Validaremos y aprobaremos la extensión.', 'success');
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
                                            <span><i>{currencySymbol}</i> {t.price}</span>
                                        </div>
                                    </div>
                                </label>
                            ))}
                        </div>

                        <div className="planes-modal-actions">
                            <p className="tiempo-note">
                                <i className="ti ti-info-circle"></i> La ampliación mantiene activa la difusión durante los días adicionales seleccionados.
                            </p>
                            <button type="button" className="btn-publish" onClick={() => setStep(2)}>
                                Continuar <i className="ti ti-chevron-right"></i>
                            </button>
                        </div>
                    </div>
                )}

                {step === 2 && tier && (
                    <div id="tiempo-modal-step-2">
                        <div className="modal-summary">
                            <div className="planes-modal-summary-bar">
                                <div className="planes-summary-body">
                                    <span className="planes-summary-label">Tiempo seleccionado</span>
                                    <h5>+{tier.extraDays} día{tier.extraDays === 1 ? '' : 's'}</h5>
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
                                {isProcessing ? 'Procesando...' : 'Pagar y ampliar tiempo'}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}