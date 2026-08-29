'use client';

import { useState, useEffect } from 'react';
import { showToast } from '@/components/global/Toast';
import { useApp } from '@/context/AppContext';
import { getPublicationById, extendExpiration, type MockPublication } from '@/lib/publications';
import { getCountryByAbbr } from '@/lib/countries';

interface ModalTiempoProps {
    isOpen: boolean;
    id: string;
    onClose: () => void;
    onExtended: () => void;
}

interface TiempoTier {
    nombre: string;
    precio: number;
    dias: number;
    level: number;
}

const TIEMPO_TIERS_BY_COUNTRY: Record<string, Record<string, TiempoTier>> = {
    PE: {
        '1d': { nombre: '+1 día', precio: 20, dias: 1, level: 1 },
        '2d': { nombre: '+2 días', precio: 35, dias: 2, level: 2 },
        '4d': { nombre: '+4 días', precio: 60, dias: 4, level: 3 },
        '6d': { nombre: '+6 días', precio: 90, dias: 6, level: 4 },
    },
    AR: {
        '1d': { nombre: '+1 día', precio: 9100, dias: 1, level: 1 },
        '2d': { nombre: '+2 días', precio: 15900, dias: 2, level: 2 },
        '4d': { nombre: '+4 días', precio: 27300, dias: 4, level: 3 },
        '6d': { nombre: '+6 días', precio: 40900, dias: 6, level: 4 },
    },
    CL: {
        '1d': { nombre: '+1 día', precio: 5600, dias: 1, level: 1 },
        '2d': { nombre: '+2 días', precio: 9700, dias: 2, level: 2 },
        '4d': { nombre: '+4 días', precio: 16700, dias: 4, level: 3 },
        '6d': { nombre: '+6 días', precio: 25000, dias: 6, level: 4 },
    },
    CO: {
        '1d': { nombre: '+1 día', precio: 18200, dias: 1, level: 1 },
        '2d': { nombre: '+2 días', precio: 31800, dias: 2, level: 2 },
        '4d': { nombre: '+4 días', precio: 54500, dias: 4, level: 3 },
        '6d': { nombre: '+6 días', precio: 81800, dias: 6, level: 4 },
    },
    MX: {
        '1d': { nombre: '+1 día', precio: 101, dias: 1, level: 1 },
        '2d': { nombre: '+2 días', precio: 177, dias: 2, level: 2 },
        '4d': { nombre: '+4 días', precio: 303, dias: 4, level: 3 },
        '6d': { nombre: '+6 días', precio: 455, dias: 6, level: 4 },
    },
    UY: {
        '1d': { nombre: '+1 día', precio: 240, dias: 1, level: 1 },
        '2d': { nombre: '+2 días', precio: 420, dias: 2, level: 2 },
        '4d': { nombre: '+4 días', precio: 720, dias: 4, level: 3 },
        '6d': { nombre: '+6 días', precio: 1080, dias: 6, level: 4 },
    },
    EC: {
        '1d': { nombre: '+1 día', precio: 6, dias: 1, level: 1 },
        '2d': { nombre: '+2 días', precio: 10, dias: 2, level: 2 },
        '4d': { nombre: '+4 días', precio: 18, dias: 4, level: 3 },
        '6d': { nombre: '+6 días', precio: 27, dias: 6, level: 4 },
    },
};

function getTiempoTiers(country: string): Record<string, TiempoTier> {
    return TIEMPO_TIERS_BY_COUNTRY[country] ?? TIEMPO_TIERS_BY_COUNTRY['PE'];
}

export default function ModalTiempo({ isOpen, id, onClose, onExtended }: ModalTiempoProps) {
    const { currentUser } = useApp();
    const country = currentUser?.country || 'PE';
    const currencySymbol = getCountryByAbbr(country).currency.symbol;
    const tiers = getTiempoTiers(country);

    const [pub, setPub] = useState<MockPublication | null>(null);
    const [step, setStep] = useState<1 | 2>(1);
    const [val, setVal] = useState('4d');
    const [paymentMethod, setPaymentMethod] = useState<'card' | 'yape'>('card');
    const [acceptTerms, setAcceptTerms] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);

    useEffect(() => {
        if (!isOpen || !id) return;
        setPub(null);
        setStep(1);
        setVal('4d');
        setPaymentMethod('card');
        setAcceptTerms(false);
        getPublicationById(id).then(setPub);
    }, [isOpen, id]);

    if (!isOpen) return null;

    const tier = tiers[val] || tiers['4d'];

    // Fecha de vencimiento real del aviso (no un "diasRestantesActual" inventado)
    const fechaVence = pub?.expires_at ? new Date(pub.expires_at) : new Date();
    const fechaNueva = new Date(fechaVence);
    fechaNueva.setDate(fechaVence.getDate() + tier.dias);

    const opcionesCorta: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' };
    const opcionesLarga: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long' };
    const fechaVenceCorta = fechaVence.toLocaleDateString('es-PE', opcionesCorta).replace('.', '');
    const fechaNuevaCorta = fechaNueva.toLocaleDateString('es-PE', opcionesCorta).replace('.', '');
    const fechaNuevaLarga = fechaNueva.toLocaleDateString('es-PE', opcionesLarga);

    const handlePagar = async () => {
        setIsProcessing(true);
        await extendExpiration(id, tier.dias);
        setIsProcessing(false);
        onClose();
        onExtended();
        showToast('Se amplió el tiempo de tu aviso correctamente', 'success');
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

                {!pub ? (
                    <div className="admin-info-box">
                        <i className="ti ti-loader"></i>
                        <p>Cargando datos del aviso...</p>
                    </div>
                ) : (
                    <>
                        {step === 1 && (
                            <div id="tiempo-modal-step-1">
                                <div className="tiempo-timeline-preview">
                                    <div className="tiempo-timeline-track">
                                        <div className="tiempo-timeline-base"></div>
                                        <div className={`tiempo-timeline-growth level-${tier.level}`}></div>

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

                                        <div className={`tiempo-timeline-point point-nueva level-${tier.level}`}>
                                            <span className="tiempo-timeline-dot dot-nueva"></span>
                                            <span className="tiempo-timeline-label label-nueva">
                                                Nueva fecha<br /><b>{fechaNuevaCorta}</b>
                                            </span>
                                        </div>
                                    </div>

                                    <p className="tiempo-timeline-caption">
                                        <i className="ti ti-history"></i>
                                        Tu aviso seguirá activo hasta el <b>{fechaNuevaLarga}</b>{' '}
                                        <b>(+{tier.dias} días adicionales)</b>
                                    </p>
                                </div>

                                <div className="zona-options-grid">
                                    {Object.entries(tiers).map(([tierKey, t]) => (
                                        <label key={tierKey} className="zona-option-label">
                                            <input
                                                type="radio"
                                                name="tiempo-extra"
                                                value={tierKey}
                                                checked={val === tierKey}
                                                onChange={() => setVal(tierKey)}
                                            />
                                            <div className="zona-option-item">
                                                <div className="zona-option-top">
                                                    <div className="zona-icon">
                                                        <i className="ti ti-calendar-plus animation-none"></i>
                                                    </div>
                                                    <span className="zona-km">{t.nombre}</span>
                                                </div>
                                                <div className="zona-precio">
                                                    <span><i>{currencySymbol}</i> {t.precio}</span>
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

                        {step === 2 && (
                            <div id="tiempo-modal-step-2">
                                <div className="modal-summary">
                                    <div className="planes-modal-summary-bar">
                                        <div className="planes-summary-body">
                                            <span className="planes-summary-label">Tiempo seleccionado</span>
                                            <h5>{tier.nombre}</h5>
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
                    </>
                )}
            </div>
        </div>
    );
}