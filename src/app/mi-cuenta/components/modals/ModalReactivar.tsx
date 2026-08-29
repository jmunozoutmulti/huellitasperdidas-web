'use client';

import { useState, useEffect } from 'react';
import { showToast } from '@/components/global/Toast';
import { getPublicationById, updatePublication, planLabel, type MockPublication } from '@/lib/publications';
import { getPlanById } from '@/lib/plans';
import { getCountryByAbbr } from '@/lib/countries';

interface ModalReactivarProps {
    isOpen: boolean;
    id: string;
    onClose: () => void;
    onReactivated: () => void;
}

export default function ModalReactivar({ isOpen, id, onClose, onReactivated }: ModalReactivarProps) {
    const [pub, setPub] = useState<MockPublication | null>(null);
    const [paymentMethod, setPaymentMethod] = useState<'card' | 'yape'>('card');
    const [acceptTerms, setAcceptTerms] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);

    useEffect(() => {
        if (!isOpen || !id) return;
        setPub(null);
        setPaymentMethod('card');
        setAcceptTerms(false);
        getPublicationById(id).then(setPub);
    }, [isOpen, id]);

    if (!isOpen) return null;

    // Reactivar reutiliza el mismo monto que ya pagó originalmente — no se recalcula
    // contra el precio actual del plan (que pudo cambiar desde entonces).
    const precio = pub?.amount_paid ?? 0;
    const planNombre = pub ? planLabel(pub.plan, pub.country || 'PE') : '';
    const diasTotales = pub ? getPlanById(pub.plan, pub.country || 'PE').dias : 0;
    const currencySymbol = pub ? getCountryByAbbr(pub.country || 'PE').currency.symbol : '';

    const handlePagar = async () => {
        setIsProcessing(true);
        await updatePublication(id, { stopped_by_user: false });
        setIsProcessing(false);
        onClose();
        onReactivated();
        showToast('Tu aviso fue reactivado correctamente', 'success');
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

                {!pub ? (
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
                                    <h5>{planNombre}</h5>
                                    <span>{diasTotales ? `${diasTotales} días de difusión` : ''}</span>
                                </div>
                                <div className="planes-summary-price">{currencySymbol} {precio}</div>
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
                                <i className="ti ti-clock"></i> Se activará en máximo 30 minutos
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