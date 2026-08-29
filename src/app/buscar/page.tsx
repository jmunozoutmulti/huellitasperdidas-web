'use client';
import { triggerOpenPlanesModal } from '@/utils/events';
import PlanesModal from '@/components/global/PlanesModal';

import { useState, useEffect, useRef, ChangeEvent, KeyboardEvent } from 'react';
import Link from 'next/link';
import CustomSelect from '@/components/ui/CustomSelect';
import '@/styles/buscar.css';
import { useRouter } from 'next/navigation';
import { getMockSearchResults, SearchResult } from '@/lib/searchResults';
import { useRequireAuth } from '@/hooks/useRequireAuth';

interface MockPetInfo {
    nombre: string;
    detalles: string;
}

interface SearchItem {
    title: string;
    subtitle: string;
}

export default function BuscarIAPage() {

    useRequireAuth();

    const router = useRouter();
    const searchResults: SearchResult[] = getMockSearchResults();

    const handleResultClick = (result: SearchResult) => {
        if (result.pet.isExternal && result.pet.externalUrl) {
            window.open(result.pet.externalUrl, '_blank');
            return;
        }
        router.push(`/${result.pet.id}`);
    };



    // ==========================================
    // ESTADOS Y MOCKS GENERALES
    // ==========================================
    const [activePetPill, setActivePetPill] = useState<string | null>(null);
    const [globalQuery, setGlobalQuery] = useState('');
    const [isSearchDropdownOpen, setIsSearchDropdownOpen] = useState(false);
    const [recentSearches, setRecentSearches] = useState<string[]>([
        'Poodle gris Miraflores',
        'Gato negro con collar rojo',
        'Husky ojos azules',
    ]);

    // Filtros rápidos
    const [filterTipoAviso, setFilterTipoAviso] = useState('');
    const [filterTiempo, setFilterTiempo] = useState('');

    // Filtros avanzados
    const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);
    const [filterDepartamento, setFilterDepartamento] = useState('');
    const [filterProvincia, setFilterProvincia] = useState('');
    const [filterDistrito, setFilterDistrito] = useState('');

    // Pills multi-select (Tipo de mascota / Tamaño)
    const [pillFilters, setPillFilters] = useState<{
        tipo: string[];
        tamano: string[];
    }>({
        tipo: [],
        tamano: [],
    });

    // Custom Tags (Raza / Color)
    const [customTags, setCustomTags] = useState<{
        raza: string[];
        color: string[];
    }>({
        raza: [],
        color: [],
    });

    const [inputTagRaza, setInputTagRaza] = useState('');
    const [inputTagColor, setInputTagColor] = useState('');

    // Centinela 24/7 y Antivirus Scan
    const [isCentinelaActive, setIsCentinelaActive] = useState(false);
    const [isCentinelaConfigOpen, setIsCentinelaConfigOpen] = useState(false);
    const [centinelaFreq, setCentinelaFreq] = useState('');
    const [includePhotoInCentinela, setIncludePhotoInCentinela] = useState(false);
    const [isCentinelaLocked, setIsCentinelaLocked] = useState(false);
    const [centinelaStatusText, setCentinelaStatusText] = useState('En pausa');

    // Scanner Biométrico / Foto
    const [uploadedBioImage, setUploadedBioImage] = useState<string | null>(null);
    const [isBioScannerLocked, setIsBioScannerLocked] = useState(false);

    // Estados de Búsqueda, Loader y Resultados
    const [isFirstVisitBannerVisible, setIsFirstVisitBannerVisible] = useState(true);
    const [isSearching, setIsSearching] = useState(false);
    const [searchProgress, setSearchProgress] = useState(0);
    const [isScanningBio, setIsScanningBio] = useState(false);

    const [hasSearched, setHasSearched] = useState(false);
    const [hasResults, setHasResults] = useState(false);

    // Refs
    const searchContainerRef = useRef<HTMLDivElement>(null);

    // Mocks
    const anunciosMock: Record<string, MockPetInfo> = {
        toby: { nombre: 'Toby', detalles: 'La Molina | Blanco y crema' },
        benji: { nombre: 'Benji', detalles: 'Miraflores | Gris total' },
        nuevo: { nombre: 'Nueva Búsqueda', detalles: '' },
    };

    const mockPostsIA: SearchItem[] = [
        { title: 'Raza pequeña de 3 meses', subtitle: 'Adopciones' },
        { title: 'Perros visto en S.M.P-Lima Perú', subtitle: 'Avistamiento' },
        { title: 'Perro encontrado en la loza deportiva SMP', subtitle: 'Encontrado' },
        { title: 'Gato macho perdido', subtitle: 'Perdido' },
    ];

    // ==========================================
    // EFECTOS Y LISTENERS
    // ==========================================
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (
                searchContainerRef.current &&
                !searchContainerRef.current.contains(e.target as Node)
            ) {
                setIsSearchDropdownOpen(false);
            }
        };
        document.addEventListener('click', handleClickOutside);
        return () => document.removeEventListener('click', handleClickOutside);
    }, []);

    // ==========================================
    // LÓGICA DE CENTINELA Y PRUEBA GRATUITA
    // ==========================================
    const handleCentinelaToggle = (e: ChangeEvent<HTMLInputElement>) => {
        const checked = e.target.checked;
        setIsCentinelaActive(checked);

        if (checked) {
            setCentinelaStatusText('Activo');
            setIsSearching(false);
            setIsScanningBio(true);

            // Simulación de prueba libre (expira a los 5s)
            if (!isCentinelaLocked) {
                setTimeout(() => {
                    setIsCentinelaActive(false);
                    setCentinelaStatusText('Rastreador en pausa');
                    setIsScanningBio(false);
                    setIsCentinelaLocked(true);
                }, 5000);
            }
        } else {
            setCentinelaStatusText('En pausa');
            setIsScanningBio(false);
        }
    };

    // ==========================================
    // LÓGICA DE CARGA BIOMÉTRICA (FOTO)
    // ==========================================
    const handleBioFileChange = (e: ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                setUploadedBioImage(event.target?.result as string);
            };
            reader.readAsDataURL(file);

            setIsSearching(false);
            setIsScanningBio(true);
            setHasSearched(false);

            setTimeout(() => {
                setIsScanningBio(false);
                setHasSearched(true);
                setHasResults(true);
            }, 2500);

            if (!isBioScannerLocked) {
                setTimeout(() => {
                    setIsBioScannerLocked(true);
                }, 5000);
            }
        }
    };

    // ==========================================
    // EJECUCIÓN DE BÚSQUEDA Y PROGRESO
    // ==========================================
    const handleTriggerSearch = () => {
        setIsScanningBio(false);
        setIsSearching(true);
        setHasSearched(false);
        setSearchProgress(0);

        let current = 0;
        const interval = setInterval(() => {
            current += 5;
            setSearchProgress(current);
            if (current >= 100) {
                clearInterval(interval);
                setIsSearching(false);
                setHasSearched(true);
                setHasResults(globalQuery.trim() !== '');
            }
        }, 40);
    };

    const executeIaSearch = (query: string) => {
        const trimmed = query.trim();
        if (!trimmed) return;

        setRecentSearches((prev) => {
            const filtered = prev.filter(
                (item) => item.toLowerCase() !== trimmed.toLowerCase()
            );
            return [trimmed, ...filtered].slice(0, 10);
        });

        setGlobalQuery(trimmed);
        setIsSearchDropdownOpen(false);
    };

    const removeRecentSearch = (e: React.MouseEvent, index: number) => {
        e.stopPropagation();
        setRecentSearches((prev) => prev.filter((_, i) => i !== index));
    };

    // ==========================================
    // MANEJO DE TAGS Y PILLS MULTI-SELECT
    // ==========================================
    const togglePillFilter = (group: 'tipo' | 'tamano', value: string) => {
        setPillFilters((prev) => {
            const currentGroup = prev[group];
            const exists = currentGroup.includes(value);
            return {
                ...prev,
                [group]: exists
                    ? currentGroup.filter((v) => v !== value)
                    : [...currentGroup, value],
            };
        });
    };

    const handleAddCustomTag = (type: 'raza' | 'color') => {
        const val = type === 'raza' ? inputTagRaza.trim() : inputTagColor.trim();
        if (val && !customTags[type].includes(val)) {
            setCustomTags((prev) => ({
                ...prev,
                [type]: [...prev[type], val],
            }));
            if (type === 'raza') setInputTagRaza('');
            else setInputTagColor('');
        }
    };

    const handleRemoveCustomTag = (type: 'raza' | 'color', index: number) => {
        setCustomTags((prev) => ({
            ...prev,
            [type]: prev[type].filter((_, i) => i !== index),
        }));
    };

    // Conteo total de filtros activos para determinar si mostrar la barra
    const activeTagsCount =
        (activePetPill && activePetPill !== 'nuevo' ? 1 : 0) +
        (globalQuery.trim() ? 1 : 0) +
        (filterTipoAviso ? 1 : 0) +
        (filterTiempo ? 1 : 0) +
        (filterDepartamento ? 1 : 0) +
        (filterProvincia ? 1 : 0) +
        (filterDistrito ? 1 : 0) +
        pillFilters.tipo.length +
        pillFilters.tamano.length +
        customTags.raza.length +
        customTags.color.length +
        (includePhotoInCentinela || uploadedBioImage ? 1 : 0);

    return (
        <main className="main-content">
            <section id="view-ia-search" className="tab-view animate-fade-in">
                <div className="ia-dashboard-grid">
                    {/* ==========================================
              COLUMNA IZQUIERDA (CONTROLES Y FILTROS)
             ========================================== */}
                    <div className="ia-col-left">
                        <div className="ia-box form-box">
                            {/* PET PILLS */}
                            <div className="pet-pills-flex">
                                <button
                                    className={`pill-btn ${activePetPill === 'toby' ? 'active' : ''}`}
                                    data-pet="toby"
                                    onClick={() => setActivePetPill('toby')}
                                >
                                    Toby
                                </button>
                                <button
                                    className={`pill-btn ${activePetPill === 'benji' ? 'active' : ''}`}
                                    data-pet="benji"
                                    onClick={() => setActivePetPill('benji')}
                                >
                                    Benji
                                </button>
                                <button
                                    className={`pill-btn ${activePetPill === 'nuevo' || !activePetPill ? 'active' : ''}`}
                                    data-pet="nuevo"
                                    onClick={() => setActivePetPill('nuevo')}
                                >
                                    <i className="ti ti-refresh"></i> Nueva búsqueda
                                </button>
                            </div>

                            {/* INPUT DE BÚSQUEDA GLOBAL */}
                            <div
                                className="input-group-custom global-search-group"
                                ref={searchContainerRef}
                            >
                                <i className="search-icon"></i>
                                <input
                                    type="text"
                                    id="ia-global-query"
                                    placeholder="Raza, color, características..."
                                    value={globalQuery}
                                    onChange={(e) => setGlobalQuery(e.target.value)}
                                    onFocus={() => setIsSearchDropdownOpen(true)}
                                />

                                {/* DROPDOWN DE BÚSQUEDA */}
                                <div
                                    className={`search-dropdown-results ${isSearchDropdownOpen ? 'is-visible' : ''
                                        }`}
                                    id="ia-search-dropdown"
                                >
                                    {!globalQuery.trim() ? (
                                        <>
                                            <div className="dropdown-section-header">
                                                <span>Recientes</span>
                                            </div>
                                            {recentSearches.length === 0 ? (
                                                <div className="dropdown-section-header">
                                                    No hay búsquedas recientes
                                                </div>
                                            ) : (
                                                recentSearches.slice(0, 10).map((search, idx) => (
                                                    <div
                                                        key={idx}
                                                        className="search-result-item"
                                                        data-type="recent"
                                                        data-value={search}
                                                        onClick={() => executeIaSearch(search)}
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
                                            {mockPostsIA.filter((item) =>
                                                item.title.toLowerCase().includes(globalQuery.toLowerCase())
                                            ).length === 0 ? (
                                                <div
                                                    className="search-result-item"
                                                    data-type="suggest"
                                                    data-value={globalQuery}
                                                    onClick={() => executeIaSearch(globalQuery)}
                                                >
                                                    <div className="search-item-left">
                                                        <div className="search-item-icon">
                                                            <i className="ti ti-search"></i>
                                                        </div>
                                                        <div className="search-item-info">
                                                            <span className="search-item-title">
                                                                Buscar &quot;<strong>{globalQuery}</strong>&quot;
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                            ) : (
                                                mockPostsIA
                                                    .filter((item) =>
                                                        item.title
                                                            .toLowerCase()
                                                            .includes(globalQuery.toLowerCase())
                                                    )
                                                    .map((item, idx) => (
                                                        <div
                                                            key={idx}
                                                            className="search-result-item"
                                                            data-type="suggest"
                                                            data-value={item.title}
                                                            onClick={() => executeIaSearch(item.title)}
                                                        >
                                                            <div className="search-item-left">
                                                                <div className="search-item-icon">
                                                                    <i className="ti ti-search"></i>
                                                                </div>
                                                                <div className="search-item-info">
                                                                    <span className="search-item-title">
                                                                        {item.title}
                                                                    </span>
                                                                    <span className="search-item-subtitle">
                                                                        {item.subtitle}
                                                                    </span>
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
                                    className={`clear-search-btn ${globalQuery.length > 0 ? 'active' : ''
                                        }`}
                                    id="btn-clear-all"
                                    onClick={() => setGlobalQuery('')}
                                >
                                    <i className="ti ti-x"></i>
                                </button>
                                <button
                                    type="button"
                                    id="btn-trigger-search"
                                    className="btn-primary-search"
                                    onClick={handleTriggerSearch}
                                >
                                    Buscar
                                </button>
                            </div>

                            {/* FILTROS RÁPIDOS */}
                            <div
                                className="form-grid-custom"
                                style={{ flexFlow: 'nowrap' }}
                            >
                                <CustomSelect
                                    placeholder="--"
                                    value={filterTipoAviso}
                                    onChange={(val) => setFilterTipoAviso(val)}
                                    options={[
                                        { value: 'Perdidos', label: 'Perdidos' },
                                        { value: 'Encontrados', label: 'Encontrados' },
                                        { value: 'Avistamientos', label: 'Avistamientos' },
                                        { value: 'Adopciones', label: 'Adopciones' },
                                    ]}
                                />
                                <CustomSelect
                                    placeholder="--"
                                    value={filterTiempo}
                                    onChange={(val) => setFilterTiempo(val)}
                                    options={[
                                        { value: 'Últimas 24 horas', label: 'Últimas 24 horas' },
                                        { value: 'Última semana', label: 'Última semana' },
                                        { value: 'Último mes', label: 'Último mes' },
                                    ]}
                                />
                            </div>

                            <div className="sources-checklist-container-modern">
                                <div className="source-check-item-modern">
                                    <i className="ti ti-world-search"></i> Buscamos en todo Internet (sitios, redes y más)
                                </div>
                            </div>

                            {/* LOADER DE PROGRESO */}
                            <div
                                id="main-search-loader"
                                className={`main-loader-container ${isSearching ? '' : 'hidden-view'
                                    }`}
                            >
                                <div className="loader-label-row">
                                    <span>
                                        <i className="fa-solid fa-circle-notch fa-spin"></i> Ejecutando escaneo profundo...
                                    </span>
                                    <span id="load-percentage">{searchProgress}%</span>
                                </div>
                                <div className="main-progress-bg">
                                    <div
                                        id="main-progress-bar"
                                        className="main-progress-bar"
                                        style={{ width: `${searchProgress}%` }}
                                    ></div>
                                </div>
                            </div>

                            {/* DESPLEGABLE DE FILTROS AVANZADOS */}
                            <button
                                type="button"
                                className={`btn-toggle-advanced-filters ${isAdvancedOpen ? 'open' : ''
                                    }`}
                                id="btn-toggle-advanced"
                                onClick={() => setIsAdvancedOpen(!isAdvancedOpen)}
                            >
                                <span>
                                    <i className="ti ti-filter-2-search"></i> Filtros avanzados
                                </span>
                                <i className="fa-solid fa-chevron-down toggle-chevron"></i>
                            </button>

                            <div
                                className="advanced-filters-panel"
                                id="advanced-filters-panel"
                                style={{ display: isAdvancedOpen ? 'flex' : 'none' }}
                            >
                                <h3>Zona de búsqueda</h3>
                                <div className="grid-3col-filters">
                                    <div className="filter-group">
                                        <CustomSelect
                                            id="filter-departamento"
                                            placeholder="--"
                                            value={filterDepartamento}
                                            onChange={(val) => setFilterDepartamento(val)}
                                            options={[{ value: 'Lima', label: 'Lima' }]}
                                        />
                                    </div>
                                    <div className="filter-group">
                                        <CustomSelect
                                            id="filter-provincia"
                                            placeholder="--"
                                            value={filterProvincia}
                                            onChange={(val) => setFilterProvincia(val)}
                                            options={[{ value: 'Lima', label: 'Lima' }]}
                                        />
                                    </div>
                                    <div className="filter-group">
                                        <CustomSelect
                                            id="filter-distrito"
                                            placeholder="--"
                                            value={filterDistrito}
                                            onChange={(val) => setFilterDistrito(val)}
                                            options={[
                                                { value: 'La Molina', label: 'La Molina' },
                                                { value: 'Miraflores', label: 'Miraflores' },
                                                {
                                                    value: 'Santiago de Surco',
                                                    label: 'Santiago de Surco',
                                                },
                                            ]}
                                        />
                                    </div>
                                </div>

                                <div className="filter-divider"></div>

                                <div className="filter-group">
                                    <label className="filter-label">Tipo de mascota</label>
                                    <div className="pill-multi-group">
                                        {['Perro', 'Gato', 'Ave'].map((t) => (
                                            <button
                                                key={t}
                                                type="button"
                                                className={`pill-multi-btn ${pillFilters.tipo.includes(t) ? 'active' : ''
                                                    }`}
                                                data-group="tipo"
                                                data-value={t}
                                                onClick={() => togglePillFilter('tipo', t)}
                                            >
                                                <i
                                                    className={`fa-solid ${t === 'Perro'
                                                        ? 'fa-dog'
                                                        : t === 'Gato'
                                                            ? 'fa-cat'
                                                            : 'fa-dove'
                                                        }`}
                                                ></i>{' '}
                                                {t}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="filter-divider"></div>

                                {/* TAGS CUSTOM (RAZA / COLOR) */}
                                <div className="grid-2col-filters">
                                    <div className="filter-group">
                                        <label className="filter-label">Raza o especie</label>
                                        <div className="tag-input-group">
                                            <input
                                                type="text"
                                                id="input-tag-raza"
                                                className="tag-input-field"
                                                value={inputTagRaza}
                                                onChange={(e) => setInputTagRaza(e.target.value)}
                                                onKeyPress={(e: KeyboardEvent<HTMLInputElement>) => {
                                                    if (e.key === 'Enter') {
                                                        e.preventDefault();
                                                        handleAddCustomTag('raza');
                                                    }
                                                }}
                                            />
                                            <button
                                                type="button"
                                                className="btn-tag-add"
                                                data-target="raza"
                                                onClick={() => handleAddCustomTag('raza')}
                                            >
                                                <i className="fa-solid fa-plus"></i>
                                            </button>
                                        </div>
                                    </div>

                                    <div className="filter-group">
                                        <label className="filter-label">Color / Pelaje</label>
                                        <div className="tag-input-group">
                                            <input
                                                type="text"
                                                id="input-tag-color"
                                                className="tag-input-field"
                                                value={inputTagColor}
                                                onChange={(e) => setInputTagColor(e.target.value)}
                                                onKeyPress={(e: KeyboardEvent<HTMLInputElement>) => {
                                                    if (e.key === 'Enter') {
                                                        e.preventDefault();
                                                        handleAddCustomTag('color');
                                                    }
                                                }}
                                            />
                                            <button
                                                type="button"
                                                className="btn-tag-add"
                                                data-target="color"
                                                onClick={() => handleAddCustomTag('color')}
                                            >
                                                <i className="fa-solid fa-plus"></i>
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                {/* CONTENEDOR DE TAGS CUSTOM */}
                                {(customTags.raza.length > 0 || customTags.color.length > 0) && (
                                    <div
                                        id="container-custom-tags"
                                        className="custom-tags-flex"
                                        style={{ display: 'flex' }}
                                    >
                                        {customTags.raza.map((val, idx) => (
                                            <span key={`raza-${idx}`} className="badge-custom-tag tag-raza">
                                                Raza: {val}{' '}
                                                <i
                                                    className="fa-solid fa-xmark remove-tag-btn"
                                                    onClick={() => handleRemoveCustomTag('raza', idx)}
                                                ></i>
                                            </span>
                                        ))}
                                        {customTags.color.map((val, idx) => (
                                            <span key={`color-${idx}`} className="badge-custom-tag tag-color">
                                                Color: {val}{' '}
                                                <i
                                                    className="fa-solid fa-xmark remove-tag-btn"
                                                    onClick={() => handleRemoveCustomTag('color', idx)}
                                                ></i>
                                            </span>
                                        ))}
                                    </div>
                                )}

                                <div className="filter-divider"></div>

                                <div className="filter-group">
                                    <label className="filter-label">Tamaño</label>
                                    <div className="pill-multi-group">
                                        {['Pequeño', 'Mediano', 'Grande'].map((size) => (
                                            <button
                                                key={size}
                                                type="button"
                                                className={`pill-multi-btn ${pillFilters.tamano.includes(size) ? 'active' : ''
                                                    }`}
                                                data-group="tamano"
                                                data-value={size}
                                                onClick={() => togglePillFilter('tamano', size)}
                                            >
                                                {size}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* ==========================================
              COLUMNA CENTRO (CENTINELA / RASTREADOR)
             ========================================== */}
                    <div className="ia-col-center">
                        <div
                            className={`ia-box centinela-premium-box ${isCentinelaLocked ? 'premium-locked' : ''
                                } ${isCentinelaActive ? 'centinela-active' : ''}`}
                            id="centinela-box"
                        >
                            <div className="wrapper-premium-notice">
                                <div className="premium-notice-banner">
                                    <Link href="/publicar" className="notice-main-link">
                                        <div className="notice-icon">
                                            <i className="ti ti-settings-search"></i>
                                        </div>
                                        <div className="notice-text">
                                            <h5>Publica un aviso</h5>
                                            <p>y activa la herramienta avanzada de búsqueda automática 24/7</p>
                                        </div>
                                    </Link>
                                    <button
                                        type="button"
                                        className="notice-alt-btn"
                                        data-open-planes-modal="" onClick={triggerOpenPlanesModal}
                                    >
                                        o activa la herramienta sin publicar aviso
                                    </button>
                                </div>
                            </div>

                            <div className="centinela-header-row">
                                <button
                                    type="button"
                                    className="btn-centinela-setting"
                                    onClick={() => setIsCentinelaConfigOpen(!isCentinelaConfigOpen)}
                                >
                                    <i className={isCentinelaConfigOpen ? 'ti ti-settings-check' : 'ti ti-settings'}></i>{' '}
                                    <span>{isCentinelaConfigOpen ? 'Guardar' : 'Ajustes'}</span>
                                </button>
                                <label className="ui-switch">
                                    <input
                                        type="checkbox"
                                        id="chk-centinela-toggle"
                                        checked={isCentinelaActive}
                                        onChange={handleCentinelaToggle}
                                    />
                                    <span className="ui-slider-btn"></span>
                                </label>
                                <h4>Buscador automático 24/7 </h4>
                            </div>

                            <div
                                id="centinela-config-flow"
                                className={isCentinelaConfigOpen ? '' : 'hidden-centinela-config-flow'}
                            >
                                <div className="centinela-row-field">
                                    <div className="centinela-field">
                                        <label className="label">Frecuencia:</label>
                                        <CustomSelect
                                            id="sel-centinela-freq"
                                            placeholder="--"
                                            value={centinelaFreq}
                                            onChange={(val) => setCentinelaFreq(val)}
                                            options={[
                                                { value: 'Cada hora', label: 'Cada hora' },
                                                { value: 'Cada 2 horas', label: 'Cada 2 horas' },
                                                { value: 'Cada día', label: 'Cada día' },
                                            ]}
                                        />
                                    </div>
                                    <div className="centinela-field">
                                        <label className="label">¿Incluir búsqueda por foto?</label>
                                        <label className="ui-switch">
                                            <input
                                                type="checkbox"
                                                id="chk-centinela-include-photo"
                                                checked={includePhotoInCentinela}
                                                onChange={(e) => setIncludePhotoInCentinela(e.target.checked)}
                                            />
                                            <span className="ui-slider-btn"></span>
                                        </label>
                                    </div>
                                </div>
                            </div>

                            <div
                                className={`antivirus-scan-wrapper ${isCentinelaActive ? 'state-scanning' : ''
                                    }`}
                                id="antivirus-wrapper-container"
                            >
                                <div className="antivirus-status-text-row">
                                    <span id="antivirus-status-title">
                                        {isCentinelaActive ? (
                                            <>
                                                <i className="icon-loading"></i>Activo
                                            </>
                                        ) : isCentinelaLocked ? (
                                            <>
                                                <i
                                                    className="fa-solid fa-circle-xmark"
                                                    style={{ color: 'var(--brand-red)' }}
                                                ></i>{' '}
                                                Rastreador en pausa
                                            </>
                                        ) : (
                                            <>
                                                <i className="fa-solid fa-circle-pause"></i> En pausa
                                            </>
                                        )}
                                    </span>
                                    <span
                                        id="antivirus-status-desc"
                                        className={isCentinelaActive ? '' : 'hidden-view'}
                                    >
                                        Buscando, rastreando...
                                    </span>
                                </div>
                                <div className="antivirus-track">
                                    <div className="antivirus-laser-bar"></div>
                                </div>
                            </div>
                        </div>

                        {/* BANNER PRIMERA VISITA */}
                        <div
                            id="first-visit-banner"
                            className={`first-visit-banner ${isFirstVisitBannerVisible ? 'is-visible' : ''
                                }`}
                        >
                            <div className="fvb-text">
                                <h5>Publica un aviso</h5>
                                <p>
                                    Para que <b>Centinela IA</b> empiece a buscar automáticamente, o realiza una búsqueda manual.
                                </p>
                            </div>
                            <div className="fvb-actions">
                                <Link href="/publicar" className="btn-primary-mini">
                                    Publicar aviso
                                </Link>
                                <button
                                    type="button"
                                    className="fvb-alt-link"
                                    data-open-planes-modal=""
                                    onClick={triggerOpenPlanesModal}
                                >
                                    Activar sin publicar aviso
                                </button>
                            </div>
                            <button
                                type="button"
                                className="fvb-close"
                                aria-label="Cerrar"
                                onClick={() => setIsFirstVisitBannerVisible(false)}
                            >
                                <i className="ti ti-x"></i>
                            </button>
                        </div>

                        {/* BARRA DE TAGS ACTIVOS */}
                        <div
                            id="container-active-tags"
                            className="active-tags-flex"
                            style={{
                                display:
                                    activeTagsCount > 0 || isCentinelaActive ? 'flex' : 'none',
                            }}
                        >
                            {activePetPill &&
                                activePetPill !== 'nuevo' &&
                                anunciosMock[activePetPill] && (
                                    <span className="badge-active-attribute badge-pill-pet">
                                        <i className="fa-solid fa-paw"></i> Mascota:{' '}
                                        {anunciosMock[activePetPill].nombre}{' '}
                                        <i
                                            className="fa-solid fa-xmark remove-tag-btn"
                                            onClick={() => setActivePetPill('nuevo')}
                                        ></i>
                                    </span>
                                )}

                            {globalQuery.trim() && (
                                <span className="badge-active-attribute">
                                    <i className="ti ti-search"></i> Criterio: &quot;{globalQuery}&quot;{' '}
                                    <i
                                        className="fa-solid fa-xmark remove-tag-btn"
                                        onClick={() => setGlobalQuery('')}
                                    ></i>
                                </span>
                            )}

                            {filterTipoAviso && (
                                <span className="badge-active-attribute">
                                    <i className="fa-solid fa-filter"></i> {filterTipoAviso}{' '}
                                    <i
                                        className="fa-solid fa-xmark remove-tag-btn"
                                        onClick={() => setFilterTipoAviso('')}
                                    ></i>
                                </span>
                            )}

                            {filterTiempo && (
                                <span className="badge-active-attribute">
                                    <i className="fa-solid fa-filter"></i> {filterTiempo}{' '}
                                    <i
                                        className="fa-solid fa-xmark remove-tag-btn"
                                        onClick={() => setFilterTiempo('')}
                                    ></i>
                                </span>
                            )}

                            {(includePhotoInCentinela || uploadedBioImage) && (
                                <span className="badge-active-attribute badge-photo-attached">
                                    <i className="fa-solid fa-camera"></i> Con Foto{' '}
                                    <i
                                        className="fa-solid fa-xmark remove-tag-btn"
                                        onClick={() => {
                                            setIncludePhotoInCentinela(false);
                                            setUploadedBioImage(null);
                                        }}
                                    ></i>
                                </span>
                            )}

                            {activeTagsCount === 0 && (
                                <p className="empty-criteria-message">
                                    <i className="ti ti-info-circle"></i> Ingresa características de tu mascota y te avisaremos si encontramos coincidencias.
                                </p>
                            )}
                        </div>

                        {/* TAGS AVANZADOS DE UBICACIÓN Y PILLS */}
                        <div
                            id="container-active-tags-avanced"
                            className="active-tags-flex-avanced"
                        >
                            {filterDepartamento && (
                                <span className="badge-active-attribute-avanced">
                                    <i className="fa-solid fa-location-dot"></i> {filterDepartamento}{' '}
                                    <i
                                        className="fa-solid fa-xmark remove-tag-btn"
                                        onClick={() => setFilterDepartamento('')}
                                    ></i>
                                </span>
                            )}
                            {filterProvincia && (
                                <span className="badge-active-attribute-avanced">
                                    <i className="fa-solid fa-location-dot"></i> {filterProvincia}{' '}
                                    <i
                                        className="fa-solid fa-xmark remove-tag-btn"
                                        onClick={() => setFilterProvincia('')}
                                    ></i>
                                </span>
                            )}
                            {filterDistrito && (
                                <span className="badge-active-attribute-avanced">
                                    <i className="fa-solid fa-location-dot"></i> {filterDistrito}{' '}
                                    <i
                                        className="fa-solid fa-xmark remove-tag-btn"
                                        onClick={() => setFilterDistrito('')}
                                    ></i>
                                </span>
                            )}

                            {pillFilters.tipo.map((val) => (
                                <span key={`pill-tipo-${val}`} className="badge-active-attribute-avanced">
                                    <i
                                        className={`fa-solid ${val === 'Perro'
                                            ? 'fa-dog'
                                            : val === 'Gato'
                                                ? 'fa-cat'
                                                : 'fa-dove'
                                            }`}
                                    ></i>{' '}
                                    {val}{' '}
                                    <i
                                        className="fa-solid fa-xmark remove-tag-btn"
                                        onClick={() => togglePillFilter('tipo', val)}
                                    ></i>
                                </span>
                            ))}

                            {pillFilters.tamano.map((val) => (
                                <span key={`pill-tamano-${val}`} className="badge-active-attribute-avanced">
                                    {val}{' '}
                                    <i
                                        className="fa-solid fa-xmark remove-tag-btn"
                                        onClick={() => togglePillFilter('tamano', val)}
                                    ></i>
                                </span>
                            ))}
                        </div>

                        {/* EMPTY STATE */}
                        {!isSearching && !isScanningBio && !hasSearched && (
                            <div className="search-empty-state">
                                <div className="empty-search">
                                    <i></i>
                                </div>
                                <p className="empty-state-description only-desktop">
                                    Introduce características en el <b>buscador a la izquierda</b>, o <b>sube una foto</b> a la derecha para un análisis asistido por IA.
                                </p>
                                <p className="empty-state-description only-mobile">
                                    Introduce características en el <b>buscador de arriba</b>, o <b>sube una foto</b> más abajo para un análisis asistido por IA.
                                </p>
                            </div>
                        )}

                        {/* SCANNING LOADER */}
                        <div
                            id="ia-scanning-state"
                            className={`ia-scanning-state ${isScanningBio ? '' : 'hidden-view'
                                }`}
                        >
                            <div className="loading-centinela">
                                <div className="loading-ia"></div>
                                <p>Buscando coincidencias...</p>
                            </div>
                        </div>

                        {/* ÁREA DE RESULTADOS */}
                        <div
                            id="ia-results-area"
                            className={`ia-results-right-column ${hasSearched ? '' : 'hidden-view'
                                }`}
                        >
                            <h4 className="results-sidebar-title">
                                Coincidencias encontradas
                                <span className="results-count-badge">
                                    {hasResults ? '7 resultados' : '0 resultados'}
                                </span>
                            </h4>

                            {/* SIN RESULTADOS */}
                            {!hasResults && (
                                <div className="no-results-state">
                                    <div className="no-results-icon">
                                        <i className="ti ti-map-question"></i>
                                    </div>
                                    <h5 className="no-results-title">Sin coincidencias</h5>
                                    <p className="no-results-desc">
                                        No encontramos resultados para <b>&quot;{globalQuery || 'tu búsqueda'}&quot;</b>.<br />
                                        Intenta con otros términos o activa el <b>Buscador 24/7</b> para rastreo continuo.
                                    </p>
                                </div>
                            )}

                            {/* CON RESULTADOS (STACK HORIZONTAL DE TARJETAS) */}
                            {hasResults && (
                                <div className="horizontal-results-stack">
                                    {searchResults.map(({ pet, matchPercent }) => {
                                        const isSystemResult = !pet.isExternal;

                                        return (
                                            <div
                                                key={pet.id}
                                                className="pet-card pet-card-horizontal"
                                                onClick={() => handleResultClick({ pet, matchPercent })}
                                                style={{ cursor: 'pointer' }}
                                            >
                                                <div className="card-horizontal-media">
                                                    <div className="card-badges-horizontal">
                                                        {pet.isExternal ? (
                                                            <span
                                                                className="badge-horizontal"
                                                                style={
                                                                    pet.externalType === 'facebook'
                                                                        ? { backgroundColor: '#1877f2' }
                                                                        : pet.externalType === 'instagram'
                                                                            ? { backgroundColor: '#cc2366' }
                                                                            : pet.externalType === 'tiktok'
                                                                                ? { backgroundColor: 'var(--brand-main)' }
                                                                                : { backgroundColor: '#4285f4' }
                                                                }
                                                            >
                                                                {pet.externalType === 'facebook' && <i className="fa-brands fa-facebook"></i>}
                                                                {pet.externalType === 'instagram' && <i className="fa-brands fa-instagram"></i>}
                                                                {pet.externalType === 'tiktok' && <i className="fa-brands fa-tiktok"></i>}
                                                                {pet.externalType === 'google' && <i className="fa-brands fa-google"></i>}
                                                                {' '}{pet.badge}
                                                            </span>
                                                        ) : (
                                                            <span className={`badge-horizontal ${pet.badgeStyle}`}>{pet.badge}</span>
                                                        )}
                                                    </div>
                                                    <img src={pet.imgSrc} className="card-img" alt={pet.title} />
                                                </div>

                                                <div className="card-horizontal-body">
                                                    <div className="card-body">
                                                        <div className="card-horizontal-header-row">
                                                            <h3 className="card-title-horizontal">{pet.title}</h3>
                                                            {isSystemResult ? (
                                                                <span className="ia-matches-badge-horizontal">
                                                                    <i className="fa-solid fa-brain"></i> {matchPercent}% Match
                                                                </span>
                                                            ) : (
                                                                <span
                                                                    className="ia-matches-badge-horizontal"
                                                                    style={
                                                                        pet.externalType === 'facebook'
                                                                            ? { color: '#1877f2', backgroundColor: 'rgb(24 119 242 / 13%)' }
                                                                            : pet.externalType === 'instagram'
                                                                                ? { color: '#cc2366', backgroundColor: 'rgb(204 35 102 / 22%)' }
                                                                                : pet.externalType === 'google'
                                                                                    ? { color: '#4285f4', backgroundColor: 'rgb(66 133 244 / 13%)' }
                                                                                    : {}
                                                                    }
                                                                >
                                                                    <i className="fa-solid fa-lock"></i> {matchPercent}% Match
                                                                </span>
                                                            )}
                                                        </div>
                                                        <div className="card-meta-horizontal">
                                                            <span>
                                                                <i className="ti ti-pin"></i> {pet.district || '-'}
                                                            </span>
                                                            <span>
                                                                <i className="ti ti-calendar-bolt"></i> {pet.date || '-'}
                                                            </span>
                                                        </div>
                                                        {pet.reward && pet.reward !== 'S/. 0' && pet.reward !== '0' && (
                                                            <div className="reward-container">
                                                                <span className="reward-label">Recompensa</span>
                                                                <span className="reward-amount">{pet.reward}</span>
                                                            </div>
                                                        )}
                                                        {pet.isExternal && pet.desc && (
                                                            <div className="card-desc-horizontal">{pet.desc}</div>
                                                        )}
                                                    </div>

                                                    <div className="card-footer-horizontal">
                                                        {isSystemResult ? (
                                                            <>
                                                                <div>
                                                                    <span>
                                                                        <i className="ti ti-share"></i> {pet.shares}
                                                                    </span>
                                                                    <span>
                                                                        <i className="ti ti-users"></i> {pet.views}
                                                                    </span>
                                                                </div>
                                                                {pet.badgeStyle === 'badge-adopt' ? (
                                                                    <button type="button" className="btn-purple-mini">¡ADOPTAR!</button>
                                                                ) : pet.badgeStyle === 'badge-found' ? (
                                                                    <button type="button" className="btn-found-mini">CONSULTAR</button>
                                                                ) : pet.badgeStyle === 'badge-sight' ? (
                                                                    <button type="button" className="btn-yellow-mini">¡LO VI!</button>
                                                                ) : (
                                                                    <button type="button" className="btn-primary-mini">¡LO VI!</button>
                                                                )}
                                                            </>
                                                        ) : (
                                                            <>
                                                                <span>
                                                                    <i className="ti ti-world-www"></i> Indexado
                                                                </span>
                                                                <span
                                                                    style={
                                                                        pet.externalType === 'facebook'
                                                                            ? { color: '#1877f2' }
                                                                            : pet.externalType === 'google'
                                                                                ? { color: '#4285f4' }
                                                                                : {}
                                                                    }
                                                                >
                                                                    {pet.externalType === 'facebook' && (
                                                                        <>
                                                                            <i className="fa-brands fa-facebook"></i> Facebook
                                                                        </>
                                                                    )}
                                                                    {pet.externalType === 'instagram' && (
                                                                        <>
                                                                            <i className="fa-brands fa-instagram"></i> Instagram
                                                                        </>
                                                                    )}
                                                                    {pet.externalType === 'tiktok' && (
                                                                        <>
                                                                            <i className="fa-brands fa-tiktok"></i> TikTok
                                                                        </>
                                                                    )}
                                                                    {pet.externalType === 'google' && (
                                                                        <>
                                                                            <i className="fa-brands fa-google"></i> Origen Externo
                                                                        </>
                                                                    )}
                                                                </span>
                                                            </>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* ==========================================
              COLUMNA DERECHA (ESCÁNER BIOMÉTRICO / FOTO)
             ========================================== */}
                    <div className="ia-col-right">
                        <div
                            className={`ia-box premium-scanner-box ${isBioScannerLocked ? 'premium-locked' : ''
                                }`}
                            id="scanner-biometrico-box"
                        >
                            <div className="wrapper-premium-notice">
                                <div className="premium-notice-banner">
                                    <Link href="/publicar" className="notice-main-link">
                                        <div className="notice-icon">
                                            <i className="ti ti-camera-search"></i>
                                        </div>
                                        <div className="notice-text">
                                            <h5>Publica un aviso</h5>
                                            <p>y activa la búsqueda por foto avanzada</p>
                                        </div>
                                    </Link>
                                    <button
                                        type="button"
                                        className="notice-alt-btn"
                                        data-open-planes-modal=""
                                        onClick={triggerOpenPlanesModal}
                                    >
                                        o activa la herramienta sin publicar aviso
                                    </button>
                                </div>
                            </div>

                            <div
                                className={`dropzone-biometric-modern ${uploadedBioImage ? 'hidden-padding' : ''
                                    }`}
                                id="ia-dropzone"
                            >
                                <input
                                    type="file"
                                    id="ia-file-input"
                                    accept="image/*"
                                    onChange={handleBioFileChange}
                                />

                                <div className="scanner-corners">
                                    <span className="corner tl"></span>
                                    <span className="corner tr"></span>
                                    <span className="corner bl"></span>
                                    <span className="corner br"></span>
                                </div>

                                {!uploadedBioImage && (
                                    <div
                                        id="dropzone-text-container"
                                        className="dropzone-content-wrapper"
                                    >
                                        <div className="bio-pulse-radar">
                                            <div className="pulse-wave"></div>
                                            <i className="ti ti-camera-plus bio-icon-tech"></i>
                                        </div>
                                        <p className="bio-main-text">Sube una foto de tu mascota</p>
                                        <p className="bio-sub-text">
                                            Analizaremos la imagen para buscar posibles <b>coincidencias</b> en <b>Internet y Redes sociales.</b>
                                        </p>
                                        <span className="bio-upload-badge">
                                            <i className="ti ti-upload"></i> Arrastrar o seleccionar
                                        </span>
                                    </div>
                                )}

                                {uploadedBioImage && (
                                    <div
                                        className="preview-img-container"
                                        id="ia-preview-wrapper"
                                    >
                                        <img
                                            id="img-ia-preview"
                                            className="preview-img-bio"
                                            src={uploadedBioImage}
                                            alt="Previsualización"
                                        />
                                        <div className="biometric-laser-line"></div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </section>
            <PlanesModal />
        </main>
    );
}