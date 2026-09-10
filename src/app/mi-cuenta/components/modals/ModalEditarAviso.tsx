'use client';

import { useState, useEffect, useRef, ChangeEvent } from 'react';
import CustomSelect from '@/components/ui/CustomSelect';
import { showToast } from '@/components/global/Toast';
import { useApp } from '@/context/AppContext';
import { getCountryByAbbr } from '@/lib/countries';
import { fetchReport, type ReportDetail } from '@/lib/api';
import { updateReport, uploadReportImage, deleteReportImage, ReportsApiError } from '@/lib/reportsApi';
import { validateText } from '@/lib/textValidation';
import AutocompleteInput from '@/components/ui/AutocompleteInput';
import { RAZAS_PERRO, RAZAS_GATO, ESPECIES_AVE, COLORES_PELAJE, COLORES_PLUMAJE } from '@/lib/petSuggestions';

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
    if (sex === 'male') return 'Macho';
    if (sex === 'female') return 'Hembra';
    return '';
}
function petTypeFromApi(petType: string | null): string {
    if (petType === 'dog') return 'Perro';
    if (petType === 'cat') return 'Gato';
    if (petType === 'bird') return 'Ave';
    return '';
}
function sizeFromApi(size: string | null): string {
    if (size === 'small') return 'Pequeño';
    if (size === 'medium') return 'Mediano';
    if (size === 'large') return 'Grande';
    return '';
}

// Traducción etiqueta en español (UI) → código real (API)
function sexToApi(sex: string): string | null {
    if (sex === 'Macho') return 'male';
    if (sex === 'Hembra') return 'female';
    return null;
}
function petTypeToApi(petType: string): string {
    if (petType === 'Perro') return 'dog';
    if (petType === 'Gato') return 'cat';
    if (petType === 'Ave') return 'bird';
    return 'other';
}
function sizeToApi(size: string): string | null {
    if (size === 'Pequeño') return 'small';
    if (size === 'Mediano') return 'medium';
    if (size === 'Grande') return 'large';
    return null;
}

// Cada slot de foto es una existente (con id real, para poder borrarla) o
// una nueva (base64, recién elegida, todavía sin subir).
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
    const country = currentUser?.country || 'PE';
    const [currencySymbol, setCurrencySymbol] = useState('');

    useEffect(() => {
        let isCancelled = false;
        getCountryByAbbr(country).then((c) => {
            if (!isCancelled) setCurrencySymbol(c?.currencySymbol ?? '');
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

    const handleEditFotoChange = (idx: number, e: ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
            setEditFotos((prev) => {
                const next = [...prev];
                next[idx] = { type: 'new', dataUrl: ev.target?.result as string };
                return next;
            });
        };
        reader.readAsDataURL(file);
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
        if (tipo !== 'found') {
            const check = validateText(editNombre, 3, 'El nombre');
            if (!check.valid) {
                showToast(check.error!, 'error');
                return;
            }
        }
        if (editRaza.trim()) {
            const check = validateText(editRaza, 3, 'La raza');
            if (!check.valid) {
                showToast(check.error!, 'error');
                return;
            }
        }
        if (editColor.trim()) {
            const check = validateText(editColor, 3, 'El color');
            if (!check.valid) {
                showToast(check.error!, 'error');
                return;
            }
        }
        if (editObservaciones.trim()) {
            const check = validateText(editObservaciones, 15, tipo === 'lost' ? 'Las observaciones' : 'La descripción');
            if (!check.valid) {
                showToast(check.error!, 'error');
                return;
            }
        }
        if (tipo === 'adoption' && editExtras.trim()) {
            const check = validateText(editExtras, 3, 'Lo que incluye');
            if (!check.valid) {
                showToast(check.error!, 'error');
                return;
            }
        }

        setIsSaving(true);
        const eventDate =
            editFechaDia && editFechaMes && editFechaAnio ? `${editFechaAnio}-${editFechaMes}-${editFechaDia}` : null;

        try {
            // Ubicación NUNCA se manda — es inmutable, confirmado con backend.
            await updateReport(id, {
                title: tipo !== 'found' ? editNombre || null : null,
                event_date: eventDate,
                pet_type: petTypeToApi(editTipoMascota),
                description: editObservaciones || null,
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

            // Fotos: primero borrar las quitadas, luego subir las nuevas.
            // Si alguna falla, seguimos con el resto — no revertimos nada.
            for (const imgId of removedImageIds) {
                try {
                    await deleteReportImage(id, imgId);
                } catch (err) {
                    console.error('No se pudo borrar una foto', err);
                }
            }
            for (const slot of editFotos) {
                if (slot?.type === 'new') {
                    try {
                        await uploadReportImage(id, slot.dataUrl, false);
                    } catch (err) {
                        console.error('No se pudo subir una foto nueva', err);
                    }
                }
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

    const c = editarModalConfig[tipo];
    const ubicacionCompleta = [readOnlyDistrict, readOnlyProvince, readOnlyRegion].filter(Boolean).join(', ');

    return (
        <div className="app-modal open" id="modal-editar-aviso">
            <div className="app-modal-backdrop" onClick={onClose}></div>
            <div className="app-modal-card wide" id="editar-modal-card">
                <div className="app-modal-header">
                    <h3 id="editar-modal-title">Editar aviso</h3>
                    <button type="button" className="app-modal-close" onClick={onClose}>
                        <i className="ti ti-x"></i>
                    </button>
                </div>
                <div className="app-modal-body form-account">
                    {isLoading ? (
                        <p style={{ padding: '24px 0', opacity: 0.6 }}>Cargando datos del aviso...</p>
                    ) : (
                        <>
                            <div className="admin-info-box info-box-revision">
                                <i className="ti ti-info-circle"></i>
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
                                    <i className="ti ti-map-pin"></i>
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
                                    <div className="photo-upload-grid">
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
                                                    {!previewUrl && <i className="ti ti-camera-plus"></i>}

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
                                                            <i className="ti ti-x"></i>
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
                                                className="form-input"
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
                                                className="date-input-trigger"
                                                onClick={() => {
                                                    setEditDatePopoverOpen((prev) => !prev);
                                                }}
                                            >
                                                <i className="ti ti-calendar-x"></i>
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
                                                                { value: '2025', label: '2025' },
                                                                { value: '2024', label: '2024' },
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
                                        <div className="gender-pill-group">
                                            <button
                                                type="button"
                                                className={`gender-pill-btn ${editSexo === 'Macho' ? 'active' : ''}`}
                                                onClick={() => setEditSexo('Macho')}
                                            >
                                                <i className="ti ti-gender-male"></i> Macho
                                            </button>
                                            <button
                                                type="button"
                                                className={`gender-pill-btn ${editSexo === 'Hembra' ? 'active' : ''}`}
                                                onClick={() => setEditSexo('Hembra')}
                                            >
                                                <i className="ti ti-gender-female"></i> Hembra
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
                                            options={[
                                                { value: 'Perro', label: 'Perro' },
                                                { value: 'Gato', label: 'Gato' },
                                                { value: 'Ave', label: 'Ave' },
                                            ]}
                                        />
                                    </div>

                                    {/* TAMAÑO */}
                                    <div className="form-group">
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
                                            className="form-input"
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
                                            className="form-input"
                                            placeholder="Ej: Blanco con manchas"
                                            value={editColor}
                                            onChange={setEditColor}
                                            suggestions={editTipoMascota === 'Ave' ? COLORES_PLUMAJE : COLORES_PELAJE}
                                        />
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
                                                className="form-input"
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
                                                        <i className="fa-solid fa-check"></i>
                                                    </span>
                                                    <span className="terms-checkbox-text">Ocultar monto</span>
                                                </label>
                                            </div>
                                        </div>
                                    )}

                                    {/* INCLUYE — solo adopción */}
                                    {tipo === 'adoption' && (
                                        <div className="form-group">
                                            <label>Incluye (opcional)</label>
                                            <input
                                                type="text"
                                                className="form-input"
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
                                                        <i className="fa-solid fa-check"></i>
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
                        <i className="ti ti-check"></i> {isSaving ? 'Guardando...' : 'Enviar a revisión'}
                    </button>
                </div>
            </div>
        </div>
    );
}