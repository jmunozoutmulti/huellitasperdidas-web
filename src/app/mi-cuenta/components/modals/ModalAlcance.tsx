'use client';

import { useState, useEffect } from 'react';
import { showToast } from '@/components/global/Toast';
import { useApp } from '@/context/AppContext';
import { purchaseExtraReach } from '@/lib/publications';
import { getCountryByAbbr } from '@/lib/countries';

interface ModalAlcanceProps {
    isOpen: boolean;
    id: string;
    onClose: () => void;
    onPurchased: () => void;
}

interface AlcanceTier {
    km: string;
    personas: string;
    precio: number;
    level: number;
}

const ALCANCE_TIERS_BY_COUNTRY: Record<string, Record<string, AlcanceTier>> = {
    PE: {
        '5km': { km: '5 km', personas: '+2,000', precio: 30, level: 1 },
        '10km': { km: '10 km', personas: '+5,000', precio: 50, level: 2 },
        '20km': { km: '20 km', personas: '+10,000', precio: 90, level: 3 },
        '50km': { km: '50 km', personas: '+20,000', precio: 130, level: 4 },
    },
    AR: {
        '5km': { km: '5 km', personas: '+2,000', precio: 13600, level: 1 },
        '10km': { km: '10 km', personas: '+5,000', precio: 22700, level: 2 },
        '20km': { km: '20 km', personas: '+10,000', precio: 40900, level: 3 },
        '50km': { km: '50 km', personas: '+20,000', precio: 59100, level: 4 },
    },
    CL: {
        '5km': { km: '5 km', personas: '+2,000', precio: 8300, level: 1 },
        '10km': { km: '10 km', personas: '+5,000', precio: 13900, level: 2 },
        '20km': { km: '20 km', personas: '+10,000', precio: 25000, level: 3 },
        '50km': { km: '50 km', personas: '+20,000', precio: 36100, level: 4 },
    },
    CO: {
        '5km': { km: '5 km', personas: '+2,000', precio: 27300, level: 1 },
        '10km': { km: '10 km', personas: '+5,000', precio: 45500, level: 2 },
        '20km': { km: '20 km', personas: '+10,000', precio: 81800, level: 3 },
        '50km': { km: '50 km', personas: '+20,000', precio: 118200, level: 4 },
    },
    MX: {
        '5km': { km: '5 km', personas: '+2,000', precio: 152, level: 1 },
        '10km': { km: '10 km', personas: '+5,000', precio: 253, level: 2 },
        '20km': { km: '20 km', personas: '+10,000', precio: 455, level: 3 },
        '50km': { km: '50 km', personas: '+20,000', precio: 657, level: 4 },
    },
    UY: {
        '5km': { km: '5 km', personas: '+2,000', precio: 360, level: 1 },
        '10km': { km: '10 km', personas: '+5,000', precio: 600, level: 2 },
        '20km': { km: '20 km', personas: '+10,000', precio: 1080, level: 3 },
        '50km': { km: '50 km', personas: '+20,000', precio: 1560, level: 4 },
    },
    EC: {
        '5km': { km: '5 km', personas: '+2,000', precio: 9, level: 1 },
        '10km': { km: '10 km', personas: '+5,000', precio: 15, level: 2 },
        '20km': { km: '20 km', personas: '+10,000', precio: 27, level: 3 },
        '50km': { km: '50 km', personas: '+20,000', precio: 39, level: 4 },
    },
};

function getAlcanceTiers(country: string): Record<string, AlcanceTier> {
    return ALCANCE_TIERS_BY_COUNTRY[country] ?? ALCANCE_TIERS_BY_COUNTRY['PE'];
}

export default function ModalAlcance({ isOpen, id, onClose, onPurchased }: ModalAlcanceProps) {
    const { currentUser } = useApp();
    const country = currentUser?.country || 'PE';
    const currencySymbol = getCountryByAbbr(country).currency.symbol;
    const tiers = getAlcanceTiers(country);

    const [step, setStep] = useState<1 | 2>(1);
    const [val, setVal] = useState('10km');
    const [paymentMethod, setPaymentMethod] = useState<'card' | 'yape'>('card');
    const [acceptTerms, setAcceptTerms] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setStep(1);
            setVal('10km');
            setPaymentMethod('card');
            setAcceptTerms(false);
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const tier = tiers[val] || tiers['10km'];

    const handlePagar = async () => {
        setIsProcessing(true);
        await purchaseExtraReach(id, val);
        setIsProcessing(false);
        onClose();
        onPurchased();
        showToast('Tu alcance fue ampliado correctamente', 'success');
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

                {step === 1 && (
                    <div id="alcance-modal-step-1">
                        <div className="alcance-radar-preview">
                            <div className="alcance-radar-box">
                                <div className="alcance-radar-ring-base"></div>
                                <div className={`alcance-radar-ring-growth level-${tier.level}`}></div>

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
                                Incrementas tu alcance a un radio de <b>{tier.km}</b> <b>(hasta {tier.personas} personas)</b>
                            </p>
                        </div>

                        <div className="zona-options-grid">
                            {Object.entries(tiers).map(([tierKey, t]) => (
                                <label key={tierKey} className="zona-option-label">
                                    <input
                                        type="radio"
                                        name="alcance-extra"
                                        value={tierKey}
                                        checked={val === tierKey}
                                        onChange={() => setVal(tierKey)}
                                    />
                                    <div className="zona-option-item">
                                        <div className="zona-option-top">
                                            <div className="zona-icon">
                                                <i className="ti ti-radar-2"></i>
                                            </div>
                                            <span className="zona-km">{t.km}</span>
                                            <span className="zona-reach">
                                                Hasta <b>{t.personas}</b> personas
                                            </span>
                                        </div>
                                        <div className="zona-precio">
                                            <span><i>{currencySymbol}</i> {t.precio}</span>
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

                {step === 2 && (
                    <div id="alcance-modal-step-2">
                        <div className="modal-summary">
                            <div className="planes-modal-summary-bar">
                                <div className="planes-summary-body">
                                    <span className="planes-summary-label">Alcance seleccionado</span>
                                    <h5>{tier.personas} Personas</h5>
                                    <span>({tier.km} adicionales)</span>
                                </div>
                                <div className="planes-summary-price">{currencySymbol} {tier.precio}</div>
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
        </div>
    );
}