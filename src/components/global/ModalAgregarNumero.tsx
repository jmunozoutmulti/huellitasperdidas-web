'use client';

import { useState, useEffect } from 'react';
import { showToast } from '@/components/global/Toast';
import { useApp } from '@/context/AppContext';
import { getCountryByAbbr, type Country } from '@/lib/countries';
import { AuthApiError } from '@/lib/authApi';

interface ModalAgregarNumeroProps {
    isOpen: boolean;
    onClose: () => void;
    mode?: 'add' | 'change';
    mandatory?: boolean;
}

export default function ModalAgregarNumero({ isOpen, onClose, mode = 'add', mandatory = false }: ModalAgregarNumeroProps) {
    const { currentUser, updateProfile } = useApp();
    const countryCode = currentUser?.country || 'PE';

    const [country, setCountry] = useState<Country | null>(null);
    const [isLoadingCountry, setIsLoadingCountry] = useState(true);

    const [step, setStep] = useState<1 | 2>(1);
    const [numero, setNumero] = useState('');
    const [codigo, setCodigo] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    // El código de país ya no se elige acá — se toma del país de la cuenta,
    // igual que ya hacemos con Ubicación. El select se muestra solo como
    // referencia visual, bloqueado.
    useEffect(() => {
        let isCancelled = false;
        setIsLoadingCountry(true);
        getCountryByAbbr(countryCode).then((c) => {
            if (!isCancelled) {
                setCountry(c);
                setIsLoadingCountry(false);
            }
        });
        return () => {
            isCancelled = true;
        };
    }, [countryCode]);

    useEffect(() => {
        if (isOpen) {
            setStep(1);
            setNumero('');
            setCodigo('');
        }
    }, [isOpen]);

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
                    {isLoadingCountry ? (
                        <div className="admin-info-box info-box-revision">
                            <i className="ti ti-loader"></i>
                            <p>Cargando...</p>
                        </div>
                    ) : !country?.dialCode || !country?.phoneDigits ? (
                        <div className="admin-info-box">
                            <i className="ti ti-info-circle"></i>
                            <p>Tu país todavía no está configurado para agregar un número de contacto. Vuelve más tarde.</p>
                        </div>
                    ) : (
                        <>
                            {step === 1 && (
                                <div className="modal-step active" data-step="1">
                                    <span className="modal-step-indicator">Paso 1 de 2</span>
                                    <div className="form-group">
                                        <label className="form-label">Número de contacto</label>
                                        <div className="datos-input-modal">
                                            <button
                                                type="button"
                                                className="country-select-trigger pointernone"
                                                disabled
                                                title="El código de país se toma de tu cuenta"
                                            >
                                                <span className="country-select-flag">{country.code}</span>
                                                <span>{country.dialCode}</span>
                                                <i className="ti ti-lock"></i>
                                            </button>
                                            <input
                                                type="tel"
                                                className="form-input"
                                                maxLength={country.phoneDigits}
                                                placeholder={'0'.repeat(country.phoneDigits)}
                                                value={numero}
                                                onChange={(e) => setNumero(e.target.value)}
                                            />
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
                                            <b>{country.dialCode} {numero || '—'}</b>.
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
                        </>
                    )}
                </div>

                {country?.dialCode && country?.phoneDigits && (
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
                                        if (!numero || numero.length < country.phoneDigits!) {
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
                                            await updateProfile({ phone: `${country.dialCode} ${numero}` });
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
                )}
            </div>
        </div>
    );
}