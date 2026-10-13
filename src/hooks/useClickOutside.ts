import { useEffect, RefObject } from 'react';

export function useClickOutside(
    ref: RefObject<HTMLElement | null>,
    onOutsideClick: () => void,
    isActive: boolean = true
) {
    useEffect(() => {
        if (!isActive) return;

        const handleClick = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) {
                onOutsideClick();
            }
        };

        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, [ref, onOutsideClick, isActive]);
}