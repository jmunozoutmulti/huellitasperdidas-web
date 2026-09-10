'use client';

import { useState, useEffect } from 'react';
import { showToast } from '@/components/global/Toast';
import { fetchReport, type ReportDetail } from '@/lib/api';
import { reactivateReport, ReportsApiError } from '@/lib/reportsApi';
import { getPackages, type PackageOption } from '@/lib/packagesApi';
import { getCountryByAbbr } from '@/lib/countries';

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
    const [paymentMethod, setPaymentMethod] = useState<'card' | 'yape'>('card');
    const [acceptTerms, setAcceptTerms] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);

    useEffect(() => {
        if (!isOpen || !id) return;
        setPub(null);
        setPkg(null);
        setCurrencySymbol('');
        setPaymentMethod('card');
        setAcceptTerms(false);
        fetchReport(id).then(async (report) => {
            setPub(report);
            if (report.package_slug && report.country) {
                const [pkgs, country] = await Promise.all([
                    getPackages(report.country),
                    getCountryByAbbr(report.country),
                ]);
                setPkg(pkgs.find((p) => p.slug === report.package_slug) ?? null);
                setCurrencySymbol(country?.currencySymbol ?? '');
            }
        });
    }, [isOpen, id]);

    if (!isOpen) return null;

    const handlePagar = async () => {
        if (!pub?.package_slug) return;
        setIsProcessing(true);
        try {
            await reactivateReport(id, pub.package_slug);
            onClose();
            onReactivated();
            showToast('Tu solicitud fue registrada. Un administrador confirmará el pago y aprobará la reactivación.', 'success');
        } catch (err) {
            const message = err instanceof ReportsApiError ? err.message : 'No pudimos reactivar tu aviso. Intenta de nuevo.';
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
                            <i className="ti ti-refresh"></i> Reactivar anuncio
                        </span>
                    </div>
                    <button type="button" className="planes-modal-close" onClick={onClose}>
                        <i className="ti ti-x"></i>
                    </button>
                </div>

                <div className="admin-info-box">
                    <i className="ti ti-info-circle"></i>
                    <p>
                        Tu aviso se reactivará con los <b>mismos datos, fotos y plan</b> con los que fue publicado originalmente.
                    </p>
                </div>

                {!pub || !pkg ? (
                    <div className="admin-info-box">
                        <i className="ti ti-loader"></i>
                        <p>Cargando datos del aviso...</p>
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
                                <div className="planes-summary-price">{currencySymbol} {pkg.price}</div>
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
                            <div className="text-modal">
                                <i className="ti ti-clock"></i> Reactivaremos tu aviso en un máximo de 30 minutos.
                            </div>
                            <button
                                type="button"
                                className="btn-publish"
                                disabled={!acceptTerms || isProcessing}
                                onClick={handlePagar}
                            >
                                {isProcessing ? 'Procesando...' : 'Pagar y Reactivar'}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}