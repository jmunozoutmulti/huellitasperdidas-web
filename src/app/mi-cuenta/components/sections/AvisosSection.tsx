'use client';

import { useEffect, useState } from 'react';
import { useApp } from '@/context/AppContext';
import { fetchMyReports, type Report } from '@/lib/api';
import { getPackages, type PackageOption } from '@/lib/packagesApi';
import PubCard from '../cards/PubCard';
import AlertBanner from '@/components/global/AlertBanner';

type Tab = 'activas' | 'revision' | 'rechazadas' | 'finalizadas';

const TAB_ICON: Record<Tab, string> = {
    activas: 'ti-check',
    revision: 'ti-clock',
    rechazadas: 'ti-ban',
    finalizadas: 'ti-x',
};

const TAB_LABEL: Record<Tab, string> = {
    activas: 'Activos',
    revision: 'En revisión',
    rechazadas: 'Rechazados',
    finalizadas: 'Finalizados',
};

// Un aviso 'active' cuyo expires_at ya pasó se trata como Finalizado en
// pantalla, aunque el backend todavía no tenga un job que lo pase a
// spam/resolved automáticamente (confirmado con backend: no existe ese
// job todavía) — evita mostrarlo como si siguiera vigente.
function isExpired(pub: Report): boolean {
    if (!pub.expires_at) return false;
    return new Date(pub.expires_at).getTime() < Date.now();
}

function getDiasRestantes(expiresAt: string | null): number {
    if (!expiresAt) return 0;
    const diffMs = new Date(expiresAt).getTime() - Date.now();
    if (diffMs <= 0) return 0;
    return Math.ceil(diffMs / 86400000);
}

function getTab(pub: Report): Tab | null {
    if (pub.status === 'pending_approval') return 'revision';
    if (pub.status === 'rejected') return 'rechazadas';
    if (pub.status === 'active') {
        return isExpired(pub) ? 'finalizadas' : 'activas';
    }
    // Detener pone status en 'spam' (confirmado con backend) — mismo bucket
    // que "venció solo". Se distinguen dentro de la tarjeta con stopped_by_user,
    // no con una pestaña aparte.
    if (pub.status === 'spam' || pub.status === 'resolved' || pub.status === 'inactive') return 'finalizadas';
    return null; // 'deleted' u otro estado no contemplado — no se muestra
}

interface DashboardSectionProps {
    activePubTab: Tab;
    setActivePubTab: (tab: Tab) => void;
    openAccordions: Record<string, boolean>;
    toggleAccordion: (key: string) => void;
    openMoreMenus: Record<string, boolean>;
    toggleMoreMenu: (e: React.MouseEvent, key: string) => void;
    onOpenEditarAviso: (id: string, tipo: 'lost' | 'adoption' | 'found') => void;
    onOpenEstadisticas: (id: string) => void;
    onOpenDetener: (id: string) => void;
    onOpenEliminarAviso: (id: string) => void;
    onOpenAlcance: (id: string) => void;
    onOpenUpgrade: (id: string) => void;
    onOpenReactivar: (id: string) => void;
    onOpenRepublicarGratis: (id: string) => void;
    onOpenTiempo: (id: string) => void;
    refreshKey: number;
    onSetAccordionOpen: (id: string, isOpen: boolean) => void;
}

export default function DashboardSection({
    activePubTab,
    setActivePubTab,
    openAccordions,
    toggleAccordion,
    onSetAccordionOpen,
    openMoreMenus,
    toggleMoreMenu,
    onOpenEditarAviso,
    onOpenEstadisticas,
    onOpenDetener,
    onOpenEliminarAviso,
    onOpenAlcance,
    onOpenUpgrade,
    onOpenReactivar,
    onOpenRepublicarGratis,
    onOpenTiempo,
    refreshKey,
}: DashboardSectionProps) {
    const { currentUser } = useApp();
    const [publications, setPublications] = useState<Report[]>([]);
    const [dismissedBannerIds, setDismissedBannerIds] = useState<Set<string>>(new Set());
    const [packages, setPackages] = useState<PackageOption[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (!currentUser) return;
        let isCancelled = false;
        setIsLoading(true);
        Promise.all([fetchMyReports(), getPackages(currentUser.country || 'PE')])
            .then(([reports, pkgs]) => {
                if (!isCancelled) {
                    setPublications(reports);
                    setPackages(pkgs);
                }
            })
            .finally(() => {
                if (!isCancelled) setIsLoading(false);
            });
        return () => {
            isCancelled = true;
        };
    }, [currentUser, refreshKey]);

    const tabs: Tab[] = ['activas', 'revision', 'rechazadas', 'finalizadas'];

    const countByTab = (tab: Tab) => publications.filter((p) => getTab(p) === tab).length;
    const currentPubs = publications.filter((p) => getTab(p) === activePubTab);

    useEffect(() => {
        const firstId = currentPubs[0]?.id;
        if (firstId) {
            onSetAccordionOpen(firstId, true);
        }
    }, [currentPubs[0]?.id]);

    return (
        <div className="cuenta-section active" id="section-dashboard">
            <div className="dashboard-recent-header">
                <h2 className="dashboard-subsection-title">Mis avisos</h2>
                <p>
                    <i className="ti ti-info-circle"></i> Resumen del rendimiento de tus avisos
                </p>
            </div>

            {publications
                .filter((p) => {
                    if (p.status !== 'active') return false;
                    if (!p.package_slug || p.package_slug === 'gratis') return false;
                    if (dismissedBannerIds.has(p.id)) return false;
                    const dias = getDiasRestantes(p.expires_at);
                    return dias > 0 && dias <= 1;
                })
                .map((p) => (
                    <AlertBanner
                        key={p.id}
                        type="danger"
                        autoDismiss={false}
                        message={
                            <>
                                Tu aviso <b>{p.title || 'sin título'}</b> vence mañana. Actívalo con más tiempo para seguir siendo visible.
                            </>
                        }
                        actionLabel="Ampliar tiempo"
                        actionIcon="ti ti-history"
                        onAction={() => onOpenTiempo(p.id)}
                        onClose={() => setDismissedBannerIds((prev) => new Set(prev).add(p.id))}
                    />
                ))}

            <div className="dashboard-filters">
                <div className="pub-tabs">
                    {tabs.map((tab) => (
                        <button
                            key={tab}
                            type="button"
                            className={`pub-tab ${activePubTab === tab ? 'active' : ''}`}
                            onClick={() => setActivePubTab(tab)}
                        >
                            <i className={`ti ${TAB_ICON[tab]}`}></i> {TAB_LABEL[tab]}{' '}
                            <span className="pub-tab-count">{countByTab(tab)}</span>
                        </button>
                    ))}
                </div>
            </div>

            <div className="pub-tab-content active">
                <div className="pub-accordion">
                    {isLoading && (
                        <div className="loading-state-centered">
                            <div className="loading-spinner"></div>
                            <p>Cargando tus avisos...</p>
                        </div>
                    )}

                    {!isLoading && currentPubs.length === 0 && (
                        <div className="pub-empty-state">
                            <p>No tienes avisos en esta sección todavía.</p>
                        </div>
                    )}
                    {!isLoading &&
                        currentPubs.map((pub) => (
                            <PubCard
                                key={pub.id}
                                pub={pub}
                                tab={activePubTab}
                                packages={packages}
                                isOpen={!!openAccordions[pub.id]}
                                onToggle={() => toggleAccordion(pub.id)}
                                isMenuOpen={!!openMoreMenus[pub.id]}
                                onToggleMenu={(e) => toggleMoreMenu(e, pub.id)}
                                onOpenEditarAviso={(tipo) => onOpenEditarAviso(pub.id, tipo)}
                                onOpenEstadisticas={() => onOpenEstadisticas(pub.id)}
                                onOpenDetener={() => onOpenDetener(pub.id)}
                                onOpenEliminarAviso={() => onOpenEliminarAviso(pub.id)}
                                onOpenAlcance={() => onOpenAlcance(pub.id)}
                                onOpenUpgrade={() => onOpenUpgrade(pub.id)}
                                onOpenReactivar={() => onOpenReactivar(pub.id)}
                                onOpenRepublicarGratis={() => onOpenRepublicarGratis(pub.id)}
                                onOpenTiempo={() => onOpenTiempo(pub.id)}
                            />
                        ))}
                </div>
            </div>
        </div>
    );
}