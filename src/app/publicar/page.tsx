'use client';
import { useState, useEffect, useRef, ChangeEvent } from 'react';
import Link from 'next/link';
import CustomSelect from '@/components/ui/CustomSelect';
import { useApp } from '@/context/AppContext';
import { createPublication } from '@/lib/publications';
import { showToast } from '@/components/global/Toast';
import DraggablePhoto from '@/components/global/DraggablePhoto';

import dynamic from 'next/dynamic';
import { geocodeAddress } from '@/lib/geocoding';
import { getPlanById } from '@/lib/plans';
import { generateFlyerImage } from '@/lib/flyerExport';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import ModalAgregarNumero from '@/components/global/ModalAgregarNumero';
import { getCountryByAbbr } from '@/lib/countries';
import { getLevel1Options, getLevel2Options, getLevel3Options } from '@/lib/locations';

const MapPicker = dynamic(() => import('@/components/global/MapPicker'), { ssr: false });

export default function PublicarPerdidaPage() {

    useRequireAuth();

    const { currentUser, isDarkMode, isAuthChecked, isLoggedIn } = useApp();

    const [lat, setLat] = useState<number | null>(null);
    const [lng, setLng] = useState<number | null>(null);
    const [isAdjustingMap, setIsAdjustingMap] = useState(false);
    const [isGeocoding, setIsGeocoding] = useState(false);

    const [photoOffsets, setPhotoOffsets] = useState<Record<number, number>>({});

    const [flyerImageBase64, setFlyerImageBase64] = useState<string | null>(null);
    const [isGeneratingFlyer, setIsGeneratingFlyer] = useState(false);


    // ==========================================
    // ESTADOS DEL WIZARD (MULTIPASO)
    // ==========================================
    const [currentStep, setCurrentStep] = useState(1);
    const [selectedPlan, setSelectedPlan] = useState('urgente');
    const [paymentMethod, setPaymentMethod] = useState<'card' | 'yape'>('card');
    const [acceptTerms, setAcceptTerms] = useState(false);

    // Overlay de status final
    const [showStatusOverlay, setShowStatusOverlay] = useState(false);

    // ==========================================
    // ESTADOS DEL FORMULARIO Y FLYER EN VIVO
    // ==========================================
    const [nombre, setNombre] = useState('');
    const [fechaDia, setFechaDia] = useState('');
    const [fechaMes, setFechaMes] = useState('');
    const [fechaAnio, setFechaAnio] = useState('');
    const [fechaDisplay, setFechaDisplay] = useState('');
    const [isDatePopoverOpen, setIsDatePopoverOpen] = useState(false);

    const [sexo, setSexo] = useState('');
    const [isCastrado, setIsCastrado] = useState(false);
    const [tipoMascota, setTipoMascota] = useState('');
    const [tamano, setTamano] = useState('');
    const [raza, setRaza] = useState('');
    const [color, setColor] = useState('');
    const [direccion, setDireccion] = useState('');

    const [departamento, setDepartamento] = useState('');
    const [provincia, setProvincia] = useState('');
    const [distrito, setDistrito] = useState('');



    const [zonaDisplay, setZonaDisplay] = useState('');
    const [isZonePopoverOpen, setIsZonePopoverOpen] = useState(false);

    const [isCollapsibleOpen, setIsCollapsibleOpen] = useState(false);
    const [observaciones, setObservaciones] = useState('');
    const [recompensa, setRecompensa] = useState('');
    const [ocultarMonto, setOcultarMonto] = useState(false);
    const [edad, setEdad] = useState('');

    const [uploadedImages, setUploadedImages] = useState<(string | null)[]>([
        null,
        null,
        null,
        null,
    ]);

    // Mobile Flyer Preview Toggle
    const [isFlyerMobileVisible, setIsFlyerMobileVisible] = useState(false);

    const datePopoverRef = useRef<HTMLDivElement>(null);
    const zonePopoverRef = useRef<HTMLDivElement>(null);

    // ==========================================
    // EFECTOS DE CIERRE DE POPOVERS Y EVENTOS
    // ==========================================
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (
                datePopoverRef.current &&
                !datePopoverRef.current.contains(e.target as Node)
            ) {
                setIsDatePopoverOpen(false);
            }
            if (
                zonePopoverRef.current &&
                !zonePopoverRef.current.contains(e.target as Node)
            ) {
                setIsZonePopoverOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside); // 👈 cambiado
        return () => document.removeEventListener('mousedown', handleClickOutside); // 👈 cambiado
    }, []);

    useEffect(() => {
        if (fechaDia && fechaMes && fechaAnio) {
            setIsDatePopoverOpen(false);
        }
    }, [fechaDia, fechaMes, fechaAnio]);

    useEffect(() => {
        if (departamento && provincia && distrito) {
            setIsZonePopoverOpen(false);
        }
    }, [departamento, provincia, distrito]);

    // Formatear Fecha Display
    useEffect(() => {
        const mesesCompletos: Record<string, string> = {
            '01': 'Enero',
            '02': 'Febrero',
            '03': 'Marzo',
            '04': 'Abril',
            '05': 'Mayo',
            '06': 'Junio',
            '07': 'Julio',
            '08': 'Agosto',
            '09': 'Septiembre',
            '10': 'Octubre',
            '11': 'Noviembre',
            '12': 'Diciembre',
        };

        if (fechaDia && fechaMes && fechaAnio) {
            const mesNombre = mesesCompletos[fechaMes] || '';
            setFechaDisplay(`${fechaDia} ${mesNombre} ${fechaAnio}`);
        } else {
            setFechaDisplay('');
        }
    }, [fechaDia, fechaMes, fechaAnio]);

    // Formatear Zona Display
    useEffect(() => {
        if (departamento && provincia && distrito) {
            setZonaDisplay(`${provincia}, ${departamento} , ${distrito}`);
        } else {
            setZonaDisplay('');
        }
    }, [departamento, provincia, distrito]);

    // ==========================================
    // CARGA Y REMOCIÓN DE IMÁGENES
    // ==========================================
    const handlePhotoChange = (e: ChangeEvent<HTMLInputElement>, index: number) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                const result = event.target?.result as string;
                setUploadedImages((prev) => {
                    const next = [...prev];
                    next[index] = result;
                    return next;
                });
            };
            reader.readAsDataURL(file);
        }
    };

    const handleRemovePhoto = (index: number) => {
        setUploadedImages((prev) => {
            const next = [...prev];
            next[index] = null;
            return next;
        });
    };

    // Fotos cargadas para el flyer
    const validPhotos = uploadedImages.filter((img) => img !== null) as string[];

    useEffect(() => {
        setPhotoOffsets({});
    }, [validPhotos.length]);

    // ==========================================
    // DATOS PARA EL RESUMEN (PASO 3)
    // ==========================================
    const country = currentUser?.country || 'PE';
    const currencySymbol = getCountryByAbbr(country).currency.symbol;
    const currentPlanObj = getPlanById(selectedPlan, country);

    const [labelNivel1, labelNivel2, labelNivel3] = getCountryByAbbr(country).locationLabels;
    const nivel1Options = getLevel1Options(country);
    const nivel2Options = getLevel2Options(country, departamento);
    const nivel3Options = getLevel3Options(country, departamento, provincia);

    const getFechaRange = () => {
        const hoy = new Date();
        const fin = new Date();
        fin.setDate(hoy.getDate() + currentPlanObj.dias);
        const opciones: Intl.DateTimeFormatOptions = {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
        };

        return {
            inicio:
                currentPlanObj.dias > 0
                    ? fin.toLocaleDateString('es-PE', opciones)
                    : 'Sujeto a aprobación',
            fin: currentPlanObj.dias > 0 ? fin.toLocaleDateString('es-PE', opciones) : '6 meses',
        };
    };


    // CLASES DINÁMICAS DE RADAR DEL MAPA (PASO 2)
    const getMapRadarClass = () => {
        switch (selectedPlan) {
            case 'local':
                return 'map-state-local';
            case 'amplio':
                return 'map-state-amplio';
            case 'urgente':
                return 'map-state-urgente';
            default:
                return 'map-state-gratis';
        }
    };

    // ==========================================
    // MANEJADORES DE NAVEGACIÓN Y SUBMIT
    // ==========================================

    function sanitizeText(value: string): string {
        return value.replace(/<[^>]*>?/gm, '').trim();
    }
    const [fieldErrors, setFieldErrors] = useState<Record<string, boolean>>({});

    function validateStep1(): boolean {
        const errors: Record<string, boolean> = {};

        if (!sanitizeText(nombre)) errors.nombre = true;
        if (!fechaDia || !fechaMes || !fechaAnio) errors.fecha = true;
        if (!sexo) errors.sexo = true;
        if (!tipoMascota) errors.tipoMascota = true;
        if (!tamano) errors.tamano = true;
        if (!sanitizeText(raza)) errors.raza = true;
        if (!sanitizeText(color)) errors.color = true;
        if (!sanitizeText(direccion)) errors.direccion = true;
        if (!departamento) errors.departamento = true;
        if (!provincia) errors.provincia = true;
        if (!distrito) errors.distrito = true;
        if (validPhotos.length === 0) errors.fotos = true;

        setFieldErrors(errors);

        if (Object.keys(errors).length > 0) {
            if (errors.fotos) {
                showToast('Agrega al menos 1 foto de tu mascota', 'error');
            } else {
                showToast('Completa todos los campos obligatorios', 'error');
            }
            return false;
        }

        return true;
    }


    const handleNextStep = async () => {
        if (currentStep === 1 && !validateStep1()) {
            return;
        }

        if (currentStep === 1) {
            setIsGeneratingFlyer(true);
            const flyerImage = await generateFlyerImage('flyer-preview');
            setFlyerImageBase64(flyerImage);
            setIsGeneratingFlyer(false);
        }

        if (currentStep < 3) {
            setCurrentStep((prev) => prev + 1);
        } else {
            executeFormSubmission();
        }
    };

    const handlePrevStep = () => {
        if (currentStep > 1) {
            setCurrentStep((prev) => prev - 1);
        }
    };

    const executeFormSubmission = async () => {
        if (currentUser) {
            await createPublication({
                user_id: currentUser.id,
                report_type: 'lost',
                pet_type: tipoMascota || null,
                title: sanitizeText(nombre) || null,
                description: sanitizeText(observaciones) || null,
                country: country,
                region: departamento || null,
                province: provincia || null,
                district: distrito || null,
                address_hint: sanitizeText(direccion) || null,
                event_date: fechaDia && fechaMes && fechaAnio ? `${fechaAnio}-${fechaMes}-${fechaDia}` : null,
                contact_name: currentUser.name || null,
                contact_phone: currentUser.phone || null,
                contact_email: currentUser.email || null,
                sex: sexo || null,
                is_neutered: isCastrado,
                size: tamano || null,
                breed: sanitizeText(raza) || null,
                color: sanitizeText(color) || null,
                reward: recompensa ? Number(recompensa) : null,
                reward_visible: !ocultarMonto,
                age: edad || null,
                adoption_extras: null,
                adoption_extras_visible: false,
                reach_facebook: false,
                reach_instagram: false,
                images: validPhotos,
                plan: selectedPlan,
                lat: lat,
                lng: lng,
                flyer_image: flyerImageBase64,
            });
        }

        setShowStatusOverlay(true);
        setTimeout(() => {
            window.location.href = 'https://www.huellasperdidas.com/informacion/alertas-de-estafa';
        }, 5000);
    };

    // Helper para generar las descripciones acumuladas del flyer
    const getFlyerDescription = () => {
        const rasgos: string[] = [];
        if (sexo) rasgos.push(sexo.toLowerCase());
        if (raza) rasgos.push(raza);
        if (isCastrado) rasgos.push(sexo === 'Hembra' ? 'esterilizada' : 'esterilizado');
        if (color) rasgos.push(color);
        if (observaciones) rasgos.push(observaciones);

        const fechaCorta = fechaDia && fechaMes ? `${fechaDia}/${fechaMes}` : null;

        let frase1 = rasgos.join(', ');
        if (fechaCorta) {
            frase1 = frase1 ? `${frase1}, me perdí el ${fechaCorta}.` : `Me perdí el ${fechaCorta}.`;
        } else if (frase1) {
            frase1 += '.';
        }

        let frase2 = '';
        if (direccion && distrito) {
            frase2 = `Me vieron en ${direccion}.`;
        } else if (direccion) {
            frase2 = `Me vieron en ${direccion}.`;
        }

        const textoCompleto = [frase1, frase2].filter(Boolean).join(' ');

        if (!textoCompleto) {
            return 'Completa los campos para autogenerar este flyer dinámicamente.';
        }
        return textoCompleto.charAt(0).toUpperCase() + textoCompleto.slice(1);
    };

    useEffect(() => {
        if (!distrito || !provincia || !departamento) return;

        let isCancelled = false;

        async function geocode() {
            setIsGeocoding(true);
            const result = await geocodeAddress(direccion, distrito, provincia, departamento, country);
            if (!isCancelled && result) {
                setLat(result.lat);
                setLng(result.lng);
            }
            if (!isCancelled) {
                setIsGeocoding(false);
            }
        }

        const timer = setTimeout(geocode, 800);

        return () => {
            isCancelled = true;
            clearTimeout(timer);
        };
    }, [distrito, direccion, provincia, departamento]);

    return (
        <main className="main-content">

            <ModalAgregarNumero
                isOpen={isAuthChecked && isLoggedIn && !currentUser?.phone}
                onClose={() => { }}
                mandatory
            />

            <section id="view-publish" className="animate-fade-in">
                <div className="grid-publish">
                    {/* ==========================================
              PANEL IZQUIERDO (PASOS Y SLOGAN)
             ========================================== */}
                    <div className="left-panel">
                        <h1>Publicar perdida</h1>

                        <div className="wizard-vertical-steps">
                            {/* PASO 1 */}
                            <div
                                className={`wizard-v-step ${currentStep === 1
                                    ? 'active'
                                    : currentStep > 1
                                        ? 'completed'
                                        : ''
                                    }`}
                                data-step="1"
                            >
                                <div className="step-icon-wrapper">
                                    <div className="step-icon">
                                        {currentStep > 1}
                                    </div>
                                    <div className="step-line"></div>
                                </div>
                                <div className="step-content">
                                    <span className="step-status">
                                        {currentStep === 1
                                            ? 'En progreso'
                                            : currentStep > 1
                                                ? 'Completado'
                                                : 'Pendiente'}
                                    </span>
                                    <h4 className="step-title">Datos de la mascota</h4>
                                </div>
                            </div>

                            {/* PASO 2 */}
                            <div
                                className={`wizard-v-step ${currentStep === 2
                                    ? 'active'
                                    : currentStep > 2
                                        ? 'completed'
                                        : ''
                                    }`}
                                data-step="2"
                            >
                                <div className="step-icon-wrapper">
                                    <div className="step-icon">
                                        {currentStep > 2}
                                    </div>
                                    <div className="step-line"></div>
                                </div>
                                <div className="step-content">
                                    <span className="step-status">
                                        {currentStep === 2
                                            ? 'En progreso'
                                            : currentStep > 2
                                                ? 'Completado'
                                                : 'Pendiente'}
                                    </span>
                                    <h4 className="step-title">Plan de difusión</h4>
                                </div>
                            </div>

                            {/* PASO 3 */}
                            <div
                                className={`wizard-v-step ${currentStep === 3 ? 'active' : ''
                                    }`}
                                data-step="3"
                            >
                                <div className="step-icon-wrapper">
                                    <div className="step-icon"></div>
                                </div>
                                <div className="step-content">
                                    <span className="step-status">
                                        {currentStep === 3 ? 'En progreso' : 'Pendiente'}
                                    </span>
                                    <h4 className="step-title">Validación y publicación</h4>
                                </div>
                            </div>
                        </div>

                        <div
                            className={`slogan-paragraph ${selectedPlan === 'gratis' ? 'slogan-dimmed' : ''
                                }`}
                        >
                            <div>
                                <span className="slogan-eyebrow">
                                    <i className="ti ti-sparkles"></i> Cómo funciona
                                </span>
                                <div className="slogan-body">
                                    <p>
                                        Todos los planes se muestran en la{' '}
                                        <b>zona exacta donde se perdió tu mascota.</b>
                                    </p>
                                </div>
                                <div className="slogan-divider"></div>
                                <div className="slogan-reach-row">
                                    <div className="slogan-reach-item">
                                        <span className="slogan-reach-icon">
                                            <i className="ti ti-device-mobile-message"></i>
                                        </span>
                                        <span>
                                            El aviso se muestra a <b>personas cercanas</b>, incluso si
                                            no siguen páginas o grupos.
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div
                            className={`centinela-addon-bar ${selectedPlan === 'gratis' ? 'centinela-dimmed' : ''
                                }`}
                            id="centinela-addon-bar"
                        >
                            <div className="centinela-addon-body">
                                <div className="centinela-addon-top">
                                    <h5>
                                        <span className="status-pulse"></span>Centinela IA · Incluido
                                    </h5>
                                </div>
                                <p>Búsqueda automática 24/7</p>
                            </div>
                        </div>
                    </div>

                    {/* ==========================================
              PANEL CENTRAL (FORMULARIO Y PASOS)
             ========================================== */}
                    <div className="center-panel">
                        <form
                            id="multi-step-publish-form"
                            autoComplete="off"
                            onSubmit={(e) => e.preventDefault()}
                        >
                            {/* ==================== PASO 1 ==================== */}
                            <div
                                className={`wizard-step ${currentStep === 1 ? 'active' : ''}`}
                                id="wizard-step-1"
                            >
                                <div id="form-perdida" className="publish-form-panel active">
                                    {/* UPLOADER FOTOS */}
                                    {/* UPLOADER FOTOS */}
                                    <div className="groups form-group">
                                        <label>Fotos de la mascota (Máx. 4)</label>
                                        <div className={`photo-upload-grid ${fieldErrors.fotos ? 'input-error' : ''}`}>
                                            {[0, 1, 2, 3].map((idx) => (
                                                <div
                                                    key={idx}
                                                    className="photo-uploader-box"
                                                    id={`e-box-${idx}`}
                                                    style={{
                                                        backgroundImage: uploadedImages[idx]
                                                            ? `url('${uploadedImages[idx]}')`
                                                            : 'none',
                                                        backgroundSize: 'cover',
                                                        backgroundPosition: 'center',
                                                    }}
                                                >
                                                    {!uploadedImages[idx] && (
                                                        <>
                                                            <i className="ti ti-camera-plus"></i>
                                                            <input
                                                                type="file"
                                                                className="pet-photo-input"
                                                                data-index={idx}
                                                                accept="image/*"
                                                                onChange={(e) => handlePhotoChange(e, idx)}
                                                            />
                                                            {idx === 0 && (
                                                                <div className="scanner-corners">
                                                                    <span className="corner tl"></span>
                                                                    <span className="corner tr"></span>
                                                                    <span className="corner bl"></span>
                                                                    <span className="corner br"></span>
                                                                </div>
                                                            )}
                                                        </>
                                                    )}
                                                    {uploadedImages[idx] && (
                                                        <button
                                                            type="button"
                                                            className="btn-remove-photo"
                                                            data-index={idx}
                                                            onClick={() => handleRemovePhoto(idx)}
                                                        >
                                                            <i className="ti ti-x"></i>
                                                        </button>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                        {fieldErrors.fotos && (
                                            <small style={{ color: '#dc2626', display: 'block', marginTop: '0.3em' }}>
                                                Agrega al menos 1 foto
                                            </small>
                                        )}
                                    </div>

                                    <div className="groups grid-2col box-data-flyer">
                                        {/* NOMBRE */}
                                        <div className="form-group">
                                            <input
                                                type="text"
                                                placeholder="Nombre de la mascota"
                                                id="p-nombre"
                                                className={`form-input ${fieldErrors.nombre ? 'input-error' : ''}`}
                                                value={nombre}
                                                onChange={(e) => setNombre(e.target.value)}
                                            />
                                        </div>

                                        {/* FECHA CON POPOVER */}
                                        <div
                                            className="form-group date-picker-group"
                                            ref={datePopoverRef}
                                        >
                                            <div
                                                className={`date-input-trigger ${fechaDisplay ? 'has-value' : ''} ${fieldErrors.fecha ? 'input-error' : ''
                                                    }`}
                                                id="date-input-trigger"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setIsDatePopoverOpen(!isDatePopoverOpen);
                                                }}
                                            >
                                                <i className="ti ti-calendar-x"></i>
                                                <input
                                                    type="text"
                                                    id="p-fecha-display"
                                                    className="form-input"
                                                    placeholder="Fecha de la pérdida"
                                                    readOnly
                                                    autoComplete="off"
                                                    value={fechaDisplay}
                                                />
                                            </div>

                                            <div
                                                className={`date-popover ${isDatePopoverOpen ? 'open' : ''
                                                    }`}
                                                id="date-popover"
                                                onClick={(e) => e.stopPropagation()}
                                            >
                                                <div className="date-selects-inline">
                                                    <CustomSelect
                                                        id="p-fecha-dia"
                                                        placeholder="Día"
                                                        value={fechaDia}
                                                        onChange={(val) => setFechaDia(val)}
                                                        options={Array.from({ length: 31 }, (_, i) => {
                                                            const val = String(i + 1).padStart(2, '0');
                                                            return { value: val, label: String(i + 1) };
                                                        })}
                                                    />

                                                    {/* Mes */}
                                                    <CustomSelect
                                                        id="p-fecha-mes"
                                                        placeholder="Mes"
                                                        value={fechaMes}
                                                        onChange={(val) => setFechaMes(val)}
                                                        options={[
                                                            { value: '01', label: 'Ene' },
                                                            { value: '02', label: 'Feb' },
                                                            { value: '03', label: 'Mar' },
                                                            { value: '04', label: 'Abr' },
                                                            { value: '05', label: 'May' },
                                                            { value: '06', label: 'Jun' },
                                                            { value: '07', label: 'Jul' },
                                                            { value: '08', label: 'Ago' },
                                                            { value: '09', label: 'Sep' },
                                                            { value: '10', label: 'Oct' },
                                                            { value: '11', label: 'Nov' },
                                                            { value: '12', label: 'Dic' },
                                                        ]}
                                                    />

                                                    {/* Año */}
                                                    <CustomSelect
                                                        id="p-fecha-anio"
                                                        placeholder="Año"
                                                        value={fechaAnio}
                                                        onChange={(val) => setFechaAnio(val)}
                                                        options={[
                                                            { value: '2026', label: '2026' },
                                                            { value: '2025', label: '2025' },
                                                            { value: '2024', label: '2024' },
                                                        ]}
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        {/* SEXO */}
                                        <div className="form-group">
                                            <div className={`gender-pill-group ${fieldErrors.sexo ? 'input-error' : ''}`}>
                                                <input type="hidden" id="p-sexo" value={sexo} />
                                                <button
                                                    type="button"
                                                    className={`gender-pill-btn ${sexo === 'Macho' ? 'active' : ''}`}
                                                    data-value="Macho"
                                                    onClick={() => setSexo('Macho')}
                                                >
                                                    <i className="ti ti-gender-male"></i> Macho
                                                </button>
                                                <button
                                                    type="button"
                                                    className={`gender-pill-btn ${sexo === 'Hembra' ? 'active' : ''}`}
                                                    data-value="Hembra"
                                                    onClick={() => setSexo('Hembra')}
                                                >
                                                    <i className="ti ti-venus"></i> Hembra
                                                </button>
                                            </div>
                                        </div>

                                        {/* CASTRADO */}
                                        <div className="form-group flex">
                                            <label className="form-label">¿Está esterilizado?</label>
                                            <div className="toggle-switch-container">
                                                <label className="toggle-switch">
                                                    <input
                                                        type="checkbox"
                                                        id="p-castrado"
                                                        className="toggle-switch-checkbox"
                                                        checked={isCastrado}
                                                        onChange={(e) => setIsCastrado(e.target.checked)}
                                                    />
                                                    <span className="toggle-switch-slider"></span>
                                                </label>
                                                <span
                                                    className="toggle-switch-text"
                                                    id="p-castrado-label"
                                                >
                                                    {isCastrado ? 'Sí' : 'No'}
                                                </span>
                                            </div>
                                        </div>

                                        {/* TIPO */}
                                        <div
                                            className={`form-group icon-field ${tipoMascota ? 'has-value' : ''} ${fieldErrors.tipoMascota ? 'input-error' : ''
                                                }`}
                                        >
                                            <CustomSelect
                                                id="p-tipo"
                                                placeholder="Tipo de mascota"
                                                value={tipoMascota}
                                                onChange={(val) => setTipoMascota(val)}
                                                options={[
                                                    { value: 'Perro', label: 'Perro' },
                                                    { value: 'Gato', label: 'Gato' },
                                                    { value: 'Ave', label: 'Ave' }
                                                ]}
                                            />
                                        </div>

                                        {/* TAMAÑO */}
                                        <div className={`form-group ${fieldErrors.tamano ? 'input-error' : ''}`}>
                                            <CustomSelect
                                                id="p-tamano"
                                                placeholder="Tamaño"
                                                value={tamano}
                                                onChange={(val) => setTamano(val)}
                                                options={[
                                                    { value: 'Pequeño', label: 'Pequeño' },
                                                    { value: 'Mediano', label: 'Mediano' },
                                                    { value: 'Grande', label: 'Grande' },
                                                ]}
                                            />
                                        </div>

                                        {/* RAZA / ESPECIE (dinámico según tipo de mascota) */}
                                        <div className="form-group">
                                            <label>{tipoMascota === 'Ave' ? 'Especie' : 'Raza'}</label>
                                            <input
                                                type="text"
                                                id="p-raza"
                                                className={`form-input ${fieldErrors.raza ? 'input-error' : ''}`}
                                                placeholder={
                                                    tipoMascota === 'Ave'
                                                        ? 'Ej: Loro'
                                                        : tipoMascota === 'Gato'
                                                            ? 'Ej: Persa'
                                                            : 'Ej: Labrador'
                                                }
                                                value={raza}
                                                onChange={(e) => setRaza(e.target.value)}
                                            />
                                        </div>

                                        {/* COLOR (dinámico según tipo de mascota) */}
                                        <div className="form-group">
                                            <label>{tipoMascota === 'Ave' ? 'Color del plumaje' : 'Color del pelaje'}</label>
                                            <input
                                                type="text"
                                                id="p-color"
                                                className={`form-input ${fieldErrors.color ? 'input-error' : ''}`}
                                                placeholder="Ej: Blanco con manchas"
                                                value={color}
                                                onChange={(e) => setColor(e.target.value)}
                                            />
                                        </div>

                                        {/* ZONA CON POPOVER */}
                                        <div
                                            className="form-group grid-1col zone-picker-group"
                                            ref={zonePopoverRef}
                                        >
                                            <div
                                                className={`zone-input-trigger ${zonaDisplay ? 'has-value' : ''} ${fieldErrors.departamento || fieldErrors.provincia || fieldErrors.distrito ? 'input-error' : ''
                                                    }`}
                                                id="zone-input-trigger"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setIsZonePopoverOpen(!isZonePopoverOpen);
                                                }}
                                            >
                                                <i className="ti ti-map-2"></i>
                                                <input
                                                    type="text"
                                                    id="p-zona-display"
                                                    className="form-input"
                                                    placeholder="Zona donde se perdió tu mascota"
                                                    readOnly
                                                    autoComplete="off"
                                                    value={zonaDisplay}
                                                />
                                            </div>

                                            <div
                                                className={`zone-popover ${isZonePopoverOpen ? 'open' : ''}`}
                                                id="zone-popover"
                                                onClick={(e) => e.stopPropagation()}
                                            >
                                                <div className="grid-3col">
                                                    <div className="form-group">
                                                        <CustomSelect
                                                            id="p-departamento"
                                                            placeholder={labelNivel1}
                                                            value={departamento}
                                                            onChange={(val) => setDepartamento(val)}
                                                            options={nivel1Options}
                                                        />
                                                    </div>

                                                    <div className="form-group">
                                                        <CustomSelect
                                                            id="p-provincia"
                                                            placeholder={labelNivel2}
                                                            value={provincia}
                                                            onChange={(val) => setProvincia(val)}
                                                            options={nivel2Options}
                                                        />
                                                    </div>

                                                    <div className="form-group">
                                                        <CustomSelect
                                                            id="p-distrito"
                                                            placeholder={labelNivel3}
                                                            value={distrito}
                                                            onChange={(val) => setDistrito(val)}
                                                            options={nivel3Options}
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* DIRECCIÓN */}
                                    <div
                                        className={`form-group icon-field grid-1col ${direccion ? 'has-value' : ''}`}
                                    >
                                        <i className="ti ti-map-pin"></i>
                                        <input
                                            type="text"
                                            id="p-direccion"
                                            className={`form-input ${direccion ? 'has-value' : ''} ${fieldErrors.direccion ? 'input-error' : ''
                                                }`}
                                            placeholder="Dirección donde fue vista por última vez"
                                            autoComplete="off"
                                            value={direccion}
                                            onChange={(e) => setDireccion(e.target.value)}
                                        />
                                    </div>

                                    {/* SECCIÓN COLAPSABLE */}
                                    <div className="collapsible-details-section">
                                        <button
                                            type="button"
                                            className={`btn-toggle-details ${isCollapsibleOpen ? 'open' : ''}`}
                                            data-target="#p-collapsible-content"
                                            onClick={() => setIsCollapsibleOpen(!isCollapsibleOpen)}
                                        >
                                            <span className="icon">
                                                <i className="fa-solid fa-plus"></i>
                                            </span>
                                            <div>
                                                <strong>Agregar más detalles</strong>
                                                <small>Recompensa, edad y señas distintivas</small>
                                            </div>
                                        </button>

                                        <div
                                            className="collapsible-content"
                                            id="p-collapsible-content"
                                            style={{
                                                display: isCollapsibleOpen ? 'block' : 'none',
                                            }}
                                        >
                                            <div className="groups form-group">
                                                <textarea
                                                    id="p-observaciones"
                                                    rows={3}
                                                    placeholder="Ej: Lleva collar azul, tiene una mancha negra en el ojo izquierdo..."
                                                    className="form-textarea"
                                                    value={observaciones}
                                                    onChange={(e) => setObservaciones(e.target.value)}
                                                ></textarea>
                                            </div>

                                            <div className="groups grid-2col">
                                                <div className="form-group">
                                                    <input
                                                        type="number"
                                                        placeholder={`Recompensa (${currencySymbol})`}
                                                        id="p-recompensa"
                                                        className="form-input"
                                                        value={recompensa}
                                                        onChange={(e) => {
                                                            const value = e.target.value;
                                                            if (value.length <= 4) {
                                                                setRecompensa(value);
                                                            }
                                                        }}
                                                        maxLength={4}
                                                    />
                                                    <div
                                                        className="terms-acceptance-box"
                                                        style={{ marginTop: '0.5em' }}
                                                    >
                                                        <label className="terms-checkbox-label">
                                                            <input
                                                                type="checkbox"
                                                                id="p-ocultar-monto"
                                                                className="terms-checkbox-input"
                                                                checked={ocultarMonto}
                                                                onChange={(e) =>
                                                                    setOcultarMonto(e.target.checked)
                                                                }
                                                            />
                                                            <span className="terms-checkbox-custom">
                                                                <i className="fa-solid fa-check"></i>
                                                            </span>
                                                            <span className="terms-checkbox-text">
                                                                Ocultar monto
                                                            </span>
                                                        </label>
                                                    </div>
                                                </div>

                                                <div className="form-group">
                                                    <CustomSelect
                                                        id="p-edad"
                                                        placeholder="Edad"
                                                        value={edad}
                                                        onChange={(val) => setEdad(val)}
                                                        options={[
                                                            { value: 'Menos de 1 año', label: 'Menos de 1 año' },
                                                            { value: '1 a 3 años', label: '1 a 3 años' },
                                                            { value: '4 a 7 años', label: '4 a 7 años' },
                                                            { value: '8 años o más', label: '8 años o más' },
                                                        ]}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* ==================== PASO 2 ==================== */}
                            <div
                                className={`wizard-step ${currentStep === 2 ? 'active' : ''}`}
                                id="wizard-step-2"
                            >
                                <div className="plans-premiun">
                                    <div className="plans-stack">
                                        {/* GRATIS */}
                                        <label className="plan-item-label">
                                            <input
                                                type="radio"
                                                name="diffusion_plan"
                                                value="gratis"
                                                checked={selectedPlan === 'gratis'}
                                                onChange={(e) => setSelectedPlan(e.target.value)}
                                            />
                                            <div className="plan-item free">
                                                <div className="row-plan">
                                                    <div className="plan-info">
                                                        <h4>Gratis </h4>
                                                        <p className="plan-scope">Visible para la comunidad</p>
                                                    </div>
                                                    <div className="plan-card">
                                                        <div className="plan-price">
                                                            <i>{currencySymbol}</i> {getPlanById('gratis', country).precio}
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="row-data-plan">
                                                    <div className="attributes-plan">
                                                        <ul>
                                                            <li>
                                                                <i className="ti ti-ban"></i> Sin impulso en la zona de
                                                                pérdida
                                                            </li>
                                                        </ul>
                                                    </div>
                                                </div>
                                            </div>
                                        </label>

                                        {/* BÁSICO / LOCAL */}
                                        <label className="plan-item-label">
                                            <input
                                                type="radio"
                                                name="diffusion_plan"
                                                value="local"
                                                checked={selectedPlan === 'local'}
                                                onChange={(e) => setSelectedPlan(e.target.value)}
                                            />
                                            <div className="plan-item">
                                                <div className="row-plan">
                                                    <div className="plan-info">
                                                        <h4>
                                                            <u>Plan</u> Local
                                                        </h4>
                                                        <p className="plan-scope">
                                                            Hasta <b>+9,000 mil</b> personas <br /> verán tu
                                                            aviso.
                                                        </p>
                                                    </div>
                                                    <div className="plan-card">
                                                        <div className="plan-price">
                                                            <i>{currencySymbol}</i> {getPlanById('local', country).precio}
                                                        </div>
                                                        <span>
                                                            / <i className="fa-regular fa-credit-card"></i> Pago
                                                            único
                                                        </span>
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
                                                            <li>
                                                                <i className="ti ti-broadcast"></i>
                                                                <b>{getPlanById('local', country).dias} días</b> de difusión
                                                            </li>
                                                        </ul>
                                                    </div>
                                                </div>
                                            </div>
                                        </label>

                                        {/* REGULAR / AMPLIO */}
                                        <label className="plan-item-label">
                                            <input
                                                type="radio"
                                                name="diffusion_plan"
                                                value="amplio"
                                                checked={selectedPlan === 'amplio'}
                                                onChange={(e) => setSelectedPlan(e.target.value)}
                                            />
                                            <div className="plan-item">
                                                <div className="row-plan">
                                                    <div className="plan-info">
                                                        <h4>
                                                            <u>Plan</u> Amplio
                                                        </h4>
                                                        <p className="plan-scope">
                                                            Hasta <b>+15,000 mil</b> personas <br /> verán tu
                                                            aviso.
                                                        </p>
                                                    </div>
                                                    <div className="plan-card">
                                                        <div className="plan-price">
                                                            <i>{currencySymbol}</i> {getPlanById('amplio', country).precio}
                                                        </div>
                                                        <span>
                                                            / <i className="fa-regular fa-credit-card"></i> Pago
                                                            único
                                                        </span>
                                                    </div>
                                                </div>
                                                <div>
                                                    <div className="plan-features-list">
                                                        <span className="plan-feature-tag btn-facebook">
                                                            <i className="fa-brands fa-facebook"></i> Facebook
                                                        </span>
                                                    </div>
                                                    <div className="attributes-plan">
                                                        <ul>
                                                            <li>
                                                                <i className="ti ti-broadcast"></i>
                                                                <b>6 días</b> de difusión
                                                            </li>
                                                        </ul>
                                                    </div>
                                                </div>
                                            </div>
                                        </label>

                                        {/* AVANZADO / URGENTE */}
                                        <label className="plan-item-label option-dominant-wrapper">
                                            <input
                                                type="radio"
                                                name="diffusion_plan"
                                                value="urgente"
                                                checked={selectedPlan === 'urgente'}
                                                onChange={(e) => setSelectedPlan(e.target.value)}
                                            />
                                            <div className="plan-item plan-item-premium">
                                                <span className="tag-info">
                                                    <i className="ti ti-bolt"></i> Máxima Difusión
                                                </span>
                                                <div className="row-plan">
                                                    <div className="plan-info">
                                                        <h4>
                                                            <u> Plan</u> Urgente
                                                        </h4>
                                                        <p className="plan-scope">
                                                            Hasta <b>+30,000 mil</b> personas <br /> verán tu
                                                            aviso.
                                                        </p>
                                                    </div>
                                                    <div className="plan-card">
                                                        <div className="plan-price">
                                                            <i>{currencySymbol}</i> {getPlanById('urgente', country).precio}
                                                        </div>
                                                        <span>
                                                            / <i className="fa-regular fa-credit-card"></i> Pago
                                                            único
                                                        </span>
                                                    </div>
                                                </div>
                                                <div>
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
                                                            <li>
                                                                <i className="ti ti-broadcast"></i>
                                                                <b>{getPlanById('urgente', country).dias} días</b> de difusión
                                                            </li>
                                                            <li>
                                                                <div className="tooltip-wrap">
                                                                    <i className="ti ti-help tooltip-trigger"></i>
                                                                    <span className="tooltip-box">
                                                                        <i className="ti ti-info-circle"></i> Si
                                                                        encuentras a tu mascota antes, te <b>devolvemos</b>{' '}
                                                                        los días restantes del plan.
                                                                    </span>
                                                                </div>{' '}
                                                                Incluye <b><u>reembolso</u></b>
                                                            </li>
                                                        </ul>
                                                    </div>
                                                </div>
                                            </div>
                                        </label>
                                    </div>
                                </div>
                            </div>

                            {/* ==================== PASO 3 ==================== */}
                            <div
                                className={`wizard-step ${currentStep === 3 ? 'active' : ''}`}
                                id="wizard-step-3"
                            >
                                {/* CHECKOUT PREMIUM */}
                                <div
                                    id="wrapper-premium-checkout"
                                    style={{
                                        display: selectedPlan !== 'gratis' ? 'block' : 'none',
                                    }}
                                >
                                    <div className="payment-gateway-box">
                                        <h4>
                                            <i className="fa-solid fa-shield-halved"></i> Checkout
                                            Seguro (Mercado Pago)
                                        </h4>

                                        <div className="payment-methods-tabs">
                                            <button
                                                type="button"
                                                className={`pay-tab-btn ${paymentMethod === 'card' ? 'active' : ''
                                                    }`}
                                                data-method="card"
                                                onClick={() => setPaymentMethod('card')}
                                            >
                                                <i className="fa-solid fa-credit-card"></i> Tarjeta de
                                                Crédito/Débito
                                            </button>
                                            <button
                                                type="button"
                                                className={`pay-tab-btn ${paymentMethod === 'yape' ? 'active' : ''
                                                    }`}
                                                data-method="yape"
                                                onClick={() => setPaymentMethod('yape')}
                                            >
                                                <i className="fa-solid fa-mobile-screen-button"></i> Yape
                                            </button>
                                        </div>

                                        <div className="payment-methods-content">
                                            {/* MÉTODO TARJETA */}
                                            <div
                                                id="pay-method-card"
                                                className={`pay-method-panel ${paymentMethod === 'card' ? 'active' : ''
                                                    }`}
                                            >
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
                                                        <input
                                                            type="text"
                                                            className="form-input"
                                                            placeholder="MM/AA"
                                                        />
                                                    </div>
                                                    <div className="form-group">
                                                        <label className="form-label">CVV</label>
                                                        <input
                                                            type="password"
                                                            className="form-input"
                                                            placeholder="000"
                                                        />
                                                    </div>
                                                </div>
                                                <div className="form-group">
                                                    <label className="form-label">
                                                        Nombre impreso en tarjeta
                                                    </label>
                                                    <input type="text" className="form-input" />
                                                </div>
                                            </div>

                                            {/* MÉTODO YAPE */}
                                            <div
                                                id="pay-method-yape"
                                                className={`pay-method-panel ${paymentMethod === 'yape' ? 'active' : ''
                                                    }`}
                                            >
                                                <div className="yape-mock-wrapper">
                                                    <p>
                                                        Escanea desde la app Yape o ingresa tu código de
                                                        aprobación:
                                                    </p>
                                                    <div className="yape-qr-box">
                                                        <i className="fa-solid fa-qrcode"></i>
                                                        <span>QR HUELLITAS PERÚ</span>
                                                    </div>
                                                    <div className="form-group">
                                                        <label className="form-label">
                                                            Código de aprobación Yape (6 dígitos)
                                                        </label>
                                                        <input
                                                            type="text"
                                                            className="form-input"
                                                            placeholder="000000"
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="terms-acceptance-box">
                                            <label className="terms-checkbox-label">
                                                <input
                                                    type="checkbox"
                                                    id="accept-terms"
                                                    className="terms-checkbox-input"
                                                    checked={acceptTerms}
                                                    onChange={(e) => setAcceptTerms(e.target.checked)}
                                                />
                                                <span className="terms-checkbox-custom">
                                                    <i className="fa-solid fa-check"></i>
                                                </span>
                                                <span className="terms-checkbox-text">
                                                    Acepto que he leído los{' '}
                                                    <Link href="/terminos-y-condiciones" target="_blank">
                                                        Términos y Condiciones
                                                    </Link>{' '}
                                                    del sitio y declaro que la información publicada es
                                                    verídica.
                                                </span>
                                            </label>
                                        </div>
                                    </div>
                                </div>

                                {/* CHECKOUT GRATIS */}
                                <div
                                    id="wrapper-free-checkout"
                                    style={{
                                        display: selectedPlan === 'gratis' ? 'block' : 'none',
                                    }}
                                >
                                    <div className="free-notice-box">
                                        <h3>¡Todo listo!</h3>
                                        <p>Tu aviso se publicará en el portal de huellitas.</p>
                                    </div>

                                    <div className="upgrade-notice-banner">
                                        <i className="fa-solid fa-circle-info"></i>
                                        <p>
                                            Recuerda que después puedes cambiar tu anuncio a un{' '}
                                            <b>plan de pago</b> desde <b>Mi cuenta</b>, para llegar
                                            más rápido a más personas en la zona de pérdida.
                                        </p>
                                    </div>

                                    <div className="terms-acceptance-box">
                                        <label className="terms-checkbox-label">
                                            <input
                                                type="checkbox"
                                                id="accept-terms"
                                                className="terms-checkbox-input"
                                                checked={acceptTerms}
                                                onChange={(e) => setAcceptTerms(e.target.checked)}
                                            />
                                            <span className="terms-checkbox-custom">
                                                <i className="fa-solid fa-check"></i>
                                            </span>
                                            <span className="terms-checkbox-text">
                                                Acepto que he leído los{' '}
                                                <Link href="/terminos-y-condiciones" target="_blank">
                                                    Términos y Condiciones
                                                </Link>{' '}
                                                del sitio y declaro que la información publicada es
                                                verídica.
                                            </span>
                                        </label>
                                    </div>
                                </div>
                            </div>

                            {/* BOTONES ACCIÓN WIZARD */}
                            <div className="wizard-actions">
                                <button
                                    type="button"
                                    id="btn-wizard-prev"
                                    className="btn-secondary"
                                    style={{ display: currentStep > 1 ? 'inline-flex' : 'none' }}
                                    onClick={handlePrevStep}
                                >
                                    <i className="ti ti-chevron-left"></i> Anterior
                                </button>

                                <button
                                    type="button"
                                    id="btn-wizard-next"
                                    className="btn-publish"
                                    disabled={(currentStep === 3 && !acceptTerms) || isGeneratingFlyer}
                                    onClick={handleNextStep}
                                >
                                    {isGeneratingFlyer ? (
                                        'Generando flyer...'
                                    ) : currentStep < 3 ? (
                                        <>
                                            Siguiente <i className="ti ti-chevron-right"></i>
                                        </>
                                    ) : selectedPlan === 'gratis' ? (
                                        <>
                                            <i className="ti ti-check"></i> Publicar Gratis
                                        </>
                                    ) : (
                                        <>
                                            <i className="ti ti-check"></i> Pagar y Publicar
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>

                    {/* ==========================================
              PANEL DERECHO (FLYER / MAPA / RESUMEN)
             ========================================== */}
                    <div className="right-panel">
                        {/* MAPA SIMULADO (PASO 2) */}
                        <div
                            id="right-panel-map"
                            className={selectedPlan === 'gratis' ? 'map-disabled' : ''}
                            style={{ display: currentStep === 2 ? 'block' : 'none' }}
                        >
                            <div className="summary-checks">
                                <div className="summary-check-item">
                                    <span className="badge-plan-flyer">
                                        <span className="status-pulse"></span> Flyer Generado
                                    </span>
                                    <span className="summary-ready-badge">
                                        <i className="ti ti-circle-check"></i> Listo
                                    </span>
                                </div>
                            </div>

                            <div className="map-section">
                                <div className="map-header">
                                    <h4>
                                        <i className="fa-solid fa-location-crosshairs"></i> Zona de
                                        perdida
                                    </h4>
                                    <span
                                        className="badge-plan-reach"
                                        id="badge-plan-reach"
                                        style={{
                                            display: selectedPlan !== 'gratis' ? 'inline-flex' : 'none',
                                        }}
                                    >
                                        <i className="ti ti-circle-dashed-check"></i> Radio de
                                        búsqueda listo
                                    </span>
                                </div>

                                <div className="map-placeholder-container" id="map-simulated">
                                    {currentStep === 2 && selectedPlan !== 'gratis' && lat !== null && lng !== null ? (
                                        <MapPicker
                                            lat={lat}
                                            lng={lng}
                                            radioKm={getPlanById(selectedPlan, country).radioKm}
                                            zoom={getPlanById(selectedPlan, country).mapZoom}
                                            isDraggable={isAdjustingMap}
                                            isDarkMode={isDarkMode}
                                            onPositionChange={(newLat, newLng) => {
                                                setLat(newLat);
                                                setLng(newLng);
                                            }}
                                        />
                                    ) : (
                                        <div className="map-radar-wrap">
                                            <div className="map-radar-pin">
                                                <i className="fa-solid fa-street-view"></i>
                                            </div>
                                            <p className="map-no-plan-msg">
                                                <i className="ti ti-hand-finger-left"></i>
                                                {selectedPlan === 'gratis'
                                                    ? 'Selecciona un plan para ver el alcance de la zona de pérdida.'
                                                    : isGeocoding
                                                        ? 'Buscando la ubicación...'
                                                        : 'Completa la zona y dirección para ver el mapa.'}
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="map-fallback-check">
                                <label className="terms-checkbox-label">
                                    <input
                                        type="checkbox"
                                        id="chk-use-address"
                                        className="terms-checkbox-input"
                                        checked={isAdjustingMap}
                                        onChange={(e) => setIsAdjustingMap(e.target.checked)}
                                    />
                                    <span className="terms-checkbox-custom">
                                        <i className="fa-solid fa-check"></i>
                                    </span>
                                    <span className="terms-checkbox-text">
                                        <small>Ajustar ubicación en el mapa  {isAdjustingMap && (
                                            <i className="map-adjust-hint"><i class="ti ti-hand-finger"></i> Arrastra el círculo</i>
                                        )}</small>
                                    </span>
                                </label>

                            </div>
                        </div>

                        {/* RESUMEN DE CONFIRMACIÓN (PASO 3) */}
                        <div
                            id="right-panel-summary"
                            style={{ display: currentStep === 3 ? 'block' : 'none' }}
                        >
                            <div className="summary-checks">
                                <div className="summary-check-item">
                                    <span className="badge-plan-flyer">
                                        <span className="status-pulse"></span> Flyer Generado
                                    </span>
                                    <span className="summary-ready-badge">
                                        <i className="ti ti-circle-check"></i> Listo
                                    </span>
                                </div>
                                <div
                                    className="summary-check-item free"
                                    style={{
                                        display: selectedPlan !== 'gratis' ? 'flex' : 'none',
                                    }}
                                >
                                    <span className="summary-title-item ">
                                        <i className="ti ti-current-location"></i> Zona de búsqueda
                                    </span>
                                    <span className="summary-ready-badge">
                                        <i className="ti ti-circle-check"></i> Listo
                                    </span>
                                </div>
                            </div>

                            <div className="summary">
                                <div className="summary-reservation">
                                    <div className="summary-dates-open">
                                        <div className="summary-date-col">
                                            <span className="summary-date-label">Inicio</span>
                                            <strong className="summary-date-value" id="sum-fecha-inicio">
                                                {getFechaRange().inicio}
                                            </strong>
                                        </div>
                                        <div className="summary-date-col">
                                            <span className="summary-date-label">Fin</span>
                                            <strong className="summary-date-value" id="sum-fecha-fin">
                                                {getFechaRange().fin}
                                            </strong>
                                        </div>
                                        <div className="summary-date-col">
                                            <span className="summary-date-label">Días de circulación</span>
                                            <strong className="summary-date-value">
                                                <i className="ti ti-calendar-bolt"></i>{' '}
                                                {selectedPlan === 'gratis' ? '6 meses' : currentPlanObj.dias}
                                            </strong>
                                        </div>
                                    </div>
                                    <div className="summary-divider"></div>

                                    <div className="summary-dates-open">
                                        <div className="summary-date-col">
                                            <span className="summary-date-label">Plan</span>
                                            <strong
                                                className="summary-date-value"
                                                id="summary-plan-name"
                                            >
                                                {currentPlanObj.nombre}
                                            </strong>
                                        </div>
                                        <div
                                            className="summary-date-col"
                                            id="sum-costo-block"
                                            style={{
                                                display: selectedPlan !== 'gratis' ? 'flex' : 'none',
                                            }}
                                        >
                                            <span className="summary-date-label">Total</span>
                                            <strong
                                                className="summary-date-value summary-total-val"
                                                id="sum-total"
                                            >
                                                {currencySymbol} {currentPlanObj.precio}
                                            </strong>
                                        </div>
                                    </div>

                                    {selectedPlan !== 'gratis' ? (
                                        <div
                                            id="sum-activacion-pago"
                                            className="summary-activacion-badge badge-activacion-green"
                                        >
                                            <i className="fa-solid fa-bolt"></i>
                                            <div>
                                                <b>Activo en máximo 30 minutos</b>
                                                <p>Tu aviso se activará tras confirmar el pago.</p>
                                            </div>
                                        </div>
                                    ) : (
                                        <div
                                            id="sum-activacion-gratis"
                                            className="summary-activacion-badge badge-activacion-yellow"
                                        >
                                            <i className="fa-solid fa-clock"></i>
                                            <div>
                                                <b>En revisión</b>
                                                <p>Aprobación en máximo 24 hrs hábiles.</p>
                                            </div>
                                        </div>
                                    )}

                                    {selectedPlan === 'urgente' && (
                                        <p className="summary-upgrade-note">
                                            <i className="fa-solid fa-circle-info"></i> Si tu mascota
                                            aparece antes de finalizar el plan, solicita un reembolso.
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* FLYER EN VIVO (PASO 1) */}
                        <div
                            id="right-panel-flyer"
                            style={{ display: currentStep === 1 ? 'block' : 'none' }}
                        >
                            <div className="editor-stage">
                                <div className="flyer-box">
                                    <div className="flyer-box-header">
                                        <span className="badge-plan-flyer">
                                            <span className="status-pulse"></span> Generando en vivo
                                        </span>
                                        <button
                                            type="button"
                                            className={`btn-toggle-flyer-mobile ${isFlyerMobileVisible ? 'active' : ''
                                                }`}
                                            id="btn-toggle-flyer-preview"
                                            onClick={() =>
                                                setIsFlyerMobileVisible(!isFlyerMobileVisible)
                                            }
                                        >
                                            {isFlyerMobileVisible ? (
                                                <>
                                                    <i className="ti ti-x"></i> Cerrar
                                                </>
                                            ) : (
                                                <>
                                                    <i className="ti ti-eye"></i> Ver el Flyer
                                                </>
                                            )}
                                        </button>
                                    </div>

                                    <div
                                        className={`flyer-canvas container-flyer-design state-perdida ${isFlyerMobileVisible ? 'mobile-visible' : ''
                                            }`}
                                        id="flyer-preview"
                                    >
                                        <div className="flyer-alert-header">
                                            <h3 id="flyer-titulo-alerta">¡BUSCAMOS!</h3>
                                            <p id="flyer-subtitulo-alerta">Ayúdame a volver a casa</p>
                                        </div>

                                        <div className="flyer-photo-stage">
                                            <div
                                                className={`flyer-dynamic-grid ${validPhotos.length === 0
                                                    ? 'layout-empty'
                                                    : `layout-${validPhotos.length}`
                                                    }`}
                                                id="flyer-grid-photos"
                                            >
                                                {validPhotos.length === 0 ? (
                                                    <div className="flyer-img-placeholder" id="flyer-main-img-view">
                                                        <i className="ti ti-camera-plus"></i>
                                                    </div>
                                                ) : (
                                                    validPhotos.map((imgSrc, idx) => (
                                                        <div key={idx} className="flyer-grid-item">
                                                            <DraggablePhoto
                                                                src={imgSrc}
                                                                offsetY={photoOffsets[idx] || 0}
                                                                onOffsetChange={(newOffset) => {
                                                                    setPhotoOffsets((prev) => ({ ...prev, [idx]: newOffset }));
                                                                }}
                                                            />
                                                        </div>
                                                    ))
                                                )}
                                            </div>
                                            {distrito && (
                                                <p className="flyer-txt-distrito" id="flyer-txt-distrito">
                                                    <i className="fa-solid fa-location-dot"></i> {distrito}
                                                </p>
                                            )}
                                            <div className="flyer-name-badge">
                                                <span className="flyer-name-badge-label">Me llamo</span>
                                                <span id="flyer-txt-nombre">{nombre || 'Nombre'}</span>
                                            </div>

                                        </div>


                                        <div className="flyer-body">
                                            <div className="flyer-body-info">
                                                <p className="flyer-canvas-text" id="flyer-txt-descripcion">
                                                    {getFlyerDescription()}
                                                </p>
                                            </div>

                                            {((recompensa && Number(recompensa) > 0) || ocultarMonto) && (
                                                <div className="flyer-canvas-reward" id="flyer-reward-box" style={{ display: 'block' }}>
                                                    {!ocultarMonto && <span id="flyer-reward-label">¡RECOMPENSA!</span>}
                                                    <span id="flyer-txt-recompensa">
                                                        {ocultarMonto ? '¡Se ofrece recompensa!' : `${currencySymbol} ${recompensa}!`}
                                                    </span>
                                                </div>
                                            )}

                                            <div className="flyer-footer-contact">
                                                <span className="flyer-footer-call-to-action">
                                                    Si me ves, por favor llama o escribe al
                                                </span>
                                                <div className="flyer-footer-number">
                                                    <i className="ti ti-brand-whatsapp"></i>
                                                    <span id="flyer-txt-tel">{currentUser?.phone?.replace(/^\+\d+\s*/, '') || '---------'}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <p className="editor-canvas-caption">
                                        <i className="ti ti-cut"></i> Podras imprimir este anuncio
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* OVERLAY STATUS FINAL */}
            <div
                id="status-overlay"
                className={`status-overlay ${showStatusOverlay ? '' : 'style-hidden'
                    }`}
            >
                <div className="status-overlay-backdrop"></div>
                <div className="status-overlay-card">
                    <div className="overlay-content">
                        <span className="overlay-eyebrow">
                            <i className="fa-solid fa-circle-check"></i> Publicación enviada
                        </span>
                        <h3 id="overlay-title">Su publicación se envió a aprobación...</h3>
                        <p id="overlay-msg">
                            {selectedPlan === 'gratis'
                                ? 'Tu reporte está siendo procesado en la cola estándar de Huellas de manera gratuita.'
                                : 'Al ser una solicitud de pago con prioridad alta, su publicación será activada dentro de los próximos 30 minutos.'}
                        </p>
                    </div>

                    <div className="overlay-redirect-row">
                        <i className="fa-solid fa-circle-notch fa-spin"></i>
                        <span>Redirigiendo en unos segundos...</span>
                    </div>

                    <div className="countdown-bar"></div>
                </div>
            </div>
        </main>
    );
}