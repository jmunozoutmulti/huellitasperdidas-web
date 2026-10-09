"use client";
import PetDetailView from './home/PetDetailView';
import PetCard from './home/PetCard';
import SearchBox from './home/SearchBox';
import LiveFeed from '@/components/global/LiveFeed';
import '@/styles/page.css';
import { useState, useEffect, useRef, useMemo, Suspense } from 'react';
import Link from 'next/link';
import { PetData } from '@/lib/pets';
import { fetchReports, fetchReport } from '@/lib/api';
import { showToast } from '@/components/global/Toast';
import { reportToPetData } from '@/lib/transformers';
import { getCountries } from '@/lib/countries';
import { saveDetectedCountry } from '@/lib/auth';
import { useApp } from '@/context/AppContext';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { buildReportPath, extractReportId } from '@/lib/slug';
import CustomSelect from '@/components/ui/CustomSelect';
import Masonry from 'react-masonry-css';
import { IconClockBolt, IconX, IconGridDots, IconPlus, IconHeartFilled, IconStarFilled } from '@tabler/icons-react';
import PopupDestacados from './home/PopupDestacados';

interface SearchItem {
  title: string;
  subtitle: string;
}

function shuffleArray<T>(items: T[]): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function getPetCategory(badgeStyle: string): string {
  if (badgeStyle === 'badge-urgent' || badgeStyle === 'badge-max-priority') return 'perdido';
  if (badgeStyle === 'badge-found') return 'encontrado';
  if (badgeStyle === 'badge-sight') return 'avistamiento';
  if (badgeStyle === 'badge-adopt' || badgeStyle === 'badge-adopt-premium') return 'adopcion';
  if (badgeStyle.startsWith('badge-ext-')) return 'externo';
  return 'otro';
}

function getDestacadoBadge(badgeStyle: string) {
  const category = getPetCategory(badgeStyle);
  if (category === 'adopcion') {
    return { label: 'Adopción', Icon: IconHeartFilled, className: 'premium-badge-adopcion' };
  }
  if (category === 'perdido') {
    return { label: 'Perdido', Icon: null, className: 'premium-badge-perdido' };
  }
  return { label: 'Destacado', Icon: IconStarFilled, className: '' };
}

function HomeContent() {

  const router = useRouter();
  const { currentUser, isAuthChecked, detectedCountry, isCountryDetectionDone } = useApp();

  const searchParams = useSearchParams();
  const pathname = usePathname();

  const [manualCountry, setManualCountry] = useState<string | null>(null);
  const countryCode = currentUser?.country || detectedCountry || manualCountry;

  const isResolvingCountry = !isAuthChecked || (!currentUser?.country && !isCountryDetectionDone && !manualCountry);

  const [pets, setPets] = useState<PetData[]>([]);
  const [isLoadingPets, setIsLoadingPets] = useState(true);
  const [isFirstLoad, setIsFirstLoad] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [noResultsFor, setNoResultsFor] = useState<string | null>(null);

  const [destacados, setDestacados] = useState<PetData[]>([]);

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  const [countryOptions, setCountryOptions] = useState<{ value: string; label: string }[]>([]);
  useEffect(() => {
    getCountries().then((list) => {
      setCountryOptions(list.map((c) => ({ value: c.code, label: c.name })));
    });
  }, []);

  useEffect(() => {
    let isCancelled = false;

    async function loadPets() {
      if (isResolvingCountry) return;

      if (!countryCode) {
        setPets([]);
        setIsLoadingPets(false);
        setIsFirstLoad(false);
        return;
      }
      setIsLoadingPets(true);
      setLoadError(null);
      try {
        await getCountries();
        const response = await fetchReports({
          page: 1,
          limit: 10,
          search: searchQuery || undefined,
          country_code: countryCode,
          status: 'active',
        });
        let transformed = response.items.map(reportToPetData);
        let pagesForThisLoad = response.pages;

        if (transformed.length === 0 && searchQuery) {
          const fallback = await fetchReports({ page: 1, limit: 10, country_code: countryCode, status: 'active' });
          transformed = fallback.items.map(reportToPetData);
          pagesForThisLoad = fallback.pages;
          if (!isCancelled) {
            setNoResultsFor(searchQuery);
          }
        } else if (!isCancelled) {
          setNoResultsFor(null);
        }

        if (!isCancelled) {
          setPets(transformed);
          setPage(1);
          setTotalPages(pagesForThisLoad);
        }
      } catch (err) {
        if (!isCancelled) {
          setLoadError('No pudimos cargar los avisos. Intenta de nuevo en unos minutos.');
        }
      } finally {
        if (!isCancelled) {
          setIsLoadingPets(false);
          setIsFirstLoad(false);
        }
      }
    }

    loadPets();

    return () => {
      isCancelled = true;
    };
  }, [searchQuery, countryCode, isResolvingCountry]);


  useEffect(() => {
    let isCancelled = false;

    async function loadDestacados() {
      if (isResolvingCountry || !countryCode) {
        setDestacados([]);
        return;
      }
      try {
        const response = await fetchReports({
          page: 1,
          limit: 10,
          country_code: countryCode,
          status: 'active',
          is_paid: true,
        });
        const paid = response.items.map(reportToPetData);
        if (!isCancelled) setDestacados(shuffleArray(paid));
      } catch {
        if (!isCancelled) setDestacados([]);
      }
    }

    loadDestacados();

    return () => {
      isCancelled = true;
    };
  }, [countryCode, isResolvingCountry]);


  useEffect(() => {
    const pathId = pathname.startsWith('/aviso/') ? extractReportId(pathname) : null;
    const legacyId = searchParams.get('id');
    const id = pathId ?? legacyId;
    if (!id) {
      setSelectedPet(null);
      setIsDetailActive(false);
      return;
    }

    let isCancelled = false;

    async function loadDetail() {
      try {
        await getCountries();
        const report = await fetchReport(id!);
        if (!isCancelled) {
          if (report.status !== 'active') {
            showToast('Este aviso ya no está disponible.', 'info');
            router.push('/');
            return;
          }
          setSelectedPet(reportToPetData(report));
          setIsDetailActive(true);
          if (!pathId) {
            window.history.replaceState(null, '', buildReportPath(report.id, report.title));
          }
        }
      } catch (err) {
        if (!isCancelled) {
          setSelectedPet(null);
          setIsDetailActive(false);
        }
      }
    }

    loadDetail();

    return () => {
      isCancelled = true;
    };
  }, [pathname, searchParams]);


  // ==========================================
  // ESTADOS GENERALES Y DE FILTRADO
  // ==========================================
  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  const [isCompactView, setIsCompactView] = useState(false);

  // ==========================================
  // MANEJADORES DE VISTA DETALLE
  // ==========================================
  const [selectedPet, setSelectedPet] = useState<PetData | null>(null);
  const [isDetailActive, setIsDetailActive] = useState(false);

  const loadMorePets = async () => {
    if (isLoadingMore || page >= totalPages || !countryCode) return;
    setIsLoadingMore(true);
    try {
      const nextPage = page + 1;
      const response = await fetchReports({
        page: nextPage,
        limit: 10,
        search: searchQuery || undefined,
        country_code: countryCode,
        status: 'active',
      });
      setPets((prev) => [...prev, ...response.items.map(reportToPetData)]);
      setPage(nextPage);
      setTotalPages(response.pages);
    } catch {
      // silencioso — si falla "cargar más", el usuario se queda con lo que
    } finally {
      setIsLoadingMore(false);
    }
  };

  useEffect(() => {
    const el = loadMoreRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) loadMorePets();
      },
      { rootMargin: '600px' }
    );
    observer.observe(el);
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, totalPages, countryCode, searchQuery, isLoadingMore]);

  const openDetail = (pet: PetData) => {
    setSelectedPet(pet);
    setIsDetailActive(true);
    window.history.pushState(null, '', buildReportPath(pet.id, pet.title));
    window.scrollTo(0, 0);
  };

  const closeDetail = () => {
    window.history.pushState(null, '', '/');
  };

  // ==========================================
  // MANEJADORES DE BÚSQUEDA Y FILTROS
  // ==========================================
  const handleFilterClick = (type: string) => {
    setActiveFilter((prev) => (prev === type ? null : type));
    if (isDetailActive) {
      closeDetail();
    }
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    if (isDetailActive) {
      closeDetail();
    }
  };

  const isCardVisible = (badgeStyle: string) => {
    if (!activeFilter) return true;
    const badgeStyleByType: Record<string, string> = {
      perdido: 'badge-urgent',
      encontrado: 'badge-found',
      avistamiento: 'badge-sight',
      adoptar: 'badge-adopt',
    };

    if (badgeStyle === 'badge-max-priority') {
      return activeFilter === 'perdido';
    }

    return badgeStyle === badgeStyleByType[activeFilter];
  };


  const displayedPets = useMemo(() => {
    if (!isDetailActive || !selectedPet) {
      return pets;
    }

    const currentId = selectedPet.id;
    const currentCategory = getPetCategory(selectedPet.badgeStyle);

    const relacionados: PetData[] = [];
    const resto: PetData[] = [];

    pets.forEach((pet) => {
      if (pet.id === currentId) return;

      if (getPetCategory(pet.badgeStyle) === currentCategory) {
        relacionados.push(pet);
      } else {
        resto.push(pet);
      }
    });

    return [...relacionados, ...resto];
  }, [isDetailActive, selectedPet, pets]);

  const visiblePets = displayedPets.filter((pet) => isCardVisible(pet.badgeStyle));

  const destacadosPopup = destacados.map((pet) => {
    const badge = getDestacadoBadge(pet.badgeStyle);
    const BadgeIcon = badge.Icon;
    return {
      pet,
      badgeLabel: badge.label,
      badgeClassName: badge.className,
      badgeIcon: BadgeIcon ? <BadgeIcon width={12} height={12} /> : null,
    };
  });

  const breakpointColumns = {
    default: 5,
    1030: 4,
    760: isCompactView ? 2 : 1,
  };

  return (
    <main className="main-content">
      <section id="view-home" className="tab-view animate-fade-in">



        {/* ==========================================
            SEARCH BOX WRAPPER
           ========================================== */}
        <div className="search-box-wrapper">
          <div className="filter-buttons">
            <button
              data-type="perdido"
              className={activeFilter === 'perdido' ? 'active' : ''}
              onClick={() => handleFilterClick('perdido')}
            >
              Perdidos
              {activeFilter === 'perdido' && <IconX className="filter-clear-icon" />}
            </button>
            <button
              data-type="encontrado"
              className={activeFilter === 'encontrado' ? 'active' : ''}
              onClick={() => handleFilterClick('encontrado')}
            >
              Encontrados
              {activeFilter === 'encontrado' && <IconX className="filter-clear-icon" />}
            </button>
            <button
              data-type="avistamiento"
              className={activeFilter === 'avistamiento' ? 'active' : ''}
              onClick={() => handleFilterClick('avistamiento')}
            >
              Avistamientos
              {activeFilter === 'avistamiento' && <IconX className="filter-clear-icon" />}
            </button>
            <button
              data-type="adoptar"
              className={`btn-filter-adoption ${activeFilter === 'adoptar' ? 'active' : ''}`}
              onClick={() => handleFilterClick('adoptar')}
            >
              <IconHeartFilled style={{ fill: 'var(--purple-brand)' }} /> Adopciones
              {activeFilter === 'adoptar' && <IconX className="filter-clear-icon" />}
            </button>
          </div>

          <SearchBox pets={pets} onSearch={handleSearch} />
        </div>


        {/* ==========================================
            VISTA DETALLE (PET DETAIL VIEW)
           ========================================== */}
        <div
          id="pet-detail-view"
          className={`view-detail-container ${isDetailActive ? 'active-view' : 'hidden-view'}`}
        >
          {selectedPet && (
            <PetDetailView pet={selectedPet} onClose={closeDetail} />
          )}
        </div>

        {/* ==========================================
            FILTROS MOBILE
           ========================================== */}
        <div className="filter-buttons filter-mobile">
          <button
            data-type="perdido"
            className={activeFilter === 'perdido' ? 'active' : ''}
            onClick={() => handleFilterClick('perdido')}
          >
            Perdidos
            {activeFilter === 'perdido' && <IconX className="filter-clear-icon" />}
          </button>
          <button
            data-type="encontrado"
            className={activeFilter === 'encontrado' ? 'active' : ''}
            onClick={() => handleFilterClick('encontrado')}
          >
            Encontrados
            {activeFilter === 'encontrado' && <IconX className="filter-clear-icon" />}
          </button>
          <button
            data-type="avistamiento"
            className={activeFilter === 'avistamiento' ? 'active' : ''}
            onClick={() => handleFilterClick('avistamiento')}
          >
            Vistos
            {activeFilter === 'avistamiento' && <IconX className="filter-clear-icon" />}
          </button>
          <button
            data-type="adoptar"
            className={`btn-filter-adoption ${activeFilter === 'adoptar' ? 'active' : ''}`}
            onClick={() => handleFilterClick('adoptar')}
          >
            <IconHeartFilled style={{ fill: 'var(--purple-brand)' }} /> Adopción
            {activeFilter === 'adoptar' && <IconX className="filter-clear-icon" />}
          </button>
          <button
            type="button"
            className={`buttonmobilegrid ${isCompactView ? 'active' : ''}`}
            onClick={() => setIsCompactView((prev) => !prev)}
            aria-label="Vista rápida"
          >
            <IconGridDots />
          </button>
        </div>

        {/* ==========================================
            MASONRY GRID - TODAS LAS TARJETAS EXACTAS
           ========================================== */}
        {isLoadingPets && (
          <div className="loading-state-centered">
            <div className="loading-spinner"></div>
            <p>{isFirstLoad ? 'Cargando...' : 'Buscando...'}</p>
          </div>
        )}

        {loadError && (
          <div className="error-state">
            <p>{loadError}</p>
          </div>
        )}

        {!isLoadingPets && !loadError && !countryCode && (
          <div className="section-not-country">
            <p>No pudimos detectar tu país automáticamente. <br /> <b>Selecciónalo para ver los avisos.</b></p>
            <div className='selectCountry'>
              <CustomSelect
                id="select-country-manual"
                placeholder="Selecciona tu país"
                value={manualCountry || ''}
                onChange={(val) => {
                  setManualCountry(val);
                  saveDetectedCountry(val);
                }}
                options={countryOptions}
              />
            </div>
          </div>
        )}

        {!isLoadingPets && !loadError && countryCode && pets.length === 0 && !searchQuery && (
          <div className="section-not-country">
            <p>Todavía no hay avisos <b>publicados en tu país.</b></p>
          </div>
        )}

        {!isLoadingPets && !loadError && (pets.length > 0 || searchQuery) && (
          <Masonry
            breakpointCols={breakpointColumns}
            className={`masonry-grid ${isCompactView ? 'compact-view' : ''}`}
            columnClassName="masonry-column"
          >
            {visiblePets.map((pet) => (
              <PetCard key={pet.id} pet={pet} onOpenDetail={openDetail} />
            ))}
          </Masonry>
        )}

        {!isLoadingPets && !loadError && page < totalPages && (
          <div ref={loadMoreRef} className="loading-state-centered" style={{ minHeight: 80 }}>
            {isLoadingMore && <div className="loading-spinner"></div>}
          </div>
        )}
      </section>

      {/* MOBILE PUBLICAR */}
      <div className="fab-publish-wrapper" id="fab-publish-wrapper">
        <Link href="/publicar" className="fab-publish-btn">
          <div className="fab-halo"></div>
          <div className="fab-halo fab-halo-2"></div>
          <IconPlus />
        </Link>
      </div>

      <LiveFeed />
      <PopupDestacados items={destacadosPopup} onOpenDetail={openDetail} />
    </main >
  );
}

export default function HomePage() {
  return (
    <Suspense fallback={null}>
      <HomeContent />
    </Suspense>
  );
}