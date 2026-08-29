'use client';

// ⚠️ SOLO DESARROLLO — BORRAR este archivo (y su import en page.tsx) cuando
// exista el panel de admin real / el endpoint que aprueba-rechaza avisos,
// Y CUANDO exista el servicio real de detección de país (el selector de
// país de acá también es 100% temporal, para probar precios/plans por país).

import { useState, useEffect, type CSSProperties } from 'react';
import { useApp } from '@/context/AppContext';
import { COUNTRIES } from '@/lib/countries';
import {
    getMyPublications,
    deletePublication,
    devSetStatus,
    reportTypeLabel,
    planLabel,
    type MockPublication,
} from '@/lib/publications';

export default function DevAvisosPanel() {
    const { currentUser, updateCurrentUser } = useApp();
    const [pubs, setPubs] = useState<MockPublication[]>([]);
    const [isOpen, setIsOpen] = useState(false);

    const refresh = () => {
        if (currentUser) {
            getMyPublications(currentUser.id).then(setPubs);
        }
    };

    useEffect(() => {
        refresh();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentUser, isOpen]);

    if (!currentUser) return null;

    const handleSetStatus = (pub: MockPublication, status: 'pending_review' | 'approved' | 'rejected' | 'finished') => {
        if (status === 'rejected') {
            const motivo = window.prompt('Motivo de rechazo (dev):', 'La foto no muestra claramente al animal.');
            devSetStatus(pub.id, status, { rejection_reason: motivo || 'Motivo de prueba (dev)' });
        } else if (status === 'finished') {
            devSetStatus(pub.id, status, { expires_at: new Date(Date.now() - 86400000).toISOString() });
        } else if (status === 'approved') {
            // si tiene plan de pago, le seteamos un vencimiento a futuro para probar "Quedan X días"
            const isPaid = pub.plan !== 'gratis';
            devSetStatus(pub.id, status, isPaid ? { expires_at: new Date(Date.now() + 3 * 86400000).toISOString() } : undefined);
        } else {
            devSetStatus(pub.id, status);
        }
        refresh();
    };

    const handleDelete = (id: string) => {
        if (window.confirm('¿Eliminar esta publicación de prueba?')) {
            deletePublication(id).then(refresh);
        }
    };

    const statusColor: Record<string, string> = {
        pending_review: '#f5a623',
        approved: '#2ecc71',
        rejected: '#e74c3c',
        finished: '#95a5a6',
    };

    return (
        <div
            style={{
                position: 'fixed',
                bottom: 16,
                right: 16,
                zIndex: 9999,
                fontFamily: 'monospace',
                fontSize: 12,
            }}
        >
            <button
                type="button"
                onClick={() => setIsOpen((o) => !o)}
                style={{
                    background: '#111',
                    color: '#fff',
                    border: 'none',
                    borderRadius: 8,
                    padding: '8px 14px',
                    cursor: 'pointer',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
                }}
            >
                🧪 Dev Avisos ({pubs.length})
            </button>

            {isOpen && (
                <div
                    style={{
                        marginTop: 8,
                        background: '#1a1a1a',
                        color: '#eee',
                        borderRadius: 8,
                        padding: 12,
                        width: 380,
                        maxHeight: 480,
                        overflowY: 'auto',
                        boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
                    }}
                >
                    <div style={{ marginBottom: 12, paddingBottom: 12, borderBottom: '1px solid #333' }}>
                        <div style={{ marginBottom: 6, opacity: 0.8 }}>
                            🌎 País del usuario (simulado): <b>{currentUser.country || 'PE'}</b>
                        </div>
                        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                            {COUNTRIES.map((c) => {
                                const isActive = (currentUser.country || 'PE') === c.abbr;
                                return (
                                    <button
                                        key={c.abbr}
                                        type="button"
                                        onClick={() => updateCurrentUser({ country: c.abbr })}
                                        style={{
                                            ...btnStyle,
                                            background: isActive ? '#2ecc71' : btnStyle.background,
                                            color: isActive ? '#111' : (btnStyle.color as string),
                                            fontWeight: isActive ? 700 : 400,
                                        }}
                                        title={c.name}
                                    >
                                        {c.abbr}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {pubs.length === 0 && <p>No tienes publicaciones creadas todavía. Publica una desde cualquier wizard primero.</p>}

                    {pubs.map((pub) => (
                        <div
                            key={pub.id}
                            style={{
                                borderBottom: '1px solid #333',
                                padding: '8px 0',
                                marginBottom: 8,
                            }}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <strong>{pub.title || reportTypeLabel(pub.report_type)}</strong>
                                <span style={{ color: statusColor[pub.status] || '#fff' }}>{pub.status}</span>
                            </div>
                            <div style={{ opacity: 0.7, marginBottom: 6 }}>
                                {reportTypeLabel(pub.report_type)} · {planLabel(pub.plan)} · id: {pub.id.slice(0, 8)}
                            </div>
                            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                                <button type="button" onClick={() => handleSetStatus(pub, 'pending_review')} style={btnStyle}>
                                    Revisión
                                </button>
                                <button type="button" onClick={() => handleSetStatus(pub, 'approved')} style={btnStyle}>
                                    Aprobar
                                </button>
                                <button type="button" onClick={() => handleSetStatus(pub, 'rejected')} style={btnStyle}>
                                    Rechazar
                                </button>
                                <button type="button" onClick={() => handleSetStatus(pub, 'finished')} style={btnStyle}>
                                    Finalizar
                                </button>
                                <button type="button" onClick={() => handleDelete(pub.id)} style={{ ...btnStyle, color: '#e74c3c' }}>
                                    🗑
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

const btnStyle: CSSProperties = {
    background: '#2a2a2a',
    color: '#eee',
    border: '1px solid #444',
    borderRadius: 4,
    padding: '3px 8px',
    cursor: 'pointer',
    fontSize: 11,
};