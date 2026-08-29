'use client';

import { useEffect, useState } from 'react';
import { useApp } from '@/context/AppContext';
import { getMyPublications, type MockPublication } from '@/lib/publications';
import PubCard from '../cards/PubCard';

type Tab = 'activas' | 'revision' | 'rechazadas' | 'finalizadas';

const STATUS_BY_TAB: Record<Tab, string> = {
    activas: 'approved',
    revision: 'pending_review',
    rechazadas: 'rejected',
    finalizadas: 'finished',
};

const TAB_ICON: Record<Tab, string> = {
    activas: 'ti-check',
    revision: 'ti-clock',
    rechazadas: 'ti-ban',
    finalizadas: 'ti-x',
};

const TAB_LABEL: Record<Tab, string> = {
    activas: 'Aprobados',
    revision: 'En revisión',
    rechazadas: 'Rechazadas',
    finalizadas: 'Finalizadas',
};

interface DashboardSectionProps {
    activePubTab: Tab;
    setActivePubTab: (tab: Tab) => void;
    openAccordions: Record<string, boolean>;
    toggleAccordion: (key: string) => void;
    openMoreMenus: Record<string, boolean>;
    toggleMoreMenu: (e: React.MouseEvent, key: string) => void;
    onOpenEditarAviso: (id: string, tipo: 'lost' | 'adoption' | 'found', corregir?: string) => void;
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
    const [publications, setPublications] = useState<MockPublication[]>([]);

    useEffect(() => {
        if (currentUser) {
            getMyPublications(currentUser.id).then(setPublications);
        }
    }, [currentUser, refreshKey]);

    const tabs: Tab[] = ['activas', 'revision', 'rechazadas', 'finalizadas'];

    const countByTab = (tab: Tab) => publications.filter((p) => p.status === STATUS_BY_TAB[tab]).length;

    const currentPubs = publications.filter((p) => p.status === STATUS_BY_TAB[activePubTab]);

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
                    <i className="ti ti-exclamation-circle"></i> Resumen del rendimiento de tus avisos
                </p>
            </div>

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
                    {currentPubs.length === 0 && (
                        <div className="pub-empty-state">
                            <p>No tienes avisos en esta sección todavía.</p>
                        </div>
                    )}
                    {currentPubs.map((pub) => (
                        <PubCard
                            key={pub.id}
                            pub={pub}
                            tab={activePubTab}
                            isOpen={!!openAccordions[pub.id]}
                            onToggle={() => toggleAccordion(pub.id)}
                            isMenuOpen={!!openMoreMenus[pub.id]}
                            onToggleMenu={(e) => toggleMoreMenu(e, pub.id)}
                            onOpenEditarAviso={(tipo, _nombre, corregir) => onOpenEditarAviso(pub.id, tipo, corregir)}
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