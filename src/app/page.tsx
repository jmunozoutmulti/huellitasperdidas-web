"use client";
import PetDetailView from './home/PetDetailView';
import PetCard from './home/PetCard';
import SearchBox from './home/SearchBox';
import '@/styles/page.css';
import { useState, useEffect, useRef, useMemo, Suspense } from 'react';
import Link from 'next/link';
import { PetData } from '@/lib/pets';
import { fetchReports, fetchReport } from '@/lib/api';
import { reportToPetData } from '@/lib/transformers';
import { useSearchParams, useRouter } from 'next/navigation';

interface SearchItem {
  title: string;
  subtitle: string;
}

function getPetCategory(badgeStyle: string): string {
  if (badgeStyle === 'badge-urgent' || badgeStyle === 'badge-max-priority') return 'perdido';
  if (badgeStyle === 'badge-found') return 'encontrado';
  if (badgeStyle === 'badge-sight') return 'avistamiento';
  if (badgeStyle === 'badge-adopt') return 'adopcion';
  if (badgeStyle.startsWith('badge-ext-')) return 'externo';
  return 'otro';
}


function HomeContent() {

  const router = useRouter();

  const searchParams = useSearchParams();

  const [pets, setPets] = useState<PetData[]>([]);
  const [isLoadingPets, setIsLoadingPets] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [noResultsFor, setNoResultsFor] = useState<string | null>(null);

  useEffect(() => {
    let isCancelled = false;

    async function loadPets() {
      setIsLoadingPets(true);
      setLoadError(null);
      try {
        const response = await fetchReports({
          page: 1,
          limit: 100,
          search: searchQuery || undefined,
        });
        let transformed = response.items.map(reportToPetData);

        if (transformed.length === 0 && searchQuery) {
          // La búsqueda no encontró nada — mostramos el listado general
          // en su lugar, en vez de dejar la pantalla vacía.
          const fallback = await fetchReports({ page: 1, limit: 100 });
          transformed = fallback.items.map(reportToPetData);
          if (!isCancelled) {
            setNoResultsFor(searchQuery);
          }
        } else if (!isCancelled) {
          setNoResultsFor(null);
        }

        if (!isCancelled) {
          setPets(transformed);
        }
      } catch (err) {
        if (!isCancelled) {
          setLoadError('No pudimos cargar los avisos. Intenta de nuevo en unos minutos.');
        }
      } finally {
        if (!isCancelled) {
          setIsLoadingPets(false);
        }
      }
    }

    loadPets();

    return () => {
      isCancelled = true;
    };
  }, [searchQuery]);

  useEffect(() => {
    const id = searchParams.get('id');
    if (!id) {
      setSelectedPet(null);
      setIsDetailActive(false);
      return;
    }

    let isCancelled = false;

    async function loadDetail() {
      try {
        const report = await fetchReport(id!);
        if (!isCancelled) {
          setSelectedPet(reportToPetData(report));
          setIsDetailActive(true);
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
  }, [searchParams]);


  // ==========================================
  // ESTADOS GENERALES Y DE FILTRADO
  // ==========================================
  const [activeFilter, setActiveFilter] = useState<string | null>(null);

  // ==========================================
  // MANEJADORES DE VISTA DETALLE
  // ==========================================
  const [selectedPet, setSelectedPet] = useState<PetData | null>(null);
  const [isDetailActive, setIsDetailActive] = useState(false);

  const openDetail = (pet: PetData) => {
    if (pet.isExternal && pet.externalUrl) {
      window.open(pet.externalUrl, '_blank');
      return;
    }

    router.push(`/?id=${pet.id}`);
  };

  const closeDetail = () => {
    router.push('/');
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
              {activeFilter === 'perdido' && <i className="ti ti-x filter-clear-icon"></i>}
            </button>
            <button
              data-type="encontrado"
              className={activeFilter === 'encontrado' ? 'active' : ''}
              onClick={() => handleFilterClick('encontrado')}
            >
              Encontrados
              {activeFilter === 'encontrado' && <i className="ti ti-x filter-clear-icon"></i>}
            </button>
            <button
              data-type="avistamiento"
              className={activeFilter === 'avistamiento' ? 'active' : ''}
              onClick={() => handleFilterClick('avistamiento')}
            >
              Avistamientos
              {activeFilter === 'avistamiento' && <i className="ti ti-x filter-clear-icon"></i>}
            </button>
            <button
              data-type="adoptar"
              className={`btn-filter-adoption ${activeFilter === 'adoptar' ? 'active' : ''}`}
              onClick={() => handleFilterClick('adoptar')}
            >
              <i className="fa-solid fa-heart"></i> Adopciones
              {activeFilter === 'adoptar' && <i className="ti ti-x filter-clear-icon"></i>}
            </button>
          </div>

          <SearchBox pets={pets} onSearch={setSearchQuery} />
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
            {activeFilter === 'perdido' && <i className="ti ti-x filter-clear-icon"></i>}
          </button>
          <button
            data-type="encontrado"
            className={activeFilter === 'encontrado' ? 'active' : ''}
            onClick={() => handleFilterClick('encontrado')}
          >
            Encontrados
            {activeFilter === 'encontrado' && <i className="ti ti-x filter-clear-icon"></i>}
          </button>
          <button
            data-type="avistamiento"
            className={activeFilter === 'avistamiento' ? 'active' : ''}
            onClick={() => handleFilterClick('avistamiento')}
          >
            Vistos
            {activeFilter === 'avistamiento' && <i className="ti ti-x filter-clear-icon"></i>}
          </button>
          <button
            data-type="adoptar"
            className={`btn-filter-adoption ${activeFilter === 'adoptar' ? 'active' : ''}`}
            onClick={() => handleFilterClick('adoptar')}
          >
            <i className="fa-solid fa-heart"></i> Adopción
            {activeFilter === 'adoptar' && <i className="ti ti-x filter-clear-icon"></i>}
          </button>
        </div>

        {/* ==========================================
            MASONRY GRID - TODAS LAS TARJETAS EXACTAS
           ========================================== */}
        {isLoadingPets && (
          <div className="loading-state-centered">
            <div className="loading-spinner"></div>
            <p>Buscando...</p>
          </div>
        )}

        {loadError && (
          <div className="error-state">
            <p>{loadError}</p>
          </div>
        )}

        {!isLoadingPets && !loadError && (
          <div className="masonry-grid">
            {displayedPets
              .filter((pet) => isCardVisible(pet.badgeStyle))
              .map((pet) => (
                <PetCard key={pet.id} pet={pet} onOpenDetail={openDetail} />
              ))}
          </div>
        )}
      </section>

      {/* MOBILE PUBLICAR */}
      <div className="fab-publish-wrapper" id="fab-publish-wrapper">
        <Link href="/publicar" className="fab-publish-btn">
          <div className="fab-halo"></div>
          <div className="fab-halo fab-halo-2"></div>
          <i className="fa-solid fa-heart-crack"></i>
        </Link>
      </div>
    </main>
  );
}

export default function HomePage() {
  return (
    <Suspense fallback={<div>Cargando...</div>}>
      <HomeContent />
    </Suspense>
  );
}
