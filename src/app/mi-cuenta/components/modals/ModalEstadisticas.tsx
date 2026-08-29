'use client';

import { useState, useEffect } from 'react';
import { getPublicationById, getDiasRestantes, type MockPublication } from '@/lib/publications';
import { getPlanById } from '@/lib/plans';

interface ModalEstadisticasProps {
    isOpen: boolean;
    id: string;
    onClose: () => void;
}

export default function ModalEstadisticas({ isOpen, id, onClose }: ModalEstadisticasProps) {
    const [pub, setPub] = useState<MockPublication | null>(null);

    useEffect(() => {
        if (!isOpen || !id) return;
        setPub(null);
        getPublicationById(id).then(setPub);
    }, [isOpen, id]);

    if (!isOpen) return null;

    const diasRestantes = pub ? getDiasRestantes(pub.expires_at) : 0;
    const diasTotales = pub ? getPlanById(pub.plan, pub.country || 'PE').dias : 0;
    const ctr =
        pub && pub.statistics_ads.impressions > 0
            ? ((pub.statistics_ads.clicks / pub.statistics_ads.impressions) * 100).toFixed(1)
            : '0.0';
    const progresoAlcance =
        pub && pub.statistics_ads.reach_projected > 0
            ? Math.min(100, Math.round((pub.statistics_ads.reach_actual / pub.statistics_ads.reach_projected) * 100))
            : 0;

    return (
        <div className="app-modal open" id="modal-estadisticas">
            <div className="app-modal-backdrop" onClick={onClose}></div>
            <div className="app-modal-card">
                <div className="app-modal-header">
                    <h3>Estadísticas del aviso</h3>
                    <button type="button" className="app-modal-close" onClick={onClose}>
                        <i className="ti ti-x"></i>
                    </button>
                </div>
                <div className="app-modal-body">
                    {!pub ? (
                        <div className="admin-info-box">
                            <i className="ti ti-loader"></i>
                            <p>Cargando estadísticas...</p>
                        </div>
                    ) : (
                        <>
                            <div className="stats-grid">
                                <div className="stat-metric-card">
                                    <span className="stat-metric-label">Alcance real</span>
                                    <h3 className="stat-metric-value">{pub.statistics_ads.reach_actual.toLocaleString('es-PE')}</h3>
                                    <span className="stat-metric-sub">de {pub.statistics_ads.reach_projected.toLocaleString('es-PE')} proyectados</span>
                                    <div className="stat-progress-bar">
                                        <div className="stat-progress-fill" style={{ width: `${progresoAlcance}%` }}></div>
                                    </div>
                                </div>
                                <div className="stat-metric-card">
                                    <span className="stat-metric-label">Impresiones</span>
                                    <h3 className="stat-metric-value">{pub.statistics_ads.impressions.toLocaleString('es-PE')}</h3>
                                    <span className="stat-metric-sub">veces mostrado</span>
                                </div>
                                <div className="stat-metric-card">
                                    <span className="stat-metric-label">Clicks (CTR)</span>
                                    <h3 className="stat-metric-value">{ctr}%</h3>
                                    <span className="stat-metric-sub">{pub.statistics_ads.clicks.toLocaleString('es-PE')} clicks totales</span>
                                </div>
                                <div className="stat-metric-card">
                                    <span className="stat-metric-label">Frecuencia</span>
                                    <h3 className="stat-metric-value">{pub.statistics_ads.frequency.toFixed(2)}</h3>
                                    <span className="stat-metric-sub">veces por persona</span>
                                </div>
                                <div className="stat-metric-card">
                                    <span className="stat-metric-label">Compartidos</span>
                                    <h3 className="stat-metric-value">{pub.statistics.shares}</h3>
                                    <span className="stat-metric-sub">en Facebook / Instagram</span>
                                </div>
                                <div className="stat-metric-card">
                                    <span className="stat-metric-label">Días restantes</span>
                                    <h3 className="stat-metric-value">{diasRestantes}</h3>
                                    <span className="stat-metric-sub">de {diasTotales} días del plan</span>
                                </div>
                            </div>

                            <div className="admin-info-box">
                                <i className="ti ti-info-circle"></i>
                                <p>
                                    Las estadísticas se actualizan cada <b>2 horas</b> mientras tu aviso esté activo.
                                </p>
                            </div>
                        </>
                    )}
                </div>
                <div className="app-modal-footer">
                    <button type="button" className="btn-secondary" onClick={onClose}>
                        Cerrar
                    </button>
                </div>
            </div>
        </div>
    );
}