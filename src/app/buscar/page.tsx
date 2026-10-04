'use client';

import { useState, useEffect, useRef, KeyboardEvent } from 'react';
import Link from 'next/link';
import CustomSelect from '@/components/ui/CustomSelect';
import '@/styles/buscar.css';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { useApp } from '@/context/AppContext';
import {
    fetchReports,
    fetchMyReports,
    fetchReport,
    analyzeImage,
    searchPets,
    type Report,
    type AnalyzeImageResult,
    type SearchResult,
    type SearchMeta,
} from '@/lib/api';

import {
    IconRefresh,
    IconClock,
    IconX,
    IconSearch,
    IconWorldSearch,
    IconFilter2Search,
    IconInfoCircle,
    IconPin,
    IconCalendarBolt,
    IconShare,
    IconUsers,
    IconWorldWww,
    IconAlertTriangle,
    IconCameraPlus,
    IconUpload,
    IconBrandFacebook,
    IconBrandInstagram,
    IconBrandTiktok,
    IconBrandGoogle,
    IconHeart,
    IconLockCheck,
    IconChevronDown,
    IconDog,
    IconCat,
    IconCanary,
    IconPower,
    IconLock,
    IconPaw,
    IconCamera,
    IconFilter,
    IconSparkles
} from '@tabler/icons-react';

import {
    createOrReplaceCentinela,
    turnOffCentinela,
    getMyCentinela,
    getCentinelaMatches,
    markCentinelaMatchVisto,
    type CentinelaWatch,
    type CentinelaMatch,
} from '@/lib/centinelaApi';
import { reportToPetData } from '@/lib/transformers';
import { PetData } from '@/lib/pets';
import {
    getLevel1Options,
    getLevel2Options,
    getLevel3Options,
    countryHasLevel3,
    getTerritoryTree,
} from '@/lib/locations';
import { getCountryByAbbr, getLocaleForCountry } from '@/lib/countries';
import { getPackages, type PackageOption } from '@/lib/packagesApi';
import {
    getRecentSearches,
    addRecentSearch,
    removeRecentSearch as removeRecentSearchStorage,
} from '@/lib/searchHistory';
import { showToast } from '@/components/global/Toast';
import { resizePetImage } from '@/lib/resizeImage';
// ==========================================
// CONSTANTES
// ==========================================

// report_type real que acepta GET /v1/reports (confirmado en el Swagger).
const REPORT_TYPE_OPTIONS = [
    { value: 'lost', label: 'Perdidos' },
    { value: 'found', label: 'Encontrados' },
    { value: 'sighting', label: 'Avistamientos' },
    { value: 'adoption', label: 'Adopciones' },
];

const TIEMPO_OPTIONS = [
    { value: '24h', label: 'Últimas 24 horas' },
    { value: '7d', label: 'Última semana' },
    { value: '30d', label: 'Último mes' },
];
const TIEMPO_HOURS: Record<string, number> = { '24h': 24, '7d': 24 * 7, '30d': 24 * 30 };

const PET_TYPE_OPTIONS = [
    { value: 'perro', label: 'Perro', icon: IconDog },
    { value: 'gato', label: 'Gato', icon: IconCat },
    { value: 'ave', label: 'Ave', icon: IconCanary },
];

// Convierte el AnalyzeImageResult en una lista plana de chips mostrables.
function buildBioAttributeChips(result: AnalyzeImageResult): { id: string; label: string }[] {
    const chips: { id: string; label: string }[] = [];
    if (result.pet_type) chips.push({ id: 'pet_type', label: result.pet_type });
    if (result.size) chips.push({ id: 'size', label: result.size });
    if (result.sex) chips.push({ id: 'sex', label: result.sex });
    (result.colors || []).forEach((c, i) => chips.push({ id: `color-${i}`, label: c }));
    if (result.has_collar) {
        chips.push({
            id: 'collar',
            label: result.collar_color ? `Collar ${result.collar_color}` : 'Con collar',
        });
    }
    (result.distinctive_marks || []).forEach((m, i) => chips.push({ id: `mark-${i}`, label: m }));
    Object.entries(result.physical_traits || {}).forEach(([k, v], i) =>
        chips.push({ id: `trait-${i}`, label: `${k}: ${v}` })
    );
    return chips;
}

function formatPetLocation(pet: PetData): string {
    if (pet.district) {
        return [pet.district, pet.province].filter(Boolean).join(', ');
    }
    return [pet.province, pet.region].filter(Boolean).join(', ') || '-';
}

function truncateText(text: string, maxLength: number): string {
    const trimmed = text.trim();
    if (trimmed.length <= maxLength) return trimmed;
    return `${trimmed.slice(0, maxLength).trimEnd()}...`;
}


export default function BuscarIAPage() {
    useRequireAuth();
    const { currentUser, setCentinelaEstaActivo } = useApp();
    const countryCode = currentUser?.country ?? null;

    // ==========================================
    // AVISOS PROPIOS (pet-pills-flex) + GATING (paquete con Centinela)
    // ==========================================
    const [myReports, setMyReports] = useState<Report[]>([]);
    const [activePetPill, setActivePetPill] = useState<string>('nuevo');
    const [packages, setPackages] = useState<PackageOption[]>([]);
    const [myReportsLoaded, setMyReportsLoaded] = useState(false);
    const [packagesLoaded, setPackagesLoaded] = useState(false);
    const isGatingReady = myReportsLoaded && packagesLoaded;

    useEffect(() => {
        let isCancelled = false;
        fetchMyReports()
            .then((reports) => {
                if (!isCancelled) setMyReports(reports);
            })
            .catch(() => {
                // silencioso — si falla, simplemente no se muestran pills
            })
            .finally(() => {
                if (!isCancelled) setMyReportsLoaded(true);
            });
        return () => {
            isCancelled = true;
        };
    }, []);

    useEffect(() => {
        if (!countryCode) return;
        let isCancelled = false;
        getPackages(countryCode)
            .then((data) => {
                if (!isCancelled) setPackages(data);
            })
            .catch(() => {
                // silencioso — sin paquetes, hasToolsAccess simplemente da false
            })
            .finally(() => {
                if (!isCancelled) setPackagesLoaded(true);
            });
        return () => {
            isCancelled = true;
        };
    }, [countryCode]);

    const activeMyReports = myReports.filter((r) => {
        if (r.status !== 'active') return false;
        if (r.payment_status === 'pending' || r.payment_status === 'failed' || r.payment_status === 'refunded') return false;
        if (r.expires_at && new Date(r.expires_at).getTime() < Date.now()) return false;
        return true;
    });

    const hasToolsAccess = myReports.some((r) => {
        if (r.payment_status !== 'paid') return false;
        if (r.status !== 'active' && r.status !== 'pending') return false;
        if (r.expires_at && new Date(r.expires_at).getTime() < Date.now()) return false;
        const pkg = packages.find((p) => p.slug === r.package_slug);
        return pkg?.centinela === true;
    });

    type SearchMode = 'mascota' | 'abierta';
    const [searchMode, setSearchMode] = useState<SearchMode>('abierta');
    const isMascotaMode = searchMode === 'mascota';

    const [selectedPetReport, setSelectedPetReport] = useState<Report | null>(null);

    const handleSelectPetPill = (report: Report) => {
        setActivePetPill(report.id);
        setSelectedPetReport(report);
        setSearchMode('mascota');
    };

    const handleResetPetPill = () => {
        setActivePetPill('nuevo');
        setSelectedPetReport(null);
        setSearchMode('abierta');
        setResults([]);
        setHasSearched(false);
        setSearchError(null);
        setResultsSearchMeta(null);
        resetBioScanner();
        setGlobalQuery('');
        setFilterReportType('');
        setFilterTiempo('');
        setFilterDepartamento('');
        setFilterProvincia('');
        setFilterDistrito('');
        setPetTypeFilter('');
    };

    const getCurrentSearchCriteria = () => {
        if (isMascotaMode) {
            if (!selectedPetReport) {
                return {
                    queryText: '',
                    district: '',
                    reportId: null as string | null,
                    reportType: null as string | null,
                    petType: null as string | null,
                };
            }
            const breed = selectedPetReport.meta?.breed;
            const color = selectedPetReport.meta?.color;
            return {
                queryText: [breed, color].filter(Boolean).join(' ') || selectedPetReport.title || '',
                district: selectedPetReport.district || '',
                reportId: selectedPetReport.id,
                reportType: null as string | null,
                petType: null as string | null,
            };
        }
        return {
            queryText: globalQuery.trim(),
            district: deepestLocationValue,
            reportId: null as string | null,
            reportType: filterReportType || null,
            petType: petTypeFilter || null,
        };
    };

    // ==========================================
    // BUSCADOR + RECIENTES (compartidos con Home vía searchHistory.ts)
    // ==========================================
    const [globalQuery, setGlobalQuery] = useState('');
    const [isSearchDropdownOpen, setIsSearchDropdownOpen] = useState(false);
    const [recentSearches, setRecentSearches] = useState<string[]>([]);
    const searchContainerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        setRecentSearches(getRecentSearches());
    }, []);

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

    const executeIaSearch = (query: string) => {
        const trimmed = query.trim();
        if (!trimmed) return;
        setGlobalQuery(trimmed);
        setIsSearchDropdownOpen(false);
    };

    const removeRecentSearch = (e: React.MouseEvent, index: number) => {
        e.stopPropagation();
        removeRecentSearchStorage(recentSearches[index]);
        setRecentSearches((prev) => prev.filter((_, i) => i !== index));
    };

    // ==========================================
    // FILTROS
    // ==========================================
    const [filterReportType, setFilterReportType] = useState('');
    const [filterTiempo, setFilterTiempo] = useState('');

    const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);
    const [isZoneHighlighted, setIsZoneHighlighted] = useState(false);
    const [filterDepartamento, setFilterDepartamento] = useState('');
    const [filterProvincia, setFilterProvincia] = useState('');
    const [filterDistrito, setFilterDistrito] = useState('');

    // Selección única (no multi) en tipo de mascota.
    const [petTypeFilter, setPetTypeFilter] = useState('');

    const selectPetTypeFilter = (value: string) => {
        setPetTypeFilter((prev) => (prev === value ? '' : value));
    };

    // ==========================================
    // UBICACIÓN DINÁMICA POR PAÍS (mismo patrón que DatosSection)
    // ==========================================
    const [locationLabels, setLocationLabels] = useState<[string, string, string] | null>(null);
    const [nivel1Options, setNivel1Options] = useState<{ value: string; label: string }[]>([]);
    const [nivel2Options, setNivel2Options] = useState<{ value: string; label: string }[]>([]);
    const [nivel3Options, setNivel3Options] = useState<{ value: string; label: string }[]>([]);
    const [hasLevel3, setHasLevel3] = useState(true);

    useEffect(() => {
        if (!countryCode) return;
        let isCancelled = false;
        getCountryByAbbr(countryCode).then((c) => {
            if (!isCancelled) setLocationLabels(c?.locationLabels ?? null);
        });
        countryHasLevel3(countryCode).then((result) => {
            if (!isCancelled) setHasLevel3(result);
        });
        return () => {
            isCancelled = true;
        };
    }, [countryCode]);

    useEffect(() => {
        getLevel1Options(countryCode).then(setNivel1Options);
    }, [countryCode]);

    useEffect(() => {
        getLevel2Options(countryCode, filterDepartamento).then(setNivel2Options);
    }, [countryCode, filterDepartamento]);

    useEffect(() => {
        getLevel3Options(countryCode, filterDepartamento, filterProvincia).then(setNivel3Options);
    }, [countryCode, filterDepartamento, filterProvincia]);

    const clearLocationFilters = () => {
        setFilterDepartamento('');
        setFilterProvincia('');
        setFilterDistrito('');
    };

    const deepestLocationValue = hasLevel3 ? filterDistrito : filterProvincia;
    const hasIncompleteLocation = () => !deepestLocationValue && !!(filterDepartamento || filterProvincia);

    const deepestLocationLabel = hasLevel3
        ? locationLabels?.[2] ?? 'distrito'
        : locationLabels?.[1] ?? 'provincia';

    const bioFileInputRef = useRef<HTMLInputElement>(null);
    const [bioImagePreview, setBioImagePreview] = useState<string | null>(null);
    const [isAnalyzingBio, setIsAnalyzingBio] = useState(false);
    const [bioAnalysisError, setBioAnalysisError] = useState<string | null>(null);
    const [bioAnalysisResult, setBioAnalysisResult] = useState<AnalyzeImageResult | null>(null);
    const [bioAttributes, setBioAttributes] = useState<{ id: string; label: string }[]>([]);
    const [isBioConfirmed, setIsBioConfirmed] = useState(false);
    const isBioLocked = !hasToolsAccess;

    const resetBioScanner = () => {
        setBioImagePreview(null);
        setBioAnalysisError(null);
        setBioAnalysisResult(null);
        setBioAttributes([]);
        setIsBioConfirmed(false);
    };

    const handleBioFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        e.target.value = ''; // permite volver a elegir el mismo archivo después

        if (!file) return;

        if (isBioLocked) {
            showToast('Publica un aviso para desbloquear la búsqueda por foto.', 'info');
            return;
        }
        if (!file.type.startsWith('image/')) {
            showToast('Solo se aceptan imágenes.', 'error');
            return;
        }
        if (file.size > 8 * 1024 * 1024) {
            showToast('La imagen no debe superar los 8MB.', 'error');
            return;
        }

        setBioAnalysisError(null);
        setBioAnalysisResult(null);
        setBioAttributes([]);
        setIsBioConfirmed(false);
        setIsAnalyzingBio(true);

        try {
            const dataUrl = await resizePetImage(file);
            setBioImagePreview(dataUrl);

            const base64 = dataUrl.split(',')[1] ?? dataUrl;
            const result = await analyzeImage(base64);

            if (!result.is_pet) {
                setBioAnalysisError(
                    result.validation_error || 'No identificamos una mascota en la foto. Intenta con otra.'
                );
                return;
            }

            setBioAnalysisResult(result);
            setBioAttributes(buildBioAttributeChips(result));
            // No se confirma sola: queda editable (chips con x) hasta que el
            // usuario pulse "Usar en búsqueda" a propósito.
            setIsBioConfirmed(false);
        } catch (err) {
            setBioAnalysisError('No pudimos analizar la foto. Intenta de nuevo.');
        } finally {
            setIsAnalyzingBio(false);
        }
    };

    const handleRemoveBioAttribute = (id: string) => {
        setBioAttributes((prev) => prev.filter((c) => c.id !== id));
    };

    const handleConfirmBioAttributes = () => {
        if (bioAttributes.length > 0) setIsBioConfirmed(true);
    };


    const [isSearching, setIsSearching] = useState(false);
    const [hasSearched, setHasSearched] = useState(false);
    const [searchError, setSearchError] = useState<string | null>(null);
    const [results, setResults] = useState<PetData[]>([]);
    const [resultsSearchMeta, setResultsSearchMeta] = useState<SearchMeta | null>(null);

    const applyClientSideFilters = (
        reports: (Report | SearchResult)[]
    ): (Report | SearchResult)[] => {
        if (isMascotaMode) return reports;

        let filtered = reports;

        if (filterReportType) {
            filtered = filtered.filter((r) => r.report_type === filterReportType);
        }
        if (petTypeFilter) {
            filtered = filtered.filter((r) => r.pet_type === petTypeFilter);
        }
        if (filterTiempo) {
            const maxHours = TIEMPO_HOURS[filterTiempo];
            if (maxHours) {
                const limit = Date.now() - maxHours * 60 * 60 * 1000;
                filtered = filtered.filter((r) => {
                    const ref = r.published_at || r.created_at;
                    return ref ? new Date(ref).getTime() >= limit : true;
                });
            }
        }

        return filtered;
    };

    const hasAnyCriteria = () => {
        if (isMascotaMode) return !!selectedPetReport;
        return !!(
            globalQuery.trim() ||
            filterReportType ||
            filterTiempo ||
            filterDepartamento ||
            filterProvincia ||
            filterDistrito ||
            petTypeFilter ||
            (isBioConfirmed && bioAttributes.length > 0)
        );
    };

    const hasConfirmedPhoto = !isMascotaMode && isBioConfirmed && !!bioAnalysisResult;
    const [centinela, setCentinela] = useState<CentinelaWatch | null>(null);
    const [isCentinelaToggling, setIsCentinelaToggling] = useState(false);
    const [centinelaMatches, setCentinelaMatches] = useState<CentinelaMatch[]>([]);
    const [centinelaMatchPets, setCentinelaMatchPets] = useState<Record<string, PetData>>({});
    const [isLoadingMatches, setIsLoadingMatches] = useState(false);

    useEffect(() => {
        if (!hasToolsAccess) return;
        let isCancelled = false;

        (async () => {
            try {
                const data = await getMyCentinela();
                if (isCancelled) return;

                setCentinelaEstaActivo(!!data?.activo);

                if (data?.activo && data.report_id) {
                    setSearchMode('mascota');
                    setActivePetPill(data.report_id);
                    try {
                        const report = await fetchReport(data.report_id);
                        if (isCancelled) return;
                        setSelectedPetReport(report);
                    } catch {
                        // silencioso — si falla, el criterio queda incompleto,
                    }
                    setCentinela(data);
                    return;
                }

                setCentinela(data);

                if (data?.activo) {
                    setSearchMode('abierta');
                    if (data.query_text) setGlobalQuery(data.query_text);
                    if (data.district) {
                        setFilterDistrito(data.district);
                        if (countryCode) {
                            getTerritoryTree(countryCode).then((tree) => {
                                if (isCancelled) return;
                                for (const dep of tree) {
                                    for (const prov of dep.children ?? []) {
                                        if (prov.name === data.district) {
                                            setFilterDepartamento(dep.name);
                                            setFilterProvincia(prov.name);
                                            return;
                                        }
                                        if ((prov.children ?? []).some((d) => d.name === data.district)) {
                                            setFilterDepartamento(dep.name);
                                            setFilterProvincia(prov.name);
                                            return;
                                        }
                                    }
                                }
                            });
                        }
                    }
                    if (data.image_features) {
                        setBioAnalysisResult(data.image_features);
                        setBioAttributes(buildBioAttributeChips(data.image_features));
                        setIsBioConfirmed(true);
                    }
                    if (data.image_url) setBioImagePreview(data.image_url);

                    if (data.report_type) setFilterReportType(data.report_type);
                    if (data.pet_type) setPetTypeFilter(data.pet_type);
                }
            } catch {
            }
        })();

        return () => {
            isCancelled = true;
        };
    }, [hasToolsAccess]);

    const loadCentinelaMatches = async () => {
        setIsLoadingMatches(true);
        try {
            const matches = await getCentinelaMatches(false);
            setCentinelaMatches(matches);

            const missing = matches.filter((m) => !centinelaMatchPets[m.report_id]);
            const fetched = await Promise.all(
                missing.map((m) => fetchReport(m.report_id).catch(() => null))
            );
            setCentinelaMatchPets((prev) => {
                const next = { ...prev };
                fetched.forEach((r, i) => {
                    if (r) next[missing[i].report_id] = reportToPetData(r);
                });
                return next;
            });
        } catch {
            // silencioso — la lista simplemente queda como estaba
        } finally {
            setIsLoadingMatches(false);
        }
    };

    useEffect(() => {
        if (centinela?.activo) {
            loadCentinelaMatches();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [centinela?.activo, centinela?.id]);

    const handleToggleCentinela = async () => {
        if (!hasToolsAccess || isCentinelaToggling) return;

        setIsCentinelaToggling(true);
        try {
            if (centinela?.activo) {
                await turnOffCentinela();
                setCentinela((prev) => (prev ? { ...prev, activo: false } : prev));
                setCentinelaEstaActivo(false);
            } else {
                if (!hasAnyCriteria()) {
                    showToast('Ingresa un criterio de búsqueda antes de activar el Centinela.', 'info');
                    return;
                }
                if (!isMascotaMode && hasIncompleteLocation()) {
                    showToast(
                        `Completa la zona de búsqueda hasta ${deepestLocationLabel} o quítala, para poder guardarla en el Centinela.`,
                        'info'
                    );
                    return;
                }

                const criteria = getCurrentSearchCriteria();

                const created = await createOrReplaceCentinela({
                    query_text: criteria.queryText || null,
                    district: criteria.district || null,
                    image_features: hasConfirmedPhoto ? bioAnalysisResult : null,
                    image_base64:
                        hasConfirmedPhoto && bioImagePreview?.startsWith('data:')
                            ? bioImagePreview.split(',')[1] ?? bioImagePreview
                            : null,
                    report_type: criteria.reportType,
                    pet_type: criteria.petType,
                    report_id: criteria.reportId,
                });
                setCentinela(created);
                setCentinelaEstaActivo(!!created.activo);
            }
        } catch (err) {
            showToast('No pudimos actualizar el Centinela. Intenta de nuevo.', 'error');
        } finally {
            setIsCentinelaToggling(false);
        }
    };

    const handleDismissMatch = async (matchId: string) => {
        setCentinelaMatches((prev) => prev.filter((m) => m.id !== matchId));
        try {
            await markCentinelaMatchVisto(matchId);
        } catch {
        }
    };

    const centinelaMatchIds = new Set(centinelaMatches.map((m) => m.report_id));
    const visibleResults = centinela?.activo
        ? results.filter((pet) => !centinelaMatchIds.has(pet.id))
        : results;

    const centinelaActiveSince = centinela?.created_at
        ? new Date(centinela.created_at).toLocaleDateString(getLocaleForCountry(countryCode), {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
        })
        : null;

    const handleTriggerSearch = async () => {
        if (!countryCode) return;

        if (!hasAnyCriteria()) {
            showToast('Ingresa una característica o elige un filtro antes de buscar.', 'info');
            return;
        }
        if (!isMascotaMode && hasIncompleteLocation()) {
            showToast(
                `Completa la zona de búsqueda hasta ${deepestLocationLabel} o quítala para buscar sin filtrar por ubicación.`,
                'info'
            );
            return;
        }

        const criteria = getCurrentSearchCriteria();

        if (hasConfirmedPhoto && !criteria.district) {
            showToast('Selecciona una zona de búsqueda.', 'info');
            setIsAdvancedOpen(true);
            setIsZoneHighlighted(true);
            return;
        }

        setIsSearching(true);
        setSearchError(null);

        try {
            let items: (Report | SearchResult)[];

            if (hasConfirmedPhoto) {
                const base64 = bioImagePreview?.startsWith('data:')
                    ? bioImagePreview.split(',')[1] ?? bioImagePreview
                    : undefined;
                const response = await searchPets({
                    district: criteria.district,
                    text: criteria.queryText || undefined,
                    image_base64: base64,
                    image_features: bioAnalysisResult!,
                    country_code: countryCode,
                });
                items = response.results;
                setResultsSearchMeta(response.meta ?? null);
            } else {
                const response = await fetchReports({
                    country_code: countryCode,
                    status: 'active',
                    search: criteria.queryText || undefined,
                    report_type: criteria.reportType || undefined,
                    district: criteria.district || undefined,
                    pet_type: criteria.petType || undefined,
                    strict: true,
                    limit: 100,
                });
                items = response.items;
                setResultsSearchMeta(null);
            }

            const seen = new Set<string>();
            const deduped = items.filter((item) => {
                if (isMascotaMode && criteria.reportId && item.id === criteria.reportId) return false;
                if (seen.has(item.id)) return false;
                seen.add(item.id);
                return true;
            });

            const filteredReports = applyClientSideFilters(deduped);
            setResults(filteredReports.map(reportToPetData));

            if (!isMascotaMode && globalQuery.trim()) {
                addRecentSearch(globalQuery.trim());
                setRecentSearches(getRecentSearches());
            }
        } catch (err) {
            setSearchError('No pudimos completar la búsqueda. Intenta de nuevo en unos minutos.');
            setResults([]);
        } finally {
            setIsSearching(false);
            setHasSearched(true);
        }
    };

    useEffect(() => {
        if (centinela?.activo) {
            handleTriggerSearch();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [centinela?.id, centinela?.activo]);

    useEffect(() => {
        if (isMascotaMode && selectedPetReport && !centinela?.activo) {
            handleTriggerSearch();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [searchMode, selectedPetReport?.id]);

    const handleSearchInputKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            setIsSearchDropdownOpen(false);
            handleTriggerSearch();
        }
    };

    const handleOpenDetail = (pet: PetData) => {
        if (pet.isExternal && pet.externalUrl) {
            window.open(pet.externalUrl, '_blank');
            return;
        }
        window.open(`/?id=${pet.id}`, '_blank');
    };


    const renderPetCard = (
        pet: PetData,
        options?: { onDismiss?: () => void }
    ) => {
        const isSystemResult = !pet.isExternal;

        return (
            <div
                key={pet.id}
                className="pet-card pet-card-horizontal"
                onClick={() => handleOpenDetail(pet)}
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
                                {pet.externalType === 'facebook' && <IconBrandFacebook />}
                                {pet.externalType === 'instagram' && <IconBrandInstagram />}
                                {pet.externalType === 'tiktok' && <IconBrandTiktok />}
                                {pet.externalType === 'google' && <IconBrandGoogle />}
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
                            {options?.onDismiss && (
                                <button
                                    type="button"
                                    className="btn-dismiss-match tooltip"
                                    data-tooltip="Descartar"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        options.onDismiss?.();
                                    }}
                                >
                                    <IconX />
                                </button>
                            )}
                        </div>
                        <div className="card-meta-horizontal">
                            <span>
                                <IconPin /> {formatPetLocation(pet)}
                            </span>
                            <span>
                                <IconCalendarBolt /> {pet.date || '-'}
                            </span>
                        </div>
                        {pet.reward && pet.reward !== 'S/. 0' && pet.reward !== '0' && (
                            <div className="reward-container">
                                <span className="reward-label">Recompensa</span>
                                <span className="reward-amount">{pet.reward}</span>
                            </div>
                        )}
                        {pet.desc && (
                            <div className="card-desc-horizontal">{truncateText(pet.desc, 120)}</div>
                        )}
                    </div>

                    <div className="card-footer-horizontal">
                        {isSystemResult ? (
                            <>
                                {pet.badgeStyle === 'badge-adopt' || pet.badgeStyle === 'badge-adopt-premium' ? (
                                    <span>
                                        <IconHeart /> Adopción Responsable
                                    </span>
                                ) : (
                                    <div>
                                        <span>
                                            <IconShare /> {pet.shares}
                                        </span>
                                        <span>
                                            <IconUsers /> {pet.views}
                                        </span>
                                    </div>
                                )}
                                {pet.badgeStyle === 'badge-adopt' || pet.badgeStyle === 'badge-adopt-premium' ? (
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
                                    <IconWorldWww /> Indexado
                                </span>
                                <span
                                    style={
                                        pet.externalType === 'facebook'
                                            ? { color: '#1877f2' }
                                            : pet.externalType === 'instagram'
                                                ? { color: '#cc2366' }
                                                : pet.externalType === 'google'
                                                    ? { color: '#4285f4' }
                                                    : {}
                                    }
                                >
                                    {pet.externalType === 'facebook' && <IconBrandFacebook />}
                                    {pet.externalType === 'instagram' && <IconBrandInstagram />}
                                    {pet.externalType === 'tiktok' && <IconBrandTiktok />}
                                    {pet.externalType === 'google' && <IconBrandGoogle />}
                                    {' '}
                                    {pet.externalType === 'facebook'
                                        ? 'Facebook'
                                        : pet.externalType === 'instagram'
                                            ? 'Instagram'
                                            : pet.externalType === 'tiktok'
                                                ? 'TikTok'
                                                : 'Origen Externo'}
                                </span>
                            </>
                        )}
                    </div>
                </div>
            </div>
        );
    };

    const activeTagsCount = isMascotaMode
        ? (activePetPill !== 'nuevo' ? 1 : 0)
        : (globalQuery.trim() ? 1 : 0) +
        (filterReportType ? 1 : 0) +
        (filterTiempo ? 1 : 0) +
        (filterDepartamento || filterProvincia || filterDistrito ? 1 : 0) +
        (petTypeFilter ? 1 : 0) +
        (isBioConfirmed && bioAttributes.length > 0 ? 1 : 0);

    return (
        <main className="main-content">
            <section id="view-ia-search" className="tab-view animate-fade-in">
                <div className="ia-dashboard-grid">
                    {/* ==========================================
                        COLUMNA IZQUIERDA (CONTROLES Y FILTROS)
                        ========================================== */}
                    <div className="ia-col-left">
                        <div className="ia-box form-box">
                            {centinela?.activo && (
                                <div className="layer-blocked"
                                >
                                    <span className="badge-active-attribute">
                                        <IconLockCheck /> Centinela activado
                                    </span>
                                </div>
                            )}
                            <div
                                style={
                                    centinela?.activo
                                        ? { opacity: 0.5, pointerEvents: 'none' }
                                        : undefined
                                }
                            >
                                {/* PET PILLS — avisos activos propios */}
                                <div className="pet-pills-flex">
                                    {activeMyReports.map((report) => (
                                        <button
                                            key={report.id}
                                            type="button"
                                            className={`pill-btn ${activePetPill === report.id ? 'active' : ''}`}
                                            onClick={() => handleSelectPetPill(report)}
                                        >
                                            {report.title || 'Sin título'}
                                        </button>
                                    ))}
                                    <button
                                        type="button"
                                        className={`pill-btn pill-btn-reset ${activePetPill === 'nuevo' ? 'active' : ''}`}
                                        onClick={handleResetPetPill}
                                    >
                                        <IconRefresh /> Nueva búsqueda
                                    </button>
                                </div>

                                <div
                                    className="input-group-custom global-search-group"
                                    ref={searchContainerRef}
                                    style={
                                        isMascotaMode
                                            ? { opacity: 0.5, pointerEvents: 'none' }
                                            : undefined
                                    }
                                >
                                    <i className="search-icon"></i>
                                    <input
                                        type="text"
                                        id="ia-global-query"
                                        autoComplete="off"
                                        placeholder="Raza, color, características..."
                                        value={globalQuery}
                                        disabled={isMascotaMode}
                                        onChange={(e) => setGlobalQuery(e.target.value)}
                                        onFocus={() => setIsSearchDropdownOpen(true)}
                                        onKeyDown={handleSearchInputKeyDown}
                                    />

                                    {/* DROPDOWN DE RECIENTES (compartido con Home) */}
                                    <div
                                        className={`search-dropdown-results search-ia ${isSearchDropdownOpen ? 'is-visible' : ''
                                            }`}
                                        id="ia-search-dropdown"
                                    >
                                        {!globalQuery.trim() ? (
                                            <>
                                                <div className="dropdown-section-header">
                                                    <span>Recientes</span>
                                                </div>
                                                <div className="dropdown-scroll">
                                                    {recentSearches.length === 0 ? (
                                                        <div className="dropdown-empty-message">No hay búsquedas recientes</div>
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
                                                                        <IconClock />
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
                                                                    <IconX />
                                                                </button>
                                                            </div>
                                                        ))
                                                    )}
                                                </div>
                                            </>
                                        ) : (
                                            <div
                                                className="search-result-item"
                                                data-type="suggest"
                                                data-value={globalQuery}
                                                onClick={() => executeIaSearch(globalQuery)}
                                            >
                                                <div className="search-item-left">
                                                    <div className="search-item-icon">
                                                        <IconSearch />
                                                    </div>
                                                    <div className="search-item-info">
                                                        <span className="search-item-title">
                                                            Buscar &quot;<strong>{globalQuery}</strong>&quot;
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    <button
                                        type="button"
                                        className={`clear-search-btn ${globalQuery.length > 0 ? 'active' : ''}`}
                                        id="btn-clear-all"
                                        onClick={() => setGlobalQuery('')}
                                    >
                                        <IconX />
                                    </button>
                                    <button
                                        type="button"
                                        id="btn-trigger-search"
                                        className="btn-primary-search"
                                        onClick={handleTriggerSearch}
                                        disabled={isSearching || !countryCode || isMascotaMode}
                                    >
                                        Buscar
                                    </button>
                                </div>

                                {/* FILTROS RÁPIDOS movidos a "Filtros avanzados" (más abajo),
                                para dejar el buscador más libre. */}

                                <div className="sources-checklist-container-modern" style={
                                    isMascotaMode
                                        ? { opacity: 0.5, pointerEvents: 'none' }
                                        : undefined
                                }>
                                    <div className="source-check-item-modern">
                                        <IconWorldSearch /> Buscamos en Internet (sitios, redes y más)
                                    </div>
                                </div>

                                {/* DESPLEGABLE DE FILTROS AVANZADOS */}
                                <button
                                    type="button"
                                    className={`btn-toggle-advanced-filters ${isAdvancedOpen ? 'open' : ''}`}
                                    id="btn-toggle-advanced"
                                    onClick={() => setIsAdvancedOpen(!isAdvancedOpen)}
                                    style={
                                        isMascotaMode
                                            ? { opacity: 0.5, pointerEvents: 'none' }
                                            : undefined
                                    }
                                >
                                    <span>
                                        <IconFilter2Search /> Filtros avanzados
                                    </span>
                                    <IconChevronDown className="toggle-chevron" />
                                </button>

                                <div
                                    className="advanced-filters-panel"
                                    id="advanced-filters-panel"
                                    style={{
                                        display: isAdvancedOpen ? 'flex' : 'none',
                                        opacity: isMascotaMode ? 0.5 : 1,
                                        pointerEvents: isMascotaMode ? 'none' : undefined,
                                    }}
                                >
                                    <div className="grid-2col-filters">
                                        <div className="filter-group">
                                            <CustomSelect
                                                placeholder="Tipo de aviso"
                                                value={filterReportType}
                                                onChange={(val) => setFilterReportType(val)}
                                                options={REPORT_TYPE_OPTIONS}
                                            />
                                        </div>
                                        <div className="filter-group">
                                            <CustomSelect
                                                placeholder="Fecha"
                                                value={filterTiempo}
                                                onChange={(val) => setFilterTiempo(val)}
                                                options={TIEMPO_OPTIONS}
                                            />
                                        </div>
                                    </div>

                                    <div className="filter-divider"></div>

                                    <h3 className={isZoneHighlighted ? 'zone-label-error' : ''}>Zona de búsqueda</h3>
                                    <div className={hasLevel3 ? 'grid-3col-filters' : 'grid-2col'}>
                                        <div className={`filter-group ${isZoneHighlighted ? 'filter-group-error' : ''}`}>
                                            <CustomSelect
                                                id="filter-departamento"
                                                placeholder={locationLabels?.[0] ?? '--'}
                                                value={filterDepartamento}
                                                onChange={(val) => {
                                                    setFilterDepartamento(val);
                                                    setFilterProvincia('');
                                                    setFilterDistrito('');
                                                }}
                                                options={nivel1Options}
                                                searchable={true}
                                            />
                                        </div>
                                        <div className={`filter-group ${isZoneHighlighted ? 'filter-group-error' : ''}`}>
                                            <CustomSelect
                                                id="filter-provincia"
                                                placeholder={locationLabels?.[1] ?? '--'}
                                                value={filterProvincia}
                                                onChange={(val) => {
                                                    setFilterProvincia(val);
                                                    setFilterDistrito('');
                                                    if (!hasLevel3) {
                                                        setIsZoneHighlighted(false);
                                                    }
                                                }}
                                                options={nivel2Options}
                                                searchable={true}
                                            />
                                        </div>
                                        {hasLevel3 && (
                                            <div className={`filter-group ${isZoneHighlighted ? 'filter-group-error' : ''}`}>
                                                <CustomSelect
                                                    id="filter-distrito"
                                                    placeholder={locationLabels?.[2] ?? '--'}
                                                    value={filterDistrito}
                                                    onChange={(val) => {
                                                        setFilterDistrito(val);
                                                        setIsZoneHighlighted(false);
                                                    }}
                                                    options={nivel3Options}
                                                    searchable={true}
                                                />
                                            </div>
                                        )}
                                    </div>

                                    <div className="filter-divider"></div>

                                    <div className="filter-group">
                                        <label className="filter-label">Tipo de mascota</label>
                                        <div className="pill-multi-group">
                                            {PET_TYPE_OPTIONS.map((t) => {
                                                const Icon = t.icon;

                                                return (
                                                    <button
                                                        key={t.value}
                                                        type="button"
                                                        className={`pill-multi-btn ${petTypeFilter === t.value ? 'active' : ''}`}
                                                        onClick={() => selectPetTypeFilter(t.value)}
                                                    >
                                                        <Icon size={18} stroke={2} /> {t.label}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="ia-col-center">
                        <div
                            className={`ia-box centinela-premium-box ${hasToolsAccess ? '' : 'premium-locked'}`}
                            id="centinela-box"
                        >
                            <div className="centinela-header-row" >
                                <label
                                    className="ui-switch tooltip"
                                    data-tooltip={centinela?.activo ? 'Desactivar' : 'Activar'}
                                >
                                    <input
                                        type="checkbox"
                                        checked={!!centinela?.activo}
                                        disabled={!hasToolsAccess || isCentinelaToggling}
                                        onChange={handleToggleCentinela}
                                    />
                                    <span className="ui-slider-btn"></span>
                                </label>
                                <h4>Buscador automático 24/7</h4>
                            </div>

                            <div
                                className={`antivirus-scan-wrapper ${centinela?.activo ? 'state-scanning' : ''}`}
                                id="antivirus-wrapper-container"
                            >
                                <div className="antivirus-status-text-row" style={
                                    isBioLocked
                                        ? { opacity: 0.5, pointerEvents: 'none' }
                                        : undefined
                                }>
                                    <span id="antivirus-status-title">
                                        {centinela?.activo ? (
                                            <>
                                                <i className="icon-loading"></i> Activo desde {centinelaActiveSince}
                                            </>
                                        ) : (
                                            <>
                                                <IconPower /> Apagado
                                            </>
                                        )}
                                    </span>
                                    <span
                                        id="antivirus-status-desc"
                                        className={centinela?.activo ? '' : 'hidden-view'}
                                    >
                                        Buscando, nuevos avisos…
                                    </span>

                                </div>
                                <div className="antivirus-track">
                                    <div className="antivirus-laser-bar"></div>
                                </div>
                            </div>

                            {isGatingReady && !hasToolsAccess && (
                                <div className="first-visit-banner">
                                    <Link href="/publicar"><IconLock /> <b>Publica</b> un aviso para <b>desbloquear</b></Link>
                                </div>
                            )}
                        </div>

                        {isMascotaMode && (
                            <p className="empty-criteria-message" style={{ 'margin': '0.5em 0' }}>
                                <IconInfoCircle /> Quita el aviso seleccionado, para búsqueda manual.
                            </p>
                        )}

                        {/* BARRA DE TAGS ACTIVOS */}
                        <div
                            id="container-active-tags"
                            className="active-tags-flex"
                            style={{
                                display: activeTagsCount > 0 ? 'flex' : 'none',
                                opacity: centinela?.activo ? 0.5 : 1,
                                pointerEvents: centinela?.activo ? 'none' : undefined,
                            }}
                        >
                            {activePetPill !== 'nuevo' && (
                                <span className="badge-active-attribute badge-pill-pet">
                                    <IconPaw /> {selectedPetReport?.title || 'Mascota seleccionada'}{' '}
                                    <IconX
                                        className="remove-tag-btn"
                                        onClick={handleResetPetPill}
                                    />
                                </span>
                            )}

                            {!isMascotaMode && globalQuery.trim() && (
                                <span className="badge-active-attribute">
                                    <IconSearch /> Criterio: &quot;{globalQuery}&quot;{' '}
                                    <IconX
                                        className="remove-tag-btn"
                                        onClick={() => setGlobalQuery('')}
                                    />
                                </span>
                            )}

                            {!isMascotaMode && filterReportType && (
                                <span className="badge-active-attribute">
                                    <IconFilter />{' '}
                                    {REPORT_TYPE_OPTIONS.find((o) => o.value === filterReportType)?.label}{' '}
                                    <IconX
                                        className="remove-tag-btn"
                                        onClick={() => setFilterReportType('')}
                                    />
                                </span>
                            )}

                            {!isMascotaMode && filterTiempo && (
                                <span className="badge-active-attribute">
                                    <IconFilter />{' '}
                                    {TIEMPO_OPTIONS.find((o) => o.value === filterTiempo)?.label}{' '}
                                    <IconX
                                        className="remove-tag-btn"
                                        onClick={() => setFilterTiempo('')}
                                    />
                                </span>
                            )}

                            {!isMascotaMode && isBioConfirmed && bioAttributes.length > 0 && (
                                <span className="badge-active-attribute badge-photo-attached">
                                    <IconCamera /> Datos de IA{' '}
                                    <IconX
                                        className="remove-tag-btn"
                                        onClick={() => {
                                            setIsBioConfirmed(false);
                                            setIsZoneHighlighted(false);
                                        }}
                                    />
                                </span>
                            )}

                            {activeTagsCount === 0 && (
                                <p className="empty-criteria-message">
                                    <IconInfoCircle /> Ingresa características de tu mascota y busca en el portal.
                                </p>
                            )}
                        </div>

                        {/* TAGS AVANZADOS DE UBICACIÓN Y PILLS — solo aplican en
                            modo "Búsqueda Abierta". */}
                        <div
                            id="container-active-tags-avanced"
                            className="active-tags-flex-avanced"
                            style={{
                                display: isMascotaMode ? 'none' : undefined,
                                opacity: centinela?.activo ? 0.5 : 1,
                                pointerEvents: centinela?.activo ? 'none' : undefined,
                            }}
                        >
                            {(filterDepartamento || filterProvincia || filterDistrito) && (
                                <span className="badge-active-attribute-avanced">
                                    <IconPin />{' '}
                                    {[filterDepartamento, filterProvincia, filterDistrito].filter(Boolean).join(', ')}{' '}
                                    <IconX
                                        className="remove-tag-btn"
                                        onClick={clearLocationFilters}
                                    />
                                </span>
                            )}

                            {petTypeFilter && (
                                <span className="badge-active-attribute-avanced">
                                    {(() => {
                                        const opt = PET_TYPE_OPTIONS.find((o) => o.value === petTypeFilter);
                                        const Icon = opt?.icon;

                                        return (
                                            <>
                                                {Icon && <Icon size={18} stroke={2} />}
                                                {' '}
                                                {opt?.label ?? petTypeFilter}
                                            </>
                                        );
                                    })()}{' '}
                                    <IconX
                                        className="remove-tag-btn"
                                        onClick={() => setPetTypeFilter('')}
                                    />
                                </span>
                            )}
                        </div>

                        {isSearching && (
                            <div className="loading-state-centered">
                                <div className="loading-spinner"></div>
                                <p>Buscando coincidencias...</p>
                            </div>
                        )}

                        {/* EMPTY STATE — solo si no hay búsqueda manual ni Centinela activo */}
                        {!isSearching && !hasSearched && !centinela?.activo && (
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

                        {!isSearching && (hasSearched || centinela?.activo) && (
                            <div id="ia-results-area" className="ia-results-right-column">
                                <h4 className="results-sidebar-title">
                                    Coincidencias encontradas
                                    <span className="results-count-badge">{visibleResults.length} resultados</span>
                                </h4>

                                {resultsSearchMeta && !centinela?.activo && (
                                    <p className="empty-criteria-message" style={{ 'marginBottom': '1em' }}>
                                        <IconSparkles /> {resultsSearchMeta.image_summary}
                                        {typeof resultsSearchMeta.phash_matches === 'number' &&
                                            ` · ${resultsSearchMeta.phash_matches} coincidencias por imagen`}
                                    </p>
                                )}

                                {hasToolsAccess && centinela?.activo && (
                                    <div className="centinela-watching-status">
                                        <i></i>
                                        Centinela sigue buscando...
                                    </div>
                                )}

                                {hasToolsAccess && centinela?.activo && centinelaMatches.length > 0 && (
                                    <div className="horizontal-results-stack" style={{ marginBottom: 16 }}>
                                        {centinelaMatches.map((m) => {
                                            const pet = centinelaMatchPets[m.report_id];
                                            if (!pet) return null;
                                            return renderPetCard(pet, { onDismiss: () => handleDismissMatch(m.id) });
                                        })}
                                    </div>
                                )}

                                {searchError && (
                                    <div className="no-results-state">
                                        <div className="no-results-icon">
                                            <IconAlertTriangle />
                                        </div>
                                        <h5 className="no-results-title">Ocurrió un error</h5>
                                        <p className="no-results-desc">{searchError}</p>
                                    </div>
                                )}

                                {!searchError && !centinela?.activo && hasSearched && results.length === 0 && (
                                    <div className="no-results-state">
                                        <div className="no-results-icon">
                                            <IconSearch />
                                        </div>
                                        <h5 className="no-results-title">Sin coincidencias</h5>
                                        <p className="no-results-desc">
                                            <b>&quot;{isMascotaMode ? (selectedPetReport?.title || 'tu mascota') : (globalQuery || 'tu búsqueda')}&quot;</b>.
                                            <br />
                                            Intenta con otros términos o filtros.
                                        </p>
                                    </div>
                                )}

                                {!searchError && visibleResults.length > 0 && (
                                    <div className="horizontal-results-stack">
                                        {visibleResults.map((pet) => renderPetCard(pet))}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* ==========================================
              COLUMNA DERECHA (ESCÁNER BIOMÉTRICO / FOTO)
             ========================================== */}
                    <div className="ia-col-right">
                        <div
                            className={`ia-box premium-scanner-box ${isBioLocked ? 'premium-locked' : ''}`}
                            id="scanner-biometrico-box"
                        >
                            {centinela?.activo && (
                                <div className="layer-blocked"
                                >
                                    <span className="badge-active-attribute">
                                        <IconLockCheck /> Centinela activado
                                    </span>
                                </div>
                            )}
                            <div
                                style={
                                    centinela?.activo || isMascotaMode || isBioLocked
                                        ? { opacity: 0.5, pointerEvents: 'none' }
                                        : undefined
                                }
                            >
                                <input
                                    type="file"
                                    accept="image/*"
                                    ref={bioFileInputRef}
                                    onChange={handleBioFileChange}
                                    disabled={isBioLocked}
                                    style={{ display: 'none' }}
                                />

                                {!bioImagePreview && !bioAnalysisResult && !isAnalyzingBio && (
                                    <div
                                        className="dropzone-biometric-modern"
                                        id="ia-dropzone"
                                        onClick={() => !isBioLocked && !isMascotaMode && bioFileInputRef.current?.click()}
                                        style={{ cursor: isBioLocked || isMascotaMode ? 'default' : 'pointer' }}
                                    >
                                        <div className="scanner-corners">
                                            <span className="corner tl"></span>
                                            <span className="corner tr"></span>
                                            <span className="corner bl"></span>
                                            <span className="corner br"></span>
                                        </div>

                                        <div id="dropzone-text-container" className="dropzone-content-wrapper">
                                            <div className="bio-pulse-radar">
                                                <div className="pulse-wave"></div>
                                                <IconCameraPlus className="bio-icon-tech" />
                                            </div>
                                            <p className="bio-main-text">Sube una foto de tu mascota</p>
                                            <p className="bio-sub-text">
                                                {isMascotaMode ? (
                                                    <>Buscando con la foto de tu mascota seleccionada.</>
                                                ) : isBioLocked ? (
                                                    <>Disponible con un aviso que incluya Centinela IA.</>
                                                ) : (
                                                    <>Analizaremos la imagen para buscar posibles <b>coincidencias</b>.</>
                                                )}
                                            </p>
                                            <span className="bio-upload-badge">
                                                <IconUpload /> Seleccionar imagen
                                            </span>
                                        </div>
                                    </div>
                                )}

                                {isAnalyzingBio && (
                                    <div className="dropzone-biometric-modern" id="ia-dropzone-scanning">
                                        <div className="scanner-corners">
                                            <span className="corner tl"></span>
                                            <span className="corner tr"></span>
                                            <span className="corner bl"></span>
                                            <span className="corner br"></span>
                                        </div>
                                        {bioImagePreview && (
                                            <div className="preview-img-container" id="ia-preview-wrapper">
                                                <img
                                                    id="img-ia-preview"
                                                    className="preview-img-bio"
                                                    src={bioImagePreview}
                                                    alt="Analizando"
                                                />
                                                <div className="biometric-laser-line"></div>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {(bioImagePreview || bioAnalysisResult) && !isAnalyzingBio && (
                                    <div className="bio-result-wrapper">
                                        {bioImagePreview && (
                                            <div className="divBioImagePreview">
                                                <img
                                                    src={bioImagePreview}
                                                    alt="Foto analizada"
                                                    className="photoBioImagePreview"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={resetBioScanner}
                                                    aria-label="Quitar foto"
                                                    className="buttonRemoveBioImagePreview"
                                                >
                                                    <IconX />
                                                </button>
                                            </div>
                                        )}

                                        {bioAnalysisError && (
                                            <div className="admin-info-box" style={{ marginTop: 12 }}>
                                                <IconInfoCircle />
                                                <p>{bioAnalysisError}</p>
                                            </div>
                                        )}

                                        {!bioAnalysisError && bioAttributes.length > 0 && (
                                            <div className={`resultScannerImage ${isBioConfirmed ? 'disabled' : ''}`}>
                                                <div className="pill-multi-group">
                                                    {bioAttributes.map((chip) => (
                                                        <span key={chip.id} className="badge-custom-tag">
                                                            {chip.label}
                                                            {!isBioConfirmed && (
                                                                <IconX
                                                                    className="remove-tag-btn"
                                                                    onClick={() => handleRemoveBioAttribute(chip.id)}
                                                                />
                                                            )}
                                                        </span>
                                                    ))}
                                                </div>
                                                <button
                                                    type="button"
                                                    className="btn-primary-mini"
                                                    onClick={handleConfirmBioAttributes}
                                                    disabled={isBioConfirmed || bioAttributes.length === 0}
                                                >
                                                    {isBioConfirmed ? 'Aplicado a la búsqueda' : 'Usar en búsqueda'}
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            {isGatingReady && isBioLocked && (
                                <div className="first-visit-banner">
                                    <Link href="/publicar"><IconLock /> <b>Publica</b> un aviso para <b>desbloquear</b></Link>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </section>
            {/* PlanesModal oculto por decisión de negocio — no se vende como
                producto aparte mientras el scraping no esté al 100%. */}
        </main>
    );
}