'use client';

import { KeyboardEvent } from 'react';

interface Mensaje {
    id: number;
    tipo: string;
    texto: string;
    hora: string;
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
    mensajes: Mensaje[];
    replyInput: string;
}

interface MensajesSectionProps {
    hilos: Hilo[];
    openMessageMenuId: string | null;
    onToggleHilo: (id: string) => void;
    onSetOpenMessageMenuId: (id: string | null) => void;
    onReplyInputChange: (hiloId: string, value: string) => void;
    onSendReply: (hiloId: string) => void;
    onReportarUsuario: () => void;
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
    return (
        <div className="cuenta-section active" id="section-mensajes">
            <div className="dashboard-recent-header">
                <h2 className="dashboard-subsection-title">Mis mensajes</h2>
                <p>
                    <i className="ti ti-info-circle"></i> Mensajes que otros usuarios dejaron en tus avisos
                </p>
            </div>

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
                                                onReportarUsuario();
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
                                            Bloquear usuario
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
                                {hilo.mensajes.map((msg) => (
                                    <div key={msg.id} className={`mensaje-burbuja ${msg.tipo}`}>
                                        <p>{msg.texto}</p>
                                        <span className="mensaje-burbuja-time">{msg.hora}</span>
                                    </div>
                                ))}

                                <div className="mensaje-reply-row">
                                    <input
                                        type="text"
                                        className="mensaje-reply-field"
                                        placeholder="Escribe una respuesta..."
                                        value={hilo.replyInput}
                                        onChange={(e) => onReplyInputChange(hilo.id, e.target.value)}
                                        onKeyPress={(e: KeyboardEvent<HTMLInputElement>) => {
                                            if (e.key === 'Enter') onSendReply(hilo.id);
                                        }}
                                    />
                                    <button
                                        type="button"
                                        className={`mensaje-reply-send-btn ${hilo.replyInput.trim() ? 'is-active' : ''}`}
                                        disabled={!hilo.replyInput.trim()}
                                        onClick={() => onSendReply(hilo.id)}
                                    >
                                        <i className="ti ti-send"></i>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}