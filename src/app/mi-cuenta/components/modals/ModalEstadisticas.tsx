'use client';

import { useState, useEffect } from 'react';
import { fetchReport, type ReportDetail } from '@/lib/api';
import { getPackages } from '@/lib/packagesApi';

interface ModalEstadisticasProps {
    isOpen: boolean;
    id: string;
    onClose: () => void;
}

function getDiasRestantes(expiresAt: string | null): number {
    if (!expiresAt) return 0;
    const diffMs = new Date(expiresAt).getTime() - Date.now();
    if (diffMs <= 0) return 0;
    return Math.ceil(diffMs / 86400000);
}

export default function ModalEstadisticas({ isOpen, id, onClose }: ModalEstadisticasProps) {
    const [pub, setPub] = useState<ReportDetail | null>(null);
    const [diasTotales, setDiasTotales] = useState(0);

    useEffect(() => {
        if (!isOpen || !id) return;
        setPub(null);
        setDiasTotales(0);
        fetchReport(id).then(async (report) => {
            setPub(report);
            if (report.package_slug && report.country) {
                const pkgs = await getPackages(report.country);
                const pkg = pkgs.find((p) => p.slug === report.package_slug);
                setDiasTotales(pkg?.days ?? 0);
            }
        });
    }, [isOpen, id]);

    if (!isOpen) return null;

    const stats = pub?.statistics_ads;

    const reachActual = stats?.reach_actual ?? 0;
    const reachProjected = stats?.reach_projected ?? 0;
    const impressions = stats?.impressions ?? 0;
    const clicks = stats?.clicks ?? 0;
    const frequency = stats?.frequency ?? 0;

    const diasRestantes = pub ? getDiasRestantes(pub.expires_at) : 0;
    const ctr = impressions > 0 ? ((clicks / impressions) * 100).toFixed(1) : '0.0';
    const progresoAlcance = reachProjected > 0 ? Math.min(100, Math.round((reachActual / reachProjected) * 100)) : 0;
    const hasAdsData = !!stats && (reachProjected > 0 || impressions > 0);

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
                                {hasAdsData ? (
                                    <>
                                        <div className="stat-metric-card">
                                            <span className="stat-metric-label">Alcance real</span>
                                            <h3 className="stat-metric-value">{reachActual.toLocaleString('es-PE')}</h3>
                                            <span className="stat-metric-sub">de {reachProjected.toLocaleString('es-PE')} proyectados</span>
                                            <div className="stat-progress-bar">
                                                <div className="stat-progress-fill" style={{ width: `${progresoAlcance}%` }}></div>
                                            </div>
                                        </div>
                                        <div className="stat-metric-card">
                                            <span className="stat-metric-label">Impresiones</span>
                                            <h3 className="stat-metric-value">{impressions.toLocaleString('es-PE')}</h3>
                                            <span className="stat-metric-sub">veces mostrado</span>
                                        </div>
                                        <div className="stat-metric-card">
                                            <span className="stat-metric-label">Clicks (CTR)</span>
                                            <h3 className="stat-metric-value">{ctr}%</h3>
                                            <span className="stat-metric-sub">{clicks.toLocaleString('es-PE')} clicks totales</span>
                                        </div>
                                        <div className="stat-metric-card">
                                            <span className="stat-metric-label">Frecuencia</span>
                                            <h3 className="stat-metric-value">{frequency.toFixed(2)}</h3>
                                            <span className="stat-metric-sub">veces por persona</span>
                                        </div>
                                    </>
                                ) : (
                                    <div className="admin-info-box" style={{ gridColumn: '1 / -1' }}>
                                        <i className="ti ti-info-circle"></i>
                                        <p>Las métricas de alcance publicitario todavía no están disponibles para este aviso.</p>
                                    </div>
                                )}
                                <div className="stat-metric-card">
                                    <span className="stat-metric-label">Vistas</span>
                                    <h3 className="stat-metric-value">{pub.views_count.toLocaleString('es-PE')}</h3>
                                </div>
                                <div className="stat-metric-card">
                                    <span className="stat-metric-label">Compartidos</span>
                                    <h3 className="stat-metric-value">{pub.shares_count}</h3>
                                </div>
                                
                            </div>

                            <div className="admin-info-box">
                                <i className="ti ti-info-circle"></i>
                                <p>
                                    Las estadísticas se actualizan cada <b>6 horas</b> mientras tu aviso esté activo.
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