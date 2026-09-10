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
    searchable?: boolean; // NUEVO
}

export default function CustomSelect({
    id,
    options,
    value,
    onChange,
    placeholder = 'Selecciona una opción',
    disabled = false,
    className = '',
    searchable = false,
}: CustomSelectProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState(''); // NUEVO
    const wrapperRef = useRef<HTMLDivElement>(null);
    const searchInputRef = useRef<HTMLInputElement>(null); // NUEVO

    const selectedOption = options.find((opt) => opt.value === value);

    // NUEVO: filtra las opciones según lo que se escribe
    const filteredOptions = searchable && searchTerm.trim()
        ? options.filter((opt) =>
            opt.label.toLowerCase().includes(searchTerm.trim().toLowerCase())
        )
        : options;

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

    // NUEVO: al abrir, limpia el buscador y enfoca el input
    useEffect(() => {
        if (isOpen) {
            setSearchTerm('');
            // pequeño delay para que el input ya esté montado en el DOM
            setTimeout(() => searchInputRef.current?.focus(), 0);
        }
    }, [isOpen]);

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
                <div className="custom-select-dropdown">
                    {searchable && (
                        <div className="custom-select-search" onClick={(e) => e.stopPropagation()}>
                            <i className="ti ti-search"></i>
                            <input
                                ref={searchInputRef}
                                type="text"
                                placeholder="Buscar..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    )}
                    <ul className="custom-select-options">
                        {filteredOptions.length > 0 ? (
                            filteredOptions.map((option) => (
                                <li
                                    key={option.value}
                                    className={option.value === value ? 'selected' : ''}
                                    onClick={() => handleSelect(option.value)}
                                >
                                    {option.label}
                                </li>
                            ))
                        ) : (
                            <li className="custom-select-no-results">Sin resultados</li>
                        )}
                    </ul>
                </div>
            )}
        </div>
    );
}