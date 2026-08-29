'use client';

import { useState, useRef, useEffect } from 'react';
import { PetData } from '@/lib/pets';
import { getRecentSearches, addRecentSearch, removeRecentSearch as removeRecentSearchFromStorage } from '@/lib/searchHistory';

interface SearchBoxProps {
    pets: PetData[];
    onSearch: (query: string) => void;
}

export default function SearchBox({ pets, onSearch }: SearchBoxProps) {
    const [searchQuery, setSearchQuery] = useState('');
    const [isSearchOpen, setIsSearchOpen] = useState(false);

    const [recentSearches, setRecentSearches] = useState<string[]>([]);
    const searchContainerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        setRecentSearches(getRecentSearches());
    }, []);



    useEffect(() => {
        const handleClickOutsideSearch = (e: MouseEvent) => {
            if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
                setIsSearchOpen(false);
            }
        };
        document.addEventListener('click', handleClickOutsideSearch);
        return () => document.removeEventListener('click', handleClickOutsideSearch);
    }, []);

    const executeSearch = (query: string) => {
        const trimmed = query.trim();
        if (!trimmed) return;

        addRecentSearch(trimmed);
        setRecentSearches(getRecentSearches());

        setSearchQuery(trimmed);
        setIsSearchOpen(false);
        onSearch(trimmed);
    };

    const removeRecentSearch = (e: React.MouseEvent, index: number) => {
        e.stopPropagation();
        removeRecentSearchFromStorage(recentSearches[index]);
        setRecentSearches((prev) => prev.filter((_, i) => i !== index));
    };

    return (
        <div className="search-box-container" ref={searchContainerRef}>
            <i className="search-icon"></i>
            <input
                type="text"
                id="main-search-input"
                placeholder="Busca por raza, color, características..."
                autoComplete="off"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => setIsSearchOpen(true)}
            />

            <div
                className={`search-dropdown-results ${isSearchOpen ? 'is-visible' : ''}`}
                id="search-dropdown"
            >
                {searchQuery.trim() === '' ? (
                    <>
                        <div className="dropdown-section-header">
                            <span>Recientes</span>
                        </div>
                        {recentSearches.length === 0 ? (
                            <div className="dropdown-empty-message">No hay búsquedas recientes</div>
                        ) : (
                            recentSearches.slice(0, 10).map((search, idx) => (
                                <div
                                    key={idx}
                                    className="search-result-item"
                                    data-type="recent"
                                    data-value={search}
                                    onClick={() => executeSearch(search)}
                                >
                                    <div className="search-item-left">
                                        <div className="search-item-icon">
                                            <i className="ti ti-clock"></i>
                                        </div>
                                        <div className="search-item-info">
                                            <span className="search-item-title">{search}</span>
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        className="search-item-remove-btn"
                                        data-index={idx}
                                        onClick={(e) => removeRecentSearch(e, idx)}
                                    >
                                        <i className="ti ti-x"></i>
                                    </button>
                                </div>
                            ))
                        )}
                    </>
                ) : (
                    <>
                        {pets.filter((pet) =>
                            pet.title.toLowerCase().includes(searchQuery.toLowerCase())
                        ).length === 0 ? (
                            <div
                                className="search-result-item"
                                data-type="suggest"
                                data-value={searchQuery}
                                onClick={() => executeSearch(searchQuery)}
                            >
                                <div className="search-item-left">
                                    <div className="search-item-icon">
                                        <i className="ti ti-search"></i>
                                    </div>
                                    <div className="search-item-info">
                                        <span className="search-item-title">
                                            Buscar &quot;<strong>{searchQuery}</strong>&quot;
                                        </span>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            pets
                                .filter((pet) =>
                                    pet.title.toLowerCase().includes(searchQuery.toLowerCase())
                                )
                                .slice(0, 8)
                                .map((pet) => (
                                    <div
                                        key={pet.id}
                                        className="search-result-item"
                                        data-type="suggest"
                                        data-value={pet.title}
                                        onClick={() => executeSearch(pet.title)}
                                    >
                                        <div className="search-item-left">
                                            <div className="search-item-icon">
                                                <i className="ti ti-search"></i>
                                            </div>
                                            <div className="search-item-info">
                                                <span className="search-item-title">{pet.title}</span>
                                                <span className="search-item-subtitle">{pet.badge}</span>
                                            </div>
                                        </div>
                                    </div>
                                ))
                        )}
                    </>
                )}
            </div>

            <button
                type="button"
                className={`clear-search-btn ${searchQuery.length > 0 ? 'active' : ''}`}
                id="btn-clear-all"
                onClick={() => {
                    setSearchQuery('');
                    setIsSearchOpen(true);
                    onSearch('');
                }}
            >
                <i className="ti ti-x"></i>
            </button>
        </div>
    );
}