'use client';
import { useState, useEffect, useRef, ChangeEvent } from 'react';
import Image from 'next/image';
import CustomSelect from '@/components/ui/CustomSelect';
import { showToast } from '@/components/global/Toast';
import { useApp } from '@/context/AppContext';
import { getCountryByAbbr } from '@/lib/countries';
import { normalizePhoneInput, isValidPhone } from '@/lib/phoneUtils';
import { fetchReport, type ReportDetail } from '@/lib/api';
import { updateReport, uploadReportImage, deleteReportImage, ReportsApiError } from '@/lib/reportsApi';
import { validateText } from '@/lib/textValidation';
import AutocompleteInput from '@/components/ui/AutocompleteInput';
import { RAZAS_PERRO, RAZAS_GATO, ESPECIES_AVE, COLORES_PELAJE, COLORES_PLUMAJE } from '@/lib/petSuggestions';
import DraggablePhoto from '@/components/global/DraggablePhoto';
import { generateFlyerImage } from '@/lib/flyerExport';
import { resizePetImage } from '@/lib/resizeImage';
import {
    IconX,
    IconInfoCircle,
    IconCameraPlus,
    IconCalendarX,
    IconGenderMale,
    IconGenderFemale,
    IconBrandWhatsapp,
    IconCheck,
    IconMapPin,
    IconCircleDashedCheck,
    IconPaw,
    IconCalendarPin,
    IconHeartPin,
    IconHeart
} from '@tabler/icons-react';
interface ModalEditarAvisoProps {
    isOpen: boolean;
    id: string;
    tipo: 'lost' | 'adoption' | 'found';
    isUnlocked: boolean;
    onClose: () => void;
    onToggleUnlock: (unlocked: boolean) => void;
    onSaved: () => void;
}

const editarModalConfig = {
    lost: {
        fechaPlaceholder: 'Fecha de la pérdida',
        observacionesLabel: 'Observaciones',
        observacionesPlaceholder: 'Ej: Lleva collar azul, tiene una mancha negra en el ojo izquierdo...',
        castradoLabel: '¿Está castrado?',
    },
    adoption: {
        fechaPlaceholder: 'Fecha',
        observacionesLabel: 'Descripción',
        observacionesPlaceholder: 'Ej: Es muy cariñoso, le encanta jugar, fue rescatado de la calle...',
        castradoLabel: '¿Está castrado?',
    },
    found: {
        fechaPlaceholder: 'Fecha en que lo encontraste',
        observacionesLabel: 'Descripción',
        observacionesPlaceholder: "Ej: Tiene una placa con el nombre 'Toby', se ve sano, lleva collar rojo...",
        castradoLabel: '¿Se nota castrado?',
    },
};

// Textos fijos del flyer por tipo de aviso — mismos diseños que los
// formularios de publicar (page_perdidos.tsx, page_sdoptar.tsx, page_encontraod.tsx).
const flyerConfig = {
    lost: {
        stateClass: 'state-perdida',
        titulo: '¡BUSCAMOS!',
        showNombre: true,
        smallTitle: false,
        whereKicker: 'Se perdió en:',
        callKicker: 'Llama o escribe al:',
        footerLine1: 'Ayúdame a',
        footerLine2: 'volver a casa',
        noteDefault: 'Cualquier información, por favor comunícate.',
    },
    adoption: {
        stateClass: 'state-adoptar',
        titulo: '¡ADÓPTAME!',
        showNombre: true,
        smallTitle: false,
        whereKicker: 'Entrega en:',
        callKicker: 'Si quieres adoptarme, escribe al:',
        footerLine1: 'En busca',
        footerLine2: 'de un hogar',
        noteDefault: 'Si quieres adoptarme, por favor comunícate.',
    },
    found: {
        stateClass: 'state-encontrado',
        titulo: '¿LO RECONOCES?',
        showNombre: false,
        smallTitle: true,
        whereKicker: 'Se encontró en:',
        callKicker: 'Si es tu mascota, llama o escribe al:',
        footerLine1: 'Busco a mi',
        footerLine2: 'familia',
        noteDefault: 'Si es tu mascota, por favor comunícate.',
    },
};

// html2canvas puede capturar antes de que las fotos remotas (URLs existentes)
// terminen de cargar en el <img>, dejando huecos en blanco en el flyer.
// Esto espera a que todas las imágenes del contenedor carguen (o fallen) antes de capturar.
function waitForImagesToLoad(containerId: string): Promise<void> {
    const container = document.getElementById(containerId);
    if (!container) return Promise.resolve();
    const pending = Array.from(container.querySelectorAll('img')).filter((img) => !img.complete);
    if (pending.length === 0) return Promise.resolve();
    return Promise.all(
        pending.map(
            (img) =>
                new Promise<void>((resolve) => {
                    img.onload = () => resolve();
                    img.onerror = () => resolve();
                })
        )
    ).then(() => undefined);
}

const mesesCompletos: Record<string, string> = {
    '01': 'Enero', '02': 'Febrero', '03': 'Marzo', '04': 'Abril',
    '05': 'Mayo', '06': 'Junio', '07': 'Julio', '08': 'Agosto',
    '09': 'Septiembre', '10': 'Octubre', '11': 'Noviembre', '12': 'Diciembre',
};

function parseEventDate(eventDate: string | null): { dia: string; mes: string; anio: string } {
    if (!eventDate) return { dia: '', mes: '', anio: '' };
    const [anio, mes, dia] = eventDate.split('T')[0].split('-');
    return { dia: dia ?? '', mes: mes ?? '', anio: anio ?? '' };
}

// Traducción código real (API) → etiqueta en español (UI)
function sexFromApi(sex: string | null): '' | 'Macho' | 'Hembra' {
    if (sex === 'macho') return 'Macho';
    if (sex === 'hembra') return 'Hembra';
    return '';
}
function petTypeFromApi(petType: string | null): string {
    if (petType === 'perro') return 'Perro';
    if (petType === 'gato') return 'Gato';
    if (petType === 'ave') return 'Ave';
    return '';
}
function sizeFromApi(size: string | null): string {
    if (size === 'pequeño') return 'Pequeño';
    if (size === 'mediano') return 'Mediano';
    if (size === 'grande') return 'Grande';
    return '';
}

// Traducción etiqueta en español (UI) → código real (API)
// Traducción etiqueta en español (UI) → código real (API)
function sexToApi(sex: string): string | null {
    if (sex === 'Macho') return 'macho';
    if (sex === 'Hembra') return 'hembra';
    return null;
}
function petTypeToApi(petType: string): string {
    if (petType === 'Perro') return 'perro';
    if (petType === 'Gato') return 'gato';
    if (petType === 'Ave') return 'ave';
    return 'other';
}
function sizeToApi(size: string): string | null {
    if (size === 'Pequeño') return 'pequeño';
    if (size === 'Mediano') return 'mediano';
    if (size === 'Grande') return 'grande';
    return null;
}

type PhotoSlot = { type: 'existing'; id: string; url: string } | { type: 'new'; dataUrl: string } | null;

export default function ModalEditarAviso({
    isOpen,
    id,
    tipo,
    isUnlocked,
    onClose,
    onToggleUnlock,
    onSaved,
}: ModalEditarAvisoProps) {
    const { currentUser } = useApp();
    const country = currentUser?.country ?? null;
    const [currencySymbol, setCurrencySymbol] = useState('');
    const [dialCode, setDialCode] = useState('');

    useEffect(() => {
        let isCancelled = false;
        getCountryByAbbr(country).then((c) => {
            if (!isCancelled) {
                setCurrencySymbol(c?.currencySymbol ?? '');
                setDialCode(c?.dialCode ?? '');
            }
        });
        return () => {
            isCancelled = true;
        };
    }, [country]);

    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [rejectionReason, setRejectionReason] = useState<string | null>(null);

    // Ubicación — solo lectura, nunca editable (confirmado con backend)
    const [readOnlyDistrict, setReadOnlyDistrict] = useState('');
    const [readOnlyProvince, setReadOnlyProvince] = useState('');
    const [readOnlyRegion, setReadOnlyRegion] = useState('');
    const [readOnlyAddressHint, setReadOnlyAddressHint] = useState('');

    const [editFotos, setEditFotos] = useState<PhotoSlot[]>([null, null, null, null]);
    const [removedImageIds, setRemovedImageIds] = useState<string[]>([]);

    const [editNombre, setEditNombre] = useState('');
    const [editFechaDia, setEditFechaDia] = useState('');
    const [editFechaMes, setEditFechaMes] = useState('');
    const [editFechaAnio, setEditFechaAnio] = useState('');
    const [editDatePopoverOpen, setEditDatePopoverOpen] = useState(false);
    const [editSexo, setEditSexo] = useState<'' | 'Macho' | 'Hembra'>('');
    const [editCastrado, setEditCastrado] = useState(false);
    const [editTipoMascota, setEditTipoMascota] = useState('');
    const [editTamano, setEditTamano] = useState('');
    const [editRaza, setEditRaza] = useState('');
    const [editColor, setEditColor] = useState('');
    const [editObservaciones, setEditObservaciones] = useState('');
    const [editRecompensa, setEditRecompensa] = useState('');
    const [editOcultarMonto, setEditOcultarMonto] = useState(false);
    const [editExtras, setEditExtras] = useState('');
    const [editOcultarExtras, setEditOcultarExtras] = useState(false);
    const [editEdad, setEditEdad] = useState('');
    const [editTelefono, setEditTelefono] = useState('');
    const [fieldErrors, setFieldErrors] = useState<Record<string, boolean>>({});
    const [originalFlyerImageId, setOriginalFlyerImageId] = useState<string | null>(null);

    const dateGroupRef = useRef<HTMLDivElement>(null);

    // Carga los datos reales del aviso al abrir
    useEffect(() => {
        if (!isOpen || !id) return;

        setIsLoading(true);
        setRemovedImageIds([]);
        fetchReport(id)
            .then((pub: ReportDetail) => {
                const { dia, mes, anio } = parseEventDate(pub.event_date);
                const normalPhotos = pub.images.filter((img) => !img.is_flyer);
                setOriginalFlyerImageId(pub.images.find((img) => img.is_flyer)?.id ?? null);

                const slots: PhotoSlot[] = [0, 1, 2, 3].map((i) => {
                    const img = normalPhotos[i];
                    return img ? { type: 'existing', id: img.id, url: img.image_url } : null;
                });

                setEditFotos(slots);
                setEditNombre(tipo !== 'found' ? pub.title || '' : '');
                setEditFechaDia(dia);
                setEditFechaMes(mes);
                setEditFechaAnio(anio);
                setEditDatePopoverOpen(false);
                setEditSexo(sexFromApi(pub.meta.sex));
                setEditCastrado(!!pub.meta.is_neutered);
                setEditTipoMascota(petTypeFromApi(pub.pet_type));
                setEditTamano(sizeFromApi(pub.meta.size));
                setEditRaza(pub.meta.breed || '');
                setEditColor(pub.meta.color || '');
                setEditObservaciones(pub.description || '');
                setEditRecompensa(pub.meta.reward || '');
                setEditOcultarMonto(!pub.meta.reward_visible);
                setEditExtras(pub.meta.adoption_extras || '');
                setEditOcultarExtras(!pub.meta.adoption_extras_visible);
                setEditEdad(pub.meta.age || '');
                setEditTelefono(pub.contact_phone?.replace(/^\+\d+\s*/, '') || '');
                setRejectionReason(pub.rejection_reason);

                setReadOnlyDistrict(pub.district || '');
                setReadOnlyProvince(pub.province || '');
                setReadOnlyRegion(pub.region || '');
                setReadOnlyAddressHint(pub.address_hint || '');

                setIsLoading(false);
            })
            .catch(() => {
                showToast('No se encontró el aviso a editar.', 'error');
                onClose();
            });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen, id]);

    // Click-outside para el popover de fecha
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            const target = e.target as Node;
            if (dateGroupRef.current && !dateGroupRef.current.contains(target)) {
                setEditDatePopoverOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Auto-cierre al completar fecha
    useEffect(() => {
        if (editFechaDia && editFechaMes && editFechaAnio) {
            setEditDatePopoverOpen(false);
        }
    }, [editFechaDia, editFechaMes, editFechaAnio]);

    const editFechaDisplay =
        editFechaDia && editFechaMes && editFechaAnio
            ? `${editFechaDia} ${mesesCompletos[editFechaMes]} ${editFechaAnio}`
            : '';

    const handleEditFotoChange = async (idx: number, e: ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        try {
            const compressedBase64 = await resizePetImage(file);
            setEditFotos((prev) => {
                const next = [...prev];
                next[idx] = { type: 'new', dataUrl: compressedBase64 };
                return next;
            });
        } catch (err) {
            console.error('Error al procesar la imagen:', err);
            showToast('No se pudo cargar la foto. Intenta con otra imagen.', 'error');
        }
    };

    const handleRemoveEditFoto = (idx: number) => {
        setEditFotos((prev) => {
            const slot = prev[idx];
            if (slot?.type === 'existing') {
                setRemovedImageIds((ids) => [...ids, slot.id]);
            }
            const next = [...prev];
            next[idx] = null;
            return next;
        });
    };

    const handleGuardar = async () => {
        const errors: Record<string, boolean> = {};
        let specificError = '';

        if (tipo !== 'found') {
            if (!editNombre.trim()) {
                errors.nombre = true;
            } else {
                const check = validateText(editNombre, 3, 'El nombre');
                if (!check.valid) {
                    errors.nombre = true;
                    specificError = specificError || check.error!;
                }
            }
        }

        // Fecha solo existe como campo en lost/found — adoption no la captura.
        if (tipo !== 'adoption' && (!editFechaDia || !editFechaMes || !editFechaAnio)) {
            errors.fecha = true;
        }

        if (!editSexo) errors.sexo = true;
        if (!editTipoMascota) errors.tipoMascota = true;
        if (!editTamano) errors.tamano = true;

        if (!editRaza.trim()) {
            errors.raza = true;
        } else {
            const check = validateText(editRaza, 3, 'La raza');
            if (!check.valid) {
                errors.raza = true;
                specificError = specificError || check.error!;
            }
        }

        if (!editColor.trim()) {
            errors.color = true;
        } else {
            const check = validateText(editColor, 3, 'El color');
            if (!check.valid) {
                errors.color = true;
                specificError = specificError || check.error!;
            }
        }

        const validEditPhotos = editFotos.filter(Boolean);
        if (validEditPhotos.length === 0) errors.fotos = true;

        // Observaciones/descripción es opcional — solo se valida si el usuario escribió algo
        if (editObservaciones.trim()) {
            const check = validateText(editObservaciones, 10, tipo === 'lost' ? 'Las observaciones' : 'La descripción');
            if (!check.valid) {
                errors.observaciones = true;
                specificError = specificError || check.error!;
            }
        }

        if (tipo === 'adoption') {
            if (editExtras.trim()) {
                const check = validateText(editExtras, 3, 'Lo que incluye');
                if (!check.valid) {
                    errors.extras = true;
                    specificError = specificError || check.error!;
                }
            }
            if (editOcultarExtras && !editExtras.trim()) {
                errors.extras = true;
                specificError = specificError || 'Ingresa qué incluye la adopción antes de ocultarlo';
            }
        }

        if (tipo === 'lost' && editOcultarMonto && !(Number(editRecompensa) > 0)) {
            errors.recompensa = true;
            specificError = specificError || 'Ingresa el monto de la recompensa antes de ocultarlo';
        }

        if (!isValidPhone(editTelefono, country)) {
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
            return;
        }

        setIsSaving(true);
        const eventDate =
            editFechaDia && editFechaMes && editFechaAnio
                ? `${editFechaAnio}-${String(editFechaMes).padStart(2, '0')}-${String(editFechaDia).padStart(2, '0')}`
                : null;

        try {
            // Ubicación NUNCA se manda — es inmutable, confirmado con backend.
            await updateReport(id, {
                title: tipo !== 'found' ? editNombre || null : null,
                event_date: eventDate,
                pet_type: petTypeToApi(editTipoMascota),
                description: editObservaciones || null,
                contact_phone: `${dialCode} ${normalizePhoneInput(editTelefono, country)}`.trim() || null,
                meta: {
                    sex: sexToApi(editSexo),
                    is_neutered: editCastrado,
                    size: sizeToApi(editTamano),
                    breed: editRaza || null,
                    color: editColor || null,
                    reward: tipo === 'lost' ? editRecompensa || null : null,
                    reward_visible: !editOcultarMonto,
                    adoption_extras: tipo === 'adoption' ? editExtras || null : null,
                    adoption_extras_visible: !editOcultarExtras,
                    age: tipo !== 'found' ? editEdad || null : null,
                },
            });


            await Promise.allSettled(
                removedImageIds.map((imgId) =>
                    deleteReportImage(id, imgId).catch((err) => {
                        console.warn('No se pudo borrar una foto:', err instanceof Error ? err.message : err);
                    })
                )
            );

            await Promise.allSettled(
                editFotos
                    .filter((slot) => slot?.type === 'new')
                    .map((slot) =>
                        uploadReportImage(id, slot!.dataUrl, false).catch((err) => {
                            console.warn('No se pudo subir una foto nueva:', err instanceof Error ? err.message : err);
                        })
                    )
            );

            // El flyer se regenera siempre que se guarda una edición, para que
            // nunca quede desincronizado con los datos/fotos ya actualizados.
            try {
                await waitForImagesToLoad('edit-flyer-preview');
                const flyerImage = await generateFlyerImage('edit-flyer-preview');
                if (flyerImage) {
                    await uploadReportImage(id, flyerImage, true);
                    if (originalFlyerImageId) {
                        try {
                            await deleteReportImage(id, originalFlyerImageId);
                        } catch (err) {
                            console.warn('No se pudo borrar el flyer anterior:', err instanceof Error ? err.message : err);
                        }
                    }
                }
            } catch (err) {
                console.warn('No se pudo regenerar el flyer:', err instanceof Error ? err.message : err);
            }

            onClose();
            onSaved();
            showToast('Tu edición fue enviada a revisión.', 'info');
        } catch (err) {
            const message = err instanceof ReportsApiError ? err.message : 'No pudimos guardar los cambios. Intenta de nuevo.';
            showToast(message, 'error');
        } finally {
            setIsSaving(false);
        }
    };

    if (!isOpen) return null;

    const fechaCorta =
        editFechaDia && editFechaMes
            ? `${Number(editFechaDia)} de ${(mesesCompletos[editFechaMes.padStart(2, '0')] ?? '').toLowerCase()}`.trim()
            : '';

    const castradoCard = editCastrado ? (editSexo === 'Hembra' ? 'Esterilizada' : 'Esterilizado') : '';
    const flyerCards = (
        tipo === 'adoption'
            ? [
                { key: 'raza', value: editRaza },
                { key: 'sexo', value: editSexo },
                { key: 'edad', value: editEdad },
                { key: 'color', value: editColor },
                { key: 'tamano', value: editTamano },
                { key: 'castrado', value: castradoCard },
            ]
            : [
                { key: 'raza', value: editRaza },
                { key: 'sexo', value: editSexo },
                { key: 'color', value: editColor },
                { key: 'castrado', value: castradoCard },
            ]
    ).filter((card) => card.value);


    const c = editarModalConfig[tipo];
    const fc = flyerConfig[tipo];
    const ubicacionCompleta = [readOnlyDistrict, readOnlyProvince, readOnlyRegion].filter(Boolean).join(', ');
    const flyerPhotoSrcs = editFotos
        .map((slot) => (slot?.type === 'existing' ? slot.url : slot?.type === 'new' ? slot.dataUrl : null))
        .filter((src): src is string => !!src);

    return (
        <div className="app-modal open" id="modal-editar-aviso">
            <div className="app-modal-backdrop" onClick={onClose}></div>
            <div className="app-modal-card wide" id="editar-modal-card">
                <div className="app-modal-header">
                    <h3 id="editar-modal-title">Editar aviso</h3>
                    <button type="button" className="app-modal-close" onClick={onClose}>
                        <IconX />
                    </button>
                </div>
                <div className="app-modal-body form-account">
                    {isLoading ? (
                        <p style={{ padding: '24px 0', opacity: 0.6 }}>Cargando datos del aviso...</p>
                    ) : (
                        <>
                            <div className="admin-info-box info-box-revision">
                                <IconInfoCircle />
                                <p>
                                    {rejectionReason ? (
                                        <>
                                            Tu aviso fue <b>rechazado</b>: {rejectionReason}. Corrige y vuelve a enviarlo.
                                        </>
                                    ) : (
                                        <>
                                            Los cambios que hagas serán <b>revisados por nuestro equipo</b> antes de publicarse.
                                        </>
                                    )}
                                </p>
                            </div>

                            {/*ubicacionCompleta && (
                                <div className="admin-info-box">
                                    <IconMapPin />
                                    <p>
                                        <b>Ubicación:</b> {ubicacionCompleta}
                                        {readOnlyAddressHint && <> — {readOnlyAddressHint}</>}. La ubicación no se puede editar después de publicado.
                                    </p>
                                </div>
                            )*/}

                            <div className="edit-toggle-wrap">
                                <span className="edit-toggle-label">Editar campos</span>
                                <label className="toggle-switch">
                                    <input
                                        type="checkbox"
                                        id="edit-enable-toggle"
                                        className="toggle-switch-checkbox"
                                        checked={isUnlocked}
                                        onChange={(e) => onToggleUnlock(e.target.checked)}
                                    />
                                    <span className="toggle-switch-slider"></span>
                                </label>
                            </div>

                            <div
                                id="edit-fields-wrapper"
                                className={isUnlocked ? 'edit-fields-unlocked' : 'edit-fields-locked'}
                            >
                                {/* FOTOS */}
                                <div className="groups form-group">
                                    <label>Fotos de la mascota (Máx. 4)</label>
                                    <div className={`photo-upload-grid ${fieldErrors.fotos ? 'input-error' : ''}`}>
                                        {[0, 1, 2, 3].map((idx) => {
                                            const slot = editFotos[idx];
                                            const previewUrl = slot?.type === 'existing' ? slot.url : slot?.type === 'new' ? slot.dataUrl : null;
                                            return (
                                                <div
                                                    key={idx}
                                                    className="photo-uploader-box"
                                                    style={{
                                                        position: 'relative',
                                                        ...(previewUrl
                                                            ? {
                                                                backgroundImage: `url('${previewUrl}')`,
                                                                backgroundSize: 'cover',
                                                                backgroundPosition: 'center',
                                                            }
                                                            : {}),
                                                    }}
                                                >
                                                    {!previewUrl && <IconCameraPlus />}

                                                    {!previewUrl && (
                                                        <input
                                                            type="file"
                                                            className="pet-photo-input"
                                                            accept="image/*"
                                                            style={{
                                                                position: 'absolute',
                                                                inset: 0,
                                                                opacity: 0,
                                                                cursor: 'pointer',
                                                                zIndex: 1,
                                                            }}
                                                            onChange={(e) => handleEditFotoChange(idx, e)}
                                                        />
                                                    )}

                                                    {previewUrl && (
                                                        <button
                                                            type="button"
                                                            className="btn-remove-photo"
                                                            style={{
                                                                position: 'absolute',
                                                                top: '4px',
                                                                right: '4px',
                                                                zIndex: 2,
                                                            }}
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleRemoveEditFoto(idx);
                                                            }}
                                                        >
                                                            <IconX />
                                                        </button>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>

                                <div className="groups grid-2col">
                                    {/* NOMBRE — perdido, adopción */}
                                    {tipo !== 'found' && (
                                        <div className="form-group">
                                            <input
                                                type="text"
                                                placeholder="Nombre de la mascota"
                                                className={`form-input ${fieldErrors.nombre ? 'input-error' : ''}`}
                                                value={editNombre}
                                                onChange={(e) => setEditNombre(e.target.value)}
                                            />
                                        </div>
                                    )}
                                    {tipo === 'adoption' && <div className="form-group icon-field"></div>}

                                    {/* FECHA — perdido, encontrado */}
                                    {tipo !== 'adoption' && (
                                        <div className="form-group icon-field date-picker-group" ref={dateGroupRef}>
                                            <div
                                                className={`date-input-trigger ${fieldErrors.fecha ? 'input-error' : ''}`}
                                                onClick={() => {
                                                    setEditDatePopoverOpen((prev) => !prev);
                                                }}
                                            >
                                                <IconCalendarX />
                                                <input
                                                    type="text"
                                                    className="form-input"
                                                    placeholder={c.fechaPlaceholder}
                                                    readOnly
                                                    value={editFechaDisplay}
                                                />
                                            </div>

                                            {editDatePopoverOpen && (
                                                <div className="date-popover open">
                                                    <div className="date-selects-inline">
                                                        <CustomSelect
                                                            id="edit-p-fecha-dia"
                                                            placeholder="Día"
                                                            value={editFechaDia}
                                                            onChange={(val) => setEditFechaDia(val)}
                                                            options={Array.from({ length: 31 }, (_, i) => i + 1).map((d) => ({
                                                                value: String(d).padStart(2, '0'),
                                                                label: String(d),
                                                            }))}
                                                        />
                                                        <CustomSelect
                                                            id="edit-p-fecha-mes"
                                                            placeholder="Mes"
                                                            value={editFechaMes}
                                                            onChange={(val) => setEditFechaMes(val)}
                                                            options={Object.entries(mesesCompletos).map(([val, label]) => ({
                                                                value: val,
                                                                label: label.slice(0, 3),
                                                            }))}
                                                        />
                                                        <CustomSelect
                                                            id="edit-p-fecha-anio"
                                                            placeholder="Año"
                                                            value={editFechaAnio}
                                                            onChange={(val) => setEditFechaAnio(val)}
                                                            options={[
                                                                { value: '2026', label: '2026' },
                                                                { value: '2025', label: '2025' }
                                                            ]}
                                                        />
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                    {tipo === 'found' && <div className="form-group icon-field"></div>}

                                    {/* GÉNERO */}
                                    <div className="form-group">
                                        <div className={`gender-pill-group ${fieldErrors.sexo ? 'input-error' : ''}`}>
                                            <button
                                                type="button"
                                                className={`gender-pill-btn ${editSexo === 'Macho' ? 'active' : ''}`}
                                                onClick={() => setEditSexo('Macho')}
                                            >
                                                <IconGenderMale /> Macho
                                                <IconCircleDashedCheck className="icon-check-active" />
                                            </button>
                                            <button
                                                type="button"
                                                className={`gender-pill-btn ${editSexo === 'Hembra' ? 'active' : ''}`}
                                                onClick={() => setEditSexo('Hembra')}
                                            >
                                                <IconGenderFemale /> Hembra
                                                <IconCircleDashedCheck className="icon-check-active" />
                                            </button>
                                        </div>
                                    </div>

                                    {/* CASTRADO */}
                                    <div className="form-group flex">
                                        <label className="form-label">{c.castradoLabel}</label>
                                        <div className="toggle-switch-container">
                                            <label className="toggle-switch">
                                                <input
                                                    type="checkbox"
                                                    className="toggle-switch-checkbox"
                                                    checked={editCastrado}
                                                    onChange={(e) => setEditCastrado(e.target.checked)}
                                                />
                                                <span className="toggle-switch-slider"></span>
                                            </label>
                                            <span className="toggle-switch-text">{editCastrado ? 'Sí' : 'No'}</span>
                                        </div>
                                    </div>

                                    {/* TIPO DE MASCOTA */}
                                    <div className="form-group">
                                        <CustomSelect
                                            id="edit-p-tipo"
                                            placeholder="Tipo de mascota"
                                            value={editTipoMascota}
                                            onChange={(val) => setEditTipoMascota(val)}
                                            className={fieldErrors.tipoMascota ? 'input-error' : ''}
                                            options={[
                                                { value: 'Perro', label: 'Perro' },
                                                { value: 'Gato', label: 'Gato' },
                                                { value: 'Ave', label: 'Ave' },
                                            ]}
                                        />
                                    </div>

                                    {/* TAMAÑO */}
                                    <div className={`form-group ${fieldErrors.tamano ? 'input-error' : ''}`}>
                                        <CustomSelect
                                            id="edit-p-tamano"
                                            placeholder="Tamaño"
                                            value={editTamano}
                                            onChange={(val) => setEditTamano(val)}
                                            options={[
                                                { value: 'Pequeño', label: 'Pequeño' },
                                                { value: 'Mediano', label: 'Mediano' },
                                                { value: 'Grande', label: 'Grande' },
                                            ]}
                                        />
                                    </div>

                                    {/* RAZA / ESPECIE (dinámico según tipo de mascota) */}
                                    <div className="form-group">
                                        <label>{editTipoMascota === 'Ave' ? 'Especie' : 'Raza'}</label>
                                        <AutocompleteInput
                                            className={`form-input ${fieldErrors.raza ? 'input-error' : ''}`}
                                            placeholder={
                                                editTipoMascota === 'Ave'
                                                    ? 'Ej: Loro'
                                                    : editTipoMascota === 'Gato'
                                                        ? 'Ej: Persa'
                                                        : 'Ej: Labrador'
                                            }
                                            value={editRaza}
                                            onChange={setEditRaza}
                                            suggestions={
                                                editTipoMascota === 'Ave'
                                                    ? ESPECIES_AVE
                                                    : editTipoMascota === 'Gato'
                                                        ? RAZAS_GATO
                                                        : RAZAS_PERRO
                                            }
                                        />
                                    </div>

                                    {/* COLOR (dinámico según tipo de mascota) */}
                                    <div className="form-group">
                                        <label>{editTipoMascota === 'Ave' ? 'Color del plumaje' : 'Color del pelaje'}</label>
                                        <AutocompleteInput
                                            className={`form-input ${fieldErrors.color ? 'input-error' : ''}`}
                                            placeholder="Ej: Blanco con manchas"
                                            value={editColor}
                                            onChange={setEditColor}
                                            suggestions={editTipoMascota === 'Ave' ? COLORES_PLUMAJE : COLORES_PELAJE}
                                        />
                                    </div>
                                </div>

                                {/* TELÉFONO DE CONTACTO — propio de este aviso, no de la cuenta */}
                                <div className="groups grid-2col">
                                    <div className="form-group grid-1col">
                                        <label>¿Dónde te pueden contactar?</label>
                                        <div className={`field-tel ${fieldErrors.telefono ? 'input-error' : ''}`}>
                                            <span>{dialCode}</span>
                                            <input
                                                type="tel"
                                                name="telefono-aviso"
                                                className="form-input"
                                                autoComplete="tel"
                                                maxLength={15}
                                                placeholder="Número de teléfono"
                                                value={editTelefono}
                                                onChange={(e) => {
                                                    const soloTelefono = e.target.value.replace(/[^\d\s\-()]/g, '');
                                                    setEditTelefono(soloTelefono);
                                                }}
                                                readOnly
                                                onFocus={(e) => e.target.removeAttribute('readonly')}
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* OBSERVACIONES */}
                                <div className="groups form-group">
                                    <label>{c.observacionesLabel}</label>
                                    <textarea
                                        rows={3}
                                        className="form-textarea"
                                        placeholder={c.observacionesPlaceholder}
                                        value={editObservaciones}
                                        onChange={(e) => setEditObservaciones(e.target.value)}
                                    ></textarea>
                                </div>

                                <div className="groups grid-2col">
                                    {/* RECOMPENSA — solo perdido */}
                                    {tipo === 'lost' && (
                                        <div className="form-group">
                                            <label>Recompensa{currencySymbol ? ` (${currencySymbol})` : ''}</label>
                                            <input
                                                type="text"
                                                className={`form-input ${fieldErrors.recompensa ? 'input-error' : ''}`}
                                                value={editRecompensa}
                                                onChange={(e) => setEditRecompensa(e.target.value)}
                                            />
                                            <div className="terms-acceptance-box" style={{ marginTop: '0.5em' }}>
                                                <label className="terms-checkbox-label">
                                                    <input
                                                        type="checkbox"
                                                        className="terms-checkbox-input"
                                                        checked={editOcultarMonto}
                                                        onChange={(e) => setEditOcultarMonto(e.target.checked)}
                                                    />
                                                    <span className="terms-checkbox-custom">
                                                        <i className="check"></i>
                                                    </span>
                                                    <span className="terms-checkbox-text">Ocultar monto</span>
                                                </label>
                                            </div>
                                        </div>
                                    )}

                                    {/* INCLUYE — solo adopción */}
                                    {tipo === 'adoption' && (
                                        <div className="form-group">
                                            <label>Incluye</label>
                                            <input
                                                type="text"
                                                className={`form-input ${fieldErrors.extras ? 'input-error' : ''}`}
                                                placeholder="Ej: cama, plato, collar..."
                                                value={editExtras}
                                                onChange={(e) => setEditExtras(e.target.value)}
                                            />
                                            <div className="terms-acceptance-box" style={{ marginTop: '0.5em' }}>
                                                <label className="terms-checkbox-label">
                                                    <input
                                                        type="checkbox"
                                                        className="terms-checkbox-input"
                                                        checked={editOcultarExtras}
                                                        onChange={(e) => setEditOcultarExtras(e.target.checked)}
                                                    />
                                                    <span className="terms-checkbox-custom">
                                                        <i className="check"></i>
                                                    </span>
                                                    <span className="terms-checkbox-text">Ocultar detalles</span>
                                                </label>
                                            </div>
                                        </div>
                                    )}

                                    {/* EDAD — perdido, adopción */}
                                    {tipo !== 'found' && (
                                        <div className="form-group">
                                            <label>Edad</label>
                                            <CustomSelect
                                                id="edit-p-edad"
                                                placeholder="Edad"
                                                value={editEdad}
                                                onChange={(val) => setEditEdad(val)}
                                                options={[
                                                    { value: 'Menos de 1 año', label: 'Menos de 1 año' },
                                                    { value: '1 a 3 años', label: '1 a 3 años' },
                                                    { value: '4 a 7 años', label: '4 a 7 años' },
                                                    { value: '8 años o más', label: '8 años o más' },
                                                ]}
                                            />
                                        </div>
                                    )}
                                </div>
                            </div>
                        </>
                    )}

                    {!isLoading && (
                        <div style={{ position: 'fixed', top: 0, left: '-9999px', zIndex: -1, width: '25em' }} aria-hidden="true">
                            <div className="editor-stage">
                                <div className="flyer-box">
                                    <div className={`flyer-canvas container-flyer-design ${fc.stateClass}`} id="edit-flyer-preview">

                                        {/* 1. Cabecera */}
                                        <div className="flyer-alert-header">
                                            <div className="flyer-title-row">
                                                <h3 id="flyer-titulo-alerta" className={fc.smallTitle ? 'title-small' : undefined}>
                                                    {fc.titulo}
                                                </h3>
                                            </div>
                                        </div>

                                        {/* 2. Fotos */}
                                        <div className="flyer-photo-stage">
                                            <div
                                                className={`flyer-dynamic-grid ${flyerPhotoSrcs.length === 0 ? 'layout-empty' : `layout-${flyerPhotoSrcs.length}`
                                                    }`}
                                            >
                                                {flyerPhotoSrcs.length === 0 ? (
                                                    <div className="flyer-img-placeholder">
                                                        <IconCameraPlus />
                                                    </div>
                                                ) : (
                                                    flyerPhotoSrcs.map((src, idx) => (
                                                        <div key={idx} className="flyer-grid-item">
                                                            <DraggablePhoto src={src} offsetY={0} onOffsetChange={() => { }} />
                                                        </div>
                                                    ))
                                                )}
                                            </div>

                                            {tipo !== 'adoption' && fechaCorta && (
                                                <span className="flyer-date">El {fechaCorta}</span>
                                            )}
                                            {fc.showNombre && (
                                                <div className="flyer-photo-tag">
                                                    {tipo === 'adoption' ? (
                                                        <span><IconHeart /> {editNombre || 'Nombre'}</span>
                                                    ) : (
                                                        <span><IconPaw /> {editNombre || 'Nombre'}</span>
                                                    )}
                                                </div>
                                            )}
                                        </div>

                                        {/* Recompensa (solo perdida) */}
                                        {tipo === 'lost' && ((editRecompensa && Number(editRecompensa) > 0) || editOcultarMonto) && (
                                            <div className="flyer-canvas-reward">
                                                {!editOcultarMonto && <span id="flyer-reward-label">¡RECOMPENSA!</span>}
                                                <span id="flyer-txt-recompensa">
                                                    {editOcultarMonto ? '¡Se ofrece recompensa!' : `${currencySymbol} ${editRecompensa}!`}
                                                </span>
                                            </div>
                                        )}

                                        {/* Extras (solo adopción) */}
                                        {tipo === 'adoption' && editExtras && (
                                            <div className="flyer-canvas-reward">
                                                <span id="flyer-txt-incluye">{editOcultarExtras ? 'Accesorios y más' : editExtras}</span>
                                            </div>
                                        )}

                                        {/* 3. Franja de datos */}
                                        <div className="flyer-info-band">
                                            <div className="flyer-info-where">
                                                {tipo === 'adoption' ? (
                                                    <IconHeartPin className="flyer-info-bigicon" />
                                                ) : (
                                                    <IconCalendarPin className="flyer-info-bigicon" />
                                                )}
                                                <div className="flyer-info-text">
                                                    <span className="flyer-info-kicker">{fc.whereKicker}</span>
                                                    {(readOnlyDistrict || readOnlyProvince) && (
                                                        <strong className="flyer-info-place">{readOnlyDistrict || readOnlyProvince}</strong>
                                                    )}
                                                    {readOnlyAddressHint && <span className="flyer-info">{readOnlyAddressHint}</span>}
                                                </div>
                                            </div>

                                            <div className="flyer-info-divider" />

                                            <div className="flyer-info-call">
                                                <IconBrandWhatsapp className="flyer-info-bigicon" />
                                                <div className="flyer-info-text">
                                                    <span className="flyer-info-kicker">{fc.callKicker}</span>
                                                    <strong className="flyer-info-phone">{editTelefono || '---------'}</strong>
                                                </div>
                                            </div>
                                        </div>

                                        {/* 4. Tarjetas */}
                                        {flyerCards.length > 0 && (
                                            <div className={`flyer-cards ${tipo === 'adoption' ? 'flyer-cards-wrap' : ''}`}>
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
                                                {fc.footerLine1} <br />{fc.footerLine2}{' '}
                                                <Image src="/images/logo-light.svg" alt="Huellas Perdidas" width={120} height={40} loading="eager" />
                                            </p>
                                            <p className="flyer-thanks-note">
                                                {editObservaciones || fc.noteDefault}
                                            </p>
                                            <p className="flyer-thanks-gracias">¡Gracias!</p>
                                        </div>

                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
                <div className="app-modal-footer">
                    <button type="button" className="btn-secondary" onClick={onClose}>
                        Cancelar
                    </button>
                    <button
                        type="button"
                        className="btn-publish"
                        disabled={!isUnlocked || isLoading || isSaving}
                        onClick={handleGuardar}
                    >
                        <IconCheck /> {isSaving ? 'Guardando...' : 'Enviar a revisión'}
                    </button>
                </div>
            </div>
        </div>
    );
}