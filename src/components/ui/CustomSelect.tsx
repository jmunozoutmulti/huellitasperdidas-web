'use client';

import { useState, useRef, useEffect } from 'react';

export interface SelectOption {
    value: string;
    label: string;
}

interface CustomSelectProps {
    id?: string;
    options: SelectOption[];
    value: string;
    onChange: (val: string) => void;
    placeholder?: string;
    disabled?: boolean;
    className?: string;
}

export default function CustomSelect({
    id,
    options,
    value,
    onChange,
    placeholder = 'Selecciona una opción',
    disabled = false,
    className = '',
}: CustomSelectProps) {
    const [isOpen, setIsOpen] = useState(false);
    const wrapperRef = useRef<HTMLDivElement>(null);

    const selectedOption = options.find((opt) => opt.value === value);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (
                wrapperRef.current &&
                !wrapperRef.current.contains(event.target as Node)
            ) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleSelect = (val: string) => {
        onChange(val);
        setIsOpen(false);
    };

    return (
        <div
            ref={wrapperRef}
            className={`custom-select-wrapper ${isOpen ? 'open' : ''} ${value ? 'has-value' : ''} ${className}`}
        >
            <div
                id={id}
                className={`custom-select-trigger ${value ? 'has-value' : ''}`}
                onClick={() => !disabled && setIsOpen(!isOpen)}
            >
                <span>{selectedOption ? selectedOption.label : placeholder}</span>
                <i className="ti ti-chevron-down"></i>
            </div>

            {isOpen && (
                <ul className="custom-select-dropdown">
                    {options.map((option) => (
                        <li
                            key={option.value}
                            className={option.value === value ? 'selected' : ''}
                            onClick={() => handleSelect(option.value)}
                        >
                            {option.label}
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}