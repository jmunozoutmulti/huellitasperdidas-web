'use client';

import { useState, useEffect, useRef, ChangeEvent } from 'react';
import CustomSelect from '@/components/ui/CustomSelect';
import { showToast } from '@/components/global/Toast';
import { useApp } from '@/context/AppContext';
import { getCountryByAbbr } from '@/lib/countries';
import { getPublicationById, updatePublication } from '@/lib/publications';

interface ModalEditarAvisoProps {
    isOpen: boolean;
    id: string;
    tipo: 'lost' | 'adoption' | 'found';
    corregirCampos: string[];
    isUnlocked: boolean;
    onClose: () => void;
    onToggleUnlock: (unlocked: boolean) => void;
    onSaved: () => void;
}

const editarModalConfig = {
    lost: {
        fechaPlaceholder: 'Fecha de la pérdida',
        direccionPlaceholder: 'Dirección donde fue vista por última vez',
        observacionesLabel: 'Observaciones',
        observacionesPlaceholder: 'Ej: Lleva collar azul, tiene una mancha negra en el ojo izquierdo...',
        castradoLabel: '¿Está castrado?',
    },
    adoption: {
        fechaPlaceholder: 'Fecha',
        direccionPlaceholder: 'Lugar de entrega',
        observacionesLabel: 'Descripción',
        observacionesPlaceholder: 'Ej: Es muy cariñoso, le encanta jugar, fue rescatado de la calle...',
        castradoLabel: '¿Está castrado?',
    },
    found: {
        fechaPlaceholder: 'Fecha en que lo encontraste',
        direccionPlaceholder: '¿Dónde lo encontraste exactamente?',
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

// event_date se guarda como "YYYY-MM-DD" (ver wizards). Lo separamos para los 3 selects.
function parseEventDate(eventDate: string | null): { dia: string; mes: string; anio: string } {
    if (!eventDate) return { dia: '', mes: '', anio: '' };
    const [anio, mes, dia] = eventDate.split('-');
    return { dia: dia ?? '', mes: mes ?? '', anio: anio ?? '' };
}

export default function ModalEditarAviso({
    isOpen,
    id,
    tipo,
    corregirCampos,
    isUnlocked,
    onClose,
    onToggleUnlock,
    onSaved,
}: ModalEditarAvisoProps) {
    const { currentUser } = useApp();
    const country = currentUser?.country || 'PE';
    const currencySymbol = getCountryByAbbr(country).currency.symbol;

    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    const [editFotos, setEditFotos] = useState<(string | null)[]>([null, null, null, null]);
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
    const [editDireccion, setEditDireccion] = useState('');
    const [editObservaciones, setEditObservaciones] = useState('');
    const [editRecompensa, setEditRecompensa] = useState('');
    const [editOcultarMonto, setEditOcultarMonto] = useState(false);
    const [editExtras, setEditExtras] = useState('');
    const [editOcultarExtras, setEditOcultarExtras] = useState(false);
    const [editEdad, setEditEdad] = useState('');

    const dateGroupRef = useRef<HTMLDivElement>(null);

    // Carga los datos reales de la publicación al abrir (en vez de resetear a blanco)
    useEffect(() => {
        if (!isOpen || !id) return;

        setIsLoading(true);
        getPublicationById(id).then((pub) => {
            if (!pub) {
                showToast('No se encontró el aviso a editar.', 'error');
                onClose();
                return;
            }

            const fotosExistentes = [0, 1, 2, 3].map((i) => pub.images[i] ?? null);
            const { dia, mes, anio } = parseEventDate(pub.event_date);

            setEditFotos(fotosExistentes);
            setEditNombre(tipo !== 'found' ? pub.title || '' : '');
            setEditFechaDia(dia);
            setEditFechaMes(mes);
            setEditFechaAnio(anio);
            setEditDatePopoverOpen(false);
            setEditSexo((pub.sex as '' | 'Macho' | 'Hembra') || '');
            setEditCastrado(!!pub.is_neutered);
            setEditTipoMascota(pub.pet_type || '');
            setEditTamano(pub.size || '');
            setEditRaza(pub.breed || '');
            setEditColor(pub.color || '');
            setEditDireccion(pub.address_hint || '');
            setEditObservaciones(pub.description || '');
            setEditRecompensa(pub.reward != null ? String(pub.reward) : '');
            setEditOcultarMonto(!pub.reward_visible);
            setEditExtras(pub.adoption_extras || '');
            setEditOcultarExtras(!pub.adoption_extras_visible);
            setEditEdad(pub.age || '');
            setIsLoading(false);
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
                next[idx] = ev.target?.result as string;
                return next;
            });
        };
        reader.readAsDataURL(file);
    };

    const handleRemoveEditFoto = (idx: number) => {
        setEditFotos((prev) => {
            const next = [...prev];
            next[idx] = null;
            return next;
        });
    };

    const handleGuardar = async () => {
        setIsSaving(true);
        const eventDate =
            editFechaDia && editFechaMes && editFechaAnio ? `${editFechaAnio}-${editFechaMes}-${editFechaDia}` : null;

        await updatePublication(id, {
            title: tipo !== 'found' ? editNombre || null : null,
            images: editFotos.filter((f): f is string => !!f),
            event_date: eventDate,
            sex: editSexo || null,
            is_neutered: editCastrado,
            pet_type: editTipoMascota || null,
            size: editTamano || null,
            breed: editRaza || null,
            color: editColor || null,
            address_hint: editDireccion || null,
            description: editObservaciones || null,
            reward: tipo === 'lost' ? (editRecompensa ? Number(editRecompensa) : null) : null,
            reward_visible: !editOcultarMonto,
            adoption_extras: tipo === 'adoption' ? editExtras || null : null,
            adoption_extras_visible: !editOcultarExtras,
            age: tipo !== 'found' ? editEdad || null : null,
        });

        setIsSaving(false);
        onClose();
        onSaved();
        showToast('Tu edición fue enviada a revisión.', 'info');
    };

    if (!isOpen) return null;

    const c = editarModalConfig[tipo];

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
                                    {corregirCampos.length > 0 ? (
                                        <>
                                            Tu aviso fue <b>rechazado</b>. Corrige los campos marcados con{' '}
                                            <span className="corregir-tag show" style={{ marginLeft: 0 }}>
                                                corregir
                                            </span>{' '}
                                            y vuelve a enviarlo.
                                        </>
                                    ) : (
                                        <>
                                            Los cambios que hagas serán <b>revisados por nuestro equipo</b> antes de publicarse.
                                        </>
                                    )}
                                </p>
                            </div>

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
                                    <label>
                                        Fotos de la mascota (Máx. 4){' '}
                                        {corregirCampos.includes('fotos') && (
                                            <span className="corregir-tag show">Corregir</span>
                                        )}
                                    </label>
                                    <div className="photo-upload-grid">
                                        {[0, 1, 2, 3].map((idx) => (
                                            <div
                                                key={idx}
                                                className="photo-uploader-box"
                                                style={{
                                                    position: 'relative',
                                                    ...(editFotos[idx]
                                                        ? {
                                                            backgroundImage: `url('${editFotos[idx]}')`,
                                                            backgroundSize: 'cover',
                                                            backgroundPosition: 'center',
                                                        }
                                                        : {}),
                                                }}
                                            >
                                                {!editFotos[idx] && <i className="ti ti-camera-plus"></i>}

                                                {!editFotos[idx] && (
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

                                                {editFotos[idx] && (
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
                                        ))}
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
                                        <label>
                                            {editTipoMascota === 'Ave' ? 'Especie' : 'Raza'}{' '}
                                            {corregirCampos.includes('raza-especie') && (
                                                <span className="corregir-tag show">Corregir</span>
                                            )}
                                        </label>
                                        <input
                                            type="text"
                                            className="form-input"
                                            placeholder={
                                                editTipoMascota === 'Ave'
                                                    ? 'Ej: Loro'
                                                    : editTipoMascota === 'Gato'
                                                        ? 'Ej: Persa'
                                                        : 'Ej: Labrador'
                                            }
                                            value={editRaza}
                                            onChange={(e) => setEditRaza(e.target.value)}
                                        />
                                    </div>

                                    {/* COLOR (dinámico según tipo de mascota) */}
                                    <div className="form-group">
                                        <label>
                                            {editTipoMascota === 'Ave' ? 'Color del plumaje' : 'Color del pelaje'}{' '}
                                            {corregirCampos.includes('color-pelaje') && (
                                                <span className="corregir-tag show">Corregir</span>
                                            )}
                                        </label>
                                        <input
                                            type="text"
                                            className="form-input"
                                            placeholder="Ej: Blanco con manchas"
                                            value={editColor}
                                            onChange={(e) => setEditColor(e.target.value)}
                                        />
                                    </div>

                                    {/* DIRECCIÓN */}
                                    <div className="form-group grid-1col">
                                        {corregirCampos.includes('direccion') && (
                                            <span className="corregir-tag show">Corregir</span>
                                        )}
                                        <input
                                            type="text"
                                            className="form-input"
                                            placeholder={c.direccionPlaceholder}
                                            value={editDireccion}
                                            onChange={(e) => setEditDireccion(e.target.value)}
                                        />
                                    </div>
                                </div>

                                {/* OBSERVACIONES */}
                                <div className="groups form-group">
                                    {corregirCampos.includes('observaciones') && (
                                        <span className="corregir-tag show">Corregir</span>
                                    )}
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
                                            <label>Recompensa ({currencySymbol})</label>
                                            <input
                                                type="number"
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