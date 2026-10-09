'use client';

import { useState, useEffect } from 'react';
import { showToast } from '@/components/global/Toast';
import type { Report } from '@/lib/api';
import type { PackageOption } from '@/lib/packagesApi';
import { getCountryByAbbr, getLocaleForCountry } from '@/lib/countries';
import {
    IconClock,
    IconCircleCheck,
    IconX,
    IconHourglassLow,
    IconChartLine,
    IconBan,
    IconTrash,
    IconPencil,
    IconUsers,
    IconShare,
    IconInfoCircle,
    IconAlertCircle,
    IconUsersGroup,
    IconBroadcast,
    IconBrandMeta,
    IconDownload,
    IconExternalLink,
    IconCreditCardPay,
    IconRefresh,
    IconPin,
    IconHistory,
    IconDotsVertical,
    IconChevronDown,
    IconHeart,
} from '@tabler/icons-react';

type Tab = 'activas' | 'revision' | 'pago_pendiente' | 'rechazadas' | 'finalizadas';
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
    onOpenRetryPago: () => void;
}

// 1. Mapeo de estado (reemplazar la constante STATUS_BADGE):
const STATUS_BADGE: Record<string, { icon: React.ElementType; text: string }> = {
    pending_approval: { icon: IconClock, text: 'En revisión' },
    active: { icon: IconCircleCheck, text: 'Aviso publicado' },
    rejected: { icon: IconX, text: 'Rechazado' },
    inactive: { icon: IconHourglassLow, text: 'Finalizado' },
    spam: { icon: IconHourglassLow, text: 'Finalizado' },
    resolved: { icon: IconHourglassLow, text: 'Finalizado' },
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

function getPendingPaymentBadgeText(pub: Report): string | null {
    if (pub.payment_status !== 'pending' && pub.payment_status !== 'failed') return null;
    if (pub.payment_flow_type === 'create') return null; // ese caso ya va a otro tab, no se muestra acá

    const action = pub.payment_status === 'failed' ? 'Reintentar pago' : 'Pago en proceso';

    switch (pub.payment_flow_type) {
        case 'upgrade':
            return `${action} de upgrade`;
        case 'extra_reach':
            return `${action} de alcance extra`;
        case 'extend':
            return `${action} de tiempo extra`;
        case 'reactivate':
            return `${action} de reactivación`;
        default:
            return action;
    }
}

function sexLabel(sex: string | null): string {
    if (sex === 'macho') return 'Macho';
    if (sex === 'hembra') return 'Hembra';
    return '';
}
function petTypeLabel(petType: string | null): string {
    if (petType === 'perro') return 'Perro';
    if (petType === 'gato') return 'Gato';
    if (petType === 'ave') return 'Ave';
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

function formatFecha(iso: string, countryCode?: string | null): string {
    return new Date(iso).toLocaleString(getLocaleForCountry(countryCode), {
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
    onOpenRetryPago,
}: PubCardProps) {
    const reportType = pub.report_type as ReportType;
    const paid = !!pub.package_slug && pub.package_slug !== 'gratis';
    const plaBadge = hasPlan(reportType);
    const suffix = typeSuffix(reportType);
    const statusBadge = STATUS_BADGE[pub.status] ?? STATUS_BADGE.pending_approval;
    const diasRestantes = getDiasRestantes(pub.expires_at ?? null);
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
                            <IconChartLine /> Estadísticas
                        </button>
                        <button type="button" className="btn-detener-anuncio" onClick={onOpenDetener}>
                            <IconBan /> Detener anuncio
                        </button>
                        <button type="button" className="btn-eliminar-anuncio" onClick={onOpenEliminarAviso}>
                            <IconTrash /> Eliminar anuncio
                        </button>
                    </>
                );
            }
            return (
                <button type="button" className="btn-eliminar-anuncio" onClick={onOpenEliminarAviso}>
                    <IconTrash /> Eliminar anuncio
                </button>
            );
        }

        if (tab === 'revision') {
            return (
                <button type="button" className="btn-eliminar-anuncio" onClick={onOpenEliminarAviso}>
                    <IconTrash /> Eliminar anuncio
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
                            <IconPencil /> Editar anuncio
                        </button>
                    )}
                    <button type="button" className="btn-eliminar-anuncio" onClick={onOpenEliminarAviso}>
                        <IconTrash /> Eliminar anuncio
                    </button>
                </>
            );
        }

        // finalizadas
        return (
            <>
                <button type="button" className="btn-eliminar-anuncio" onClick={onOpenEliminarAviso}>
                    <IconTrash /> Eliminar anuncio
                </button>
            </>
        );
    };

    // ============ HEADER: metrics-compact ============
    const renderMetricsCompact = () => {
        if (tab === 'activas' || tab === 'finalizadas') {
            return (
                <div className="pub-accordion-metrics-compact">
                    <span><IconUsers /> {pub.views_count}</span>
                    <span><IconShare /> {pub.shares_count}</span>
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
                        <div className="admin-info-box">
                            <IconInfoCircle />
                            <p>Este aviso fue reactivado el <b>{formatFecha(pub.reactivated_at, pub.country)}</b>.</p>
                        </div>
                    )}
                    {pub.extra_reach_purchased_at && (
                        <div className="admin-info-box">
                            <IconInfoCircle />
                            <p>
                                Alcance ampliado a <b>{pub.extra_reach || 'un radio mayor'}</b> el{' '}
                                <b>{formatFecha(pub.extra_reach_purchased_at, pub.country)}</b>.
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
                    <IconClock />
                    <p>{mensaje}</p>
                </div>
            );
        }
        if (tab === 'rechazadas') {
            return (
                <div className="admin-reason-box">
                    <IconAlertCircle />
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
                        <IconInfoCircle />
                        <p>
                            Este anuncio finalizó por decisión del usuario
                            {pub.stopped_at && <> el <b>{formatFecha(pub.stopped_at, pub.country)}</b></>}
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
                    <IconInfoCircle />
                    <p>
                        {mensaje}
                        {pub.expires_at && <> <br></br> Venció el <b>{formatFecha(pub.expires_at, pub.country)}</b></>}
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
                        <IconUsersGroup /> Llegar a más personas
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
                    <IconBroadcast /> Difundir ahora
                </button>
            </div>
        );
    };

    // ============ BODY: editor-actions (activos / rechazados) ============
    const renderEditorActions = () => {
        if (tab === 'activas') {
            if (reportType === 'sighting') {
                return (
                    <div className="pub-editor-actions">
                        <button type="button" className="btn-eliminar-anuncio tooltip" data-tooltip="Eliminar" onClick={onOpenEliminarAviso}>
                            <IconTrash />
                        </button>
                        <a href={`/?id=${pub.id}`} className="tooltip" data-tooltip="Ir al aviso">
                            <IconExternalLink />
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
                        <IconPencil />
                    </button>
                    <button type="button" className="tooltip" data-tooltip="Descargar" onClick={() => downloadFlyer(flyerUrl)}>
                        <IconDownload />
                    </button>
                    <a href={`/?id=${pub.id}`} className="tooltip" data-tooltip="Ir al aviso">
                        <IconExternalLink />
                    </a>
                </div>
            );
        }

        if (tab === 'rechazadas') {
            if (reportType === 'sighting') {
                return (
                    <div className="pub-editor-actions">
                        <button type="button" className="btn-eliminar-anuncio danger tooltip" data-tooltip="Eliminar" onClick={onOpenEliminarAviso}>
                            <IconTrash />
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
                        <IconPencil />
                    </button>
                    <button type="button" className="btn-eliminar-anuncio danger tooltip" data-tooltip="Eliminar" onClick={onOpenEliminarAviso}>
                        <IconTrash />
                    </button>
                </div>
            );
        }

        return null;
    };

    // ============ BODY: acción de pago pendiente (terminar de pagar) ============
    const renderPagoPendienteAction = () => {
        if (tab !== 'pago_pendiente') return null;
        return (
            <div className="pub-editor-actions">
                <button type="button" className="btn-reactivar-pago" onClick={onOpenRetryPago}>
                    <IconCreditCardPay /> Terminar de pagar
                </button>
            </div>
        );
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
                        <IconRefresh /> Reactivar anuncio
                    </button>
                </div>
            );
        }
        // Gratis — republicar no depende de expires_at (PUT vacío funciona
        // desde spam/resolved sin importar la fecha).
        return (
            <div className="pub-editor-actions">
                <button type="button" className="btn-republicar-gratis" onClick={onOpenRepublicarGratis}>
                    <IconRefresh /> Volver a publicar
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
                        <div className="stat-detail-top"><span className="stat-detail-value"><IconUsers /> {pub.views_count}</span></div>
                        <span className="stat-detail-label">{tab === 'activas' ? 'Vistas' : 'Vistas totales'}</span>
                    </div>
                </div>
                <div className="stat-detail-card">
                    <div className="stat-detail-body">
                        <div className="stat-detail-top"><span className="stat-detail-value"><IconShare /> {pub.shares_count}</span></div>
                        <span className="stat-detail-label">Compartidos</span>
                    </div>
                </div>
            </div>
        );
    };

    // ============ BANNER: campaña de difusión activa (solo activos de pago) ============
    const renderAdsBanner = () => {
        const adsUrl = pub.statistics_ads?.facebook_post_url;
        if (tab !== 'activas' || !paid || !adsUrl) return null;
        return (
            <div className="pub-ads-banner">
                <div className="pub-ads-banner-info">
                    <div className="pub-ads-banner-text">
                        <span className="pub-ads-banner-title">
                            <span className="status-pulse"></span> Campaña de difusión activa
                        </span>
                        <span className="pub-ads-banner-desc">
                            Tu aviso se está mostrando a personas cercanas a la zona de pérdida.
                        </span>
                    </div>
                </div>
                <a
                    href={adsUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="pub-ads-banner-link"
                >
                    <IconBrandMeta />  Ver difusión
                </a>
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
                        {
                            /*getPendingPaymentBadgeText(pub) && (
                                <span className="badge-plan badge-pending-payment">
                                    <span className="status-pulse"></span> {getPendingPaymentBadgeText(pub)}
                                </span> )
                            */
                        }
                    </div>
                    <div className="pub-accordion-meta">
                        {pub.district && <span><IconPin /> {[pub.district, pub.province].filter(Boolean).join(', ')}</span>}
                        {tab === 'activas' && paid && pub.expires_at && (
                            <span
                                className="pub-accordion-time-left"
                                role="button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onOpenTiempo();
                                }}
                            >
                                <IconHistory /> <u>Quedan {diasRestantes} día{diasRestantes === 1 ? '' : 's'}</u>
                            </span>
                        )}
                        <span><b>Publicado:</b> {formatFecha(pub.created_at, pub.country)}</span>
                    </div>
                </div>
                {renderMetricsCompact()}
                <div className="pub-btn-group" onClick={(e) => e.stopPropagation()}>
                    <button type="button" className="action-btn-ghost pub-more-trigger" onClick={onToggleMenu}>
                        <IconDotsVertical />
                    </button>
                    <div className={`pub-more-menu ${isMenuOpen ? 'open' : ''}`}>{renderMenu()}</div>
                </div>
                <button type="button" className="pub-accordion-chevron"><IconChevronDown /></button>
            </div>

            <div className="pub-accordion-body">
                <div className="pub-accordion-body-inner">
                    <div className="pub-editor-stage">
                        <div className="pub-editor-flyer-box">
                            <span className={`badge-plan-status ${suffix ? `status-${suffix}` : ''}`}>
                                <statusBadge.icon /> {statusBadge.text}
                            </span>
                            <div className={`flyer-account state-${reportType}`}>
                                <div className="flyer-account-alert-header">
                                    <h3>
                                        {reportType === 'adoption' && <IconHeart />}
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
                                            <span>{pub.title}</span>
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
                        {renderPagoPendienteAction()}
                        {renderFinalizadaAction()}
                        {renderStatsGrid()}
                    </div>

                    {renderAdsBanner()}
                </div>
            </div>
        </div>
    );
}