'use client';
import { PetData } from '@/lib/pets';
import {
    IconExternalLink,
    IconPin,
    IconCalendarBolt,
    IconWorldWww,
    IconBrandFacebook,
    IconBrandInstagram,
    IconBrandTiktok,
    IconBrandGoogle,
    IconClockBolt,
    IconHeartQuestion,
    IconShare,
    IconUsers,
    IconHeartFilled
} from '@tabler/icons-react';

interface PetCardProps {
    pet: PetData;
    onOpenDetail: (pet: PetData) => void;
}

export default function PetCard({ pet, onOpenDetail }: PetCardProps) {
    // 1. TARJETA EXTERNA (Instagram, TikTok, Facebook, Google)
    if (pet.isExternal) {
        return (
            <div className="masonry-item">
                <div
                    className="pet-card pet-card-external"
                    data-id={pet.id}
                    onClick={() => onOpenDetail(pet)}
                >
                    <div className="card-badges">
                        <span className={`badge badge-ext-${pet.externalType}`}>
                            {pet.externalType === 'facebook' && <IconBrandFacebook />}
                            {pet.externalType === 'instagram' && <IconBrandInstagram />}
                            {pet.externalType === 'tiktok' && <IconBrandTiktok />}
                            {pet.externalType === 'google' && <IconBrandGoogle />}
                            {' '}{pet.badge}
                        </span>
                    </div>

                    <div className="card-overlay">
                        <span className="btn-external-link">
                            <IconExternalLink /> VER
                        </span>
                    </div>

                    <div className="card-img">
                        <a href="#" onClick={(e) => e.preventDefault()}>
                            <img src={pet.imgSrc} alt={pet.title} loading="lazy" />
                        </a>
                    </div>

                    {pet.title && (
                        <div className="card-body">
                            <div className="card-meta">
                                <span><IconPin /> {[pet.district, pet.province, pet.region].filter(Boolean).join(', ')}</span>
                                <span><IconCalendarBolt /> {pet.date}</span>
                            </div>
                            <h3 className="card-title">{pet.title}</h3>
                        </div>
                    )}

                    <div className="card-footer card-footer-external">
                        <span><IconWorldWww /> Indexado</span>
                        <span className="source-tag">
                            {pet.externalType === 'facebook' && <IconBrandFacebook />}
                            {pet.externalType === 'instagram' && <IconBrandInstagram />}
                            {pet.externalType === 'tiktok' && <IconBrandTiktok />}
                            {pet.externalType === 'google' && <IconBrandGoogle />}
                            {' '}{pet.badge}
                        </span>
                    </div>
                </div>
            </div>
        );
    }

    // 2b. TARJETA PREMIUM DE ADOPCIÓN (morada, sin recompensa)
    if (pet.isPremium && pet.badgeStyle === 'badge-adopt-premium') {
        return (
            <div className="masonry-item">
                <div
                    className="pet-card pet-card-adoptar-premium"
                    data-id={pet.id}
                    onClick={() => onOpenDetail(pet)}
                >
                    <div className="card-badges">
                        <span className="badge badge-adopt">
                            <IconHeartFilled /> {pet.badge}
                        </span>
                    </div>
                    <div className="card-img">
                        <a href="#" onClick={(e) => e.preventDefault()}>
                            <img src={pet.imgSrc} alt={pet.title} loading="lazy" />
                        </a>
                    </div>

                    <div className="card-body">
                        <div className="card-meta">
                            <span><IconPin /> {[pet.district, pet.province, pet.region].filter(Boolean).join(', ')}</span>
                            <span><IconCalendarBolt /> {pet.date}</span>
                        </div>
                        {pet.title && <h3 className="card-title">{pet.title}</h3>}

                        <div className="reward-container-premium">
                            <div>
                                <span className="reward-amount-premium">ADOPCIÓN</span>
                            </div>
                            <button type="button" className="btn-purple">
                                ¡VER!
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // 2. TARJETA PREMIUM / URGENTE ROJA (Perdidos)
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
                            <IconClockBolt /> {pet.badge}
                        </span>
                    </div>
                    <div className="card-img">
                        <a href="#" onClick={(e) => e.preventDefault()}>
                            <img src={pet.imgSrc} alt={pet.title} loading="lazy" />
                        </a>
                    </div>

                    <div className="card-body">
                        <div className="card-meta">
                            <span><IconPin /> {[pet.district, pet.province, pet.region].filter(Boolean).join(', ')}</span>
                            <span><IconCalendarBolt /> {pet.date}</span>
                        </div>
                        {pet.title && <h3 className="card-title">{pet.title}</h3>}

                        <div className="reward-container-premium">
                            <div>
                                {!pet.rewardVisible ? (
                                    <>
                                        <span className="reward-label-premium">Se ofrece:</span>
                                        <span className="reward-amount-premium">RECOMPENSA</span>
                                    </>
                                ) : pet.reward ? (
                                    <>
                                        <span className="reward-label-premium">Recompensa:</span>
                                        <span className="reward-amount-premium">{pet.reward}</span>
                                    </>
                                ) : (
                                    <span className="reward-amount-premium">PERDIDO</span>
                                )}
                            </div>
                            <button type="button" className="btn-yellow">
                                ¡VER!
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
                        {pet.badgeStyle === 'badge-adopt' && <IconHeartFilled />}
                        {pet.badge}
                    </span>
                </div>

                <div className="card-overlay">
                    {pet.badgeStyle === 'badge-adopt' ? (
                        <button type="button" className="btn-purple">¡ADOPTAR!</button>
                    ) : pet.badgeStyle === 'badge-found' ? (
                        <button type="button" className="btn-green">
                            <IconHeartQuestion /> Ver mascota
                        </button>
                    ) : pet.badgeStyle === 'badge-sight' ? (
                        <button type="button" className="btn-yellow">¡VER!</button>
                    ) : (
                        <button type="button" className="btn-primary">¡VER!</button>
                    )}
                </div>
                <div className="card-img">
                    <img src={pet.imgSrc} alt={pet.title} loading="lazy" />
                </div>

                {pet.badgeStyle !== 'badge-sight' && (
                    <div className="card-body">
                        <div className="card-meta">
                            <span><IconPin /> {[pet.district, pet.province, pet.region].filter(Boolean).join(', ')}</span>
                            <span><IconCalendarBolt /> {pet.date}</span>
                        </div>
                        {pet.title && <h3 className="card-title">{pet.title}</h3>}
                    </div>
                )}

                <div className="card-footer">
                    <span><IconShare /> {pet.shares} <b>Compartidos</b></span>
                    <span><IconUsers /> {pet.views} <b>Vistas</b></span>
                </div>
            </div>
        </div>
    );
}