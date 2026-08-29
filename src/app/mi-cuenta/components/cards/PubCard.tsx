'use client';

import { showToast } from '@/components/global/Toast';
import {
    type MockPublication,
    reportTypeLabel,
    planLabel,
    isPaidPlan,
    getDiasRestantes,
} from '@/lib/publications';

type Tab = 'activas' | 'revision' | 'rechazadas' | 'finalizadas';
type ReportType = 'lost' | 'found' | 'adoption' | 'sighting';

interface PubCardProps {
    pub: MockPublication;
    tab: Tab;
    isOpen: boolean;
    onToggle: () => void;
    isMenuOpen: boolean;
    onToggleMenu: (e: React.MouseEvent) => void;
    onOpenEditarAviso: (tipo: 'lost' | 'adoption' | 'found', nombre: string, corregir?: string) => void;
    onOpenEstadisticas: () => void;
    onOpenDetener: () => void;
    onOpenEliminarAviso: () => void;
    onOpenAlcance: () => void;
    onOpenUpgrade: () => void;
    onOpenReactivar: () => void;
    onOpenRepublicarGratis: () => void;
    onOpenTiempo: () => void;
}

// --- Íconos/textos del badge de estado según status ---
const STATUS_BADGE: Record<string, { icon: string; text: string }> = {
    pending_review: { icon: 'ti-clock', text: 'En revisión' },
    approved: { icon: 'ti-circle-check', text: 'Aviso publicado' },
    rejected: { icon: 'ti-x', text: 'Rechazada' },
    finished: { icon: 'ti-hourglass-low', text: 'Finalizado' },
};

// report_type que tiene concepto de "plan" (perdido/adopción). Encontrado y avistamiento no.
function hasPlan(reportType: string): boolean {
    return reportType === 'lost' || reportType === 'adoption';
}

// Suffix de clase CSS: '' para lost (no lleva sufijo), 'found'/'adoption'/'sighting' para el resto
function typeSuffix(reportType: string): string {
    return reportType === 'lost' ? '' : reportType;
}

function capitalize(s: string): string {
    return s.charAt(0).toUpperCase() + s.slice(1);
}

// Encontrado no tiene nombre de mascota — armamos un título descriptivo
// a partir de pet_type/breed/sex. Ej: "Perro de raza Pitbull Macho"
function buildFoundTitle(pub: MockPublication): string {
    const parts: string[] = [];
    parts.push(pub.pet_type ? capitalize(pub.pet_type) : 'Animal');
    if (pub.breed) parts.push(`de raza ${pub.breed}`);
    if (pub.sex) parts.push(capitalize(pub.sex));
    return parts.join(' ');
}

function formatFecha(iso: string): string {
    return new Date(iso).toLocaleString('es-PE', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
    });
}

// Convierte el base64 guardado en flyer_image en una descarga real del navegador.
function downloadFlyer(pub: MockPublication) {
    if (!pub.flyer_image) {
        showToast('Este aviso todavía no tiene un flyer generado.', 'error');
        return;
    }
    const a = document.createElement('a');
    a.href = pub.flyer_image;
    a.download = `flyer-${pub.title || pub.report_type}-${pub.id.slice(0, 8)}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    showToast('Flyer descargado correctamente', 'success');
}

export default function PubCard({
    pub,
    tab,
    isOpen,
    onToggle,
    isMenuOpen,
    onToggleMenu,
    onOpenEditarAviso,
    onOpenEstadisticas,
    onOpenDetener,
    onOpenEliminarAviso,
    onOpenAlcance,
    onOpenUpgrade,
    onOpenReactivar,
    onOpenRepublicarGratis,
    onOpenTiempo,
}: PubCardProps) {
    const reportType = pub.report_type as ReportType;
    const paid = isPaidPlan(pub.plan);
    const plaBadge = hasPlan(reportType);
    const suffix = typeSuffix(reportType);
    const statusBadge = STATUS_BADGE[pub.status] ?? STATUS_BADGE.pending_review;
    const diasRestantes = getDiasRestantes(pub.expires_at);
    const displayName = reportType === 'found' ? buildFoundTitle(pub) : pub.title || reportTypeLabel(reportType);

    // ============ MENÚ (pub-more-menu) por tab ============
    const renderMenu = () => {
        if (tab === 'activas') {
            if (paid) {
                return (
                    <>
                        <button type="button" className="btn-ver-estadisticas" onClick={onOpenEstadisticas}>
                            <i className="ti ti-chart-line"></i> Estadísticas
                        </button>
                        <button type="button" className="btn-detener-anuncio" onClick={onOpenDetener}>
                            <i className="ti ti-ban"></i> Detener anuncio
                        </button>
                        <button type="button" className="btn-eliminar-anuncio" onClick={onOpenEliminarAviso}>
                            <i className="ti ti-trash"></i> Eliminar anuncio
                        </button>
                    </>
                );
            }
            return (
                <button type="button" className="btn-eliminar-anuncio" onClick={onOpenEliminarAviso}>
                    <i className="ti ti-trash"></i> Eliminar anuncio
                </button>
            );
        }

        if (tab === 'revision') {
            return (
                <button type="button" className="btn-eliminar-anuncio" onClick={onOpenEliminarAviso}>
                    <i className="ti ti-trash"></i> Eliminar anuncio
                </button>
            );
        }

        if (tab === 'rechazadas') {
            return (
                <>
                    {reportType !== 'sighting' && (
                        <button
                            type="button"
                            className="btn-editar-aviso"
                            onClick={() => onOpenEditarAviso(reportType as 'lost' | 'adoption' | 'found', displayName)}
                        >
                            <i className="ti ti-pencil"></i> Editar anuncio
                        </button>
                    )}
                    <button type="button" className="btn-eliminar-anuncio" onClick={onOpenEliminarAviso}>
                        <i className="ti ti-trash"></i> Eliminar anuncio
                    </button>
                </>
            );
        }

        // finalizadas — solo Eliminar anuncio, para los 4 tipos
        return (
            <button type="button" className="btn-eliminar-anuncio" onClick={onOpenEliminarAviso}>
                <i className="ti ti-trash"></i> Eliminar anuncio
            </button>
        );
    };

    // ============ HEADER: metrics-compact ============
    const renderMetricsCompact = () => {
        if (tab === 'activas') {
            return (
                <div className="pub-accordion-metrics-compact">
                    <span><i className="ti ti-users"></i> {pub.statistics.views}</span>
                    <span><i className="ti ti-message-circle"></i> {pub.statistics.comments_count}</span>
                    <span><i className="ti ti-share"></i> {pub.statistics.shares}</span>
                </div>
            );
        }
        if (tab === 'finalizadas') {
            return (
                <div className="pub-accordion-metrics-compact">
                    <span><i className="ti ti-users"></i> {pub.statistics.views}</span>
                    <span><i className="ti ti-share"></i> {pub.statistics.shares}</span>
                </div>
            );
        }
        return null;
    };

    // ============ BODY: admin box (revisión / rechazo / info) ============
    const renderAdminBox = () => {
        if (tab === 'revision') {
            return (
                <div className="admin-info-box info-box-revision">
                    <i className="ti ti-clock"></i>
                    <p>
                        {reportType === 'sighting' ? (
                            <>Estamos <b>validando la información</b> de este avistamiento. Este proceso toma máximo 10 minutos.</>
                        ) : paid ? (
                            <>Estamos <b>validando la información</b> antes de activar la difusión.</>
                        ) : (
                            <>Estamos <b>validando la información</b> de este anuncio. Este proceso suele tomar hasta 24 horas.</>
                        )}
                    </p>
                </div>
            );
        }
        if (tab === 'rechazadas') {
            return (
                <div className="admin-reason-box">
                    <i className="ti ti-alert-circle"></i>
                    <div>
                        <b>Motivo del rechazo</b>
                        <p>{pub.rejection_reason || 'No se especificó un motivo.'}</p>
                    </div>
                </div>
            );
        }
        if (tab === 'finalizadas') {
            let mensaje = 'Este anuncio finalizó su tiempo de difusión. Ahora aparece en la sección Explorar.';
            if (pub.stopped_by_user) {
                mensaje = 'Este anuncio finalizó por petición tuya.';
            } else if (reportType === 'adoption') {
                mensaje = `${displayName} ya fue adoptado o el anuncio caducó. Puedes volver a publicarlo si sigue disponible.`;
            } else if (reportType === 'found') {
                mensaje = 'Este caso pasó a la sección Explorar como referencia.';
            } else if (reportType === 'sighting') {
                mensaje = 'Este aviso de avistamiento venció. Ahora aparece en Explorar como caso de referencia.';
            }
            return (
                <div className="admin-info-box">
                    <i className="ti ti-info-circle"></i>
                    <p>{mensaje}</p>
                </div>
            );
        }
        return null;
    };

    // ============ BODY: upsell (solo aprobados, solo lost/adoption) ============
    const renderUpsell = () => {
        if (tab !== 'activas' || !plaBadge) return null;
        if (paid) {
            return (
                <div className="admin-flyer-actions">
                    <button
                        type="button"
                        className="btn-llegar-mas-personas btn-upsell btn-upsell-primary"
                        onClick={onOpenAlcance}
                    >
                        <i className="ti ti-users-group"></i> Llegar a más personas
                    </button>
                </div>
            );
        }
        return (
            <div className="admin-flyer-actions">
                <button
                    type="button"
                    className="btn-upsell btn-upsell-plan"
                    data-tipo={reportType}
                    onClick={onOpenUpgrade}
                >
                    <i className="ti ti-broadcast"></i> Difundir ahora
                </button>
            </div>
        );
    };

    // ============ BODY: editor-actions (aprobados / rechazadas) ============
    const renderEditorActions = () => {
        if (tab === 'activas') {
            if (reportType === 'sighting') {
                return (
                    <div className="pub-editor-actions">
                        <button type="button" className="btn-eliminar-anuncio tooltip" data-tooltip="Eliminar" onClick={onOpenEliminarAviso}>
                            <i className="ti ti-trash"></i>
                        </button>
                    </div>
                );
            }
            return (
                <div className="pub-editor-actions">
                    <button
                        type="button"
                        className="btn-editar-aviso tooltip"
                        data-tooltip="Editar"
                        onClick={() => onOpenEditarAviso(reportType as 'lost' | 'adoption' | 'found', displayName)}
                    >
                        <i className="ti ti-pencil"></i>
                    </button>
                    <button type="button" className="tooltip" data-tooltip="Descargar" onClick={() => downloadFlyer(pub)}>
                        <i className="ti ti-download"></i>
                    </button>
                    <button type="button" className="tooltip" data-tooltip="Ir al aviso"><i className="ti ti-external-link"></i></button>
                </div>
            );
        }

        if (tab === 'rechazadas') {
            if (reportType === 'sighting') {
                return (
                    <div className="pub-editor-actions">
                        <button type="button" className="btn-eliminar-anuncio danger tooltip" data-tooltip="Eliminar" onClick={onOpenEliminarAviso}>
                            <i className="ti ti-trash"></i>
                        </button>
                    </div>
                );
            }
            return (
                <div className="pub-editor-actions">
                    <button
                        type="button"
                        className="btn-editar-aviso tooltip"
                        data-tooltip="Editar"
                        onClick={() => onOpenEditarAviso(reportType as 'lost' | 'adoption' | 'found', displayName)}
                    >
                        <i className="ti ti-pencil"></i>
                    </button>
                    <button type="button" className="btn-eliminar-anuncio danger tooltip" data-tooltip="Eliminar" onClick={onOpenEliminarAviso}>
                        <i className="ti ti-trash"></i>
                    </button>
                </div>
            );
        }

        return null;
    };

    // ============ BODY: acción de finalizadas (reactivar / republicar) ============
    const renderFinalizadaAction = () => {
        if (tab !== 'finalizadas' || !plaBadge) return null;
        if (paid) {
            return (
                <div className="pub-editor-actions">
                    <button type="button" className="btn-reactivar-pago" onClick={onOpenReactivar}>
                        <i className="ti ti-refresh"></i> Reactivar anuncio
                    </button>
                </div>
            );
        }
        return (
            <div className="pub-editor-actions">
                <button type="button" className="btn-republicar-gratis" onClick={onOpenRepublicarGratis}>
                    <i className="ti ti-refresh"></i> Volver a publicar
                </button>
            </div>
        );
    };

    // ============ BODY: stats-detail-grid ============
    const renderStatsGrid = () => {
        if (tab === 'activas') {
            return (
                <div className="stats-detail-grid">
                    <div className="stat-detail-card">
                        <div className="stat-detail-body">
                            <div className="stat-detail-top"><span className="stat-detail-value"><i className="ti ti-users"></i> {pub.statistics.views}</span></div>
                            <span className="stat-detail-label">Vistas</span>
                        </div>
                    </div>
                    <div className="stat-detail-card">
                        <div className="stat-detail-body">
                            <div className="stat-detail-top"><span className="stat-detail-value"><i className="ti ti-share"></i> {pub.statistics.shares}</span></div>
                            <span className="stat-detail-label">Compartidos</span>
                        </div>
                    </div>
                    {reportType !== 'sighting' && (
                        <div className="stat-detail-card">
                            <div className="stat-detail-body">
                                <div className="stat-detail-top"><span className="stat-detail-value"><i className="ti ti-message-circle"></i> {pub.statistics.comments_count}</span></div>
                                <span className="stat-detail-label">Comentarios</span>
                            </div>
                        </div>
                    )}
                </div>
            );
        }
        if (tab === 'finalizadas') {
            return (
                <div className="stats-detail-grid">
                    <div className="stat-detail-card">
                        <div className="stat-detail-body">
                            <div className="stat-detail-top"><span className="stat-detail-value"><i className="ti ti-users"></i> {pub.statistics.views}</span></div>
                            <span className="stat-detail-label">Vistas totales</span>
                        </div>
                    </div>
                    <div className="stat-detail-card">
                        <div className="stat-detail-body">
                            <div className="stat-detail-top"><span className="stat-detail-value"><i className="ti ti-share"></i> {pub.statistics.shares}</span></div>
                            <span className="stat-detail-label">Compartidos</span>
                        </div>
                    </div>
                </div>
            );
        }
        return null;
    };

    return (
        <div className={`pub-accordion-item ${isOpen ? 'open' : ''}`} data-tipo={reportType}>
            <div className="pub-accordion-header" onClick={onToggle}>
                <div className="pub-accordion-thumb">
                    <img src={pub.images[0] || '/uploads/publicaciones/placeholder.jpg'} alt="" />
                </div>
                <div className="pub-accordion-main">
                    <div className="pub-accordion-title-row">
                        <h4>{displayName}</h4>
                        <span className={`badge-micro ${suffix ? `badge-${suffix}` : ''}`}>{reportTypeLabel(reportType)}</span>
                        {plaBadge && (
                            <span className={`badge-plan ${paid ? 'badge-plan-premiun' : ''}`}>
                                {paid && <span className="status-pulse"></span>} {planLabel(pub.plan, pub.country || 'PE')}
                            </span>
                        )}
                    </div>
                    <div className="pub-accordion-meta">
                        {pub.district && <span><i className="ti ti-pin"></i> {[pub.district, pub.province].filter(Boolean).join(', ')}</span>}
                        {tab === 'activas' && paid && (
                            <span
                                className="pub-accordion-time-left"
                                role="button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onOpenTiempo();
                                }}
                            >
                                <i className="ti ti-history"></i> <u>Quedan {diasRestantes} día{diasRestantes === 1 ? '' : 's'}</u>
                            </span>
                        )}
                        <span><b>Publicado:</b> {formatFecha(pub.created_at)}</span>
                    </div>
                </div>
                {renderMetricsCompact()}
                <div className="pub-btn-group" onClick={(e) => e.stopPropagation()}>
                    <button type="button" className="action-btn-ghost pub-more-trigger" onClick={onToggleMenu}>
                        <i className="ti ti-pencil"></i>
                    </button>
                    <div className={`pub-more-menu ${isMenuOpen ? 'open' : ''}`}>{renderMenu()}</div>
                </div>
                <button type="button" className="pub-accordion-chevron"><i className="ti ti-chevron-down"></i></button>
            </div>

            <div className="pub-accordion-body">
                <div className="pub-accordion-body-inner">
                    <div className="pub-editor-stage">
                        <div className="pub-editor-flyer-box">
                            <span className={`badge-plan-status ${suffix ? `status-${suffix}` : ''}`}>
                                <i className={`ti ${statusBadge.icon}`}></i> {statusBadge.text}
                            </span>
                            <div className={`flyer-account state-${reportType}`}>
                                <div className="flyer-account-alert-header">
                                    <h3>
                                        {reportType === 'adoption' && <i className="ti ti-heart"></i>}
                                        {reportType === 'lost' && '¡BUSCAMOS!'}
                                        {reportType === 'adoption' && ' ADOPCIÓN'}
                                        {reportType === 'found' && 'ENCONTRADO'}
                                        {reportType === 'sighting' && 'AVISTAMIENTO'}
                                    </h3>
                                </div>
                                <div className="flyer-account-photo-stage">
                                    <div className="flyer-account-dynamic-grid">
                                        <div className="flyer-account-grid-item" style={{ backgroundImage: `url('${pub.images[0] || ''}')` }}></div>
                                    </div>
                                    {plaBadge && pub.title && (
                                        <div className="flyer-account-name-badge">
                                            <span className="flyer-account-name-badge-label">Me llamo <b>{pub.title}</b></span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="pub-editor-side">
                        {renderAdminBox()}
                        {renderUpsell()}
                        {renderEditorActions()}
                        {renderFinalizadaAction()}
                        {renderStatsGrid()}
                    </div>
                </div>
            </div>
        </div>
    );
}