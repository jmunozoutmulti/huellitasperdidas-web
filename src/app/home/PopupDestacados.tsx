'use client';
import { useState, useEffect, useRef, type ReactNode } from 'react';
import { IconX, IconPin } from '@tabler/icons-react';
import { PetData } from '@/lib/pets';

const INITIAL_DELAY_MS = 5000;
const VISIBLE_MS = 4000;
const FADE_MS = 2000;
const PAUSE_MS = 50000;
const MOBILE_QUERY = '(max-width: 760px)';

export interface PopupDestacadoItem {
    pet: PetData;
    badgeLabel: string;
    badgeClassName: string;
    badgeIcon: ReactNode;
}

interface PopupDestacadosProps {
    items: PopupDestacadoItem[];
    onOpenDetail: (pet: PetData) => void;
}

export default function PopupDestacados({ items, onOpenDetail }: PopupDestacadosProps) {
    const [index, setIndex] = useState(0);
    const [isVisible, setIsVisible] = useState(false);
    const [isPaused, setIsPaused] = useState(false);
    const pauseTimerRef = useRef<NodeJS.Timeout | null>(null);
    const [visibleCount, setVisibleCount] = useState(1);

    useEffect(() => {
        const mediaQuery = window.matchMedia(MOBILE_QUERY);
        const update = () => setVisibleCount(mediaQuery.matches ? 1 : 2);
        update();
        mediaQuery.addEventListener('change', update);
        return () => mediaQuery.removeEventListener('change', update);
    }, []);

    useEffect(() => {
        if (items.length === 0 || isPaused) return;

        let timer: NodeJS.Timeout;

        const show = () => {
            setIsVisible(true);
            if (items.length <= visibleCount) return;
            timer = setTimeout(hide, VISIBLE_MS);
        };

        const hide = () => {
            setIsVisible(false);
            timer = setTimeout(() => {
                setIndex((current) => (current + visibleCount) % items.length);
                show();
            }, FADE_MS);
        };

        timer = setTimeout(show, INITIAL_DELAY_MS);

        return () => clearTimeout(timer);
    }, [items.length, isPaused, visibleCount]);


    useEffect(() => {
        return () => {
            if (pauseTimerRef.current) clearTimeout(pauseTimerRef.current);
        };
    }, []);

    const handleClose = () => {
        setIsVisible(false);
        setIsPaused(true);
        pauseTimerRef.current = setTimeout(() => setIsPaused(false), PAUSE_MS);
    };

    if (items.length === 0) return null;

    const visibleItems = Array.from(
        { length: Math.min(visibleCount, items.length) },
        (_, i) => items[(index + i) % items.length]
    );

    return (
        <div className={`popup-destacados ${isVisible ? 'popup-destacados-visible' : ''}`}>
            <button
                type="button"
                className="popup-destacados-close"
                onClick={handleClose}
                aria-label="Cerrar destacados"
            >
                <IconX />
            </button>

            {visibleItems.map(({ pet, badgeLabel, badgeClassName, badgeIcon }) => {
                const location = [pet.district, pet.province, pet.region].filter(Boolean).join(', ');
                return (
                    <div key={pet.id} className="premium-card" onClick={() => onOpenDetail(pet)}>
                        <div className="premium-img-box">
                            <img src={pet.imgSrc || '/images/placeholder.jpg'} alt={pet.title || 'Mascota destacada'} />
                        </div>

                        <div className="premium-body">
                            <div className={`premium-badge ${badgeClassName}`}>
                                {badgeIcon} {badgeLabel}
                            </div>
                            {pet.title && <h3 className="premium-title">{pet.title}</h3>}
                            {location && (
                                <p className="premium-location">
                                    <IconPin /> {location}
                                </p>
                            )}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}