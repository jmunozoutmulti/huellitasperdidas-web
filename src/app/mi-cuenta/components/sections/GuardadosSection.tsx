'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { showToast } from '@/components/global/Toast';
import { useApp } from '@/context/AppContext';
import { getMyFavorites, unfavoriteReport } from '@/lib/socialApi';
import { favoriteToCardData, type FavoriteCardData } from '@/lib/transformers';

export default function GuardadosSection() {
    const { currentUser } = useApp();
    const [pets, setPets] = useState<FavoriteCardData[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (!currentUser) return;
        let isCancelled = false;

        async function loadFavorites() {
            setIsLoading(true);
            try {
                const favorites = await getMyFavorites();
                if (!isCancelled) {
                    setPets(favorites.map(favoriteToCardData));
                }
            } finally {
                if (!isCancelled) setIsLoading(false);
            }
        }

        loadFavorites();
        return () => {
            isCancelled = true;
        };
    }, [currentUser]);

    const handleRemove = async (petId: string) => {
        try {
            await unfavoriteReport(petId);
            setPets((prev) => prev.filter((p) => p.id !== petId));
            showToast('Publicación quitada de guardados.', 'info');
        } catch {
            showToast('No pudimos quitar el favorito. Intenta de nuevo.', 'error');
        }
    };

    return (
        <div className="cuenta-section active" id="section-guardados">
            <div className="dashboard-recent-header">
                <h2 className="dashboard-subsection-title">Favoritos</h2>
                <p>
                    <i className="ti ti-info-circle"></i> Publicaciones que guardaste desde <b>Explorar</b>
                </p>
            </div>

            <div className="guardados-list">

                {isLoading && (
                    <div className="loading-state-centered">
                        <div className="loading-spinner"></div>
                        <p>Cargando guardados...</p>
                    </div>
                )}

                {!isLoading && pets.length === 0 && (
                    <div className="pub-empty-state">
                        <p>Todavía no guardaste ninguna publicación.</p>
                    </div>
                )}

                {!isLoading &&
                    pets.map((pet) => (
                        <div key={pet.id} className="guardado-row">
                            <div className="guardado-thumb">
                                <img src={pet.imgSrc} alt="" />
                            </div>
                            <div className="guardado-grid">
                                <div className="guardado-main">
                                    <h5 className="guardado-title">{pet.title || pet.badge}</h5>
                                    <div className="guardado-meta">
                                        {pet.badgeStyle !== 'badge-sight' && (
                                            <span>
                                                <i className="ti ti-pin"></i> {pet.district}
                                            </span>
                                        )}
                                        <span>
                                            <b>Publicado:</b> {pet.date}
                                        </span>
                                    </div>
                                </div>
                                <div className="guardado-actions">
                                    <Link href={`/?id=${pet.id}`}>
                                        <i className="ti ti-external-link"></i>
                                    </Link>
                                    <button
                                        type="button"
                                        aria-label="Quitar de favoritos"
                                        onClick={() => handleRemove(pet.id)}
                                    >
                                        <i className="ti ti-x"></i>
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
            </div>
        </div>
    );
}