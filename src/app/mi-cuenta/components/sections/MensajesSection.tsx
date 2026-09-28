'use client';

import { KeyboardEvent, ChangeEvent, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { showToast } from '@/components/global/Toast';
import { resizePetImage } from '@/lib/resizeImage';

interface Mensaje {
    id: string;
    tipo: string;
    texto: string;
    hora: string;
    imagen?: string | null;
}

interface Hilo {
    id: string;
    nombre: string;
    aviso: string;
    preview: string;
    tiempo: string;
    unread: boolean;
    thumb: string;
    isOpen: boolean;
    isBlocked: boolean;
    adminReply?: string | null;
    mensajes: Mensaje[];
    replyInput: string;
}

interface MensajesSectionProps {
    hilos: Hilo[];
    openMessageMenuId: string | null;
    onToggleHilo: (id: string) => void;
    onSetOpenMessageMenuId: (id: string | null) => void;
    onReplyInputChange: (hiloId: string, value: string) => void;
    onSendReply: (hiloId: string, imagenFile?: File | null) => void;
    onReportarUsuario: (hiloId: string) => void;
    onBloquearUsuario: (nombre: string, hiloId: string) => void;
    onEliminarMensaje: (hiloId: string) => void;
}

export default function MensajesSection({
    hilos,
    openMessageMenuId,
    onToggleHilo,
    onSetOpenMessageMenuId,
    onReplyInputChange,
    onSendReply,
    onReportarUsuario,
    onBloquearUsuario,
    onEliminarMensaje,
}: MensajesSectionProps) {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [activeHiloId, setActiveHiloId] = useState<string | null>(null);
    const [lightboxImage, setLightboxImage] = useState<string | null>(null);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);
    const [pendingImages, setPendingImages] = useState<Record<string, File | null>>({});
    const [pendingPreviews, setPendingPreviews] = useState<Record<string, string | null>>({});

    const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        const currentHiloId = activeHiloId;
        if (!file || !currentHiloId) {
            e.target.value = '';
            return;
        }

        try {
            const compressedBase64 = await resizePetImage(file);
            const res = await fetch(compressedBase64);
            const blob = await res.blob();
            const optimizedFile = new File([blob], file.name.replace(/\.[^/.]+$/, '') + '.jpg', {
                type: 'image/jpeg',
            });

            setPendingImages((prev) => ({ ...prev, [currentHiloId]: optimizedFile }));
            setPendingPreviews((prev) => ({ ...prev, [currentHiloId]: URL.createObjectURL(optimizedFile) }));
        } catch (err) {
            console.error('Error al optimizar la imagen:', err);
            showToast('No se pudo procesar la imagen seleccionada.', 'error');
        } finally {
            e.target.value = '';
        }
    };

    const handleSend = (hiloId: string) => {
        onSendReply(hiloId, pendingImages[hiloId] ?? undefined);
        setPendingImages((prev) => ({ ...prev, [hiloId]: null }));
        setPendingPreviews((prev) => {
            if (prev[hiloId]) URL.revokeObjectURL(prev[hiloId]!);
            return { ...prev, [hiloId]: null };
        });
    };

    return (
        <div className="cuenta-section active" id="section-mensajes">
            <div className="dashboard-recent-header">
                <h2 className="dashboard-subsection-title">Mis mensajes</h2>
                <p>
                    <i className="ti ti-info-circle"></i> Mensajes que otros usuarios dejaron en tus avisos
                </p>
            </div>

            <input
                type="file"
                ref={fileInputRef}
                accept="image/*"
                style={{ display: 'none' }}
                onChange={handleFileChange}
            />

            <div className="mensajes-hilos-list">
                {hilos.map((hilo) => (
                    <div
                        key={hilo.id}
                        className={`mensaje-hilo-item ${hilo.unread ? 'unread' : ''} ${hilo.isOpen ? 'open' : ''}`}
                    >
                        <div className="mensaje-hilo-header" onClick={() => onToggleHilo(hilo.id)}>
                            <div className="mensaje-hilo-thumb">
                                <img src={hilo.thumb} alt="" />
                            </div>
                            <div className="mensaje-hilo-main">
                                <div className="mensaje-hilo-title-row">
                                    <h5>{hilo.nombre}</h5>
                                    <span className="mensaje-hilo-badge-aviso">Sobre: {hilo.aviso}</span>
                                    {hilo.isBlocked && (
                                        <span className="mensaje-hilo-badge-aviso" style={{ color: 'var(--brand-red)' }}>
                                            <i className="ti ti-ban"></i> Bloqueado
                                        </span>
                                    )}
                                </div>
                                <p className="mensaje-hilo-preview">{hilo.preview}</p>
                            </div>
                            <div className="mensaje-hilo-meta">
                                <span className="mensaje-hilo-time">{hilo.tiempo}</span>
                                {hilo.unread && <span className="mensaje-hilo-unread-dot"></span>}
                            </div>

                            <div className="mensaje-hilo-options" onClick={(e) => e.stopPropagation()}>
                                <button
                                    type="button"
                                    className="mensaje-hilo-icon-btn mensaje-hilo-more-trigger"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onSetOpenMessageMenuId(openMessageMenuId === hilo.id ? null : hilo.id);
                                    }}
                                >
                                    <i className="fa-solid fa-ellipsis-vertical"></i>
                                </button>
                                {openMessageMenuId === hilo.id && (
                                    <div className="mensaje-hilo-floating-menu" style={{ display: 'block' }}>
                                        <button
                                            type="button"
                                            className="mensaje-menu-option-item btn-reportar-usuario"
                                            onClick={() => {
                                                onSetOpenMessageMenuId(null);
                                                onReportarUsuario(hilo.id);
                                            }}
                                        >
                                            Reportar usuario
                                        </button>
                                        <button
                                            type="button"
                                            className="mensaje-menu-option-item btn-bloquear-usuario"
                                            onClick={() => {
                                                onSetOpenMessageMenuId(null);
                                                onBloquearUsuario(hilo.nombre, hilo.id);
                                            }}
                                        >
                                            {hilo.isBlocked ? 'Desbloquear usuario' : 'Bloquear usuario'}
                                        </button>
                                        <button
                                            type="button"
                                            className="mensaje-menu-option-item option-danger btn-eliminar-mensaje"
                                            onClick={() => {
                                                onSetOpenMessageMenuId(null);
                                                onEliminarMensaje(hilo.id);
                                            }}
                                        >
                                            Eliminar conversación
                                        </button>
                                    </div>
                                )}
                            </div>

                            <button type="button" className="mensaje-hilo-chevron">
                                <i className="ti ti-chevron-down"></i>
                            </button>
                        </div>

                        <div className="mensaje-hilo-body">
                            <div className="mensaje-hilo-body-inner">
                                {hilo.adminReply && (
                                    <div className="admin-info-box">
                                        <i className="ti ti-info-circle"></i>
                                        <p>
                                            <b>Tu reporte fue revisado:</b> {hilo.adminReply}
                                        </p>
                                    </div>
                                )}

                                {hilo.mensajes.map((msg) => (
                                    <div key={msg.id} className={`mensaje-burbuja ${msg.tipo}`}>
                                        {msg.imagen && (
                                            <div
                                                className="mensaje-burbuja-imagen-wrap"
                                                onClick={() => setLightboxImage(msg.imagen!)}
                                            >
                                                <img src={msg.imagen} alt="" className="mensaje-burbuja-imagen" />
                                                <div className="mensaje-burbuja-imagen-overlay">
                                                    <i className="ti ti-arrows-maximize"></i>
                                                </div>
                                            </div>
                                        )}
                                        {msg.texto && <p>{msg.texto}</p>}
                                        <span className="mensaje-burbuja-time">{msg.hora}</span>
                                    </div>
                                ))}

                                {hilo.isBlocked ? (
                                    <div className="admin-info-box">
                                        <i className="ti ti-ban"></i>
                                        <p>Bloqueaste a este usuario. Ya no puede enviarte mensajes.</p>
                                    </div>
                                ) : (
                                    <>
                                        {pendingPreviews[hilo.id] && (
                                            <div className="mensaje-reply-image-preview">
                                                <img src={pendingPreviews[hilo.id]!} alt="" />
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setPendingImages((prev) => ({ ...prev, [hilo.id]: null }));
                                                        setPendingPreviews((prev) => {
                                                            if (prev[hilo.id]) URL.revokeObjectURL(prev[hilo.id]!);
                                                            return { ...prev, [hilo.id]: null };
                                                        });
                                                    }}
                                                >
                                                    <i className="ti ti-x"></i>
                                                </button>
                                            </div>
                                        )}
                                        <div className="mensaje-reply-row">
                                            <button
                                                type="button"
                                                className="mensaje-hilo-icon-btn"
                                                onClick={() => {
                                                    setActiveHiloId(hilo.id);
                                                    fileInputRef.current?.click();
                                                }}
                                            >
                                                <i className="ti ti-photo-plus"></i>
                                            </button>
                                            <input
                                                type="text"
                                                className="mensaje-reply-field"
                                                placeholder="Escribe una respuesta..."
                                                value={hilo.replyInput}
                                                onChange={(e) => onReplyInputChange(hilo.id, e.target.value)}
                                                onKeyPress={(e: KeyboardEvent<HTMLInputElement>) => {
                                                    if (e.key === 'Enter') handleSend(hilo.id);
                                                }}
                                            />
                                            <button
                                                type="button"
                                                className={`mensaje-reply-send-btn ${hilo.replyInput.trim() || pendingImages[hilo.id] ? 'is-active' : ''}`}
                                                disabled={!hilo.replyInput.trim() && !pendingImages[hilo.id]}
                                                onClick={() => handleSend(hilo.id)}
                                            >
                                                <i className="ti ti-send"></i>
                                            </button>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
            {mounted && lightboxImage && createPortal(
                <div className="mensaje-lightbox-overlay" onClick={() => setLightboxImage(null)}>
                    <button type="button" className="mensaje-lightbox-close" onClick={() => setLightboxImage(null)}>
                        <i className="ti ti-x"></i>
                    </button>
                    <img src={lightboxImage} alt="" onClick={(e) => e.stopPropagation()} />
                </div>,
                document.body
            )}
        </div>
    );
}