'use client';

import { useState, useEffect, useRef, ChangeEvent } from 'react';
import dynamic from 'next/dynamic';
import '@/styles/avistamiento.css';
import { useApp } from '@/context/AppContext';
import { createReport, uploadReportImage, ReportsApiError } from '@/lib/reportsApi';
import { useRouter } from 'next/navigation';
import DraggablePhoto from '@/components/global/DraggablePhoto';
import { resizePetImage } from '@/lib/resizeImage';
import { showToast } from '@/components/global/Toast';
import { reverseGeocode } from '@/lib/geocoding';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import {
    IconBolt,
    IconBell,
    IconCamera,
    IconCameraPlus,
    IconUpload,
    IconX,
    IconBellRinging,
    IconReload,
    IconDog,
    IconCat,
    IconCanary,
    IconCurrentLocation,
    IconCircleCheck
} from '@tabler/icons-react';

const MapPicker = dynamic(() => import('@/components/global/MapPicker'), { ssr: false });

export default function AvistamientoPage() {

    useRequireAuth();

    const { currentUser, isDarkMode, isAuthChecked, isLoggedIn } = useApp();

    // ==========================================
    // ESTADOS DE IMÁGENES (PRINCIPAL Y THUMBS)
    // ==========================================
    const [mainImage, setMainImage] = useState<string | null>(null);
    const [mainImageOffset, setMainImageOffset] = useState(0);

    const [uploadedThumbs, setUploadedThumbs] = useState<(string | null)[]>([
        null,
        null,
        null,
        null,
    ]);
    const [thumbOffsets, setThumbOffsets] = useState<Record<number, number>>({});

    // ==========================================
    // ESTADOS DEL FORMULARIO Y GPS
    // ==========================================
    const [tipoAnimal, setTipoAnimal] = useState('');
    const [ubicacion, setUbicacion] = useState('');
    const [descripcion, setDescripcion] = useState('');

    const [isGpsActive, setIsGpsActive] = useState(false);
    const [gpsFeedback, setGpsFeedback] = useState('Sincronizando GPS...');
    const [lat, setLat] = useState('');
    const [lng, setLng] = useState('');

    const [showStatusOverlay, setShowStatusOverlay] = useState(false);
    const idempotencyKeyRef = useRef<string | null>(null);
    const router = useRouter();

    // Validación de campos obligatorios
    const [fieldErrors, setFieldErrors] = useState<Record<string, boolean>>({});

    // ==========================================
    // MANEJADORES DE IMÁGENES
    // ==========================================
    const handleMainFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            try {
                const compressedBase64 = await resizePetImage(file);
                setMainImage(compressedBase64);
                setMainImageOffset(0);
            } catch (err) {
                console.error('Error al procesar la imagen:', err);
                showToast('No se pudo cargar la foto. Intenta con otra imagen.', 'error');
            }
        }
        e.target.value = '';
    };

    const handleResetScanner = () => {
        setMainImage(null);
        setMainImageOffset(0);
    };

    const handleThumbFileChange = async (
        e: ChangeEvent<HTMLInputElement>,
        index: number
    ) => {
        const file = e.target.files?.[0];
        if (file) {
            try {
                const compressedBase64 = await resizePetImage(file);
                setUploadedThumbs((prev) => {
                    const next = [...prev];
                    next[index] = compressedBase64;
                    return next;
                });

                if (!mainImage && index === 0) {
                    setMainImage(compressedBase64);
                }
            } catch (err) {
                console.error('Error al procesar la imagen:', err);
                showToast('No se pudo cargar la foto. Intenta con otra imagen.', 'error');
            }
        }
    };

    const handleRemoveThumb = (index: number) => {
        setUploadedThumbs((prev) => {
            const next = [...prev];
            next[index] = null;
            return next;
        });
        setThumbOffsets((prev) => {
            const next = { ...prev };
            delete next[index];
            return next;
        });
    };

    // Al hacer click en una miniatura ya cargada, la promueve a foto principal
    const handlePromoteThumb = (index: number) => {
        const img = uploadedThumbs[index];
        if (!img) return;
        setMainImage(img);
        setMainImageOffset(thumbOffsets[index] || 0);
    };

    // ==========================================
    // MANEJADOR DE GEOLOCALIZACIÓN GPS
    // ==========================================
    const handleGpsToggle = (e: ChangeEvent<HTMLInputElement>) => {
        const checked = e.target.checked;
        setIsGpsActive(checked);

        if (checked) {
            setGpsFeedback('Sincronizando señal GPS...');

            if (!navigator.geolocation) {
                setGpsFeedback('Tu dispositivo no soporta geolocalización.');
                setIsGpsActive(false);
                return;
            }

            navigator.geolocation.getCurrentPosition(
                async (position) => {
                    const latitude = position.coords.latitude;
                    const longitude = position.coords.longitude;
                    const latStr = latitude.toFixed(6);
                    const lngStr = longitude.toFixed(6);

                    setLat(latStr);
                    setLng(lngStr);
                    setGpsFeedback('Buscando la dirección...');

                    const direccion = await reverseGeocode(latitude, longitude);
                    if (direccion) {
                        setGpsFeedback(`Ubicación capturada: ${direccion}`);
                        if (!ubicacion.trim()) {
                            setUbicacion(direccion);
                        }
                    } else {
                        setGpsFeedback(`Ubicación capturada: ${latStr}, ${lngStr}`);
                        if (!ubicacion.trim()) {
                            setUbicacion(`${latStr}, ${lngStr}`);
                        }
                    }
                },
                () => {
                    setIsGpsActive(false);
                    setGpsFeedback('Permiso de ubicación denegado.');
                    setLat('');
                    setLng('');
                },
                { enableHighAccuracy: true, timeout: 6000 }
            );
        } else {
            setLat('');
            setLng('');
        }
    };

    // ==========================================
    // VALIDACIÓN Y SANITIZACIÓN
    // ==========================================
    function sanitizeText(value: string): string {
        return value.replace(/<[^>]*>?/gm, '').trim();
    }

    function tipoAnimalToApi(valor: string): string {
        if (valor === 'Perro') return 'perro';
        if (valor === 'Gato') return 'gato';
        if (valor === 'Ave') return 'ave';
        return 'otro';
    }

    const hasAnyPhoto = mainImage !== null || uploadedThumbs.some((img) => img !== null);

    function validateForm(): boolean {
        const errors: Record<string, boolean> = {};

        if (!tipoAnimal) errors.tipoAnimal = true;
        if (!sanitizeText(ubicacion)) errors.ubicacion = true;
        if (!hasAnyPhoto) errors.fotos = true;

        setFieldErrors(errors);

        if (Object.keys(errors).length > 0) {
            if (errors.fotos) {
                showToast('Agrega al menos 1 foto del animal', 'error');
            } else {
                showToast('Completa todos los campos obligatorios', 'error');
            }
            return false;
        }

        return true;
    }

    // ==========================================
    // ENVÍO DE ALERTA
    // ==========================================
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSendAlert = async () => {
        if (!validateForm()) return;
        if (!currentUser) return;

        const parsedLat = lat ? parseFloat(lat) : null;
        const parsedLng = lng ? parseFloat(lng) : null;
        const allPhotos = [mainImage, ...uploadedThumbs].filter((img) => img !== null) as string[];

        if (!idempotencyKeyRef.current) {
            idempotencyKeyRef.current = crypto.randomUUID();
        }

        setIsSubmitting(true);
        try {
            const { report } = await createReport({
                report_type: 'sighting',
                pet_type: tipoAnimal ? tipoAnimalToApi(tipoAnimal) : null,
                title: null, // avistamiento no captura nombre de mascota
                description: sanitizeText(descripcion) || null,
                country: currentUser.country ?? null,
                region: null,
                province: null,
                district: null,
                address_hint: sanitizeText(ubicacion) || null,
                lat: parsedLat,
                lng: parsedLng,
                event_date: null,
                contact_name: currentUser.name || null,
                contact_phone: currentUser.phone || null,
                contact_email: currentUser.email || null,
                meta: {
                    sex: null,
                    is_neutered: false,
                    size: null,
                    breed: null,
                    color: null,
                    age: null,
                },
            }, idempotencyKeyRef.current);

            await Promise.allSettled(
                allPhotos.map((foto) =>
                    uploadReportImage(report.id, foto, false).catch((err) => {
                        console.error('No se pudo subir una foto', err);
                    })
                )
            );

            setShowStatusOverlay(true);
            setTimeout(() => {
                router.push('/mi-cuenta');
            }, 5000);
        } catch (err) {
            const message = err instanceof ReportsApiError ? err.message : 'No pudimos enviar tu alerta. Intenta de nuevo.';
            showToast(message, 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    const parsedLat = lat ? parseFloat(lat) : null;
    const parsedLng = lng ? parseFloat(lng) : null;
    const showMapArea = isGpsActive;

    return (
        <main className="main-content">
            <section id="view-publish-sighting" className="tab-view animate-fade-in">
                <div className="grid-publish-sighting">
                    {/* ==========================================
              COLUMNA IZQUIERDA
             ========================================== */}
                    <div className="left-sighting">
                        <h1>
                            Reportar <br /> avistamiento
                        </h1>
                        <div className="slogan-paragraph">
                            <div>
                                <div className="slogan-body">
                                    <p>
                                        Tu reporte puede ayudar a <b>reunir a una mascota con su familia</b> hoy mismo.
                                    </p>
                                </div>
                                <div className="slogan-divider"></div>
                                <div className="slogan-reach-row">
                                    <div className="slogan-reach-item">
                                        <IconBolt />
                                        <span>
                                            Reporte <b>instantáneo</b> — menos de 30 segundos.
                                        </span>
                                    </div>
                                    <div className="slogan-reach-item">
                                        <IconBell />
                                        <span>
                                            Notificamos a dueños en la <b>zona exacta</b> de inmediato.
                                        </span>
                                    </div>
                                    <div className="slogan-reach-item">
                                        <IconCamera />
                                        <span>
                                            La foto es lo más importante — <b>sube hasta 4 imágenes</b>.
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* ==========================================
              COLUMNA CENTRO (FOTO Y THUMBS)
             ========================================== */}
                    <div className="center-sighting">
                        <div
                            className={`sighting-dropzone-modern ${fieldErrors.fotos ? 'input-error' : ''}`}
                            id="sighting-dropzone"
                        >
                            <div className="sighting-corners">
                                <div className="corner-sighting tl"></div>
                                <div className="corner-sighting tr"></div>
                                <div className="corner-sighting bl"></div>
                                <div className="corner-sighting br"></div>
                            </div>

                            {/* INPUTS OCULTOS: SELECCIONAR VS CAPTURAR */}
                            <input
                                type="file"
                                id="sighting-file-input-select"
                                accept="image/*"
                                style={{ display: 'none' }}
                                onChange={handleMainFileChange}
                            />
                            <input
                                type="file"
                                id="sighting-file-input-capture"
                                accept="image/*"
                                capture="environment"
                                style={{ display: 'none' }}
                                onChange={handleMainFileChange}
                            />

                            {/* UI POR DEFECTO (SIN FOTO) */}
                            <label
                                htmlFor="sighting-file-input-select"
                                className="sighting-content-empty"
                                id="scanner-default-ui"
                                style={{ display: mainImage ? 'none' : 'block', cursor: 'pointer' }}
                            >
                                <div className="sighting-pulse-radar">
                                    <div className="sighting-pulse-wave"></div>
                                    <IconCameraPlus className="sighting-icon-photo" />
                                </div>
                                <h3 className="sighting-main-title">Sube una foto del animal</h3>
                                <p className="sighting-sub-title">Arrastra o selecciona una imagen</p>

                                <div className="sighting-upload-actions">
                                    <span className="sighting-upload-badge">
                                        <IconUpload /> Seleccionar
                                    </span>
                                    <label
                                        htmlFor="sighting-file-input-capture"
                                        className="sighting-upload-badge sighting-capture-btn"
                                        onClick={(e) => e.stopPropagation()}
                                    >
                                        <IconCamera /> Capturar
                                    </label>
                                </div>
                            </label>

                            {/* UI PREVISUALIZACIÓN ESCÁNER (CON FOTO) */}
                            <div
                                className="sighting-preview-container"
                                id="scanner-preview-ui"
                                style={{ display: mainImage ? 'flex' : 'none' }}
                            >
                                {mainImage && (
                                    <DraggablePhoto
                                        src={mainImage}
                                        offsetY={mainImageOffset}
                                        onOffsetChange={setMainImageOffset}
                                    />
                                )}
                                <div className="sighting-laser-line"></div>
                                <button
                                    type="button"
                                    className="btn-clear-photo-fast"
                                    id="btn-reset-scanner"
                                    onClick={handleResetScanner}
                                >
                                    <IconX /> Cambiar
                                </button>
                            </div>
                        </div>

                        {/* GRILLA DE 4 MINIATURAS */}
                        <div className="sighting-thumbs-grid">
                            {[0, 1, 2, 3].map((idx) => (
                                <div
                                    key={idx}
                                    className="sighting-thumb"
                                    id={`s-box-${idx}`}
                                    onClick={() => handlePromoteThumb(idx)}
                                    style={{ cursor: uploadedThumbs[idx] ? 'pointer' : 'default' }}
                                >
                                    {!uploadedThumbs[idx] && (
                                        <>
                                            <IconCameraPlus className="icon" />
                                            <input
                                                type="file"
                                                className="sighting-thumb-input"
                                                data-index={idx}
                                                accept="image/*"
                                                onChange={(e) => handleThumbFileChange(e, idx)}
                                            />
                                        </>
                                    )}
                                    {uploadedThumbs[idx] && (
                                        <>
                                            <DraggablePhoto
                                                src={uploadedThumbs[idx] as string}
                                                offsetY={thumbOffsets[idx] || 0}
                                                onOffsetChange={(newOffset) => {
                                                    setThumbOffsets((prev) => ({ ...prev, [idx]: newOffset }));
                                                }}
                                            />
                                            <button
                                                type="button"
                                                className="btn-remove-photo"
                                                data-index={idx}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleRemoveThumb(idx);
                                                }}
                                            >
                                                <IconX />
                                            </button>
                                        </>
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

                    {/* ==========================================
              COLUMNA DERECHA (FORMULARIO)
             ========================================== */}
                    <div className="right-sighting">
                        <form
                            id="fast-sighting-form"
                            autoComplete="off"
                            className="sighting-form-card"
                            onSubmit={(e) => e.preventDefault()}
                        >
                            {/* PILLS TIPO DE ANIMAL */}
                            <div className="form-group">
                                <label className="form-label">Tipo de animal</label>
                                <div className={`pill-multi-group ${fieldErrors.tipoAnimal ? 'input-error' : ''}`}>
                                    <button
                                        type="button"
                                        className={`pill-sighting-btn sighting-type-btn ${tipoAnimal === 'Perro' ? 'active' : ''
                                            }`}
                                        data-value="Perro"
                                        onClick={() => setTipoAnimal('Perro')}
                                    >
                                        <IconDog /> Perro
                                    </button>
                                    <button
                                        type="button"
                                        className={`pill-sighting-btn sighting-type-btn ${tipoAnimal === 'Gato' ? 'active' : ''
                                            }`}
                                        data-value="Gato"
                                        onClick={() => setTipoAnimal('Gato')}
                                    >
                                        <IconCat /> Gato
                                    </button>
                                    <button
                                        type="button"
                                        className={`pill-sighting-btn sighting-type-btn ${tipoAnimal === 'Ave' ? 'active' : ''
                                            }`}
                                        data-value="Ave"
                                        onClick={() => setTipoAnimal('Ave')}
                                    >
                                        <IconCanary /> Ave
                                    </button>
                                    <input type="hidden" id="s-tipo" value={tipoAnimal} />
                                </div>
                            </div>

                            {/* UBICACIÓN + GPS TOGGLE */}
                            <div className="form-group">
                                <label className="form-label">Ubicación</label>
                                <div className="sighting-location-row">
                                    <input
                                        type="text"
                                        id="s-ubicacion"
                                        className={`form-input ${fieldErrors.ubicacion ? 'input-error' : ''}`}
                                        placeholder="Ej: Av. Larco cruce con Schell..."
                                        value={ubicacion}
                                        onChange={(e) => setUbicacion(e.target.value)}
                                        disabled={isGpsActive}
                                    />
                                    <label
                                        className="toggle-switch sighting-gps-toggle"
                                        title="Compartir ubicación GPS"
                                    >
                                        <input
                                            type="checkbox"
                                            id="s-gps-toggle"
                                            className="toggle-switch-checkbox"
                                            checked={isGpsActive}
                                            onChange={handleGpsToggle}
                                        />
                                        <span className="toggle-switch-slider"></span>
                                    </label>
                                    <span
                                        className={`sighting-gps-icon ${isGpsActive ? 'gps-active' : ''
                                            }`}
                                        id="sighting-gps-icon"
                                    >
                                        <IconCurrentLocation />
                                    </span>
                                </div>
                            </div>

                            {/* MAPA Y FEEDBACK GPS */}
                            <div
                                className="sighting-map-section"
                                id="sighting-map-box"
                                style={{ display: showMapArea ? 'block' : 'none' }}
                            >
                                <div className="map-placeholder-avistamiento-container" id="map-interactive-area">
                                    {parsedLat !== null && parsedLng !== null ? (
                                        <MapPicker
                                            lat={parsedLat}
                                            lng={parsedLng}
                                            radioKm={0}
                                            zoom={16}
                                            isDraggable={true}
                                            isDarkMode={isDarkMode}
                                            onPositionChange={async (newLat, newLng) => {
                                                const latStr = newLat.toFixed(6);
                                                const lngStr = newLng.toFixed(6);
                                                setLat(latStr);
                                                setLng(lngStr);
                                                setGpsFeedback('Buscando la dirección...');

                                                const direccion = await reverseGeocode(newLat, newLng);
                                                if (direccion) {
                                                    setUbicacion(direccion);
                                                    setGpsFeedback(`Ubicación ajustada: ${direccion}`);
                                                } else {
                                                    setUbicacion(`${latStr}, ${lngStr}`);
                                                    setGpsFeedback(`Ubicación ajustada: ${latStr}, ${lngStr}`);
                                                }
                                            }}
                                        />
                                    ) : (
                                        <div id="sighting-map-preview">
                                            <p id="gps-feedback">{gpsFeedback}</p>
                                        </div>
                                    )}
                                </div>
                                <input type="hidden" id="s-lat" name="latitude" value={lat} />
                                <input type="hidden" id="s-lng" name="longitude" value={lng} />
                            </div>

                            {/* DESCRIPCIÓN */}
                            <div className="form-group">
                                <label className="form-label">Descripción rápida (opcional)</label>
                                <textarea
                                    id="s-descripcion"
                                    rows={3}
                                    className="form-textarea"
                                    placeholder="Ej: Tiene collar azul, va cojeando hacia el sur, parece asustado..."
                                    value={descripcion}
                                    onChange={(e) => setDescripcion(e.target.value)}
                                ></textarea>
                            </div>

                            {/* ENVIAR */}
                            <button
                                type="button"
                                id="btn-send-alert"
                                className="btn-publish-avistamiento"
                                disabled={isSubmitting}
                                onClick={handleSendAlert}
                            >
                                {isSubmitting ? 'Enviando...' : (
                                    <>
                                        Enviar alerta <IconBellRinging />
                                    </>
                                )}
                            </button>
                        </form>
                    </div>
                </div>
            </section>

            {/* OVERLAY STATUS FINAL */}
            <div
                id="status-overlay"
                className={`sighting-status-overlay ${showStatusOverlay ? '' : 'style-hidden'}`}
            >
                <div className="sighting-status-overlay-backdrop"></div>
                <div className="sighting-status-overlay-card">
                    <div className="sighting-overlay-content">
                        <span className="sighting-overlay-eyebrow">
                            <IconCircleCheck /> Alerta enviada
                        </span>
                        <h3 id="overlay-title">¡Avistamiento recibido!</h3>
                        <p id="overlay-msg">
                            Revisaremos tu reporte y, una vez aprobado, será publicado.
                        </p>
                    </div>
                    <div className="sighting-overlay-redirect-row">
                        <IconReload className="animate-spin" />
                        <span>Redirigiendo en unos segundos...</span>
                    </div>
                    <div className="sighting-countdown-bar"></div>
                </div>
            </div>
        </main>
    );
}
