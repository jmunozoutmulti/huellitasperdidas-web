'use client';

import { ChangeEvent, useState, useEffect } from 'react';
import CustomSelect from '@/components/ui/CustomSelect';
import { useApp } from '@/context/AppContext';
import { getCountryByAbbr, type Country } from '@/lib/countries';
import { getLevel1Options, getLevel2Options, getLevel3Options } from '@/lib/locations';

interface SelectOption {
    value: string;
    label: string;
}

interface DatosSectionProps {
    avatarSrc: string | null;
    dNombre: string;
    dApellidoPaterno: string;
    dApellidoMaterno: string;
    dDepartamento: string;
    dProvincia: string;
    dDistrito: string;
    dTelefono: string;
    dCorreo: string;
    isDatosChanged: boolean;
    onSetNombre: (val: string) => void;
    onSetApellidoPaterno: (val: string) => void;
    onSetApellidoMaterno: (val: string) => void;
    onSetDepartamento: (val: string) => void;
    onSetProvincia: (val: string) => void;
    onSetDistrito: (val: string) => void;
    onAvatarChange: (e: ChangeEvent<HTMLInputElement>) => void;
    onAvatarRemove: () => void;
    onSaveDatos: () => void;
    onOpenCambiarNumero: () => void;
    onOpenCambiarClave: () => void;
}

export default function DatosSection({
    avatarSrc,
    dNombre,
    dApellidoPaterno,
    dApellidoMaterno,
    dDepartamento,
    dProvincia,
    dDistrito,
    dTelefono,
    dCorreo,
    isDatosChanged,
    onSetNombre,
    onSetApellidoPaterno,
    onSetApellidoMaterno,
    onSetDepartamento,
    onSetProvincia,
    onSetDistrito,
    onAvatarChange,
    onAvatarRemove,
    onSaveDatos,
    onOpenCambiarNumero,
    onOpenCambiarClave,
}: DatosSectionProps) {
    const { currentUser } = useApp();
    const countryCode = currentUser?.country || 'PE';

    const [country, setCountry] = useState<Country | null>(null);
    const [isLoadingCountry, setIsLoadingCountry] = useState(true);

    const [nivel1Options, setNivel1Options] = useState<SelectOption[]>([]);
    const [nivel2Options, setNivel2Options] = useState<SelectOption[]>([]);
    const [nivel3Options, setNivel3Options] = useState<SelectOption[]>([]);

    // Datos del país (para las etiquetas de ubicación)
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

    // Nivel 1 (Departamento/Estado/Región) — depende solo del país
    useEffect(() => {
        let isCancelled = false;
        getLevel1Options(countryCode).then((opts) => {
            if (!isCancelled) setNivel1Options(opts);
        });
        return () => {
            isCancelled = true;
        };
    }, [countryCode]);

    // Nivel 2 — depende del país + lo elegido en nivel 1
    useEffect(() => {
        let isCancelled = false;
        getLevel2Options(countryCode, dDepartamento).then((opts) => {
            if (!isCancelled) setNivel2Options(opts);
        });
        return () => {
            isCancelled = true;
        };
    }, [countryCode, dDepartamento]);

    // Nivel 3 — depende del país + nivel 1 + nivel 2
    useEffect(() => {
        let isCancelled = false;
        getLevel3Options(countryCode, dDepartamento, dProvincia).then((opts) => {
            if (!isCancelled) setNivel3Options(opts);
        });
        return () => {
            isCancelled = true;
        };
    }, [countryCode, dDepartamento, dProvincia]);

    const locationLabels = country?.locationLabels;
    const isCountryConfigured = !isLoadingCountry && !!locationLabels;

    return (
        <div className="cuenta-section active" id="section-datos">
            <div className="dashboard-recent-header">
                <h2 className="dashboard-subsection-title">Mis datos</h2>
                <p>
                    <i className="ti ti-info-circle"></i> Actualiza tu información personal
                </p>
            </div>

            <div className="datos-form-card">
                <p className="datos-section-label">Foto de perfil</p>
                <div className="datos-avatar-upload-row">
                    <div className="datos-avatar-preview" id="datos-avatar-preview">
                        {!avatarSrc ? (
                            <span className="datos-avatar-fallback">O</span>
                        ) : (
                            <img className="datos-avatar-img" id="datos-avatar-img" src={avatarSrc} alt="Avatar" />
                        )}
                        <label className="datos-avatar-edit-btn" htmlFor="datos-avatar-input">
                            <i className="ti ti-camera"></i>
                        </label>
                        <input
                            type="file"
                            id="datos-avatar-input"
                            accept="image/*"
                            className="hidden-view"
                            onChange={onAvatarChange}
                        />
                    </div>
                    <div className="datos-avatar-info">
                        <span className="datos-avatar-hint">JPG o PNG. Máximo 5MB.</span>
                        {avatarSrc && (
                            <button
                                type="button"
                                className="datos-avatar-remove-btn"
                                id="datos-avatar-remove"
                                onClick={onAvatarRemove}
                            >
                                <i className="ti ti-trash"></i> Quitar foto
                            </button>
                        )}
                    </div>
                </div>

                <div className="datos-section-divider"></div>

                <p className="datos-section-label">Información personal</p>
                <div className="grid-2col">
                    <div className="form-group">
                        <label className="form-label">Nombre</label>
                        <input
                            type="text"
                            className="form-input"
                            id="d-nombre"
                            value={dNombre}
                            onChange={(e) => onSetNombre(e.target.value)}
                        />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Apellido Paterno</label>
                        <input
                            type="text"
                            className="form-input"
                            id="d-apellido-paterno"
                            value={dApellidoPaterno}
                            onChange={(e) => onSetApellidoPaterno(e.target.value)}
                        />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Apellido Materno</label>
                        <input
                            type="text"
                            className="form-input"
                            id="d-apellido-materno"
                            value={dApellidoMaterno}
                            onChange={(e) => onSetApellidoMaterno(e.target.value)}
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label">
                            Ubicación{' '}
                            <span className="form-label-note">— Se usa para mostrarte avisos cerca de ti</span>
                        </label>

                        {isLoadingCountry ? (
                            <p className="form-label-note">Cargando...</p>
                        ) : !isCountryConfigured ? (
                            <div className="admin-info-box">
                                <i className="ti ti-info-circle"></i>
                                <p>Este país aún no está configurado. Vuelve más tarde.</p>
                            </div>
                        ) : (
                            <div className="grid-3col">
                                <div className="form-group">
                                    <CustomSelect
                                        id="d-departamento"
                                        placeholder={locationLabels![0]}
                                        value={dDepartamento}
                                        onChange={onSetDepartamento}
                                        options={nivel1Options}
                                        searchable={true}
                                    />
                                </div>
                                <div className="form-group">
                                    <CustomSelect
                                        id="d-provincia"
                                        placeholder={locationLabels![1]}
                                        value={dProvincia}
                                        onChange={onSetProvincia}
                                        options={nivel2Options}
                                        searchable={true}
                                    />
                                </div>
                                <div className="form-group">
                                    <CustomSelect
                                        id="d-distrito"
                                        placeholder={locationLabels![2]}
                                        value={dDistrito}
                                        onChange={onSetDistrito}
                                        options={nivel3Options}
                                        searchable={true}
                                    />
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <div className="form-group">
                    <label className="form-label">
                        Teléfono de contacto <span className="form-label-note">— Aparece en tus avisos</span>
                    </label>
                    <div className="datos-locked-field">
                        <div className="datos-input-verified">
                            <input type="tel" className="form-input" id="d-telefono" value={dTelefono} disabled />
                            <span className="datos-verified-badge">
                                <i className="ti ti-circle-check"></i> Verificado
                            </span>
                        </div>
                        <button
                            type="button"
                            className="datos-unlock-btn"
                            data-field="telefono"
                            onClick={onOpenCambiarNumero}
                        >
                            <i className="ti ti-lock"></i> Cambiar
                        </button>
                    </div>
                </div>

                <div className="datos-section-divider"></div>

                <p className="datos-section-label">Seguridad y acceso</p>

                <div className="form-group">
                    <label className="form-label">
                        Correo electrónico{' '}
                        <span className="form-label-note">— No se puede modificar</span>
                    </label>
                    <div className="datos-locked-field">
                        <input type="email" className="form-input" id="d-correo" value={dCorreo} disabled />
                    </div>
                </div>

                <div className="form-group">
                    <label className="form-label">Contraseña</label>
                    <div className="datos-locked-field">
                        <input type="password" className="form-input" value="••••••••" disabled />
                        <button
                            type="button"
                            className="datos-unlock-btn"
                            data-field="clave"
                            onClick={onOpenCambiarClave}
                        >
                            <i className="ti ti-lock"></i> Cambiar
                        </button>
                    </div>
                </div>

                <div className="datos-form-actions">
                    <button
                        type="button"
                        className="btn-save-datos"
                        id="btn-guardar-datos"
                        disabled={!isDatosChanged}
                        onClick={onSaveDatos}
                    >
                        <i className="ti ti-device-floppy"></i> Guardar cambios
                    </button>
                </div>
            </div>
        </div>
    );
}