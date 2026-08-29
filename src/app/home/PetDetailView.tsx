'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import Swiper from 'swiper';
import { Navigation, Pagination } from 'swiper/modules';
import { showToast } from '@/components/global/Toast';
import CommentsWidget from './CommentsWidget';
import { PetData } from '@/lib/pets';

import { useApp } from '@/context/AppContext';
import { getFavoriteIds, addFavorite, removeFavorite } from '@/lib/favorites';

interface PetDetailViewProps {
    pet: PetData;
    onClose: () => void;
}

export default function PetDetailView({ pet, onClose }: PetDetailViewProps) {
    const { currentUser, openAuthModal } = useApp();
    const [isLiked, setIsLiked] = useState(false);
    const [likeCount, setLikeCount] = useState(12);
    const [isFavorite, setIsFavorite] = useState(false);

    useEffect(() => {
        if (currentUser) {
            getFavoriteIds(currentUser.id).then((ids) => setIsFavorite(ids.includes(pet.id)));
        } else {
            setIsFavorite(false);
        }
    }, [currentUser, pet.id]);

    const handleToggleFavorite = async () => {
        if (!currentUser) {
            openAuthModal();
            return;
        }
        const next = !isFavorite;
        setIsFavorite(next);
        if (next) {
            await addFavorite(currentUser.id, pet.id);
            showToast('Guardado en tus favoritos', 'success');
        } else {
            await removeFavorite(currentUser.id, pet.id);
            showToast('Publicación quitada de guardados.', 'info');
        }
    };


    const [isShareOpen, setIsShareOpen] = useState(false);

    const [isAuthorEllipsisOpen, setIsAuthorEllipsisOpen] = useState(false);
    const [activeAuthorPopover, setActiveAuthorPopover] = useState<'message' | 'report' | null>(null);
    const [authorMessageInput, setAuthorMessageInput] = useState('');
    const [authorReportInput, setAuthorReportInput] = useState('');

    const swiperRef = useRef<Swiper | null>(null);

    const shareUrl = useMemo(
        () => (typeof window !== 'undefined' ? `${window.location.origin}/?id=${pet.id}` : ''),
        [pet.id]
    );


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
        if (badgeStyle === 'badge-adopt') return 'Fecha de publicación';
        if (badgeStyle === 'badge-found') return 'Día del hallazgo';
        if (badgeStyle === 'badge-sight') return 'Día del avistamiento';
        return 'Día de la pérdida';
    };

    const renderContactButton = () => {
        if (pet.badgeStyle === 'badge-adopt') {
            return (
                <button id="detail-contact-btn" className="detail-btn-contact btn-purple">
                    <i className="fa-solid fa-heart"></i> ¡ADOPTAR!
                </button>
            );
        }
        if (pet.badgeStyle === 'badge-found') {
            return (
                <button id="detail-contact-btn" className="detail-btn-contact btn-green">
                    <i className="ti ti-heart-question"></i> Consultar mascota
                </button>
            );
        }
        if (pet.badgeStyle === 'badge-sight') {
            return (
                <button id="detail-contact-btn" className="detail-btn-contact btn-yellow">
                    ¡Ver ubicación!
                </button>
            );
        }
        return (
            <button id="detail-contact-btn" className="detail-btn-contact btn-primary">
                ¡LO VI!
            </button>
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
                                onClick={() => {
                                    const nextLiked = !isLiked;
                                    setIsLiked(nextLiked);
                                    setLikeCount((prev) => (nextLiked ? prev + 1 : prev - 1));
                                    showToast(
                                        nextLiked ? 'Te gusta esta publicación' : 'Ya no te gusta esta publicación',
                                        'success'
                                    );
                                }}
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

                            <div className="share-dropdown-wrapper">
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

                    <div className="detail-author-row">
                        <div className="detail-author-left">
                            <div className="author-avatar-badge">J</div>
                            <span className="card-date">
                                <b>Publicado por:</b> Juan Pérez · 04 Julio 2026, 3:01 pm
                            </span>
                        </div>

                        <div className="dropdown-menu-container detail-author-options">
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
                                            onClick={() => {
                                                if (authorMessageInput.trim()) {
                                                    showToast('Mensaje enviado', 'success');
                                                    setAuthorMessageInput('');
                                                    setActiveAuthorPopover(null);
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
                                            onClick={() => {
                                                if (authorReportInput.trim()) {
                                                    showToast('Reporte enviado', 'success');
                                                    setAuthorReportInput('');
                                                    setActiveAuthorPopover(null);
                                                }
                                            }}
                                        >
                                            Reportar
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    <h2 id="detail-title" className="detail-main-title">
                        {pet.title}
                    </h2>

                    {pet.badgeStyle !== 'badge-sight' && (
                        <div className="detail-specs-grid">
                            <div className="spec-item">
                                <span className="spec-label">Distrito</span>
                                <p id="spec-district" className="spec-value">
                                    {pet.district || '-'}
                                </p>
                            </div>
                            <div className="spec-item">
                                <span className="spec-label" id="spec-date-label">
                                    {getDateLabel(pet.badgeStyle)}
                                </span>
                                <p id="spec-date" className="spec-value">
                                    {pet.date || '-'}
                                </p>
                            </div>
                            <div className="spec-item">
                                <span className="spec-label">Raza</span>
                                <p id="spec-race" className="spec-value">
                                    {pet.race || '-'}
                                </p>
                            </div>
                            <div className="spec-item">
                                <span className="spec-label">Pelaje / Señas</span>
                                <p id="spec-features" className="spec-value">
                                    {pet.features || '-'}
                                </p>
                            </div>
                            <div className="spec-item">
                                <span className="spec-label">Edad aproximada</span>
                                <p id="spec-age" className="spec-value">
                                    {pet.age || '-'}
                                </p>
                            </div>
                            <div className="spec-item">
                                <span className="spec-label">Sexo / Condición</span>
                                <p id="spec-gender" className="spec-value">
                                    {pet.gender || '-'}
                                </p>
                            </div>
                        </div>
                    )}

                    {pet.reward && pet.reward !== 'S/. 0' && pet.reward !== '0' && (
                        <div id="detail-reward-container" className="reward-strip-clean">
                            <span className="reward-tag-clean">Recompensa</span>
                            <span id="detail-reward-amount" className="reward-price-clean">
                                {pet.reward}
                            </span>
                        </div>
                    )}

                    <div className="detail-description-block">
                        <h3>Detalles Adicionales</h3>
                        <p id="detail-desc">{pet.desc}</p>
                    </div>

                    {renderContactButton()}
                </div>

                <CommentsWidget />
            </div>
        </div>
    );
}