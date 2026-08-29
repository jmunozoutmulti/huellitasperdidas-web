'use client';
import { useState, useEffect, useRef, ChangeEvent } from 'react';
import Link from 'next/link';
import CustomSelect from '@/components/ui/CustomSelect';
import '@/styles/encontrado.css';
import { useApp } from '@/context/AppContext';
import { createPublication } from '@/lib/publications';
import { generateFlyerImage } from '@/lib/flyerExport';
import DraggablePhoto from '@/components/global/DraggablePhoto';
import { showToast } from '@/components/global/Toast';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import ModalAgregarNumero from '@/components/global/ModalAgregarNumero';
import { getCountryByAbbr } from '@/lib/countries';
import { getLevel1Options, getLevel2Options, getLevel3Options } from '@/lib/locations';

export default function PublicarEncontradoPage() {

    useRequireAuth();

    const { currentUser, isAuthChecked, isLoggedIn } = useApp();

    const country = currentUser?.country || 'PE';
    const [labelNivel1, labelNivel2, labelNivel3] = getCountryByAbbr(country).locationLabels;

    // ==========================================
    // ESTADOS DEL WIZARD (MULTIPASO - 2 PASOS)
    // ==========================================
    const [currentStep, setCurrentStep] = useState(1);
    const [acceptTerms, setAcceptTerms] = useState(false);
    const [showStatusOverlay, setShowStatusOverlay] = useState(false);

    // ==========================================
    // ESTADOS DEL FORMULARIO Y FLYER EN VIVO
    // ==========================================
    const [tipoMascota, setTipoMascota] = useState('');
    const [fechaDia, setFechaDia] = useState('');
    const [fechaMes, setFechaMes] = useState('');
    const [fechaAnio, setFechaAnio] = useState('');
    const [fechaDisplay, setFechaDisplay] = useState('');
    const [isDatePopoverOpen, setIsDatePopoverOpen] = useState(false);

    const [sexo, setSexo] = useState('');
    const [isCastrado, setIsCastrado] = useState(false);
    const [raza, setRaza] = useState('');
    const [color, setColor] = useState('');
    const [tamano, setTamano] = useState('');
    const [direccion, setDireccion] = useState('');

    const [departamento, setDepartamento] = useState('');
    const [provincia, setProvincia] = useState('');
    const [distrito, setDistrito] = useState('');

    const nivel1Options = getLevel1Options(country);
    const nivel2Options = getLevel2Options(country, departamento);
    const nivel3Options = getLevel3Options(country, departamento, provincia);


    const [zonaDisplay, setZonaDisplay] = useState('');
    const [isZonePopoverOpen, setIsZonePopoverOpen] = useState(false);

    const [isCollapsibleOpen, setIsCollapsibleOpen] = useState(false);
    const [descripcion, setDescripcion] = useState('');

    const [uploadedImages, setUploadedImages] = useState<(string | null)[]>([
        null,
        null,
        null,
        null,
    ]);

    // Posición vertical elegida por el usuario para cada foto del flyer (arrastre)
    const [photoOffsets, setPhotoOffsets] = useState<Record<number, number>>({});

    // Flyer generado automáticamente al avanzar del paso 1 al 2
    const [flyerImageBase64, setFlyerImageBase64] = useState<string | null>(null);
    const [isGeneratingFlyer, setIsGeneratingFlyer] = useState(false);

    // Validación de campos obligatorios del paso 1
    const [fieldErrors, setFieldErrors] = useState<Record<string, boolean>>({});

    // Mobile Flyer Preview Toggle
    const [isFlyerMobileVisible, setIsFlyerMobileVisible] = useState(false);

    const datePopoverRef = useRef<HTMLDivElement>(null);
    const zonePopoverRef = useRef<HTMLDivElement>(null);

    // ==========================================
    // EFECTOS DE POPOVERS Y EVENTOS
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
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
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
        setPhotoOffsets((prev) => {
            const next = { ...prev };
            delete next[index];
            return next;
        });
    };

    // Fotos cargadas para el flyer
    const validPhotos = uploadedImages.filter((img) => img !== null) as string[];

    useEffect(() => {
        setPhotoOffsets({});
    }, [validPhotos.length]);

    // ==========================================
    // VALIDACIÓN Y SANITIZACIÓN (PASO 1)
    // ==========================================
    function sanitizeText(value: string): string {
        return value.replace(/<[^>]*>?/gm, '').trim();
    }

    function validateStep1(): boolean {
        const errors: Record<string, boolean> = {};

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
                showToast('Agrega al menos 1 foto de la mascota', 'error');
            } else {
                showToast('Completa todos los campos obligatorios', 'error');
            }
            return false;
        }

        return true;
    }

    // ==========================================
    // MANEJADORES DE NAVEGACIÓN Y SUBMIT
    // ==========================================
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

        if (currentStep < 2) {
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
                report_type: 'found',
                pet_type: tipoMascota || null,
                title: null, // encontrado no captura nombre de mascota
                description: sanitizeText(descripcion) || null,
                country: currentUser.country || 'PE',
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
                reward: null, // no aplica para encontrado
                reward_visible: false,
                age: null, // encontrado no captura edad
                adoption_extras: null,
                adoption_extras_visible: false,
                reach_facebook: false,
                reach_instagram: false,
                images: validPhotos,
                plan: 'gratis', // encontrado no tiene selector de plan de pago
                lat: null,
                lng: null,
                flyer_image: flyerImageBase64,
            });
        }

        setShowStatusOverlay(true);
        setTimeout(() => {
            window.location.href = 'https://www.huellasperdidas.com/informacion/alertas-de-estafa';
        }, 5000);
    };

    // Helper para generar la descripción narrativa del flyer
    const getFlyerDescription = () => {
        const rasgos: string[] = [];
        if (sexo) rasgos.push(sexo.toLowerCase());
        if (raza) rasgos.push(raza);
        if (isCastrado) rasgos.push(sexo === 'Hembra' ? 'esterilizada' : 'esterilizado');
        if (color) rasgos.push(color);
        if (descripcion) rasgos.push(descripcion);

        const fechaCorta = fechaDia && fechaMes ? `${fechaDia}/${fechaMes}` : null;

        let frase1 = rasgos.join(', ');
        if (fechaCorta) {
            frase1 = frase1 ? `${frase1}, lo encontré el ${fechaCorta}.` : `Lo encontré el ${fechaCorta}.`;
        } else if (frase1) {
            frase1 += '.';
        }

        let frase2 = '';
        if (direccion && distrito) {
            frase2 = `Encontrado en ${direccion} - ${distrito}.`;
        } else if (direccion) {
            frase2 = `Encontrado en ${direccion}.`;
        }

        const textoCompleto = [frase1, frase2].filter(Boolean).join(' ');

        if (!textoCompleto) {
            return 'Completa los campos para autogenerar este flyer dinámicamente.';
        }
        return textoCompleto.charAt(0).toUpperCase() + textoCompleto.slice(1);
    };

    // Fecha actual formateada para el resumen del paso 2
    const getFechaHoy = () => {
        const hoy = new Date();
        const opciones: Intl.DateTimeFormatOptions = {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
        };
        return hoy.toLocaleDateString('es-PE', opciones);
    };

    return (
        <main className="main-content">

            <ModalAgregarNumero
                isOpen={isAuthChecked && isLoggedIn && !currentUser?.phone}
                onClose={() => { }}
                mandatory
            />

            <section id="view-publish-found" className="animate-fade-in">
                <div className="grid-publish">
                    {/* ==========================================
              PANEL IZQUIERDO (PASOS Y SLOGAN)
             ========================================== */}
                    <div className="left-panel">
                        <h1>Publicar hallazgo</h1>

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
                                    <h4 className="step-title">Detalles del hallazgo</h4>
                                </div>
                            </div>

                            {/* PASO 2 */}
                            <div
                                className={`wizard-v-step ${currentStep === 2 ? 'active' : ''}`}
                                data-step="2"
                            >
                                <div className="step-icon-wrapper">
                                    <div className="step-icon"></div>
                                </div>
                                <div className="step-content">
                                    <span className="step-status">
                                        {currentStep === 2 ? 'En progreso' : 'Pendiente'}
                                    </span>
                                    <h4 className="step-title">Validación y publicación</h4>
                                </div>
                            </div>
                        </div>

                        <div className="slogan-paragraph">
                            <div>
                                <span className="slogan-eyebrow">
                                    <i className="ti ti-sparkles"></i> Cómo funciona
                                </span>
                                <div className="slogan-body">
                                    <p>
                                        Tu reporte ayuda a que <b>el dueño te encuentre</b> más rápido.
                                    </p>
                                </div>
                                <div className="slogan-divider"></div>
                                <div className="slogan-reach-row">
                                    <div className="slogan-reach-item">
                                        <span className="slogan-reach-icon">
                                            <i className="ti ti-heart-handshake"></i>
                                        </span>
                                        <span>
                                            Publicación <b>100% gratuita</b>, visible de inmediato para la comunidad.
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* ==========================================
              PANEL CENTRAL (FORMULARIO Y PASOS)
             ========================================== */}
                    <div className="center-panel">
                        <form
                            id="multi-step-found-form"
                            autoComplete="off"
                            onSubmit={(e) => e.preventDefault()}
                        >
                            {/* ==================== PASO 1 ==================== */}
                            <div
                                className={`wizard-step ${currentStep === 1 ? 'active' : ''}`}
                                id="wizard-step-1"
                            >
                                <div id="form-encontrado" className="publish-form-panel active">
                                    {/* UPLOADER FOTOS */}
                                    <div className="groups form-group">
                                        <label>Fotos de la mascota encontrada (Máx. 4)</label>
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
                                        {/* TIPO DE MASCOTA */}
                                        <div
                                            className={`form-group icon-field ${tipoMascota ? 'has-value' : ''
                                                }`}
                                        >
                                            <CustomSelect
                                                id="e-tipo"
                                                placeholder="Tipo de mascota"
                                                value={tipoMascota}
                                                onChange={(val) => setTipoMascota(val)}
                                                className={fieldErrors.tipoMascota ? 'input-error' : ''}
                                                options={[
                                                    { value: 'Perro', label: 'Perro' },
                                                    { value: 'Gato', label: 'Gato' },
                                                    { value: 'Ave', label: 'Ave' },
                                                ]}
                                            />
                                        </div>

                                        {/* FECHA CON POPOVER */}
                                        <div
                                            className="form-group date-picker-group"
                                            ref={datePopoverRef}
                                        >
                                            <div
                                                className={`date-input-trigger ${fechaDisplay ? 'has-value' : ''
                                                    } ${fieldErrors.fecha ? 'input-error' : ''}`}
                                                id="date-input-trigger"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setIsDatePopoverOpen(!isDatePopoverOpen);
                                                }}
                                            >
                                                <i className="ti ti-calendar-search"></i>
                                                <input
                                                    type="text"
                                                    id="e-fecha-display"
                                                    className="form-input"
                                                    placeholder="Fecha en que lo encontraste"
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
                                                        id="e-fecha-dia"
                                                        placeholder="Día"
                                                        value={fechaDia}
                                                        onChange={(val) => setFechaDia(val)}
                                                        options={Array.from({ length: 31 }, (_, i) => {
                                                            const val = String(i + 1).padStart(2, '0');
                                                            return { value: val, label: String(i + 1) };
                                                        })}
                                                    />

                                                    <CustomSelect
                                                        id="e-fecha-mes"
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

                                                    <CustomSelect
                                                        id="e-fecha-anio"
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
                                                <input type="hidden" id="e-sexo" value={sexo} />
                                                <button
                                                    type="button"
                                                    className={`gender-pill-btn ${sexo === 'Macho' ? 'active' : ''
                                                        }`}
                                                    data-value="Macho"
                                                    onClick={() => setSexo('Macho')}
                                                >
                                                    <i className="ti ti-gender-male"></i> Macho
                                                </button>
                                                <button
                                                    type="button"
                                                    className={`gender-pill-btn ${sexo === 'Hembra' ? 'active' : ''
                                                        }`}
                                                    data-value="Hembra"
                                                    onClick={() => setSexo('Hembra')}
                                                >
                                                    <i className="ti ti-venus"></i> Hembra
                                                </button>
                                            </div>
                                        </div>

                                        {/* CASTRADO */}
                                        <div className="form-group flex">
                                            <label className="form-label">¿Se nota esterilizado?</label>
                                            <div className="toggle-switch-container">
                                                <label className="toggle-switch">
                                                    <input
                                                        type="checkbox"
                                                        id="e-castrado"
                                                        className="toggle-switch-checkbox"
                                                        checked={isCastrado}
                                                        onChange={(e) => setIsCastrado(e.target.checked)}
                                                    />
                                                    <span className="toggle-switch-slider"></span>
                                                </label>
                                                <span
                                                    className="toggle-switch-text"
                                                    id="e-castrado-label"
                                                >
                                                    {isCastrado ? 'Sí' : 'No'}
                                                </span>
                                            </div>
                                        </div>

                                        {/* RAZA / ESPECIE (dinámico según tipo de mascota) */}
                                        <div className="form-group">
                                            <label>{tipoMascota === 'Ave' ? 'Especie' : 'Raza'}</label>
                                            <input
                                                type="text"
                                                id="e-raza"
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
                                                id="e-color"
                                                className={`form-input ${fieldErrors.color ? 'input-error' : ''}`}
                                                placeholder="Ej: Blanco con manchas negras..."
                                                value={color}
                                                onChange={(e) => setColor(e.target.value)}
                                            />
                                        </div>

                                        {/* TAMAÑO */}
                                        <div className={`form-group ${fieldErrors.tamano ? 'input-error' : ''}`}>
                                            <CustomSelect
                                                id="e-tamano"
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

                                        {/* DIRECCIÓN */}
                                        <div
                                            className={`form-group icon-field grid-1col ${direccion ? 'has-value' : ''
                                                }`}
                                        >
                                            <i className="ti ti-map-pin"></i>
                                            <input
                                                type="text"
                                                id="e-direccion"
                                                className={`form-input ${direccion ? 'has-value' : ''} ${fieldErrors.direccion ? 'input-error' : ''
                                                    }`}
                                                placeholder="¿Dónde lo encontraste exactamente?"
                                                autoComplete="off"
                                                value={direccion}
                                                onChange={(e) => setDireccion(e.target.value)}
                                            />
                                        </div>

                                        {/* ZONA CON POPOVER */}
                                        <div
                                            className="form-group grid-1col zone-picker-group"
                                            ref={zonePopoverRef}
                                        >
                                            <div
                                                className={`zone-input-trigger ${zonaDisplay ? 'has-value' : ''
                                                    } ${fieldErrors.departamento || fieldErrors.provincia || fieldErrors.distrito
                                                        ? 'input-error'
                                                        : ''
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
                                                    id="e-zona-display"
                                                    className="form-input"
                                                    placeholder="Zona donde lo encontraste"
                                                    readOnly
                                                    autoComplete="off"
                                                    value={zonaDisplay}
                                                />
                                            </div>

                                            <div
                                                className={`zone-popover ${isZonePopoverOpen ? 'open' : ''
                                                    }`}
                                                id="zone-popover"
                                                onClick={(e) => e.stopPropagation()}
                                            >
                                                <div className="grid-3col">
                                                    <div className="form-group">
                                                        <CustomSelect
                                                            id="e-departamento"
                                                            placeholder={labelNivel1}
                                                            value={departamento}
                                                            onChange={(val) => setDepartamento(val)}
                                                            options={nivel1Options}
                                                        />
                                                    </div>

                                                    <div className="form-group">
                                                        <CustomSelect
                                                            id="e-provincia"
                                                            placeholder={labelNivel2}
                                                            value={provincia}
                                                            onChange={(val) => setProvincia(val)}
                                                            options={nivel2Options}
                                                        />
                                                    </div>

                                                    <div className="form-group">
                                                        <CustomSelect
                                                            id="e-distrito"
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

                                    {/* SECCIÓN COLAPSABLE */}
                                    <div className="collapsible-details-section">
                                        <button
                                            type="button"
                                            className={`btn-toggle-details ${isCollapsibleOpen ? 'open' : ''
                                                }`}
                                            data-target="#e-collapsible-content"
                                            onClick={() => setIsCollapsibleOpen(!isCollapsibleOpen)}
                                        >
                                            <span className="icon">
                                                <i className="fa-solid fa-plus"></i>
                                            </span>
                                            <div>
                                                <strong>Agregar más detalles</strong>
                                                <small>Estado del animal y señas distintivas</small>
                                            </div>
                                        </button>

                                        <div
                                            className="collapsible-content"
                                            id="e-collapsible-content"
                                            style={{
                                                display: isCollapsibleOpen ? 'block' : 'none',
                                            }}
                                        >
                                            <div className="groups form-group">
                                                <textarea
                                                    id="e-descripcion"
                                                    rows={3}
                                                    placeholder="Ej: Tiene una placa con el nombre 'Toby', se ve sano, lleva collar rojo..."
                                                    className="form-textarea"
                                                    value={descripcion}
                                                    onChange={(e) => setDescripcion(e.target.value)}
                                                ></textarea>
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
                                <div id="wrapper-free-checkout">
                                    <div className="free-notice-box">
                                        <h3>¡Todo listo!</h3>
                                        <p>
                                            Tu reporte se publicará en el portal de Huellas para que el
                                            dueño pueda encontrarte.
                                        </p>
                                    </div>

                                    <div className="upgrade-notice-banner">
                                        <i className="fa-solid fa-circle-info"></i>
                                        <p>
                                            Gracias por ayudar. Tu publicación es <b>100% gratuita</b>{' '}
                                            y estará visible de inmediato para la comunidad.
                                        </p>
                                    </div>

                                    <div className="terms-acceptance-box">
                                        <div
                                            className="terms-checkbox-label"
                                            onClick={() => setAcceptTerms(!acceptTerms)}
                                            style={{ cursor: 'pointer' }}
                                        >
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
                                        </div>
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
                                    disabled={(currentStep === 2 && !acceptTerms) || isGeneratingFlyer}
                                    onClick={handleNextStep}
                                >
                                    {isGeneratingFlyer ? (
                                        'Generando flyer...'
                                    ) : currentStep === 1 ? (
                                        <>
                                            Siguiente <i className="ti ti-chevron-right"></i>
                                        </>
                                    ) : (
                                        <>
                                            <i className="ti ti-check"></i> Publicar Gratis
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>

                    {/* ==========================================
              PANEL DERECHO (FLYER / RESUMEN)
             ========================================== */}
                    <div className="right-panel">
                        {/* RESUMEN DE CONFIRMACIÓN (PASO 2) */}
                        <div
                            id="right-panel-summary"
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

                            <div className="summary">
                                <div className="summary-reservation">
                                    <div className="summary-dates-open">
                                        <div className="summary-date-col">
                                            <span className="summary-date-label">
                                                Fecha de publicación
                                            </span>
                                            <strong
                                                className="summary-date-value"
                                                id="sum-fecha-publicacion"
                                            >
                                                {getFechaHoy()}
                                            </strong>
                                        </div>
                                        <div className="summary-date-col">
                                            <span className="summary-date-label">Vigencia</span>
                                            <strong className="summary-date-value">
                                                <i className="ti ti-calendar-bolt"></i> 6 meses
                                            </strong>
                                        </div>
                                    </div>

                                    <div className="summary-activacion-badge badge-activacion-green">
                                        <i className="fa-solid fa-clock"></i>
                                        <div>
                                            <b>En revisión</b>
                                            <p>Aprobación en máximo 24 hrs hábiles.</p>
                                        </div>
                                    </div>
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
                                        className={`flyer-canvas container-flyer-design state-encontrado ${isFlyerMobileVisible ? 'mobile-visible' : ''
                                            }`}
                                        id="flyer-preview"
                                    >
                                        <div className="flyer-alert-header">
                                            <h3 id="flyer-titulo-alerta" className="title-small">¿LO RECONOCES?</h3>
                                            <p id="flyer-subtitulo-alerta">Busco a mi familia</p>
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
                                        </div>

                                        <div className="flyer-body">
                                            <div className="flyer-body-info">
                                                <p className="flyer-canvas-text" id="flyer-txt-descripcion">
                                                    {getFlyerDescription()}
                                                </p>
                                            </div>

                                            <div className="flyer-footer-contact">
                                                <span className="flyer-footer-call-to-action">
                                                    Si es tu mascota, llama o escribe al
                                                </span>
                                                <div className="flyer-footer-number">
                                                    <i className="ti ti-brand-whatsapp"></i>
                                                    <span id="flyer-txt-tel">{currentUser?.phone?.replace(/^\+\d+\s*/, '') || '---------'}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <p className="editor-canvas-caption">
                                        <i className="ti ti-cut"></i> Podrás imprimir este anuncio
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
                            <i className="fa-solid fa-circle-check"></i> Reporte enviado
                        </span>
                        <h3 id="overlay-title">Procesando reporte...</h3>
                        <p id="overlay-msg">
                            Tu reporte de hallazgo está siendo procesado en la cola estándar de
                            Huellas de manera gratuita.
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
