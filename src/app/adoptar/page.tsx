'use client';
import { useState, useEffect, useRef, ChangeEvent } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import dynamic from 'next/dynamic';
import CustomSelect from '@/components/ui/CustomSelect';
import '@/styles/adoptar.css';
import { useApp } from '@/context/AppContext';
import { resizePetImage } from '@/lib/resizeImage';
import { geocodeAddress } from '@/lib/geocoding';
import { getPackages, type PackageOption } from '@/lib/packagesApi';
import { createReport, uploadReportImage, ReportsApiError } from '@/lib/reportsApi';
import { generateFlyerImage } from '@/lib/flyerExport';
import DraggablePhoto from '@/components/global/DraggablePhoto';
import AutocompleteInput from '@/components/ui/AutocompleteInput';
import { RAZAS_PERRO, RAZAS_GATO, ESPECIES_AVE, COLORES_PELAJE, COLORES_PLUMAJE } from '@/lib/petSuggestions';
import { validateText } from '@/lib/textValidation';
import { showToast } from '@/components/global/Toast';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { getCountryByAbbr, getLocaleForCountry, type Country } from '@/lib/countries';
import { normalizePhoneInput, isValidPhone } from '@/lib/phoneUtils';
import { getLevel1Options, getLevel2Options, getLevel3Options, countryHasLevel3 } from '@/lib/locations';
import type { PaymentInfo } from '@/lib/paymentsApi';
import CheckoutPago from '@/components/checkout/CheckoutPago';
import { useRouter } from 'next/navigation';
import {
    IconSparkles,
    IconDeviceMobileMessage,
    IconCameraPlus,
    IconX,
    IconGenderMale,
    IconVenus,
    IconInfoCircle,
    IconBolt,
    IconBan,
    IconBroadcast,
    IconHelp,
    IconChevronLeft,
    IconCheck,
    IconChevronRight,
    IconCircleCheck,
    IconCircleDashedCheck,
    IconHandFingerLeft,
    IconHandFingerDown,
    IconHandFinger,
    IconCurrentLocation,
    IconCalendarBolt,
    IconEye,
    IconBrandWhatsapp,
    IconCut,
    IconPlus,
    IconShieldCheck,
    IconCreditCard,
    IconBrandFacebook,
    IconBrandInstagram,
    IconBrandTiktok,
    IconBrandMessenger,
    IconCalendarPin,
    IconCircleCheckFilled,
    IconLoader,
    IconClock,
    IconHeart,
    IconHeartPin
} from '@tabler/icons-react';

const MapPicker = dynamic(() => import('@/components/global/MapPicker'), { ssr: false });

export default function PublicarAdoptarPage() {

    useRequireAuth();

    const { currentUser, isDarkMode, isAuthChecked, isLoggedIn } = useApp();
    const country = currentUser?.country ?? null;

    // Teléfono del aviso — independiente del de la cuenta.
    const [telefono, setTelefono] = useState('');

    useEffect(() => {
        if (currentUser?.phone) {
            setTelefono((prev) => prev || currentUser.phone!.replace(/^\+\d+\s*/, ''));
        }
    }, [currentUser?.phone]);

    // ==========================================
    // ESTADOS DEL WIZARD (MULTIPASO)
    // ==========================================
    const [currentStep, setCurrentStep] = useState(1);
    const [selectedPlan, setSelectedPlan] = useState('urgente');
    const [paymentMethod, setPaymentMethod] = useState<'card' | 'yape'>('card');
    const [acceptTerms, setAcceptTerms] = useState(false);
    const [showStatusOverlay, setShowStatusOverlay] = useState(false);
    const [pendingPayment, setPendingPayment] = useState<PaymentInfo | null>(null);
    const [createdReportId, setCreatedReportId] = useState<string | null>(null);
    const idempotencyKeyRef = useRef<string | null>(null);
    const router = useRouter();

    // ==========================================
    // ESTADOS DEL FORMULARIO Y FLYER EN VIVO
    // ==========================================
    const [nombre, setNombre] = useState('');
    const [tipoMascota, setTipoMascota] = useState('');
    const [sexo, setSexo] = useState('');
    const [isCastrado, setIsCastrado] = useState(false);
    const [raza, setRaza] = useState('');
    const [color, setColor] = useState('');
    const [tamano, setTamano] = useState('');
    const [direccion, setDireccion] = useState('');

    const [departamento, setDepartamento] = useState('');
    const [provincia, setProvincia] = useState('');
    const [distrito, setDistrito] = useState('');

    const [hasLevel3, setHasLevel3] = useState(true);
    useEffect(() => {
        let isCancelled = false;
        countryHasLevel3(country).then((result) => {
            if (!isCancelled) setHasLevel3(result);
        });
        return () => {
            isCancelled = true;
        };
    }, [country]);

    const [isCollapsibleOpen, setIsCollapsibleOpen] = useState(false);
    const [descripcion, setDescripcion] = useState('');
    const [extras, setExtras] = useState('');
    const [ocultarExtras, setOcultarExtras] = useState(false);
    const [edad, setEdad] = useState('');

    const [uploadedImages, setUploadedImages] = useState<(string | null)[]>([
        null,
        null,
        null,
        null,
    ]);

    // Posición vertical elegida por el usuario para cada foto del flyer (arrastre)
    const [photoOffsets, setPhotoOffsets] = useState<Record<number, number>>({});

    // Mapa: coordenadas y ajuste manual de ubicación
    const [lat, setLat] = useState<number | null>(null);
    const [lng, setLng] = useState<number | null>(null);
    const [isAdjustingMap, setIsAdjustingMap] = useState(false);
    const [isGeocoding, setIsGeocoding] = useState(false);

    // Flyer generado automáticamente al avanzar del paso 1 al 2
    const [flyerImageBase64, setFlyerImageBase64] = useState<string | null>(null);
    const [isGeneratingFlyer, setIsGeneratingFlyer] = useState(false);

    // Validación de campos obligatorios del paso 1
    const [fieldErrors, setFieldErrors] = useState<Record<string, boolean>>({});

    // Mobile Flyer Preview Toggle
    const [isFlyerMobileVisible, setIsFlyerMobileVisible] = useState(false);

    // Fecha de publicación calculada automáticamente
    const [fechaPublicacion, setFechaPublicacion] = useState('--/--/----');

    useEffect(() => {
        const hoy = new Date();
        const d = String(hoy.getDate()).padStart(2, '0');
        const m = String(hoy.getMonth() + 1).padStart(2, '0');
        const y = hoy.getFullYear();
        setFechaPublicacion(`${d}/${m}/${y}`);
    }, []);

    // ==========================================
    // EFECTOS DE POPOVERS Y EVENTOS
    // ==========================================

    // Recuerda la última combinación que ya se geocodificó, para no volver a
    // pegarle a la API con exactamente la misma dirección — antes esto
    // pasaba cuando algún campo del dependency array cambiaba (ej. hasLevel3
    // resolviéndose tarde) sin que la dirección real fuera distinta.
    const lastGeocodedQueryRef = useRef<string | null>(null);

    useEffect(() => {
        if (!provincia || !departamento) return;
        if (hasLevel3 && !distrito) return;

        const query = [direccion, distrito, provincia, departamento, country].join('|');
        if (query === lastGeocodedQueryRef.current) return;

        let isCancelled = false;

        async function geocode() {
            lastGeocodedQueryRef.current = query;
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
    }, [distrito, direccion, provincia, departamento, hasLevel3, country]);

    // ==========================================
    // CARGA Y REMOCIÓN DE IMÁGENES
    // ==========================================
    const handlePhotoChange = async (e: ChangeEvent<HTMLInputElement>, index: number) => {
        const file = e.target.files?.[0];
        if (file) {
            try {
                const compressedBase64 = await resizePetImage(file);
                setUploadedImages((prev) => {
                    const next = [...prev];
                    next[index] = compressedBase64;
                    return next;
                });
                clearFieldError('fotos');
            } catch (err) {
                console.error('Error al procesar la imagen:', err);
                showToast('No se pudo cargar la foto. Intenta con otra imagen.', 'error');
            }
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

    const validPhotos = uploadedImages.filter((img) => img !== null) as string[];
    const coverIndex = uploadedImages.findIndex((img) => img !== null);

    useEffect(() => {
        setPhotoOffsets({});
    }, [validPhotos.length]);


    // ==========================================
    // DATOS PARA EL RESUMEN (PASO 3)
    // ==========================================
    const [countryInfo, setCountryInfo] = useState<Country | null>(null);
    const [packages, setPackages] = useState<PackageOption[]>([]);
    const [isLoadingWizardData, setIsLoadingWizardData] = useState(true);

    useEffect(() => {
        let isCancelled = false;
        setIsLoadingWizardData(true);
        Promise.all([getCountryByAbbr(country), getPackages(country)]).then(([c, pkgs]) => {
            if (!isCancelled) {
                setCountryInfo(c);
                setPackages(pkgs);
                setIsLoadingWizardData(false);
            }
        });
        return () => {
            isCancelled = true;
        };
    }, [country]);

    const currencySymbol = countryInfo?.currencySymbol ?? '';
    const currencyCode = country !== 'PE' ? countryInfo?.currency ?? '' : '';
    const currentPlanObj = packages.find((p) => p.slug === selectedPlan) ?? null;
    const isCountryReady = !isLoadingWizardData && !!countryInfo?.locationLabels && packages.length > 0;

    const [labelNivel1, labelNivel2, labelNivel3] = countryInfo?.locationLabels ?? ['Departamento', 'Provincia', 'Distrito'];

    const [nivel1Options, setNivel1Options] = useState<{ value: string; label: string }[]>([]);
    const [nivel2Options, setNivel2Options] = useState<{ value: string; label: string }[]>([]);
    const [nivel3Options, setNivel3Options] = useState<{ value: string; label: string }[]>([]);

    useEffect(() => {
        let isCancelled = false;
        getLevel1Options(country).then((opts) => {
            if (!isCancelled) setNivel1Options(opts);
        });
        return () => {
            isCancelled = true;
        };
    }, [country]);

    useEffect(() => {
        let isCancelled = false;
        getLevel2Options(country, departamento).then((opts) => {
            if (!isCancelled) setNivel2Options(opts);
        });
        return () => {
            isCancelled = true;
        };
    }, [country, departamento]);

    useEffect(() => {
        let isCancelled = false;
        getLevel3Options(country, departamento, provincia).then((opts) => {
            if (!isCancelled) setNivel3Options(opts);
        });
        return () => {
            isCancelled = true;
        };
    }, [country, departamento, provincia]);



    const getFechaRange = () => {
        const inicio = new Date();
        const fin = new Date();
        const dias = currentPlanObj?.days ?? 0;
        fin.setDate(inicio.getDate() + dias);
        const opciones: Intl.DateTimeFormatOptions = {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
        };
        const esGratis = selectedPlan === 'gratis';

        return {
            inicio: esGratis ? 'Sujeto a aprobación' : inicio.toLocaleDateString(getLocaleForCountry(country), opciones),
            fin: esGratis ? null : fin.toLocaleDateString(getLocaleForCountry(country), opciones),
            diasTexto: esGratis ? '3 meses' : `${dias} días`,
        };
    };

    // ==========================================
    // VALIDACIÓN Y SANITIZACIÓN (PASO 1)
    // ==========================================
    function sanitizeText(value: string): string {
        return value.replace(/<[^>]*>?/gm, '').trim();
    }

    function clearFieldError(field: string) {
        setFieldErrors((prev) => {
            if (!prev[field]) return prev;
            const next = { ...prev };
            delete next[field];
            return next;
        });
    }

    function tipoMascotaToApi(valor: string): string {
        if (valor === 'Perro') return 'perro';
        if (valor === 'Gato') return 'gato';
        if (valor === 'Ave') return 'ave';
        return 'otro';
    }
    function sexoToApi(valor: string): string | null {
        if (valor === 'Macho') return 'macho';
        if (valor === 'Hembra') return 'hembra';
        return null;
    }
    function tamanoToApi(valor: string): string | null {
        if (valor === 'Pequeño') return 'pequeño';
        if (valor === 'Mediano') return 'mediano';
        if (valor === 'Grande') return 'grande';
        return null;
    }

    function validateStep1(): boolean {
        const errors: Record<string, boolean> = {};
        let specificError = '';

        if (!sanitizeText(nombre)) {
            errors.nombre = true;
        } else {
            const check = validateText(nombre, 3, 'El nombre');
            if (!check.valid) {
                errors.nombre = true;
                specificError = specificError || check.error!;
            }
        }

        if (!sexo) errors.sexo = true;
        if (!tipoMascota) errors.tipoMascota = true;
        if (!tamano) errors.tamano = true;

        if (!sanitizeText(raza)) {
            errors.raza = true;
        } else {
            const check = validateText(raza, 3, 'La raza');
            if (!check.valid) {
                errors.raza = true;
                specificError = specificError || check.error!;
            }
        }

        if (!sanitizeText(color)) {
            errors.color = true;
        } else {
            const check = validateText(color, 3, 'El color');
            if (!check.valid) {
                errors.color = true;
                specificError = specificError || check.error!;
            }
        }

        if (!sanitizeText(direccion)) {
            errors.direccion = true;
        } else {
            const check = validateText(direccion, 10, 'La dirección');
            if (!check.valid) {
                errors.direccion = true;
                specificError = specificError || check.error!;
            }
        }

        if (!departamento) errors.departamento = true;
        if (!provincia) errors.provincia = true;
        if (hasLevel3 && !distrito) errors.distrito = true;
        if (validPhotos.length === 0) errors.fotos = true;

        // Descripción e "incluye" son opcionales — solo se validan si el usuario escribió algo
        if (sanitizeText(descripcion)) {
            const check = validateText(descripcion, 10, 'La descripción');
            if (!check.valid) {
                errors.descripcion = true;
                specificError = specificError || check.error!;
            }
        }
        if (sanitizeText(extras)) {
            const check = validateText(extras, 3, 'Lo que incluye');
            if (!check.valid) {
                errors.extras = true;
                specificError = specificError || check.error!;
            }
        }

        if (ocultarExtras && !sanitizeText(extras)) {
            errors.extras = true;
            specificError = specificError || 'Ingresa qué incluye la adopción antes de ocultarlo';
        }

        if (!isValidPhone(telefono, country)) {
            errors.telefono = true;
            specificError = specificError || 'Ingresa un número de contacto válido';
        }

        setFieldErrors(errors);

        if (Object.keys(errors).length > 0) {
            if (errors.fotos) {
                showToast('Agrega al menos 1 foto de la mascota', 'error');
            } else if (specificError) {
                showToast(specificError, 'error');
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

        if (currentStep === 2 && selectedPlan !== 'gratis') {
            executeFormSubmission();
            return;
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

    const [isSubmitting, setIsSubmitting] = useState(false);

    const executeFormSubmission = async () => {
        if (!currentUser) return;

        if (!idempotencyKeyRef.current) {
            idempotencyKeyRef.current = crypto.randomUUID();
        }

        setIsSubmitting(true);
        try {
            const { report, payment } = await createReport({
                report_type: 'adoption',
                package_slug: selectedPlan,
                pet_type: tipoMascota ? tipoMascotaToApi(tipoMascota) : null,
                title: sanitizeText(nombre) || null,
                description: sanitizeText(descripcion) || null,
                country: country,
                region: departamento || null,
                province: provincia || null,
                district: distrito || null,
                address_hint: sanitizeText(direccion) || null,
                lat: lat,
                lng: lng,
                event_date: null, // adopción no captura una fecha de evento
                contact_name: currentUser.name || null,
                contact_phone: `${countryInfo?.dialCode ?? ''} ${normalizePhoneInput(telefono, country)}`.trim() || null,
                contact_email: currentUser.email || null,
                meta: {
                    sex: sexoToApi(sexo),
                    is_neutered: isCastrado,
                    size: tamanoToApi(tamano),
                    breed: sanitizeText(raza) || null,
                    color: sanitizeText(color) || null,
                    age: edad || null,
                    adoption_extras: sanitizeText(extras) || null,
                    adoption_extras_visible: !ocultarExtras,
                },
            }, idempotencyKeyRef.current);

            await Promise.allSettled([
                ...validPhotos.map((foto, index) =>
                    uploadReportImage(report.id, foto, false, index === 0).catch((err) => {
                        console.error('No se pudo subir una foto', err);
                    })
                ),
                ...(flyerImageBase64
                    ? [
                        uploadReportImage(report.id, flyerImageBase64, true).catch((err) => {
                            console.error('No se pudo subir el flyer', err);
                        }),
                    ]
                    : []),
            ]);

            if (payment) {
                setCreatedReportId(report.id);
                setPendingPayment(payment);
                setCurrentStep(3);
            } else {
                setShowStatusOverlay(true);
                setTimeout(() => {
                    router.push('/mi-cuenta');
                }, 5000);
            }
        } catch (err) {
            const message = err instanceof ReportsApiError ? err.message : 'No pudimos publicar tu aviso. Intenta de nuevo.';
            showToast(message, 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handlePaymentConfirmed = () => {
        showToast('¡Pago confirmado! Tu aviso quedará activo en cuanto nuestro equipo lo revise.', 'success');
        router.push('/mi-cuenta');
    };

    const handlePaymentTimeout = () => {
        showToast('Tu pago está siendo confirmado, puede tardar unos minutos. Revisa "Mis avisos" en un momento.', 'info');
        router.push('/mi-cuenta');
    };

    const handlePaymentCancelled = () => {
        showToast('No pudimos procesar el pago. Puedes intentarlo de nuevo.', 'error');
    };

    const flyerCards = [
        { key: 'raza', value: raza },
        { key: 'sexo', value: sexo },
        { key: 'edad', value: edad },
        { key: 'color', value: color },
        { key: 'tamano', value: tamano },
        { key: 'castrado', value: isCastrado ? (sexo === 'Hembra' ? 'Esterilizada' : 'Esterilizado') : '' },
    ].filter((card) => card.value);


    return (
        <main className="main-content">
            <section id="view-publish-adopt" className="animate-fade-in">
                <div className="grid-publish">
                    {
                    /* ==========================================
                    PANEL IZQUIERDO (PASOS Y SLOGAN)
                    ========================================== */}
                    <div className="left-panel">
                        <h1>Publicar adopción</h1>

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
                                    <h4 className="step-title">Información de la mascota</h4>
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
                                className={`wizard-v-step ${currentStep === 3 ? 'active' : ''}`}
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
                                    <IconSparkles /> Cómo funciona
                                </span>
                                <div className="slogan-body">
                                    <p>
                                        Tu aviso llega a <b>personas que realmente buscan adoptar</b> en tu zona.
                                    </p>
                                </div>
                                <div className="slogan-divider"></div>
                                <div className="slogan-reach-row">
                                    <div className="slogan-reach-item">
                                        <span className="slogan-reach-icon">
                                            <IconDeviceMobileMessage />
                                        </span>
                                        <span>
                                            El aviso llega <b>sin necesidad</b> de seguir páginas o grupos.
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
                            id="multi-step-adopt-form"
                            autoComplete="off"
                            onSubmit={(e) => e.preventDefault()}
                        >
                            {/* ==================== PASO 1 ==================== */}
                            <div
                                className={`wizard-step ${currentStep === 1 ? 'active' : ''}`}
                                id="wizard-step-1"
                            >
                                <div id="form-adoptar" className="publish-form-panel active">
                                    {/* UPLOADER FOTOS */}
                                    <div className="groups form-group">
                                        <label>Fotos de la mascota en adopción (Máx. 4)</label>
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
                                                            <IconCameraPlus />
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
                                                            <IconX />
                                                        </button>
                                                    )}
                                                    {idx === coverIndex && (
                                                        <span className="photo-cover-badge">Portada</span>
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

                                    <div className="groups grid-2col">
                                        {/* NOMBRE */}
                                        <div className="form-group">
                                            <input
                                                type="text"
                                                placeholder="Nombre de la mascota"
                                                id="e-nombre"
                                                className={`form-input ${fieldErrors.nombre ? 'input-error' : ''}`}
                                                value={nombre}
                                                onChange={(e) => {
                                                    setNombre(e.target.value);
                                                    clearFieldError('nombre');
                                                }}
                                            />
                                        </div>

                                        {/* TIPO DE MASCOTA */}
                                        <div
                                            className={`form-group ${tipoMascota ? 'has-value' : ''
                                                }`}
                                        >
                                            <CustomSelect
                                                id="e-tipo"
                                                placeholder="Tipo de mascota"
                                                value={tipoMascota}
                                                onChange={(val) => {
                                                    setTipoMascota(val);
                                                    clearFieldError('tipoMascota');
                                                }}
                                                className={fieldErrors.tipoMascota ? 'input-error' : ''}
                                                options={[
                                                    { value: 'Perro', label: 'Perro' },
                                                    { value: 'Gato', label: 'Gato' },
                                                    { value: 'Ave', label: 'Ave' },
                                                ]}
                                            />
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
                                                    onClick={() => {
                                                        setSexo('Macho');
                                                        clearFieldError('sexo');
                                                    }}
                                                >
                                                    <IconGenderMale /> Macho
                                                    <IconCircleDashedCheck className="icon-check-active" />
                                                </button>
                                                <button
                                                    type="button"
                                                    className={`gender-pill-btn ${sexo === 'Hembra' ? 'active' : ''
                                                        }`}
                                                    data-value="Hembra"
                                                    onClick={() => {
                                                        setSexo('Hembra');
                                                        clearFieldError('sexo');
                                                    }}
                                                >
                                                    <IconVenus /> Hembra
                                                    <IconCircleDashedCheck className="icon-check-active" />
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
                                            <AutocompleteInput
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
                                                onChange={(val) => {
                                                    setRaza(val);
                                                    clearFieldError('raza');
                                                }}
                                                suggestions={
                                                    tipoMascota === 'Ave'
                                                        ? ESPECIES_AVE
                                                        : tipoMascota === 'Gato'
                                                            ? RAZAS_GATO
                                                            : RAZAS_PERRO
                                                }
                                            />
                                        </div>

                                        {/* COLOR (dinámico según tipo de mascota) */}
                                        <div className="form-group">
                                            <label>{tipoMascota === 'Ave' ? 'Color del plumaje' : 'Color del pelaje'}</label>
                                            <AutocompleteInput
                                                id="e-color"
                                                className={`form-input ${fieldErrors.color ? 'input-error' : ''}`}
                                                placeholder="Ej: Blanco"
                                                value={color}
                                                onChange={(val) => {
                                                    setColor(val);
                                                    clearFieldError('color');
                                                }}
                                                suggestions={tipoMascota === 'Ave' ? COLORES_PLUMAJE : COLORES_PELAJE}
                                            />
                                        </div>

                                        {/* TAMAÑO */}
                                        <div className={`form-group ${fieldErrors.tamano ? 'input-error' : ''}`}>
                                            <CustomSelect
                                                id="e-tamano"
                                                placeholder="Tamaño"
                                                value={tamano}
                                                onChange={(val) => {
                                                    setTamano(val);
                                                    clearFieldError('tamano');
                                                }}
                                                options={[
                                                    { value: 'Pequeño', label: 'Pequeño' },
                                                    { value: 'Mediano', label: 'Mediano' },
                                                    { value: 'Grande', label: 'Grande' },
                                                ]}
                                            />
                                        </div>

                                        {/* ZONA (SIN POPOVER) */}
                                        <div className="form-group grid-1col">
                                            <label>Zona de entrega de la mascota</label>
                                            {!isCountryReady ? (
                                                <div className="admin-info-box">
                                                    <IconInfoCircle />
                                                    <p>Tu país todavía no está configurado para publicar. Vuelve más tarde.</p>
                                                </div>
                                            ) : (
                                                <div className={hasLevel3 ? 'grid-3col' : 'grid-2col'}>
                                                    <div className="form-group">
                                                        <CustomSelect
                                                            id="e-departamento"
                                                            placeholder={labelNivel1}
                                                            value={departamento}
                                                            onChange={(val) => {
                                                                setDepartamento(val);
                                                                clearFieldError('departamento');
                                                            }}
                                                            options={nivel1Options}
                                                            searchable={true}
                                                            className={fieldErrors.departamento ? 'input-error' : ''}
                                                        />
                                                    </div>

                                                    <div className="form-group">
                                                        <CustomSelect
                                                            id="e-provincia"
                                                            placeholder={labelNivel2}
                                                            value={provincia}
                                                            onChange={(val) => {
                                                                setProvincia(val);
                                                                clearFieldError('provincia');
                                                            }}
                                                            options={nivel2Options}
                                                            searchable={true}
                                                            className={fieldErrors.provincia ? 'input-error' : ''}
                                                        />
                                                    </div>

                                                    {hasLevel3 && (
                                                        <div className="form-group">
                                                            <CustomSelect
                                                                id="e-distrito"
                                                                placeholder={labelNivel3}
                                                                value={distrito}
                                                                onChange={(val) => {
                                                                    setDistrito(val);
                                                                    clearFieldError('distrito');
                                                                }}
                                                                options={nivel3Options}
                                                                searchable={true}
                                                                className={fieldErrors.distrito ? 'input-error' : ''}
                                                            />
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>

                                        {/* DIRECCIÓN */}
                                        <div
                                            className={`form-group input-address grid-1col ${direccion ? 'has-value' : ''
                                                }`}>
                                            <input
                                                type="text"
                                                id="e-direccion"
                                                className={`form-input ${direccion ? 'has-value' : ''} ${fieldErrors.direccion ? 'input-error' : ''
                                                    }`}
                                                placeholder="Calle, avenida o punto de referencia"
                                                autoComplete="off"
                                                value={direccion}
                                                onChange={(e) => {
                                                    setDireccion(e.target.value);
                                                    clearFieldError('direccion');
                                                }}
                                            />
                                        </div>
                                    </div>

                                    {/* TELÉFONO DE CONTACTO — propio de este aviso, no de la cuenta */}
                                    <div className="groups grid-2col">
                                        <div className="form-group grid-1col">
                                            <label>¿Dónde te pueden contactar?</label>
                                            <div className={`field-tel ${fieldErrors.telefono ? 'input-error' : ''}`}>
                                                <span>{countryInfo?.dialCode}</span>
                                                <input
                                                    type="tel"
                                                    name="telefono-aviso"
                                                    className="form-input"
                                                    autoComplete="tel"
                                                    maxLength={15}
                                                    placeholder="Número de teléfono"
                                                    value={telefono}
                                                    onChange={(e) => {
                                                        const soloTelefono = e.target.value.replace(/[^\d\s\-()]/g, '');
                                                        setTelefono(soloTelefono);
                                                        clearFieldError('telefono');
                                                    }}
                                                    readOnly
                                                    onFocus={(e) => e.target.removeAttribute('readonly')}
                                                />
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
                                                <IconPlus />
                                            </span>
                                            <div>
                                                <strong>Agregar más detalles</strong>
                                                <small>Personalidad, historia y edad</small>
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
                                                    placeholder="Ej: Es muy cariñoso, le encanta jugar, fue rescatado de la calle..."
                                                    className="form-textarea"
                                                    value={descripcion}
                                                    onChange={(e) => setDescripcion(e.target.value)}
                                                ></textarea>
                                            </div>

                                            <div className="groups grid-2col">
                                                <div className="form-group">
                                                    <input
                                                        type="text"
                                                        id="e-extras"
                                                        className={`form-input ${fieldErrors.extras ? 'input-error' : ''}`}
                                                        placeholder="Incluye: cama, plato, collar..."
                                                        value={extras}
                                                        onChange={(e) => {
                                                            setExtras(e.target.value);
                                                            clearFieldError('extras');
                                                        }}
                                                    />
                                                    <div
                                                        className="terms-acceptance-box"
                                                        style={{ marginTop: '0.5em' }}
                                                    >
                                                        <label className="terms-checkbox-label">
                                                            <input
                                                                type="checkbox"
                                                                id="e-ocultar-extras"
                                                                className="terms-checkbox-input"
                                                                checked={ocultarExtras}
                                                                onChange={(e) => {
                                                                    setOcultarExtras(e.target.checked);
                                                                    clearFieldError('extras');
                                                                }}
                                                            />
                                                            <span className="terms-checkbox-custom">
                                                                <i className="check"></i>
                                                            </span>
                                                            <span className="terms-checkbox-text">
                                                                Ocultar detalles
                                                            </span>
                                                        </label>
                                                    </div>
                                                </div>

                                                <div className="form-group">
                                                    <CustomSelect
                                                        id="e-edad"
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
                                        {packages.map((pkg) => {
                                            const isFree = pkg.price === 0;
                                            const isUrgente = pkg.slug === 'urgente';
                                            const descriptionHtml = pkg.description.replace(/\n/g, '<br/>');

                                            return (
                                                <label
                                                    key={pkg.slug}
                                                    className={`plan-item-label ${isUrgente ? 'option-dominant-wrapper' : ''}`}
                                                >
                                                    <input
                                                        type="radio"
                                                        name="diffusion_plan"
                                                        value={pkg.slug}
                                                        checked={selectedPlan === pkg.slug}
                                                        onChange={(e) => setSelectedPlan(e.target.value)}
                                                    />
                                                    <div className={`plan-item ${isFree ? 'free' : ''} ${isUrgente ? 'plan-item-premium' : ''}`}>
                                                        {isUrgente && (
                                                            <span className="tag-info">
                                                                <IconBolt /> Máxima Difusión
                                                            </span>
                                                        )}
                                                        <div className="row-plan">
                                                            <div className="plan-info">
                                                                <h4>
                                                                    {isFree ? (
                                                                        pkg.name
                                                                    ) : (
                                                                        <>
                                                                            <u>Plan</u> {pkg.name}
                                                                        </>
                                                                    )}
                                                                </h4>
                                                                <p
                                                                    className="plan-scope"
                                                                    dangerouslySetInnerHTML={{ __html: descriptionHtml }}
                                                                />
                                                            </div>
                                                            <div className="plan-card">
                                                                <div className="plan-price">
                                                                    <i>{currencySymbol}</i> {pkg.price} {currencyCode}
                                                                </div>
                                                                {!isFree && (
                                                                    <span>
                                                                        / <IconCreditCard /> Pago único
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                        <div className="row-data-plan">
                                                            {pkg.channels.length > 0 && (
                                                                <div className="plan-features-list">
                                                                    {pkg.channels.map((ch) => (
                                                                        <span key={ch} className={`plan-feature-tag btn-${ch}`}>
                                                                            {ch === 'facebook' && <IconBrandFacebook />}
                                                                            {ch === 'instagram' && <IconBrandInstagram />}
                                                                            {ch === 'tiktok' && <IconBrandTiktok />}
                                                                            {ch === 'messenger' && <IconBrandMessenger />}
                                                                            {' '}
                                                                            {ch.charAt(0).toUpperCase() + ch.slice(1)}
                                                                        </span>
                                                                    ))}
                                                                </div>
                                                            )}
                                                            <div className="attributes-plan">
                                                                <ul>
                                                                    {isFree ? (
                                                                        <li>
                                                                            <IconBan /> Sin difusión en zonas de
                                                                            adopción
                                                                        </li>
                                                                    ) : (
                                                                        <li>
                                                                            <IconBroadcast />
                                                                            <b>{pkg.days} días</b> de difusión
                                                                        </li>
                                                                    )}

                                                                    {pkg.includesRefund && (
                                                                        <li>
                                                                            <div className="tooltip-wrap">
                                                                                <IconHelp className="tooltip-trigger" />
                                                                                <span className="tooltip-box">
                                                                                    <IconInfoCircle /> Si
                                                                                    encuentras un hogar para tu mascota antes, te{' '}
                                                                                    <b>devolvemos</b> los días restantes del plan.
                                                                                </span>
                                                                            </div>{' '}
                                                                            Incluye <b><u>reembolso</u></b>
                                                                        </li>
                                                                    )}
                                                                </ul>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </label>
                                            );
                                        })}
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
                                            <IconShieldCheck /> Pago seguro
                                        </h4>

                                        {pendingPayment && (
                                            <CheckoutPago
                                                payment={pendingPayment}
                                                reportId={createdReportId!}
                                                country={country}
                                                onConfirmed={handlePaymentConfirmed}
                                                onTimeout={handlePaymentTimeout}
                                                onCancelled={handlePaymentCancelled}
                                            />
                                        )}
                                        <span className='text-chat'>¿Problemas con tu pago? <a href="https://tawk.to/chat/6aba144ddff27f343f63f5c8/1k3jduk17?layout=modern" target='blank'>Escríbenos aquí</a> y te ayudamos.</span>
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
                                        <p>
                                            Tu aviso aparecerá en el catálogo de adopciones de Huellas Perdidas.
                                        </p>
                                    </div>

                                    <div className="upgrade-notice-banner">
                                        <IconInfoCircle />
                                        <p>
                                            Recuerda que después puedes cambiar tu anuncio a un{' '}
                                            <b>plan de pago</b> desde <b>Mi cuenta</b>, para llegar
                                            más rápido a más personas interesadas en adoptar.
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
                                                <i className="check"></i>
                                            </span>
                                            <span className="terms-checkbox-text">
                                                Acepto que he leído y declaro que la información publicada es verídica.{' '}
                                                <Link href="https://www.huellasperdidas.com/informacion/terminos-y-condiciones/" target="_blank">
                                                    Términos y Condiciones
                                                </Link>
                                            </span>
                                        </label>
                                    </div>
                                </div>
                            </div>

                            {currentStep === 2 && selectedPlan !== 'gratis' && (
                                <p className="terms-inline-note">
                                    Al continuar aceptas los{' '}
                                    <Link href="https://www.huellasperdidas.com/informacion/terminos-y-condiciones/" target="_blank">
                                        Términos y Condiciones
                                    </Link>{' '}
                                    y declaras que la información publicada es verídica.
                                </p>
                            )}

                            {/* BOTONES ACCIÓN WIZARD */}
                            <div className="wizard-actions">
                                <button
                                    type="button"
                                    id="btn-wizard-prev"
                                    className="btn-secondary"
                                    style={{ display: currentStep > 1 && !pendingPayment ? 'inline-flex' : 'none' }}
                                    onClick={handlePrevStep}
                                >
                                    <IconChevronLeft /> Anterior
                                </button>

                                {!pendingPayment && (
                                    <button
                                        type="button"
                                        id="btn-wizard-next"
                                        className="btn-publish"
                                        disabled={(currentStep === 3 && !acceptTerms) || isGeneratingFlyer || isSubmitting}
                                        onClick={handleNextStep}
                                    >
                                        {isSubmitting ? (
                                            'Cargando...'
                                        ) : isGeneratingFlyer ? (
                                            'Generando flyer...'
                                        ) : currentStep < 3 ? (
                                            currentStep === 2 && selectedPlan !== 'gratis' ? (
                                                <>
                                                    <IconCheck /> Continuar
                                                </>
                                            ) : (
                                                <>
                                                    Siguiente <IconChevronRight />
                                                </>
                                            )
                                        ) : selectedPlan === 'gratis' ? (
                                            <>
                                                <IconCheck /> Publicar Gratis
                                            </>
                                        ) : (
                                            <>
                                                <IconCheck /> Continuar
                                            </>
                                        )}
                                    </button>
                                )}
                            </div>
                        </form>
                    </div>

                    {/* ==========================================
              PANEL DERECHO (FLYER / MAPA / RESUMEN)
             ========================================== */}
                    <div className="right-panel">
                        {/* MAPA (PASO 2) */}
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
                                        <IconCircleCheck /> Listo
                                    </span>
                                </div>
                            </div>

                            <div className="map-section">
                                <div className="map-header">
                                    <h4>
                                        <IconCurrentLocation /> Zona de
                                        difusión
                                    </h4>
                                    <span
                                        className="badge-plan-reach"
                                        id="badge-plan-reach"
                                        style={{
                                            display: selectedPlan !== 'gratis' ? 'inline-flex' : 'none',
                                        }}
                                    >
                                        <IconCircleDashedCheck /> Radio de
                                        difusión listo
                                    </span>
                                </div>

                                <div className="map-placeholder-container" id="map-simulated">
                                    {currentStep === 2 && selectedPlan !== 'gratis' && lat !== null && lng !== null ? (
                                        <MapPicker
                                            lat={lat}
                                            lng={lng}
                                            radioKm={currentPlanObj?.adsMetaRadiusKm ?? 0}
                                            zoom={currentPlanObj?.mapZoom ?? 12}
                                            isDraggable={isAdjustingMap}
                                            isDarkMode={isDarkMode}
                                            circleColor="#8578d8"
                                            onPositionChange={(newLat, newLng) => {
                                                setLat(newLat);
                                                setLng(newLng);
                                            }}
                                        />
                                    ) : (
                                        <div className="map-radar-wrap">
                                            <div className="map-radar-pin">
                                                <IconCurrentLocation />
                                            </div>
                                            <p className="map-no-plan-msg">
                                                <IconHandFingerLeft className="map-hint-icon-desktop" />
                                                <IconHandFingerDown className="map-hint-icon-mobile" />
                                                {selectedPlan === 'gratis'
                                                    ? 'Selecciona un plan para ver el alcance de difusión.'
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
                                        <i className="check"></i>
                                    </span>
                                    <span className="terms-checkbox-text">
                                        <small>Ajustar ubicación en el mapa  {isAdjustingMap && (
                                            <i className="map-adjust-hint"><IconHandFinger /> Arrastra el círculo</i>
                                        )}</small>
                                    </span>
                                </label>
                                {isAdjustingMap && (
                                    <i className="map-adjust-hint">Arrastra el círculo</i>
                                )}
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
                                        <IconCircleCheck /> Listo
                                    </span>
                                </div>
                                <div
                                    className="summary-check-item free"
                                    style={{
                                        display: selectedPlan !== 'gratis' ? 'flex' : 'none',
                                    }}
                                >
                                    <span className="summary-title-item">
                                        <IconCurrentLocation /> Zona de difusión
                                    </span>
                                    <span className="summary-ready-badge">
                                        <IconCircleCheck /> Listo
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
                                        {getFechaRange().fin && (
                                            <div className="summary-date-col">
                                                <span className="summary-date-label">Fin</span>
                                                <strong className="summary-date-value" id="sum-fecha-fin">
                                                    {getFechaRange().fin}
                                                </strong>
                                            </div>
                                        )}
                                        <div className="summary-date-col">
                                            <span className="summary-date-label">Días de circulación</span>
                                            <strong className="summary-date-value" id="sum-dias">
                                                <IconCalendarBolt />
                                                {getFechaRange().diasTexto}
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
                                                {currentPlanObj?.name ?? ''}
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
                                                {currencySymbol} {currentPlanObj?.price ?? 0} {currencyCode}
                                            </strong>
                                        </div>
                                    </div>

                                    {selectedPlan !== 'gratis' ? (
                                        <div
                                            id="sum-activacion-pago"
                                            className="summary-activacion-badge badge-activacion-green"
                                        >
                                            <IconBolt />
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
                                            <IconClock />
                                            <div>
                                                <b>En revisión</b>
                                                <p>Aprobación en máximo 24 hrs hábiles.</p>
                                            </div>
                                        </div>
                                    )}

                                    <p className="summary-upgrade-note" style={{ display: 'none' }}>
                                        <IconInfoCircle /> Desde <b>Mi cuenta</b> puedes convertir este aviso a un plan de mayor alcance.
                                    </p>
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
                                                    <IconX /> Cerrar
                                                </>
                                            ) : (
                                                <>
                                                    <IconEye /> Ver el Flyer
                                                </>
                                            )}
                                        </button>
                                    </div>

                                    <div
                                        className={`flyer-canvas container-flyer-design state-adoptar ${isFlyerMobileVisible ? 'mobile-visible' : ''
                                            }`}
                                        id="flyer-preview"
                                    >
                                        {/* 1. Cabecera */}
                                        <div className="flyer-alert-header">
                                            <div className="flyer-title-row">
                                                <h3 id="flyer-titulo-alerta">¡ADÓPTAME!</h3>
                                            </div>
                                        </div>

                                        {/* 2. Fotos + etiqueta con el nombre */}
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
                                                        <IconCameraPlus />
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

                                            <div className="flyer-photo-tag">
                                                <span><IconHeart /> {nombre || 'Nombre'}</span>
                                            </div>
                                        </div>

                                        {/* Extras / accesorios (arriba de la franja de datos) */}
                                        {extras && (
                                            <div className="flyer-canvas-reward" id="flyer-includes-box">
                                                <span id="flyer-txt-incluye">
                                                    {ocultarExtras ? 'Accesorios y más' : extras}
                                                </span>
                                            </div>
                                        )}

                                        {/* 3. Franja de datos */}
                                        <div className="flyer-info-band">
                                            <div className="flyer-info-where">
                                                <IconHeartPin className="flyer-info-bigicon" />
                                                <div className="flyer-info-text">
                                                    <span className="flyer-info-kicker">Entrega en:</span>
                                                    {(distrito || provincia) && (
                                                        <strong className="flyer-info-place">{distrito || provincia}</strong>
                                                    )}
                                                    {direccion && <span className="flyer-info">{direccion}</span>}
                                                </div>
                                            </div>

                                            <div className="flyer-info-divider" />

                                            <div className="flyer-info-call">
                                                <IconBrandWhatsapp className="flyer-info-bigicon" />
                                                <div className="flyer-info-text">
                                                    <span className="flyer-info-kicker">Si quieres adoptarme, escribe al:</span>
                                                    <strong className="flyer-info-phone">{telefono || '---------'}</strong>
                                                </div>
                                            </div>
                                        </div>

                                        {/* 4. Tarjetas */}
                                        {flyerCards.length > 0 && (
                                            <div className="flyer-cards flyer-cards-wrap">
                                                {flyerCards.map((card) => (
                                                    <div key={card.key} className="flyer-card">
                                                        <span>{card.value}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}

                                        {/* 5. Pie */}
                                        <div className="flyer-thanks-band">
                                            <p className="flyer-thanks-main">
                                                En busca <br />de un hogar <Image src="/images/logo-light.svg" alt="Huellas Perdidas" width={120} height={40} />
                                            </p>
                                            <p className="flyer-thanks-note">
                                                {descripcion || 'Si quieres adoptarme, por favor comunícate.'}
                                            </p>
                                            <p className="flyer-thanks-gracias">¡Gracias!</p>
                                        </div>
                                    </div>

                                    <p className="editor-canvas-caption">
                                        <IconCut /> Podrás imprimir este anuncio
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
                            <IconCircleCheckFilled /> Publicación enviada
                        </span>
                        <h3 id="overlay-title">Procesando publicación...</h3>
                        <p id="overlay-msg">
                            Tu aviso ingresará al catálogo público de adopciones de Huellas Perdidas.
                        </p>
                    </div>

                    <div className="overlay-redirect-row">
                        <IconLoader className="animate-spin" />
                        <span>Redirigiendo en unos segundos...</span>
                    </div>

                    <div
                        className="countdown-bar"
                        style={{ background: 'var(--purple-brand)' }}
                    ></div>
                </div>
            </div>
        </main>
    );
}
