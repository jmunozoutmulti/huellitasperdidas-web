'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import Swiper from 'swiper';
import { Navigation, Pagination } from 'swiper/modules';
import { showToast } from '@/components/global/Toast';
import CommentsWidget from './CommentsWidget';
import { PetData } from '@/lib/pets';

import { useApp } from '@/context/AppContext';
import { likeReport, unlikeReport, favoriteReport, unfavoriteReport } from '@/lib/socialApi';

import { registerReportView, registerReportShare } from '@/lib/api';
import { hasViewedReport, markReportViewed } from '@/lib/viewTracking';

import { useClickOutside } from '@/hooks/useClickOutside';
import { startConversation, flagReport, MessagesApiError } from '@/lib/messagesApi';

interface PetDetailViewProps {
    pet: PetData;
    onClose: () => void;
}

export default function PetDetailView({ pet, onClose }: PetDetailViewProps) {
    const { currentUser, openAuthModal } = useApp();
    const [isLiked, setIsLiked] = useState(pet.hasLiked);
    const [likeCount, setLikeCount] = useState(pet.likesCount);
    const [isFavorite, setIsFavorite] = useState(pet.isFavorited);

    useEffect(() => {
        setIsLiked(pet.hasLiked);
        setLikeCount(pet.likesCount);
        setIsFavorite(pet.isFavorited);
    }, [pet.id, pet.hasLiked, pet.likesCount, pet.isFavorited]);

    const handleToggleLike = async () => {
        if (!currentUser) {
            openAuthModal();
            return;
        }
        const next = !isLiked;
        setIsLiked(next);
        setLikeCount((prev) => (next ? prev + 1 : prev - 1));
        try {
            if (next) {
                await likeReport(pet.id);
            } else {
                await unlikeReport(pet.id);
            }
            showToast(next ? 'Te gusta esta publicación' : 'Ya no te gusta esta publicación', 'success');
        } catch {
            // revertir si falla
            setIsLiked(!next);
            setLikeCount((prev) => (next ? prev - 1 : prev + 1));
            showToast('No pudimos guardar tu like. Intenta de nuevo.', 'error');
        }
    };

    const handleToggleFavorite = async () => {
        if (!currentUser) {
            openAuthModal();
            return;
        }
        const next = !isFavorite;
        setIsFavorite(next);
        try {
            if (next) {
                await favoriteReport(pet.id);
                showToast('Guardado en tus favoritos', 'success');
            } else {
                await unfavoriteReport(pet.id);
                showToast('Publicación quitada de guardados.', 'info');
            }
        } catch {
            setIsFavorite(!next);
            showToast('No pudimos actualizar tus favoritos. Intenta de nuevo.', 'error');
        }
    };


    const [isShareOpen, setIsShareOpen] = useState(false);

    const [isAuthorEllipsisOpen, setIsAuthorEllipsisOpen] = useState(false);
    const [activeAuthorPopover, setActiveAuthorPopover] = useState<'message' | 'report' | null>(null);
    const [authorMessageInput, setAuthorMessageInput] = useState('');
    const [authorReportInput, setAuthorReportInput] = useState('');

    const swiperRef = useRef<Swiper | null>(null);

    const shareMenuRef = useRef<HTMLDivElement>(null);
    const authorMenuRef = useRef<HTMLDivElement>(null);

    useClickOutside(shareMenuRef, () => setIsShareOpen(false), isShareOpen);
    useClickOutside(authorMenuRef, () => setIsAuthorEllipsisOpen(false), isAuthorEllipsisOpen);

    const shareUrl = useMemo(
        () => (typeof window !== 'undefined' ? `${window.location.origin}/?id=${pet.id}` : ''),
        [pet.id]
    );

    useEffect(() => {
        if (!hasViewedReport(pet.id)) {
            registerReportView(pet.id);
            markReportViewed(pet.id);
        }
    }, [pet.id]);

    useEffect(() => {
        const timer = setTimeout(() => {
            if (swiperRef.current) {
                swiperRef.current.destroy(true, true);
            }
            swiperRef.current = new Swiper('.detail-swiper', {
                modules: [Navigation, Pagination],
                loop: true,
                autoHeight: true,
                observer: true,
                observeParents: true,
                pagination: {
                    el: '.detail-swiper-pagination',
                    clickable: true,
                },
                navigation: {
                    nextEl: '.detail-swiper-next',
                    prevEl: '.detail-swiper-prev',
                },
            });
        }, 100);

        return () => clearTimeout(timer);
    }, [pet]);

    const getDateLabel = (badgeStyle?: string) => {
        if (badgeStyle === 'badge-adopt' || badgeStyle === 'badge-adopt-premium') return 'Fecha de publicación';
        if (badgeStyle === 'badge-found') return 'Día del hallazgo';
        if (badgeStyle === 'badge-sight') return 'Día del avistamiento';
        return 'Día de la pérdida';
    };

    // TODO: cuando pet.sourceType === 'users', usar el canal de contacto
    // propio del usuario en vez de contact_phone — por ahora usamos el mismo
    // dato como placeholder mientras se define ese flujo real (backend aún
    // no expone un teléfono/canal distinto por usuario en el reporte).
    // Prefijo +51 fijo por ahora — pendiente de usar el país real del aviso.
    const buildWhatsAppLink = () => {
        const digits = pet.contactPhone.replace(/\D/g, '');
        return digits ? `https://wa.me/51${digits}` : null;
    };

    const renderContactButton = () => {
        if (pet.badgeStyle === 'badge-sight') {
            if (pet.lat != null && pet.lng != null) {
                return (
                    <a
                        id="detail-contact-btn"
                        className="detail-btn-contact btn-yellow"
                        href={`https://www.google.com/maps?q=${pet.lat},${pet.lng}`}
                        target="_blank"
                        rel="noreferrer"
                    >
                        ¡Ver ubicación!
                    </a>
                );
            }
            const link = buildWhatsAppLink();
            return (
                <a
                    id="detail-contact-btn"
                    className="detail-btn-contact btn-yellow"
                    href={link ?? '#'}
                    target={link ? '_blank' : undefined}
                    rel="noreferrer"
                    onClick={(e) => { if (!link) e.preventDefault(); }}
                >
                    Consultar
                </a>
            );
        }

        const link = buildWhatsAppLink();

        if (pet.badgeStyle === 'badge-adopt' || pet.badgeStyle === 'badge-adopt-premium') {
            return (
                <a
                    id="detail-contact-btn"
                    className="detail-btn-contact btn-purple"
                    href={link ?? '#'}
                    target={link ? '_blank' : undefined}
                    rel="noreferrer"
                    onClick={(e) => { if (!link) e.preventDefault(); }}
                >
                    <i className="fa-solid fa-heart"></i> ¡ADOPTAR!
                </a>
            );
        }
        if (pet.badgeStyle === 'badge-found') {
            return (
                <a
                    id="detail-contact-btn"
                    className="detail-btn-contact btn-green"
                    href={link ?? '#'}
                    target={link ? '_blank' : undefined}
                    rel="noreferrer"
                    onClick={(e) => { if (!link) e.preventDefault(); }}
                >
                    <i className="ti ti-heart-question"></i> Consultar mascota
                </a>
            );
        }
        // Perdido / Urgente
        return (
            <a
                id="detail-contact-btn"
                className="detail-btn-contact btn-primary"
                href={link ?? '#'}
                target={link ? '_blank' : undefined}
                rel="noreferrer"
                onClick={(e) => { if (!link) e.preventDefault(); }}
            >
                ¡LO VI!
            </a>
        );
    };

    return (
        <div className="detail-content-layout">
            <div className="detail-media-side">
                <div className="detail-media-wrapper">
                    <span id="detail-img-badge" className={`badge badge-img-floating ${pet.badgeStyle}`}>
                        {pet.badge}
                    </span>

                    <div className="swiper detail-swiper">
                        <div className="swiper-wrapper" id="detail-swiper-wrapper">
                            {(pet.images && pet.images.length > 0 ? pet.images : [pet.imgSrc]).map((src, idx) => (
                                <div className="swiper-slide" key={idx}>
                                    <img id={idx === 0 ? 'detail-img' : undefined} src={src} alt="Mascota seleccionada" />
                                </div>
                            ))}
                        </div>

                        <div className="swiper-pagination detail-swiper-pagination"></div>
                        <div className="swiper-button-prev detail-swiper-prev"></div>
                        <div className="swiper-button-next detail-swiper-next"></div>
                    </div>

                    <div className="detail-img-stats">
                        <span>
                            <i className="ti ti-share"></i> <span id="detail-stat-shares">{pet.shares}</span> Compartidos
                        </span>
                        <span>
                            <i className="ti ti-users"></i> <span id="detail-stat-views">{pet.views}</span> Vistas
                        </span>
                    </div>
                </div>
            </div>

            <div className="detail-info-side">
                <div className="detail-up-actions">
                    <div className="detail-header-actions">
                        <button type="button" className="action-icon-btn" id="btn-close-detail" onClick={onClose}>
                            <i className="ti ti-x"></i>
                        </button>
                        <div className="header-right-actions">
                            <button
                                type="button"
                                className={`action-icon-btn tooltip ${isLiked ? 'like-active' : ''}`}
                                id="btn-detail-like"
                                data-tooltip="Me gusta"
                                onClick={handleToggleLike}
                            >
                                <i className={isLiked ? 'fa-solid fa-heart' : 'fa-regular fa-heart'}></i>
                                <span className="like-counter-num">{likeCount}</span>
                            </button>

                            <button
                                type="button"
                                className={`action-icon-btn tooltip ${isFavorite ? 'favorite-active' : ''}`}
                                id="btn-detail-favorite"
                                data-tooltip={isFavorite ? 'Quitar de guardados' : 'Guardar'}
                                onClick={handleToggleFavorite}
                            >
                                <i className={isFavorite ? 'fa-solid fa-bookmark' : 'fa-regular fa-bookmark'}></i>
                            </button>

                            <div className="share-dropdown-wrapper" ref={shareMenuRef}>
                                <button
                                    type="button"
                                    className={`action-icon-btn tooltip ${isShareOpen ? 'share-active' : ''}`}
                                    id="btn-detail-share"
                                    data-tooltip="Compartir"
                                    onClick={() => setIsShareOpen(!isShareOpen)}
                                >
                                    <i className="ti ti-share"></i>
                                </button>

                                {isShareOpen && (
                                    <div className="share-social-grid" id="share-menu-options" style={{ display: 'grid' }}>
                                        <button
                                            type="button"
                                            className="share-grid-item item-link"
                                            id="btn-copy-link"
                                            onClick={() => {
                                                navigator.clipboard.writeText(window.location.href);
                                                registerReportShare(pet.id);
                                                showToast('Enlace copiado al portapapeles', 'success');
                                                setIsShareOpen(false);
                                            }}
                                        >
                                            <span className="grid-icon-circle">
                                                <i className="fa-solid fa-link"></i>
                                            </span>
                                            <span className="grid-item-label">Copiar enlace</span>
                                        </button>

                                        <a
                                            href={`https://wa.me/?text=${encodeURIComponent(shareUrl)}`}
                                            target="_blank"
                                            className="share-grid-item item-whatsapp"
                                            onClick={() => registerReportShare(pet.id)}
                                            rel="noreferrer"
                                        >
                                            <span className="grid-icon-circle">
                                                <i className="fa-brands fa-whatsapp"></i>
                                            </span>
                                            <span className="grid-item-label">WhatsApp</span>
                                        </a>
                                        <a
                                            href={`https://www.facebook.com/dialog/send?link=${encodeURIComponent(shareUrl)}&app_id=2186263202014959&redirect_uri=${encodeURIComponent(shareUrl)}`}
                                            target="_blank"
                                            className="share-grid-item item-messenger"
                                            onClick={() => registerReportShare(pet.id)}
                                            rel="noreferrer"
                                        >
                                            <span className="grid-icon-circle">
                                                <i className="fa-brands fa-facebook-messenger"></i>
                                            </span>
                                            <span className="grid-item-label">Messenger</span>
                                        </a>
                                        <a

                                            href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`}
                                            target="_blank"
                                            className="share-grid-item item-facebook"
                                            onClick={() => registerReportShare(pet.id)}
                                            rel="noreferrer"
                                        >
                                            <span className="grid-icon-circle">
                                                <i className="fa-brands fa-facebook"></i>
                                            </span>
                                            <span className="grid-item-label">Facebook</span>
                                        </a>
                                        <a
                                            href={`https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}`}
                                            target="_blank"
                                            className="share-grid-item item-x"
                                            onClick={() => registerReportShare(pet.id)}
                                            rel="noreferrer"
                                        >
                                            <span className="grid-icon-circle">
                                                <img src="/images/icon-x.svg" alt="X" />
                                            </span>
                                            <span className="grid-item-label">X</span>
                                        </a>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {pet.sourceType === 'user' ? (
                        <div className="detail-author-row">
                            <div className="detail-author-left">
                                <div className="author-avatar-badge">
                                    {pet.authorAvatar ? (
                                        <img src={pet.authorAvatar} alt={pet.authorName ?? ''} />
                                    ) : (
                                        pet.authorName?.charAt(0).toUpperCase() ?? '?'
                                    )}
                                </div>
                                <span className="card-date">
                                    <b> {pet.authorName ?? 'Usuario'}</b> · {pet.publishedAtDisplay || pet.createdAtDisplay}
                                </span>
                            </div>

                    {currentUser && (
                            <div className="dropdown-menu-container detail-author-options" ref={authorMenuRef}>
                                <button
                                    type="button"
                                    className="comment-action-icon-btn btn-trigger-dropdown"
                                    id="btn-author-ellipsis"
                                    onClick={() => setIsAuthorEllipsisOpen(!isAuthorEllipsisOpen)}
                                >
                                    <i className="fa-solid fa-ellipsis-vertical"></i>
                                </button>

                                {isAuthorEllipsisOpen && (
                                    <div className="comment-floating-menu author-floating-menu" style={{ display: 'block' }}>
                                        <div className="menu-options-view">
                                            <button
                                                type="button"
                                                className="menu-option-item btn-open-author-popover"
                                                onClick={() => {
                                                    setIsAuthorEllipsisOpen(false);
                                                    setActiveAuthorPopover('message');
                                                }}
                                            >
                                                Dejar un mensaje
                                            </button>
                                            <button
                                                type="button"
                                                className="menu-option-item option-danger btn-open-author-popover"
                                                onClick={() => {
                                                    setIsAuthorEllipsisOpen(false);
                                                    setActiveAuthorPopover('report');
                                                }}
                                            >
                                                Reportar publicación
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {activeAuthorPopover === 'message' && (
                                    <div className="author-inline-popover is-open" id="popover-author-message">
                                        <textarea
                                            className="author-popover-textarea"
                                            placeholder="Añade un mensaje"
                                            rows={3}
                                            value={authorMessageInput}
                                            onChange={(e) => setAuthorMessageInput(e.target.value)}
                                        ></textarea>
                                        <div className="author-popover-actions">
                                            <button
                                                type="button"
                                                className="author-popover-cancel-btn"
                                                onClick={() => {
                                                    setAuthorMessageInput('');
                                                    setActiveAuthorPopover(null);
                                                }}
                                            >
                                                Cancelar
                                            </button>
                                            <button
                                                type="button"
                                                className={`author-popover-submit-btn ${authorMessageInput.trim().length > 0 ? 'is-active' : ''}`}
                                                onClick={async () => {
                                                    if (authorMessageInput.trim()) {
                                                        try {
                                                            await startConversation(pet.id, authorMessageInput.trim());
                                                            showToast('Mensaje enviado', 'success');
                                                            setAuthorMessageInput('');
                                                            setActiveAuthorPopover(null);
                                                        } catch (err) {
                                                            const message = err instanceof MessagesApiError ? err.message : 'No pudimos enviar tu mensaje. Intenta de nuevo.';
                                                            showToast(message, 'error');
                                                        }
                                                    }
                                                }}
                                            >
                                                Enviar
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {activeAuthorPopover === 'report' && (
                                    <div className="author-inline-popover is-open" id="popover-author-report">
                                        <textarea
                                            className="author-popover-textarea"
                                            placeholder="Explicar los motivos del reporte"
                                            rows={3}
                                            value={authorReportInput}
                                            onChange={(e) => setAuthorReportInput(e.target.value)}
                                        ></textarea>
                                        <div className="author-popover-actions">
                                            <button
                                                type="button"
                                                className="author-popover-cancel-btn"
                                                onClick={() => {
                                                    setAuthorReportInput('');
                                                    setActiveAuthorPopover(null);
                                                }}
                                            >
                                                Cancelar
                                            </button>
                                            <button
                                                type="button"
                                                className={`author-popover-submit-btn btn-report-submit ${authorReportInput.trim().length > 0 ? 'is-active' : ''}`}
                                                onClick={async () => {
                                                    if (authorReportInput.trim()) {
                                                        try {
                                                            await flagReport(pet.id, authorReportInput.trim());
                                                            showToast('Reporte enviado', 'success');
                                                            setAuthorReportInput('');
                                                            setActiveAuthorPopover(null);
                                                        } catch (err) {
                                                            const message = err instanceof MessagesApiError ? err.message : 'No pudimos enviar tu reporte. Intenta de nuevo.';
                                                            showToast(message, 'error');
                                                        }
                                                    }
                                                }}
                                            >
                                                Reportar
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                            )}
                        </div>
                    ) : (
                        <div className="detail-author-row">
                            <span className="card-date">
                                <b>Publicado el:</b> {pet.createdAtDisplay}
                            </span>
                        </div>
                    )}

                    {[pet.district, pet.province, pet.region].filter(Boolean).length > 0 && (
                        <div className="detail-location-row">
                            <i className="ti ti-map-pin"></i>{' '}
                            <span>{[pet.district, pet.province, pet.region].filter(Boolean).join(', ')}</span>
                        </div>
                    )}

                    {pet.title && (
                        <h2 id="detail-title" className="detail-main-title">
                            {pet.title}
                        </h2>
                    )}

                    {pet.badgeStyle !== 'badge-sight' && (
                        <div className="detail-specs-grid">
                            {pet.lastSeenLocation && (pet.badgeStyle === 'badge-urgent' || pet.badgeStyle === 'badge-max-priority' || pet.badgeStyle === 'badge-adopt' || pet.badgeStyle === 'badge-adopt-premium' || pet.badgeStyle === 'badge-found') && (
                                <div className="spec-item">
                                    <span className="spec-label">
                                        {pet.badgeStyle === 'badge-adopt' || pet.badgeStyle === 'badge-adopt-premium'
                                            ? 'Se entrega en'
                                            : pet.badgeStyle === 'badge-found'
                                                ? 'Encontrado en'
                                                : 'Perdido en'}
                                    </span>
                                    <p className="spec-value">
                                        {pet.lastSeenLocation}
                                    </p>
                                </div>
                            )}
                            {pet.date && (
                                <div className="spec-item">
                                    <span className="spec-label" id="spec-date-label">
                                        {getDateLabel(pet.badgeStyle)}
                                    </span>
                                    <p id="spec-date" className="spec-value">
                                        {pet.date.split(',')[0]}
                                    </p>
                                </div>
                            )}
                            {pet.race && (
                                <div className="spec-item">
                                    <span className="spec-label">{pet.petType === 'bird' ? 'Especie' : 'Raza'}</span>
                                    <p id="spec-race" className="spec-value">
                                        {pet.race}
                                    </p>
                                </div>
                            )}
                            {pet.features && (
                                <div className="spec-item">
                                    <span className="spec-label">{pet.petType === 'bird' ? 'Color del plumaje' : 'Color del pelaje'}</span>
                                    <p id="spec-features" className="spec-value">
                                        {pet.features}
                                    </p>
                                </div>
                            )}
                            {pet.age && (
                                <div className="spec-item">
                                    <span className="spec-label">Edad aproximada</span>
                                    <p id="spec-age" className="spec-value">
                                        {pet.age}
                                    </p>
                                </div>
                            )}
                            {pet.size && (
                                <div className="spec-item">
                                    <span className="spec-label">Tamaño</span>
                                    <p id="spec-size" className="spec-value">
                                        {pet.size}
                                    </p>
                                </div>
                            )}
                            {pet.gender && (
                                <div className="spec-item">
                                    <span className="spec-label">Sexo / Condición</span>
                                    <p id="spec-gender" className="spec-value">
                                        {pet.gender}
                                    </p>
                                </div>
                            )}
                        </div>
                    )}

                    {pet.reward && (
                        <div id="detail-reward-container" className="reward-strip-clean">
                            <span className="reward-tag-clean">
                                {pet.rewardVisible ? 'Recompensa' : 'Se ofrece'}
                            </span>
                            <span id="detail-reward-amount" className="reward-price-clean">
                                {pet.rewardVisible ? pet.reward : 'RECOMPENSA'}
                            </span>
                        </div>
                    )}

                    {pet.desc && (
                        <div className="detail-description-block">
                            <h3>Detalles</h3>
                            <p id="detail-desc">{pet.desc}</p>
                        </div>
                    )}

                    {pet.adoptionExtras && (
                        <div className="detail-description-block">
                            <h3>Se entrega con la adopción</h3>
                            <p>{pet.adoptionExtrasVisible ? pet.adoptionExtras : 'Incluye accesorios'}</p>
                        </div>
                    )}

                    {renderContactButton()}
                </div>

                <CommentsWidget reportId={pet.id} />
            </div>
        </div>
    );
}