'use client';

import { useState, useEffect } from 'react';
import { showToast } from '@/components/global/Toast';
import { useApp } from '@/context/AppContext';
import { updatePublication } from '@/lib/publications';
import { getPlanById } from '@/lib/plans';
import { getCountryByAbbr } from '@/lib/countries';

interface ModalUpgradeProps {
    isOpen: boolean;
    id: string;
    onClose: () => void;
    onUpgraded: () => void;
}

// Solo el "marketing copy" (personas alcanzadas) es propio de este modal —
// precio y días de difusión siempre se leen de plans.ts para no desincronizarse.
const upgradeReachCopy: Record<string, { personas: string; level: number }> = {
    local: { personas: '+9,000', level: 1 },
    amplio: { personas: '+15,000', level: 2 },
    urgente: { personas: '+30,000', level: 3 },
};

export default function ModalUpgrade({ isOpen, id, onClose, onUpgraded }: ModalUpgradeProps) {
    const { currentUser } = useApp();
    const country = currentUser?.country || 'PE';
    const currencySymbol = getCountryByAbbr(country).currency.symbol;
    const [step, setStep] = useState<1 | 2>(1);
    const [val, setVal] = useState('local');
    const [paymentMethod, setPaymentMethod] = useState<'card' | 'yape'>('card');
    const [acceptTerms, setAcceptTerms] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setStep(1);
            setVal('local');
            setPaymentMethod('card');
            setAcceptTerms(false);
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const planActual = getPlanById(val, country);
    const copy = upgradeReachCopy[val] || upgradeReachCopy['local'];

    const handlePagar = async () => {
        setIsProcessing(true);
        await updatePublication(id, { plan: val, amount_paid: planActual.precio, country });
        setIsProcessing(false);
        onClose();
        onUpgraded();
        showToast('Tu aviso ahora tiene difusión activa', 'success');
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
                                <div className={`upgrade-map-ring-growth level-${copy.level}`}></div>
                                <div className="upgrade-map-pin">
                                    <i className="fa-solid fa-street-view"></i>
                                </div>
                            </div>
                            <p className="upgrade-map-caption">
                                <i className="ti ti-users"></i>
                                Tu aviso llegará a <b>{copy.personas}</b> personas en la <b>zona de perdida</b>
                            </p>
                        </div>

                        <div className="plans-stack upgrade-plans-stack">
                            <label className="plan-item-label">
                                <input
                                    type="radio"
                                    name="upgrade-plan"
                                    value="local"
                                    checked={val === 'local'}
                                    onChange={() => setVal('local')}
                                />
                                <div className="plan-item">
                                    <div className="row-plan">
                                        <div className="plan-info">
                                            <h4>Plan Local</h4>
                                            <p className="plan-scope">
                                                Hasta <b>+9,000</b> personas <br /> verán tu aviso.
                                            </p>
                                        </div>
                                        <div className="plan-card">
                                            <div className="plan-price"><i>{currencySymbol}</i> {getPlanById('local', country).precio}</div>
                                            <span>/ <i className="fa-regular fa-credit-card"></i> Pago único</span>
                                        </div>
                                    </div>
                                    <div className="row-data-plan">
                                        <div className="plan-features-list">
                                            <span className="plan-feature-tag btn-facebook">
                                                <i className="fa-brands fa-facebook"></i> Facebook
                                            </span>
                                        </div>
                                        <div className="attributes-plan">
                                            <ul>
                                                <li><i className="ti ti-broadcast"></i><b>{getPlanById('local', country).dias} días</b> de difusión</li>
                                            </ul>
                                        </div>
                                    </div>
                                </div>
                            </label>

                            <label className="plan-item-label">
                                <input
                                    type="radio"
                                    name="upgrade-plan"
                                    value="amplio"
                                    checked={val === 'amplio'}
                                    onChange={() => setVal('amplio')}
                                />
                                <div className="plan-item">
                                    <div className="row-plan">
                                        <div className="plan-info">
                                            <h4>Plan Amplio</h4>
                                            <p className="plan-scope">
                                                Hasta <b>+15,000</b> personas <br /> verán tu aviso.
                                            </p>
                                        </div>
                                        <div className="plan-card">
                                            <div className="plan-price"><i>{currencySymbol}</i> {getPlanById('amplio', country).precio}</div>
                                            <span>/ <i className="fa-regular fa-credit-card"></i> Pago único</span>
                                        </div>
                                    </div>
                                    <div className="row-data-plan">
                                        <div className="plan-features-list">
                                            <span className="plan-feature-tag btn-facebook">
                                                <i className="fa-brands fa-facebook"></i> Facebook
                                            </span>
                                        </div>
                                        <div className="attributes-plan">
                                            <ul>
                                                <li><i className="ti ti-broadcast"></i><b>{getPlanById('amplio', country).dias} días</b> de difusión</li>
                                            </ul>
                                        </div>
                                    </div>
                                </div>
                            </label>

                            <label className="plan-item-label option-dominant-wrapper">
                                <input
                                    type="radio"
                                    name="upgrade-plan"
                                    value="urgente"
                                    checked={val === 'urgente'}
                                    onChange={() => setVal('urgente')}
                                />
                                <div className="plan-item plan-item-premium">
                                    <span className="tag-info"><i className="ti ti-bolt"></i> Máxima Difusión</span>
                                    <div className="row-plan">
                                        <div className="plan-info">
                                            <h4>Plan Urgente</h4>
                                            <p className="plan-scope">
                                                Hasta <b>+30,000</b> personas <br /> verán tu aviso.
                                            </p>
                                        </div>
                                        <div className="plan-card">
                                            <div className="plan-price"><i>{currencySymbol}</i> {getPlanById('urgente', country).precio}</div>
                                            <span>/ <i className="fa-regular fa-credit-card"></i> Pago único</span>
                                        </div>
                                    </div>
                                    <div className="row-data-plan">
                                        <div className="plan-features-list">
                                            <span className="plan-feature-tag btn-facebook">
                                                <i className="fa-brands fa-facebook"></i> Facebook
                                            </span>
                                            <span className="plan-feature-tag btn-instagram">
                                                <i className="fa-brands fa-instagram"></i> Instagram
                                            </span>
                                        </div>
                                        <div className="attributes-plan">
                                            <ul>
                                                <li><i className="ti ti-broadcast"></i><b>{getPlanById('urgente', country).dias} días</b> de difusión</li>
                                                <li>
                                                    <div className="tooltip-wrap">
                                                        <i className="ti ti-help tooltip-trigger"></i>
                                                        <span className="tooltip-box">
                                                            <i className="ti ti-info-circle"></i> Si encuentras a tu mascota antes, te <b>devolvemos</b> los días restantes del plan.
                                                        </span>
                                                    </div> Incluye <b><u>reembolso</u></b>
                                                </li>
                                            </ul>
                                        </div>
                                    </div>
                                </div>
                            </label>
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
                                    <h5>{planActual.nombre}</h5>
                                </div>
                                <div className="planes-summary-price">{currencySymbol} {planActual.precio}</div>
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