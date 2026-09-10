'use client';

import { useState, useRef } from 'react';
import { useClickOutside } from '@/hooks/useClickOutside';

interface AutocompleteInputProps {
    value: string;
    onChange: (value: string) => void;
    suggestions: string[];
    placeholder?: string;
    className?: string;
    id?: string;
}

export default function AutocompleteInput({
    value,
    onChange,
    suggestions,
    placeholder,
    className,
    id,
}: AutocompleteInputProps) {
    const [isOpen, setIsOpen] = useState(false);
    const wrapperRef = useRef<HTMLDivElement>(null);
    useClickOutside(wrapperRef, () => setIsOpen(false), isOpen);

    const filtered =
        value.trim().length > 0
            ? suggestions.filter((s) => s.toLowerCase().includes(value.trim().toLowerCase())).slice(0, 6)
            : [];

    return (
        <div className={`custom-select-wrapper ${isOpen && filtered.length > 0 ? 'open' : ''}`} ref={wrapperRef}>
            <input
                type="text"
                id={id}
                className={className}
                placeholder={placeholder}
                value={value}
                onChange={(e) => {
                    onChange(e.target.value);
                    setIsOpen(true);
                }}
                onFocus={() => setIsOpen(true)}
                autoComplete="off"
            />
            {isOpen && filtered.length > 0 && (
                <div className="custom-select-dropdown">
                    <ul className="custom-select-options">
                        {filtered.map((s) => (
                            <li
                                key={s}
                                onMouseDown={(e) => {
                                    e.preventDefault();
                                    onChange(s);
                                    setIsOpen(false);
                                }}
                            >
                                {s}
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
}