'use client';
import { PetData } from '@/lib/pets';


interface PetCardProps {
    pet: PetData;
    onOpenDetail: (pet: PetData) => void;
}

export default function PetCard({ pet, onOpenDetail }: PetCardProps) {
    // 1. TARJETA EXTERNA (Instagram, TikTok, Facebook)
    if (pet.isExternal) {
        return (
            <div className="masonry-item">
                <a
                    href={pet.externalUrl}
                    target="_blank"
                    className="pet-card pet-card-external external-direct"
                    rel="noreferrer">
                    <div className="card-badges">
                        <span className={`badge badge-ext-${pet.externalType}`}>
                            {pet.externalType === 'instagram' && <i className="fa-brands fa-instagram"></i>}
                            {pet.externalType === 'tiktok' && <i className="fa-brands fa-tiktok"></i>}
                            {pet.externalType === 'facebook' && <i className="fa-brands fa-facebook"></i>}
                            {pet.externalType === 'google' && <i className="fa-brands fa-google"></i>}
                            {' '}{pet.badge}
                        </span>
                    </div>

                    <div className="card-overlay">
                        <span className="btn-external-link">
                            <i className="ti ti-external-link"></i> Ver enlace original
                        </span>
                    </div>

                    <img src={pet.imgSrc} className="card-img" alt={pet.title} />

                    {pet.title && (
                        <div className="card-body">
                            <div className="card-meta">
                                <span><i className="ti ti-pin"></i> {pet.district}</span>
                                <span><i className="ti ti-calendar-bolt"></i> {pet.date}</span>
                            </div>
                            <h3 className="card-title">{pet.title}</h3>
                        </div>
                    )}

                    <div className="card-footer card-footer-external">
                        <span><i className="ti ti-world-www"></i> Indexado</span>
                        <span className="source-tag">
                            {pet.externalType === 'instagram' && <i className="ti ti-brand-instagram"></i>}
                            {pet.externalType === 'tiktok' && <i className="fa-brands fa-tiktok"></i>}
                            {pet.externalType === 'facebook' && <i className="fa-brands fa-facebook"></i>}
                            {' '}{pet.badge}
                        </span>
                    </div>
                </a>
            </div >
        );
    }

    // 2. TARJETA PREMIUM / URGENTE ROJA
    if (pet.isPremium) {
        return (
            <div className="masonry-item">
                <div
                    className="pet-card pet-card-premium"
                    data-id={pet.id}
                    onClick={() => onOpenDetail(pet)}
                >
                    <div className="card-badges">
                        <span className="badge badge-max-priority">
                            <i className="ti ti-clock-bolt"></i> {pet.badge}
                        </span>
                    </div>

                    <a href="#" onClick={(e) => e.preventDefault()}>
                        <img src={pet.imgSrc} className="card-img" alt={pet.title} />
                    </a>

                    <div className="card-body">
                        <div className="card-meta">
                            <span><i className="ti ti-pin"></i> {pet.district}</span>
                            <span><i className="ti ti-calendar-bolt"></i> {pet.date}</span>
                        </div>
                        <h3 className="card-title">{pet.title}</h3>

                        <div className="reward-container-premium">
                            <div>
                                <span className="reward-label-premium">Recompensa</span>
                                <span className="reward-amount-premium">{pet.reward}</span>
                            </div>
                            <button type="button" className="btn-yellow">
                                ¡LO VI!
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // 3. TARJETA NORMAL (Perdido, Encontrado, Avistamiento, Adopción)
    return (
        <div className="masonry-item">
            <div
                className={`pet-card ${pet.badgeStyle === 'badge-adopt' ? 'pet-card-adoptar' : ''}`}
                data-id={pet.id}
                onClick={() => onOpenDetail(pet)}
            >
                <div className="card-badges">
                    <span className={`badge ${pet.badgeStyle}`}>
                        {pet.badgeStyle === 'badge-adopt' && <i className="fa-solid fa-heart"></i>}
                        {pet.badge}
                    </span>
                </div>

                <div className="card-overlay">
                    {pet.badgeStyle === 'badge-adopt' ? (
                        <button type="button" className="btn-purple">¡ADOPTAR!</button>
                    ) : pet.badgeStyle === 'badge-found' ? (
                        <button type="button" className="btn-green">
                            <i className="ti ti-heart-question"></i> Consultar mascota
                        </button>
                    ) : pet.badgeStyle === 'badge-sight' ? (
                        <button type="button" className="btn-yellow">¡VER!</button>
                    ) : (
                        <button type="button" className="btn-primary">¡LO VI!</button>
                    )}
                </div>

                <img src={pet.imgSrc} className="card-img" alt={pet.title} />

                <div className="card-body">
                    <div className="card-meta">
                        <span><i className="ti ti-pin"></i> {pet.district}</span>
                        <span><i className="ti ti-calendar-bolt"></i> {pet.date}</span>
                    </div>
                    <h3 className="card-title">{pet.title}</h3>
                </div>

                <div className="card-footer">
                    <span><i className="ti ti-share"></i> {pet.shares} <b>Compartidos</b></span>
                    <span><i className="ti ti-users"></i> {pet.views} <b>Vistas</b></span>
                </div>
            </div>
        </div>
    );
}