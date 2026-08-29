'use client';

import { useState, useEffect, ChangeEvent } from 'react';
import dynamic from 'next/dynamic';
import '@/styles/avistamiento.css';
import { useApp } from '@/context/AppContext';
import { createPublication } from '@/lib/publications';
import DraggablePhoto from '@/components/global/DraggablePhoto';
import { showToast } from '@/components/global/Toast';
import { reverseGeocode } from '@/lib/geocoding';
import { useRequireAuth } from '@/hooks/useRequireAuth';

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

    // Validación de campos obligatorios
    const [fieldErrors, setFieldErrors] = useState<Record<string, boolean>>({});

    // ==========================================
    // MANEJADORES DE IMÁGENES
    // ==========================================
    const handleMainFileChange = (e: ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                setMainImage(event.target?.result as string);
                setMainImageOffset(0);
            };
            reader.readAsDataURL(file);
        }
        e.target.value = ''; // permite volver a seleccionar el mismo archivo si hace falta
    };

    const handleResetScanner = () => {
        setMainImage(null);
        setMainImageOffset(0);
    };

    const handleThumbFileChange = (
        e: ChangeEvent<HTMLInputElement>,
        index: number
    ) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                const result = event.target?.result as string;
                setUploadedThumbs((prev) => {
                    const next = [...prev];
                    next[index] = result;
                    return next;
                });

                if (!mainImage && index === 0) {
                    setMainImage(result);
                }
            };
            reader.readAsDataURL(file);
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
    const handleSendAlert = async () => {
        if (!validateForm()) return;

        if (currentUser) {
            const parsedLat = lat ? parseFloat(lat) : null;
            const parsedLng = lng ? parseFloat(lng) : null;
            const allPhotos = [mainImage, ...uploadedThumbs].filter((img) => img !== null) as string[];

            await createPublication({
                user_id: currentUser.id,
                report_type: 'sighting',
                pet_type: tipoAnimal || null,
                title: null, // avistamiento no captura nombre de mascota
                description: sanitizeText(descripcion) || null,
                country: currentUser.country || 'PE',
                region: null,
                province: null,
                district: null,
                address_hint: sanitizeText(ubicacion) || null,
                event_date: null,
                contact_name: currentUser.name || null,
                contact_phone: currentUser.phone || null,
                contact_email: currentUser.email || null,
                sex: null,
                is_neutered: false,
                size: null,
                breed: null,
                color: null,
                reward: null,
                reward_visible: false,
                age: null,
                adoption_extras: null,
                adoption_extras_visible: false,
                reach_facebook: false,
                reach_instagram: false,
                images: allPhotos,
                plan: 'gratis', // avistamiento siempre es gratuito, no tiene selector de plan
                lat: parsedLat,
                lng: parsedLng,
                flyer_image: null, // avistamiento no genera flyer
            });
        }

        setShowStatusOverlay(true);
        setTimeout(() => {
            window.location.href = 'https://www.huellasperdidas.com/informacion/alertas-de-estafa';
        }, 5000);
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
                                        <i className="ti ti-bolt"></i>
                                        <span>
                                            Reporte <b>instantáneo</b> — menos de 30 segundos.
                                        </span>
                                    </div>
                                    <div className="slogan-reach-item">
                                        <i className="ti ti-bell"></i>
                                        <span>
                                            Notificamos a dueños en la <b>zona exacta</b> de inmediato.
                                        </span>
                                    </div>
                                    <div className="slogan-reach-item">
                                        <i className="ti ti-camera"></i>
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
                                    <i className="ti ti-camera-plus sighting-icon-photo"></i>
                                </div>
                                <h3 className="sighting-main-title">Sube una foto del animal</h3>
                                <p className="sighting-sub-title">Arrastra o selecciona una imagen</p>

                                <div className="sighting-upload-actions">
                                    <span className="sighting-upload-badge">
                                        <i className="ti ti-upload"></i> Seleccionar
                                    </span>
                                    <label
                                        htmlFor="sighting-file-input-capture"
                                        className="sighting-upload-badge sighting-capture-btn"
                                        onClick={(e) => e.stopPropagation()}
                                    >
                                        <i className="ti ti-camera"></i> Capturar
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
                                    <i className="ti ti-x"></i> Cambiar
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
                                            <i className="ti ti-camera-plus icon"></i>
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
                                                <i className="ti ti-x"></i>
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
                                        className={`pill-multi-btn sighting-type-btn ${tipoAnimal === 'Perro' ? 'active' : ''
                                            }`}
                                        data-value="Perro"
                                        onClick={() => setTipoAnimal('Perro')}
                                    >
                                        <i className="fa-solid fa-dog"></i> Perro
                                    </button>
                                    <button
                                        type="button"
                                        className={`pill-multi-btn sighting-type-btn ${tipoAnimal === 'Gato' ? 'active' : ''
                                            }`}
                                        data-value="Gato"
                                        onClick={() => setTipoAnimal('Gato')}
                                    >
                                        <i className="fa-solid fa-cat"></i> Gato
                                    </button>
                                    <button
                                        type="button"
                                        className={`pill-multi-btn sighting-type-btn ${tipoAnimal === 'Ave' ? 'active' : ''
                                            }`}
                                        data-value="Ave"
                                        onClick={() => setTipoAnimal('Ave')}
                                    >
                                        <i className="fa-solid fa-dove"></i> Ave
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
                                        <i className="fa-solid fa-location-crosshairs"></i>
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
                                onClick={handleSendAlert}
                            >
                                Enviar alerta <i className="ti ti-bell-ringing"></i>
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
                            <i className="fa-solid fa-circle-check"></i> Alerta enviada
                        </span>
                        <h3 id="overlay-title">¡Avistamiento recibido!</h3>
                        <p id="overlay-msg">
                            Revisaremos tu reporte y, una vez aprobado, será publicado.
                        </p>
                    </div>
                    <div className="sighting-overlay-redirect-row">
                        <i className="fa-solid fa-circle-notch fa-spin"></i>
                        <span>Redirigiendo en unos segundos...</span>
                    </div>
                    <div className="sighting-countdown-bar"></div>
                </div>
            </div>
        </main>
    );
}
