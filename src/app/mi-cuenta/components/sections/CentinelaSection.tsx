'use client';

import Link from 'next/link';
import { useState } from 'react';
import { showToast } from '@/components/global/Toast';

interface Hallazgo {
    id: string;
    thumb: string;
    titulo: string;
    matchLabel: string;
    matchIcon: string;
    matchColor?: string;
    ubicacion?: string;
    fecha?: string;
    esFacebook?: boolean;
    linkHref: string;
}

const hallazgos11Ago: Hallazgo[] = [
    {
        id: 'benji',
        thumb: '/uploads/publicaciones/dog-14.jpg',
        titulo: 'Benji (Poodle toy)',
        matchLabel: '94% Match',
        matchIcon: 'fa-solid fa-brain',
        ubicacion: 'Lima, Miraflores',
        fecha: 'Hoy, 3:01 pm',
        linkHref: '/?pet=benji',
    },
    {
        id: 'facebook-1',
        thumb: '/uploads/publicaciones/dog-3.jpg',
        titulo: 'Posible reporte en grupo de Facebook',
        matchLabel: '87% Match',
        matchIcon: 'fa-solid fa-lock',
        matchColor: '#1877f2',
        ubicacion: 'Miraflores',
        esFacebook: true,
        linkHref: '#',
    },
];

const hallazgos10Ago: Hallazgo[] = [
    {
        id: 'perrito-corriendo',
        thumb: '/uploads/publicaciones/dog-2.jpg',
        titulo: 'Perrito corriendo asustado en Av. Principal',
        matchLabel: '81% Match',
        matchIcon: 'fa-solid fa-brain',
        ubicacion: 'San Borja',
        fecha: '10 Ago 2026, 5:40 pm',
        linkHref: '#',
    },
];

export default function CentinelaSection() {
    const [descartados, setDescartados] = useState<Set<string>>(new Set());

    const handleDescartar = (id: string) => {
        setDescartados((prev) => new Set(prev).add(id));
        showToast('Hallazgo descartado.', 'info');
    };

    const renderHallazgo = (h: Hallazgo) => {
        if (descartados.has(h.id)) return null;

        return (
            <div className="centinela-hallazgo-row" key={h.id}>
                <div className="centinela-hallazgo-thumb">
                    <img src={h.thumb} alt="" />
                </div>
                <div className="centinela-hallazgo-grid">
                    <div className="centinela-hallazgo-main">
                        <div className="centinela-hallazgo-title-row">
                            <h6>{h.titulo}</h6>
                            <span
                                className="ia-matches-badge-horizontal"
                                style={
                                    h.matchColor
                                        ? { color: h.matchColor, backgroundColor: 'rgb(24 119 242 / 13%)' }
                                        : undefined
                                }
                            >
                                <i className={h.matchIcon}></i> {h.matchLabel}
                            </span>
                        </div>
                        <div className="centinela-hallazgo-meta">
                            {h.ubicacion && (
                                <span>
                                    <i className="ti ti-pin"></i> {h.ubicacion}
                                </span>
                            )}
                            {h.fecha && (
                                <span>
                                    <i className="ti ti-clock-hour-5"></i> {h.fecha}
                                </span>
                            )}
                            {h.esFacebook && (
                                <span style={{ color: '#1877f2' }}>
                                    <i className="fa-brands fa-facebook"></i> Facebook
                                </span>
                            )}
                        </div>
                    </div>
                    <div className="centinela-hallazgo-actions">
                        {h.linkHref.startsWith('/') ? (
                            <Link href={h.linkHref} className="pub-btn pub-btn-secondary">
                                <i className="ti ti-external-link"></i> Ver publicación
                            </Link>
                        ) : (
                            <a href={h.linkHref} className="pub-btn pub-btn-secondary">
                                <i className="ti ti-external-link"></i> Ver publicación
                            </a>
                        )}
                        <button
                            type="button"
                            className="centinela-descartar-btn"
                            onClick={() => handleDescartar(h.id)}
                        >
                            <i className="ti ti-x"></i>
                        </button>
                    </div>
                </div>
            </div>
        );
    };

    const visibles11Ago = hallazgos11Ago.filter((h) => !descartados.has(h.id));
    const visibles10Ago = hallazgos10Ago.filter((h) => !descartados.has(h.id));

    return (
        <div className="cuenta-section active" id="section-centinela">
            <div className="dashboard-recent-header">
                <h2 className="dashboard-subsection-title">Centinela IA</h2>
                <p>
                    <i className="ti ti-info-circle"></i> Coincidencias que encontramos automáticamente para <b>Toby</b>
                </p>
            </div>

            <div className="centinela-hallazgos-list">
                {visibles11Ago.length > 0 && (
                    <div className="centinela-day-group">
                        <h5 className="centinela-day-label">11 de Agosto</h5>
                        {hallazgos11Ago.map(renderHallazgo)}
                    </div>
                )}

                {visibles10Ago.length > 0 && (
                    <div className="centinela-day-group">
                        <h5 className="centinela-day-label">10 de Agosto</h5>
                        {hallazgos10Ago.map(renderHallazgo)}
                    </div>
                )}
            </div>
        </div>
    );
}