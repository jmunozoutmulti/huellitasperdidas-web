'use client';

import { useState, useEffect, useRef } from 'react';
import { showToast } from '@/components/global/Toast';
import { useApp } from '@/context/AppContext';
import { COUNTRIES, DEFAULT_COUNTRY, type Country } from '@/lib/countries';
import { AuthApiError } from '@/lib/authApi';

interface ModalAgregarNumeroProps {
    isOpen: boolean;
    onClose: () => void;
    mode?: 'add' | 'change';
    mandatory?: boolean;
}

export default function ModalAgregarNumero({ isOpen, onClose, mode = 'add', mandatory = false }: ModalAgregarNumeroProps) {
    const { updateProfile } = useApp();
    const [step, setStep] = useState<1 | 2>(1);
    const [numero, setNumero] = useState('');
    const [codigo, setCodigo] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [selectedCountry, setSelectedCountry] = useState<Country>(DEFAULT_COUNTRY);
    const [isCountryDropdownOpen, setIsCountryDropdownOpen] = useState(false);
    const countryDropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (isOpen) {
            setStep(1);
            setNumero('');
            setCodigo('');
            setSelectedCountry(DEFAULT_COUNTRY);
            setIsCountryDropdownOpen(false);
        }
    }, [isOpen]);

    // Cierra el dropdown de país si el usuario hace clic fuera de él
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (countryDropdownRef.current && !countryDropdownRef.current.contains(event.target as Node)) {
                setIsCountryDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    if (!isOpen) return null;

    return (
        <div className="app-modal open" id="modal-agregar-numero">
            <div className="app-modal-backdrop" onClick={mandatory ? undefined : onClose}></div>
            <div className="app-modal-card">
                <div className="app-modal-header">
                    <h3>{mode === 'change' ? 'Cambiar número de contacto' : 'Agregar número de contacto'}</h3>
                    {!mandatory && (
                        <button type="button" className="app-modal-close" onClick={onClose}>
                            <i className="ti ti-x"></i>
                        </button>
                    )}
                </div>
                <div className="app-modal-body">
                    {step === 1 && (
                        <div className="modal-step active" data-step="1">
                            <span className="modal-step-indicator">Paso 1 de 2</span>
                            <div className="form-group">
                                <label className="form-label">Número de contacto</label>
                                <div className="datos-input-modal " ref={countryDropdownRef}>
                                    <button
                                        type="button"
                                        className="country-select-trigger"
                                        onClick={() => setIsCountryDropdownOpen((prev) => !prev)}
                                    >
                                        <span className="country-select-flag">{selectedCountry.abbr}</span>
                                        <span>{selectedCountry.dialCode}</span>
                                        <i className="ti ti-chevron-down"></i>
                                    </button>
                                    <input
                                        type="tel"
                                        className="form-input"
                                        maxLength={selectedCountry.phoneDigits}
                                        placeholder={'0'.repeat(selectedCountry.phoneDigits)}
                                        value={numero}
                                        onChange={(e) => setNumero(e.target.value)}
                                    />

                                    {isCountryDropdownOpen && (
                                        <div className="country-select-dropdown show">
                                            {COUNTRIES.map((c) => (
                                                <button
                                                    key={c.abbr}
                                                    type="button"
                                                    className={selectedCountry.abbr === c.abbr ? 'selected' : ''}
                                                    onClick={() => {
                                                        setSelectedCountry(c);
                                                        setNumero((prev) => prev.slice(0, c.phoneDigits));
                                                        setIsCountryDropdownOpen(false);
                                                    }}
                                                >
                                                    {c.name} <span className="country-dial">{c.dialCode}</span>
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div className="admin-info-box info-box-revision">
                                <i className="ti ti-info-circle"></i>
                                <p>Este número se mostrará en tus avisos, es importante que lo verifiques.</p>
                            </div>
                        </div>
                    )}

                    {step === 2 && (
                        <div className="modal-step active" data-step="2">
                            <span className="modal-step-indicator">Paso 2 de 2</span>
                            <div className="admin-info-box info-box-revision">
                                <i className="ti ti-message-circle"></i>
                                <p>
                                    Te hemos enviado un código de acceso de un solo uso al{' '}
                                    <b>{selectedCountry.dialCode} {numero || '—'}</b>.
                                    Este código caducará en 5 minutos.
                                </p>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Código de verificación</label>
                                <div className="code-input-group">
                                    <input
                                        type="text"
                                        className="form-input"
                                        maxLength={6}
                                        placeholder="000000"
                                        value={codigo}
                                        onChange={(e) => setCodigo(e.target.value)}
                                    />
                                </div>
                                <button
                                    type="button"
                                    className="btn-reenviar-codigo"
                                    onClick={() => showToast('Código reenviado por SMS', 'info')}
                                >
                                    Reenviar código
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                <div className="app-modal-footer">
                    {step === 1 ? (
                        <div
                            className="modal-footer-step active"
                            style={{ width: '100%', justifyContent: 'flex-end', display: 'flex', gap: '0.5rem' }}
                        >
                            {!mandatory && (
                                <button type="button" className="btn-secondary" onClick={onClose}>
                                    Cancelar
                                </button>
                            )}
                            <button
                                type="button"
                                className="btn-publish"
                                onClick={() => {
                                    if (!numero || numero.length < selectedCountry.phoneDigits) {
                                        showToast('Ingresa un número de contacto válido', 'error');
                                        return;
                                    }
                                    setStep(2);
                                    showToast('Enviamos un código de verificación por SMS', 'info');
                                }}
                            >
                                <i className="ti ti-send"></i> Enviar código
                            </button>
                        </div>
                    ) : (
                        <div
                            className="modal-footer-step active"
                            style={{ width: '100%', justifyContent: 'flex-end', display: 'flex', gap: '0.5rem' }}
                        >
                            <button type="button" className="btn-secondary" onClick={() => setStep(1)}>
                                Atrás
                            </button>
                            <button
                                type="button"
                                className="btn-publish"
                                disabled={isSaving}
                                onClick={async () => {
                                    if (!codigo || codigo.length !== 6) {
                                        showToast('Ingresa el código de 6 dígitos', 'error');
                                        return;
                                    }
                                    setIsSaving(true);
                                    try {
                                        await updateProfile({ phone: `${selectedCountry.dialCode} ${numero}` });
                                        onClose();
                                        showToast(
                                            mode === 'change'
                                                ? 'Tu número de contacto fue actualizado correctamente'
                                                : 'Tu número de contacto fue agregado correctamente',
                                            'success'
                                        );
                                    } catch (err) {
                                        const message = err instanceof AuthApiError ? err.message : 'No pudimos guardar tu número. Intenta de nuevo.';
                                        showToast(message, 'error');
                                        setIsSaving(false);
                                    }
                                }}
                            >
                                <i className="ti ti-check"></i> {isSaving ? 'Guardando...' : 'Verificar y guardar'}
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}