'use client';

import { useState, useEffect } from 'react';
import { showToast } from '@/components/global/Toast';
import { useApp } from '@/context/AppContext';
import { getCountryByAbbr, type Country } from '@/lib/countries';
import { AuthApiError } from '@/lib/authApi';
import { normalizePhoneInput, isValidPhone } from '@/lib/phoneUtils';

interface ModalAgregarNumeroProps {
    isOpen: boolean;
    onClose: () => void;
    mode?: 'add' | 'change';
    mandatory?: boolean;
}

export default function ModalAgregarNumero({ isOpen, onClose, mode = 'add', mandatory = false }: ModalAgregarNumeroProps) {
    const { currentUser, updateProfile } = useApp();
    const countryCode = currentUser?.country ?? null;

    const [country, setCountry] = useState<Country | null>(null);
    const [isLoadingCountry, setIsLoadingCountry] = useState(true);

    const [numero, setNumero] = useState('');
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
            setNumero(currentUser?.phone?.replace(/^\+\d+\s*/, '') || '');
        }
    }, [isOpen, currentUser?.phone]);

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
                    ) : !country?.dialCode ? (
                        <div className="admin-info-box">
                            <i className="ti ti-info-circle"></i>
                            <p>Tu país todavía no está configurado para agregar un número de contacto. Vuelve más tarde.</p>
                        </div>
                    ) : (
                        <div className="modal-step active">
                            <div className="form-group">
                                <label className="form-label">Número de contacto</label>
                                <div className="datos-input-modal">
                                    <div
                                        className="country-select-trigger"
                                    >
                                        <span>{country.code}</span>
                                        <span>{country.dialCode}</span>
                                    </div>
                                    <input
                                        type="tel"
                                        className="form-input"
                                        maxLength={15}
                                        placeholder="Tu número"
                                        value={numero}
                                        onChange={(e) => setNumero(e.target.value)}
                                    />
                                </div>
                            </div>
                            <div className="admin-info-box info-box-revision">
                                <i className="ti ti-info-circle"></i>
                                <p>Este número se usará para notificaciones y podrás usarlo como contacto en tus avisos. <b>Verifícalo antes de guardar.</b></p>
                            </div>
                        </div>
                    )}
                </div>

                {country?.dialCode && (
                    <div className="app-modal-footer">
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
                                disabled={isSaving}
                                onClick={async () => {
                                    if (!isValidPhone(numero, country.code)) {
                                        showToast('Ingresa un número de contacto válido', 'error');
                                        return;
                                    }
                                    const numeroLimpio = normalizePhoneInput(numero, country.code);
                                    setIsSaving(true);
                                    try {
                                        await updateProfile({ phone: `${country.dialCode} ${numeroLimpio}` });
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
                                    } finally {
                                        setIsSaving(false);
                                    }
                                }}
                            >
                                <i className="ti ti-check"></i> {isSaving ? 'Guardando...' : 'Guardar número'}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}