'use client';
import { useState, useEffect, useRef, type ReactNode } from 'react';
import { IconX, IconPin } from '@tabler/icons-react';
import { PetData } from '@/lib/pets';

const INITIAL_DELAY_MS = 5000;
const VISIBLE_MS = 4000;
const FADE_MS = 1000;
const PAUSE_MS = 50000;

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

    useEffect(() => {
        if (items.length === 0 || isPaused) return;

        let timer: NodeJS.Timeout;

        const show = () => {
            setIsVisible(true);
            timer = setTimeout(hide, VISIBLE_MS);
        };

        const hide = () => {
            setIsVisible(false);
            timer = setTimeout(() => {
                setIndex((current) => (current + 1) % items.length);
                show();
            }, FADE_MS);
        };

        timer = setTimeout(show, INITIAL_DELAY_MS);

        return () => clearTimeout(timer);
    }, [items.length, isPaused]);


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

    const { pet, badgeLabel, badgeClassName, badgeIcon } = items[index % items.length];
    const location = [pet.district, pet.province, pet.region].filter(Boolean).join(', ');

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

            <div className="premium-card" onClick={() => onOpenDetail(pet)}>
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
        </div>
    );
}