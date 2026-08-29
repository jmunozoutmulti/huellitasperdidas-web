'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import '@/styles/global/planes-modal.css';
import { useApp } from '@/context/AppContext';
import { getCountryByAbbr } from '@/lib/countries';

// Antes esto era 'local' | 'amplio' | 'urgente', pero los radio buttons reales
// usaban 'local' | 'estandar' | 'pro' — no coincidían, así que elegir Estándar
// o Avanzado rompía el modal (PLANES_DATA[esosValores] era undefined). Se
// corrige el tipo para que coincida con lo que el UI realmente usa.
export type PlanKey = 'local' | 'estandar' | 'pro';

interface PlanInfo {
    nombre: string;
    precio: number;
    dias: number;
}

// Producto distinto a los planes de difusión de avisos (plans.ts) — esto es
// para las herramientas de búsqueda (Centinela IA), con su propio catálogo
// y precios. Montos de países != Perú son SIMULADOS (mismo tipo de cambio
// del 26 ago 2026 usado en el resto del sistema), pendientes de que el
// admin los defina de verdad.
const PLANES_DATA_BY_COUNTRY: Record<string, Record<PlanKey, PlanInfo>> = {
    PE: {
        local: { nombre: 'Local', precio: 35, dias: 1 },
        estandar: { nombre: 'Estándar', precio: 60, dias: 3 },
        pro: { nombre: 'Avanzado', precio: 90, dias: 5 },
    },
    AR: {
        local: { nombre: 'Local', precio: 15900, dias: 1 },
        estandar: { nombre: 'Estándar', precio: 27300, dias: 3 },
        pro: { nombre: 'Avanzado', precio: 40900, dias: 5 },
    },
    CL: {
        local: { nombre: 'Local', precio: 9700, dias: 1 },
        estandar: { nombre: 'Estándar', precio: 16700, dias: 3 },
        pro: { nombre: 'Avanzado', precio: 25000, dias: 5 },
    },
    CO: {
        local: { nombre: 'Local', precio: 31800, dias: 1 },
        estandar: { nombre: 'Estándar', precio: 54500, dias: 3 },
        pro: { nombre: 'Avanzado', precio: 81800, dias: 5 },
    },
    MX: {
        local: { nombre: 'Local', precio: 177, dias: 1 },
        estandar: { nombre: 'Estándar', precio: 303, dias: 3 },
        pro: { nombre: 'Avanzado', precio: 455, dias: 5 },
    },
    UY: {
        local: { nombre: 'Local', precio: 420, dias: 1 },
        estandar: { nombre: 'Estándar', precio: 720, dias: 3 },
        pro: { nombre: 'Avanzado', precio: 1080, dias: 5 },
    },
    EC: {
        local: { nombre: 'Local', precio: 10, dias: 1 },
        estandar: { nombre: 'Estándar', precio: 18, dias: 3 },
        pro: { nombre: 'Avanzado', precio: 27, dias: 5 },
    },
};

function getPlanesData(country: string): Record<PlanKey, PlanInfo> {
    return PLANES_DATA_BY_COUNTRY[country] ?? PLANES_DATA_BY_COUNTRY['PE'];
}

interface PlanesModalProps {
    isOpen?: boolean;
    onClose?: () => void;
}

export default function PlanesModal({ isOpen: externalIsOpen, onClose: externalOnClose }: PlanesModalProps) {
    const { currentUser } = useApp();
    const country = currentUser?.country || 'PE';
    const currencySymbol = getCountryByAbbr(country).currency.symbol;
    const planes = getPlanesData(country);

    const [internalIsOpen, setInternalIsOpen] = useState(false);
    const isOpen = externalIsOpen !== undefined ? externalIsOpen : internalIsOpen;

    const handleClose = () => {
        if (externalOnClose) {
            externalOnClose();
        } else {
            setInternalIsOpen(false);
        }
    };

    const [step, setStep] = useState<1 | 2>(1);
    const [selectedPlan, setSelectedPlan] = useState<PlanKey>('local');
    const [payMethod, setPayMethod] = useState<'card' | 'yape'>('card');
    const [showConfirm, setShowConfirm] = useState(false);
    const [acceptedTerms, setAcceptedTerms] = useState(false);

    // Escuchar el evento de apertura global emitido por los botones
    useEffect(() => {
        const handleGlobalOpen = () => {
            setInternalIsOpen(true);
        };

        window.addEventListener('openPlanesModal', handleGlobalOpen);
        return () => window.removeEventListener('openPlanesModal', handleGlobalOpen);
    }, []);

    // Reiniciar estados al abrir/cerrar modal y bloquear scroll
    useEffect(() => {
        if (isOpen) {
            setStep(1);
            setSelectedPlan('local');
            setShowConfirm(false);
            setPayMethod('card');
            setAcceptedTerms(false);
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }

        return () => {
            document.body.style.overflow = '';
        };
    }, [isOpen]);

    // Escuchar la tecla ESC para cerrar
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && isOpen) {
                handleClose();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen]);

    if (!isOpen) return null;

    const currentPlan = planes[selectedPlan];

    const handleNextStep = () => {
        setStep(2);
    };

    const handleBackStep = () => {
        setStep(1);
    };

    const handlePay = () => {
        setShowConfirm(true);
        setTimeout(() => {
            handleClose();
        }, 4000);
    };

    return (
        <div id="planes-modal-overlay" className="planes-modal-overlay">
            <div className="planes-modal-backdrop" onClick={handleClose}></div>
            <div className="planes-modal-card">
                {/* HEADER */}
                <div className="planes-modal-header">
                    <div>
                        <span className="planes-modal-eyebrow">
                            <i className="ti ti-settings-search"></i> Herramientas Avanzadas
                        </span>
                    </div>
                    <button
                        type="button"
                        className="planes-modal-close"
                        id="planes-modal-close"
                        onClick={handleClose}
                    >
                        <i className="ti ti-x"></i>
                    </button>
                </div>

                {/* PASO 1: ELEGIR PLAN */}
                {step === 1 && (
                    <div id="planes-modal-step-1">
                        <div className="planes-modal-grid">
                            {/* PLAN BÁSICO / LOCAL */}
                            <label className="planes-modal-plan-label">
                                <input
                                    type="radio"
                                    name="modal_plan"
                                    value="local"
                                    checked={selectedPlan === 'local'}
                                    onChange={() => setSelectedPlan('local')}
                                />
                                <div className="planes-modal-plan-item">
                                    <div className="box-modal-plan-top">
                                        <div className="planes-modal-plan-top">
                                            <h4 className="planes-modal-plan-name">Básico</h4>
                                        </div>
                                        <ul className="planes-modal-features">
                                            <li>
                                                <i className="ti ti-check"></i> Buscador automático 24/7
                                            </li>
                                            <li className="feat-disabled">
                                                <i className="ti ti-cancel"></i> Búsqueda por foto
                                            </li>
                                            <li className="feat-disabled">
                                                <i className="ti ti-cancel"></i> Alertas WhatsApp
                                            </li>
                                        </ul>
                                    </div>
                                    <div>
                                        <div className="planes-modal-plan-price">
                                            <span>
                                                <i>{currencySymbol}</i> {planes.local.precio}
                                            </span>{' '}
                                            <p>/ <i className="fa-solid fa-credit-card"></i> Pago único</p>
                                        </div>
                                        <p className="planes-modal-plan-days">
                                            <i className="ti ti-clock-hour-5"></i>Duración: <b>{planes.local.dias} día{planes.local.dias === 1 ? '' : 's'}</b>
                                        </p>
                                    </div>
                                </div>
                            </label>

                            {/* PLAN ESTÁNDAR */}
                            <label className="planes-modal-plan-label">
                                <input
                                    type="radio"
                                    name="modal_plan"
                                    value="estandar"
                                    checked={selectedPlan === 'estandar'}
                                    onChange={() => setSelectedPlan('estandar')}
                                />
                                <div className="planes-modal-plan-item">
                                    <div className="box-modal-plan-top">
                                        <div className="planes-modal-plan-top">
                                            <h4 className="planes-modal-plan-name">Estándar</h4>
                                        </div>
                                        <ul className="planes-modal-features">
                                            <li>
                                                <i className="ti ti-check"></i> Buscador automático 24/7
                                            </li>
                                            <li>
                                                <i className="ti ti-check"></i> Búsqueda por foto
                                            </li>
                                            <li className="feat-disabled">
                                                <i className="ti ti-cancel"></i> Alertas WhatsApp
                                            </li>
                                        </ul>
                                    </div>
                                    <div>
                                        <div className="planes-modal-plan-price">
                                            <span>
                                                <i>{currencySymbol}</i> {planes.estandar.precio}
                                            </span>{' '}
                                            <p>/ <i className="fa-solid fa-credit-card"></i> Pago único</p>
                                        </div>
                                        <p className="planes-modal-plan-days">
                                            <i className="ti ti-clock-hour-5"></i>Duración: <b>{planes.estandar.dias} días</b>
                                        </p>
                                    </div>
                                </div>
                            </label>

                            {/* PLAN PRO / AVANZADO */}
                            <label className="planes-modal-plan-label">
                                <input
                                    type="radio"
                                    name="modal_plan"
                                    value="pro"
                                    checked={selectedPlan === 'pro'}
                                    onChange={() => setSelectedPlan('pro')}
                                />
                                <div className="planes-modal-plan-item planes-modal-plan-recommended">
                                    <div className="box-modal-plan-top">
                                        <span className="planes-modal-recommended-tag">
                                            <i className="ti ti-bolt"></i> Recomendado
                                        </span>
                                        <div className="planes-modal-plan-top">
                                            <h4 className="planes-modal-plan-name">Avanzado</h4>
                                        </div>
                                        <ul className="planes-modal-features">
                                            <li>
                                                <i className="ti ti-check"></i> Buscador automático 24/7
                                            </li>
                                            <li>
                                                <i className="ti ti-check"></i> Búsqueda por foto
                                            </li>
                                            <li>
                                                <i className="ti ti-check"></i> Alertas WhatsApp
                                            </li>
                                        </ul>
                                    </div>
                                    <div>
                                        <div className="planes-modal-plan-price">
                                            <span>
                                                <i>{currencySymbol}</i> {planes.pro.precio}
                                            </span>{' '}
                                            <p>/ <i className="fa-solid fa-credit-card"></i> Pago único</p>
                                        </div>
                                        <p className="planes-modal-plan-days">
                                            <i className="ti ti-clock-hour-5"></i>Duración: <b>{planes.pro.dias} días</b>
                                        </p>
                                    </div>
                                </div>
                            </label>
                        </div>

                        <div className="planes-modal-actions">
                            <div className="text-modal">
                                <i className="ti ti-world-search"></i> Buscamos en todo Internet (sitios, redes y más)
                            </div>
                            <button
                                type="button"
                                id="btn-planes-modal-next"
                                className="btn-publish"
                                onClick={handleNextStep}
                            >
                                Continuar <i className="ti ti-chevron-right"></i>
                            </button>
                        </div>
                    </div>
                )}

                {/* PASO 2: PAGAR */}
                {step === 2 && (
                    <div id="planes-modal-step-2">
                        <div className="modal-summary">
                            <div className="planes-modal-summary-bar" id="planes-modal-summary-bar">
                                <div className="planes-summary-body">
                                    <span className="planes-summary-label">Plan seleccionado</span>
                                    <h5 id="planes-summary-name">{currentPlan.nombre}</h5>
                                </div>
                                <div className="planes-summary-price" id="planes-summary-price">
                                    {currencySymbol} {currentPlan.precio}
                                </div>
                            </div>

                            <div className="payment-gateway-box">
                                <h4>
                                    <i className="fa-solid fa-shield-halved"></i> Checkout Seguro (Mercado Pago)
                                </h4>

                                <div className="payment-methods-tabs">
                                    <button
                                        type="button"
                                        className={`pay-tab-btn ${payMethod === 'card' ? 'active' : ''}`}
                                        onClick={() => setPayMethod('card')}
                                    >
                                        <i className="fa-solid fa-credit-card"></i> Tarjeta de Crédito/Débito
                                    </button>
                                    <button
                                        type="button"
                                        className={`pay-tab-btn ${payMethod === 'yape' ? 'active' : ''}`}
                                        onClick={() => setPayMethod('yape')}
                                    >
                                        <i className="fa-solid fa-mobile-screen-button"></i> Yape
                                    </button>
                                </div>

                                <div className="payment-methods-content">
                                    {payMethod === 'card' && (
                                        <div id="pay-method-modal-card" className="pay-method-panel active">
                                            <div className="groups-payment form-group">
                                                <label className="form-label">Número de tarjeta</label>
                                                <input
                                                    type="text"
                                                    className="form-input"
                                                    placeholder="0000 0000 0000 0000"
                                                />
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
                                    )}

                                    {payMethod === 'yape' && (
                                        <div id="pay-method-modal-yape" className="pay-method-panel active">
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
                                    )}
                                </div>

                                <div className="terms-acceptance-box">
                                    <label className="terms-checkbox-label">
                                        <input
                                            type="checkbox"
                                            id="modal-accept-terms"
                                            className="terms-checkbox-input"
                                            checked={acceptedTerms}
                                            onChange={(e) => setAcceptedTerms(e.target.checked)}
                                        />
                                        <span className="terms-checkbox-custom">
                                            <i className="fa-solid fa-check"></i>
                                        </span>
                                        <span className="terms-checkbox-text">
                                            Acepto los{' '}
                                            <Link href="/terminos-y-condiciones" target="_blank">
                                                Términos y Condiciones
                                            </Link>{' '}
                                            del servicio.
                                        </span>
                                    </label>
                                </div>
                            </div>
                        </div>

                        <div className="planes-modal-actions">
                            <button
                                type="button"
                                id="btn-planes-modal-back"
                                className="btn-secondary"
                                onClick={handleBackStep}
                            >
                                <i className="ti ti-chevron-left"></i> Volver
                            </button>
                            <button
                                type="button"
                                id="btn-planes-modal-pay"
                                className="btn-publish"
                                disabled={!acceptedTerms}
                                onClick={handlePay}
                            >
                                Pagar y Activar
                            </button>
                        </div>
                    </div>
                )}

                {/* OVERLAY DE CONFIRMACIÓN */}
                {showConfirm && (
                    <div id="planes-modal-confirm" className="planes-modal-confirm">
                        <div className="modal-icon">
                            <Image
                                src="/images/logo.svg"
                                alt="Huellas Perdidas"
                                width={80}
                                height={80}
                            />
                        </div>
                        <h3>¡Pago recibido!</h3>
                        <p>
                            Tus herramientas de búsqueda estarán <b>activas en un máximo de 10 minutos</b>. Te notificaremos por WhatsApp cuando estén listas.
                        </p>
                        <div className="planes-confirm-bar"></div>
                    </div>
                )}
            </div>
        </div>
    );
}