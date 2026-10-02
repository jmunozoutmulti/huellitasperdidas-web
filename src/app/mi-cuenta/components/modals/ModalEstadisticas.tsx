'use client';
import { useState, useEffect } from 'react';
import { fetchReport, type ReportDetail } from '@/lib/api';
import { getLocaleForCountry } from '@/lib/countries';
import { IconX, IconLoader, IconInfoCircle } from '@tabler/icons-react';

interface ModalEstadisticasProps {
    isOpen: boolean;
    id: string;
    onClose: () => void;
}

export default function ModalEstadisticas({ isOpen, id, onClose }: ModalEstadisticasProps) {
    const [pub, setPub] = useState<ReportDetail | null>(null);

    useEffect(() => {
        if (!isOpen || !id) return;
        setPub(null);
        fetchReport(id).then((report) => {
            setPub(report);
        });
    }, [isOpen, id]);

    if (!isOpen) return null;

    const stats = pub?.statistics_ads;

    const reachActual = stats?.reach_actual ?? 0;
    const impressions = stats?.impressions ?? 0;
    const clicks = stats?.clicks ?? 0;

    const hasAdsData = !!stats && impressions > 0;
    const locale = getLocaleForCountry(pub?.country);

    return (
        <div className="app-modal open" id="modal-estadisticas">
            <div className="app-modal-backdrop" onClick={onClose}></div>
            <div className="app-modal-card">
                <div className="app-modal-header">
                    <h3>Estadísticas del aviso</h3>
                    <button type="button" className="app-modal-close" onClick={onClose}>
                        <IconX />
                    </button>
                </div>
                <div className="app-modal-body">
                    {!pub ? (
                        <div className="admin-info-box">
                            <IconLoader />
                            <p>Cargando estadísticas...</p>
                        </div>
                    ) : (
                        <>
                            <div className="stats-grid">
                                {hasAdsData ? (
                                    <>
                                        <div className="stat-metric-card">
                                            <span className="stat-metric-label">Alcance</span>
                                            <h3 className="stat-metric-value">{reachActual.toLocaleString(locale)}</h3>
                                            <span className="stat-metric-sub">Personas alcanzadas</span>
                                        </div>
                                        <div className="stat-metric-card">
                                            <span className="stat-metric-label">Impresiones</span>
                                            <h3 className="stat-metric-value">{impressions.toLocaleString(locale)}</h3>
                                            <span className="stat-metric-sub">veces mostrado</span>
                                        </div>
                                        <div className="stat-metric-card">
                                            <span className="stat-metric-label">Clics en el anuncio</span>
                                            <h3 className="stat-metric-value">{Math.round(clicks).toLocaleString(locale)}</h3>
                                        </div>
                                    </>
                                ) : (
                                    <div className="admin-info-box" style={{ gridColumn: '1 / -1' }}>
                                        <IconInfoCircle />
                                        <p>Las métricas de alcance publicitario todavía no están disponibles para este aviso.</p>
                                    </div>
                                )}
                            </div>

                            <div className="admin-info-box">
                                <IconInfoCircle />
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