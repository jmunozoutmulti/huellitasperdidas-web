'use client';

import { useState, useEffect } from 'react';
import { showToast } from '@/components/global/Toast';
import type { Report } from '@/lib/api';
import type { PackageOption } from '@/lib/packagesApi';
import { getCountryByAbbr } from '@/lib/countries';

type Tab = 'activas' | 'revision' | 'rechazadas' | 'finalizadas';
type ReportType = 'lost' | 'found' | 'adoption' | 'sighting';

interface PubCardProps {
    pub: Report;
    tab: Tab;
    packages: PackageOption[];
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

// --- Íconos/textos del badge de estado según status real ---
const STATUS_BADGE: Record<string, { icon: string; text: string }> = {
    pending_approval: { icon: 'ti-clock', text: 'En revisión' },
    active: { icon: 'ti-circle-check', text: 'Aviso publicado' },
    rejected: { icon: 'ti-x', text: 'Rechazado' },
    inactive: { icon: 'ti-hourglass-low', text: 'Finalizado' },
    spam: { icon: 'ti-hourglass-low', text: 'Finalizado' },
    resolved: { icon: 'ti-hourglass-low', text: 'Finalizado' },
};

function reportTypeLabel(reportType: string): string {
    const map: Record<string, string> = {
        lost: 'Perdido',
        found: 'Encontrado',
        adoption: 'Adopción',
        sighting: 'Avistamiento',
    };
    return map[reportType] ?? reportType;
}

function sexLabel(sex: string | null): string {
    if (sex === 'male') return 'Macho';
    if (sex === 'female') return 'Hembra';
    return '';
}

function petTypeLabel(petType: string | null): string {
    if (petType === 'dog') return 'Perro';
    if (petType === 'cat') return 'Gato';
    if (petType === 'bird') return 'Ave';
    return 'Animal';
}

// report_type que tiene concepto de "plan" (perdido/adopción). Encontrado y avistamiento no.
function hasPlan(reportType: string): boolean {
    return reportType === 'lost' || reportType === 'adoption';
}

function typeSuffix(reportType: string): string {
    return reportType === 'lost' ? '' : reportType;
}

// Encontrado no tiene nombre de mascota — armamos un título descriptivo
// a partir de pet_type/breed/sex. Ej: "Perro de raza Pitbull Macho"
function buildFoundTitle(pub: Report): string {
    const parts: string[] = [];
    parts.push(petTypeLabel(pub.pet_type));
    if (pub.meta.breed) parts.push(`de raza ${pub.meta.breed}`);
    if (pub.meta.sex) parts.push(sexLabel(pub.meta.sex));
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

function getDiasRestantes(expiresAt: string | null): number {
    if (!expiresAt) return 0;
    const diffMs = new Date(expiresAt).getTime() - Date.now();
    if (diffMs <= 0) return 0;
    return Math.ceil(diffMs / 86400000);
}

// Reactivar solo funciona si el aviso ya venció de verdad (confirmado con
// backend) — no basta con que esté en la pestaña Finalizados, hay que
// revisar expires_at directamente. Un aviso detenido antes de tiempo no
// pasa esta condición hasta que su fecha real de vencimiento llegue.
function isReallyExpired(pub: Report): boolean {
    if (!pub.expires_at) return false;
    return new Date(pub.expires_at).getTime() < Date.now();
}

function downloadFlyer(flyerUrl: string | null) {
    if (!flyerUrl) {
        showToast('Este aviso todavía no tiene un flyer generado.', 'error');
        return;
    }
    const a = document.createElement('a');
    a.href = flyerUrl;
    a.download = `flyer-${Date.now()}.png`;
    a.target = '_blank';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
}

export default function PubCard({
    pub,
    tab,
    packages,
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
    const paid = !!pub.package_slug && pub.package_slug !== 'gratis';
    const plaBadge = hasPlan(reportType);
    const suffix = typeSuffix(reportType);
    const statusBadge = STATUS_BADGE[pub.status] ?? STATUS_BADGE.pending_approval;
    const diasRestantes = getDiasRestantes(pub.expires_at);
    const displayName = reportType === 'found' ? buildFoundTitle(pub) : pub.title || reportTypeLabel(reportType);
    const planName = packages.find((p) => p.slug === pub.package_slug)?.name ?? pub.package_slug ?? '';
    const canReactivate = isReallyExpired(pub);

    const [currencySymbol, setCurrencySymbol] = useState('');
    useEffect(() => {
        if (pub.country) {
            getCountryByAbbr(pub.country).then((c) => setCurrencySymbol(c?.currencySymbol ?? ''));
        }
    }, [pub.country]);

    const normalPhotos = pub.images.filter((img) => !img.is_flyer);
    const thumbUrl = normalPhotos[0]?.image_url || '/uploads/publicaciones/placeholder.jpg';
    const flyerUrl = pub.images.find((img) => img.is_flyer)?.image_url ?? null;

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

        // finalizadas
        return (
            <>
                {plaBadge && paid && canReactivate && !pub.stopped_by_user && (
                    <button type="button" className="btn-reactivar-pago" onClick={onOpenReactivar}>
                        <i className="ti ti-refresh"></i> Reactivar anuncio
                    </button>
                )}
                {plaBadge && !paid && (
                    <button type="button" className="btn-republicar-gratis" onClick={onOpenRepublicarGratis}>
                        <i className="ti ti-refresh"></i> Volver a publicar
                    </button>
                )}
                <button type="button" className="btn-eliminar-anuncio" onClick={onOpenEliminarAviso}>
                    <i className="ti ti-trash"></i> Eliminar anuncio
                </button>
            </>
        );
    };

    // ============ HEADER: metrics-compact ============
    const renderMetricsCompact = () => {
        if (tab === 'activas' || tab === 'finalizadas') {
            return (
                <div className="pub-accordion-metrics-compact">
                    <span><i className="ti ti-users"></i> {pub.views_count}</span>
                    <span><i className="ti ti-share"></i> {pub.shares_count}</span>
                </div>
            );
        }
        return null;
    };

    // ============ BODY: admin box (revisión / rechazo / info) ============
    const renderAdminBox = () => {
        if (tab === 'activas' && (pub.reactivated_at || pub.extra_reach_purchased_at)) {
            return (
                <>
                    {pub.reactivated_at && (
                        <div className="admin-info-box" style={{ marginTop: '3em' }}>
                            <i className="ti ti-info-circle"></i>
                            <p>Este aviso fue reactivado el <b>{formatFecha(pub.reactivated_at)}</b>.</p>
                        </div>
                    )}
                    {pub.extra_reach_purchased_at && (
                        <div className="admin-info-box" style={{ marginTop: '3em' }}>
                            <i className="ti ti-info-circle"></i>
                            <p>
                                Alcance ampliado a <b>{pub.extra_reach || 'un radio mayor'}</b> el{' '}
                                <b>{formatFecha(pub.extra_reach_purchased_at)}</b>.
                            </p>
                        </div>
                    )}
                </>
            );
        }
        if (tab === 'revision') {
            const REASON_MESSAGES: Record<string, string> = {
                created: reportType === 'sighting'
                    ? 'Estamos validando la información de este avistamiento. Este proceso toma máximo 10 minutos.'
                    : paid
                        ? 'Estamos validando la información antes de activar la difusión.'
                        : 'Estamos validando la información de este anuncio. Este proceso suele tomar hasta 24 horas.',
                edited: 'Estamos revisando tus cambios.',
                upgraded: 'Estamos validando el cambio de plan.',
                extra_reach: 'Estamos validando tu compra de alcance extra.',
                extended: 'Estamos validando la extensión de tiempo.',
                reactivated: 'Estamos revisando la reactivación de tu aviso.',
                reopened: 'Estamos revisando tu solicitud de reapertura.',
            };
            const mensaje = REASON_MESSAGES[pub.pending_reason ?? 'created'] ?? REASON_MESSAGES.created;
            return (
                <div className="admin-info-box info-box-revision">
                    <i className="ti ti-clock"></i>
                    <p>{mensaje}</p>
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
            if (pub.stopped_by_user) {
                return (
                    <div className="admin-info-box">
                        <i className="ti ti-info-circle"></i>
                        <p>
                            Este anuncio finalizó por decisión del usuario
                            {pub.stopped_at && <> el <b>{formatFecha(pub.stopped_at)}</b></>}
                            {pub.refund_status === 'pending' && pub.refund_amount && (
                                <> Se te reembolsará <b>{currencySymbol} {pub.refund_amount}</b> en los próximos días.</>
                            )}
                            {pub.refund_status === 'processed' && pub.refund_amount && (
                                <> Ya se procesó tu reembolso de <b>{currencySymbol} {pub.refund_amount}</b></>
                            )}
                        </p>
                    </div>
                );
            }
            let mensaje = 'Este anuncio finalizó su tiempo de difusión.';
            if (reportType === 'adoption') {
                mensaje = `${displayName} ya fue adoptado o el anuncio caducó. Puedes volver a publicarlo si sigue disponible.`;
            } else if (reportType === 'found') {
                mensaje = 'Este caso de encontrado venció.';
            } else if (reportType === 'sighting') {
                mensaje = 'Este aviso de avistamiento venció.';
            }
            return (
                <div className="admin-info-box">
                    <i className="ti ti-info-circle"></i>
                    <p>
                        {mensaje}
                        {pub.expires_at && <> <br></br> Venció el <b>{formatFecha(pub.expires_at)}</b></>}
                    </p>
                </div>
            );
        }
        return null;
    };

    // ============ BODY: upsell (solo activos, solo lost/adoption) ============
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

    // ============ BODY: editor-actions (activos / rechazados) ============
    const renderEditorActions = () => {
        if (tab === 'activas') {
            if (pub.statistics_ads?.facebook_post_url) {
                return (
                    <div className="pub-editor-actions">
                        <a
                            href={pub.statistics_ads.facebook_post_url}
                            target="_blank"
                            rel="noreferrer"
                            className="tooltip"
                            data-tooltip="Ver difusión"
                        >
                            <i className="ti ti-brand-meta"></i>
                        </a>
                        {reportType !== 'sighting' && (
                            <>
                                <button
                                    type="button"
                                    className="btn-editar-aviso tooltip"
                                    data-tooltip="Editar"
                                    onClick={() => onOpenEditarAviso(reportType as 'lost' | 'adoption' | 'found', displayName)}
                                >
                                    <i className="ti ti-pencil"></i>
                                </button>
                                <button type="button" className="tooltip" data-tooltip="Descargar" onClick={() => downloadFlyer(flyerUrl)}>
                                    <i className="ti ti-download"></i>
                                </button>
                                <a href={`/?id=${pub.id}`} className="tooltip" data-tooltip="Ir al aviso">
                                    <i className="ti ti-external-link"></i>
                                </a>
                            </>
                        )}
                        {reportType === 'sighting' && (
                            <a href={`/?id=${pub.id}`} className="tooltip" data-tooltip="Ir al aviso">
                                <i className="ti ti-external-link"></i>
                            </a>
                        )}
                    </div>
                );
            }
            if (reportType === 'sighting') {
                return (
                    <div className="pub-editor-actions">
                        <button type="button" className="btn-eliminar-anuncio tooltip" data-tooltip="Eliminar" onClick={onOpenEliminarAviso}>
                            <i className="ti ti-trash"></i>
                        </button>
                        <a href={`/?id=${pub.id}`} className="tooltip" data-tooltip="Ir al aviso">
                            <i className="ti ti-external-link"></i>
                        </a>
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
                    <button type="button" className="tooltip" data-tooltip="Descargar" onClick={() => downloadFlyer(flyerUrl)}>
                        <i className="ti ti-download"></i>
                    </button>
                    <a href={`/?id=${pub.id}`} className="tooltip" data-tooltip="Ir al aviso">
                        <i className="ti ti-external-link"></i>
                    </a>
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
            // Reactivar (con el mismo plan) solo si de verdad venció y el
            // usuario no lo detuvo antes de tiempo (confirmado con backend:
            // /reactivate exige expires_at ya pasado).
            if (!canReactivate || pub.stopped_by_user) return null;
            return (
                <div className="pub-editor-actions">
                    <button type="button" className="btn-reactivar-pago" onClick={onOpenReactivar}>
                        <i className="ti ti-refresh"></i> Reactivar anuncio
                    </button>
                </div>
            );
        }
        // Gratis — republicar no depende de expires_at (PUT vacío funciona
        // desde spam/resolved sin importar la fecha).
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
        if (tab !== 'activas' && tab !== 'finalizadas') return null;
        return (
            <div className="stats-detail-grid">
                <div className="stat-detail-card">
                    <div className="stat-detail-body">
                        <div className="stat-detail-top"><span className="stat-detail-value"><i className="ti ti-users"></i> {pub.views_count}</span></div>
                        <span className="stat-detail-label">{tab === 'activas' ? 'Vistas' : 'Vistas totales'}</span>
                    </div>
                </div>
                <div className="stat-detail-card">
                    <div className="stat-detail-body">
                        <div className="stat-detail-top"><span className="stat-detail-value"><i className="ti ti-share"></i> {pub.shares_count}</span></div>
                        <span className="stat-detail-label">Compartidos</span>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className={`pub-accordion-item ${isOpen ? 'open' : ''}`} data-tipo={reportType}>
            <div className="pub-accordion-header" onClick={onToggle}>
                <div className="pub-accordion-thumb">
                    <img src={thumbUrl} alt="" />
                </div>
                <div className="pub-accordion-main">
                    <div className="pub-accordion-title-row">
                        <h4>{displayName}</h4>
                        <span className={`badge-micro ${suffix ? `badge-${suffix}` : ''}`}>{reportTypeLabel(reportType)}</span>
                        {plaBadge && pub.package_slug && (
                            <span className={`badge-plan ${paid ? (reportType === 'adoption' ? 'badge-plan-premiun-adopcion' : 'badge-plan-premiun') : ''}`}>
                                {paid && tab === 'activas' && <span className="status-pulse"></span>} {planName}
                            </span>
                        )}
                    </div>
                    <div className="pub-accordion-meta">
                        {pub.district && <span><i className="ti ti-pin"></i> {[pub.district, pub.province].filter(Boolean).join(', ')}</span>}
                        {tab === 'activas' && paid && pub.expires_at && (
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
                        <i className="ti ti-dots-vertical"></i>
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
                                        <div className="flyer-account-grid-item" style={{ backgroundImage: `url('${thumbUrl}')` }}></div>
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