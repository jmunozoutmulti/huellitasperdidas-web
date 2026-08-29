'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { showToast } from '@/components/global/Toast';
import { useApp } from '@/context/AppContext';
import { getFavoriteIds, removeFavorite } from '@/lib/favorites';
import { fetchReport } from '@/lib/api';
import { reportToPetData } from '@/lib/transformers';
import { PetData } from '@/lib/pets';

export default function GuardadosSection() {
    const { currentUser } = useApp();
    const [pets, setPets] = useState<PetData[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (!currentUser) return;
        let isCancelled = false;

        async function loadFavorites() {
            setIsLoading(true);
            const ids = await getFavoriteIds(currentUser.id);

            const results = await Promise.all(
                ids.map(async (id) => {
                    try {
                        const report = await fetchReport(id);
                        return reportToPetData(report);
                    } catch {
                        // La publicación ya no existe en el backend (fue borrada,
                        // rechazada, etc.) — limpiamos el favorito huérfano.
                        await removeFavorite(currentUser.id, id);
                        return null;
                    }
                })
            );

            if (!isCancelled) {
                setPets(results.filter((p): p is PetData => p !== null));
                setIsLoading(false);
            }
        }

        loadFavorites();
        return () => {
            isCancelled = true;
        };
    }, [currentUser]);

    const handleRemove = async (petId: string) => {
        if (!currentUser) return;
        await removeFavorite(currentUser.id, petId);
        setPets((prev) => prev.filter((p) => p.id !== petId));
        showToast('Publicación quitada de guardados.', 'info');
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
                {isLoading && <p style={{ padding: '24px 0', opacity: 0.6 }}>Cargando guardados...</p>}

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
                                    <h5 className="guardado-title">{pet.title}</h5>
                                    <div className="guardado-meta">
                                        <span>
                                            <i className="ti ti-pin"></i> {pet.district}
                                        </span>
                                        <span>
                                            <b>Publicado:</b> {pet.date}
                                        </span>
                                    </div>
                                </div>
                                <div className="guardado-actions">
                                    <Link href={`/?id=${pet.id}`} className="pub-btn pub-btn-secondary">
                                        <i className="ti ti-external-link"></i> Ver publicación
                                    </Link>
                                    <button
                                        type="button"
                                        className="guardado-remove-btn"
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