'use client';
import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import AuthModal from './AuthModal';
import { useApp } from '@/context/AppContext';
import { useLayoutEffect } from 'react';

export default function Header() {
    const pathname = usePathname();

    useLayoutEffect(() => {
        const body = document.body;
        body.classList.remove('is-home', 'theme-avistamiento', 'theme-adoptar', 'theme-encontrado');

        if (pathname === '/') {
            body.classList.add('is-home');
        } else if (pathname.startsWith('/avistamiento')) {
            body.classList.add('theme-avistamiento');
        } else if (pathname.startsWith('/adoptar')) {
            body.classList.add('theme-adoptar');
        } else if (pathname.startsWith('/encontrado')) {
            body.classList.add('theme-encontrado');
        }
    }, [pathname]);

    const [isAddDropdownOpen, setIsAddDropdownOpen] = useState(false);
    const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false);

    // Referencias para detectar clics fuera de los menús
    const addDropdownRef = useRef<HTMLDivElement>(null);
    const userDropdownRef = useRef<HTMLDivElement>(null);

    // Extraemos estados y funciones de AppContext
    const {
        isAuthModalOpen,
        openAuthModal,
        closeAuthModal,
        isLoggedIn,
        currentUser,
        isAuthChecked,
        logout,
        isDarkMode,
        toggleTheme
    } = useApp();


    const getFavicon = () => {
        if (pathname.startsWith('/encontrado')) return '/images/isotipo-emerald.png';
        if (pathname.startsWith('/adoptar')) return '/images/isotipo-purple.png';
        if (pathname.startsWith('/avistamiento')) return '/images/isotipo-yellow.png';
        return '/images/isotipo.png';
    };

    useEffect(() => {
        const faviconHref = getFavicon();
        let link = document.querySelector<HTMLLinkElement>("link[rel~='icon']");
        if (!link) {
            link = document.createElement('link');
            link.rel = 'icon';
            document.head.appendChild(link);
        }

        link.type = 'image/png';
        link.href = faviconHref;
    }, [pathname]);


    const getLogo = () => {
        if (pathname.startsWith('/encontrado')) return '/images/logo-emerald.svg';
        if (pathname.startsWith('/adoptar')) return '/images/logo-purple.svg';
        if (pathname.startsWith('/avistamiento')) return '/images/logo-yellow.svg';
        return '/images/logo.svg';
    };

    const isWizardRoute =
        pathname.startsWith('/publicar') ||
        pathname.startsWith('/encontrado') ||
        pathname.startsWith('/adoptar') ||
        pathname.startsWith('/avistamiento') ||
        pathname.startsWith('/mi-cuenta');


    // Escuchar clics en cualquier parte de la pantalla para cerrar los desplegables
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as Node;

            // Cerrar menú Agregar si el clic fue fuera
            if (addDropdownRef.current && !addDropdownRef.current.contains(target)) {
                setIsAddDropdownOpen(false);
            }

            // Cerrar menú Usuario si el clic fue fuera
            if (userDropdownRef.current && !userDropdownRef.current.contains(target)) {
                setIsUserDropdownOpen(false);
            }
        };

        document.addEventListener('click', handleClickOutside);
        return () => {
            document.removeEventListener('click', handleClickOutside);
        };
    }, []);
    return (
        <>
            <nav className="navbar">
                <div className="left-navbar">
                    <div className="logo-brand">
                        <Link href="/">
                            <Image
                                src={getLogo()}
                                alt="Huellas Perdidas"
                                width={160}
                                height={40}
                                priority
                            />
                        </Link>
                    </div>

                    <div
                        ref={addDropdownRef}
                        className={`btn-add ${isAddDropdownOpen ? 'open' : ''}`}
                        id="btn-add-trigger"
                    >
                        <button
                            type="button"
                            onClick={() => setIsAddDropdownOpen(!isAddDropdownOpen)}
                        >
                            <i className="ti ti-plus btn-add-icon"></i>
                        </button>

                        {isAddDropdownOpen && (
                            <div className="btn-add-dropdown open" id="btn-add-dropdown">
                                <div className="dropdown-header">
                                    <span>¿Qué quieres hacer?</span>
                                </div>
                                <div className="flex-dropdown">
                                    <Link
                                        href="/publicar"
                                        className="btn-add-option btn-add-perdido"
                                        onClick={() => setIsAddDropdownOpen(false)}
                                    >
                                        <div className="btn-add-option-icon">
                                            <i className="ti ti-heart-broken"></i>
                                        </div>
                                        <div className="btn-add-option-body">
                                            <span className="btn-add-option-label">Perdí mi mascota</span>
                                            <span className="btn-add-option-sub">
                                                Publica un aviso de búsqueda
                                            </span>
                                        </div>
                                    </Link>

                                    <Link
                                        href="/encontrado"
                                        className="btn-add-option btn-add-encontrado"
                                        onClick={() => setIsAddDropdownOpen(false)}
                                    >
                                        <div className="btn-add-option-icon">
                                            <i className="ti ti-paw"></i>
                                        </div>
                                        <div className="btn-add-option-body">
                                            <span className="btn-add-option-label">
                                                Encontré una mascota
                                            </span>
                                            <span className="btn-add-option-sub">
                                                Ayuda a encontrar a su dueño
                                            </span>
                                        </div>
                                    </Link>

                                    <Link
                                        href="/avistamiento"
                                        className="btn-add-option btn-add-avistamiento"
                                        onClick={() => setIsAddDropdownOpen(false)}
                                    >
                                        <div className="btn-add-option-icon">
                                            <i className="ti ti-binoculars"></i>
                                        </div>
                                        <div className="btn-add-option-body">
                                            <span className="btn-add-option-label">Vi una mascota</span>
                                            <span className="btn-add-option-sub">
                                                Reporta un avistamiento
                                            </span>
                                        </div>
                                    </Link>

                                    <Link
                                        href="/adoptar"
                                        className="btn-add-option btn-add-adoptar"
                                        onClick={() => setIsAddDropdownOpen(false)}
                                    >
                                        <div className="btn-add-option-icon">
                                            <i className="ti ti-home-heart"></i>
                                        </div>
                                        <div className="btn-add-option-body">
                                            <span className="btn-add-option-label">Dar en adopción</span>
                                            <span className="btn-add-option-sub">
                                                Encuentra un hogar amoroso
                                            </span>
                                        </div>
                                    </Link>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Pestañas de navegación central */}
                <div className="nav-menu">
                    <Link
                        href="/"
                        className={`tab-btn ${pathname === '/' ? 'active' : ''}`}
                    >
                        <i className="ti ti-brand-safari"></i> <span>Explorar</span>
                    </Link>
                    <Link
                        href="/buscar"
                        className={`tab-btn ${pathname.startsWith('/buscar') ? 'active' : ''}`}
                    >
                        <i className="ti ti-camera-search"></i> <span>Centinela IA</span>
                    </Link>
                </div>

                {/* Acciones del lado derecho */}
                <div className="right-navbar">
                    {!isWizardRoute && (
                        <Link href="/publicar" className="btn-ads" id="btn-ads-publish">
                            <i className="fa-solid fa-heart-crack"></i>
                            <span>Perdí mi mascota</span>
                        </Link>
                    )}

                    {!isAuthChecked ? (
                        <div className="header-auth-placeholder" style={{ width: 40, height: 40 }}></div>
                    ) : !isLoggedIn ? (
                        <button
                            className="btn-login"
                            id="btn-open-login"
                            onClick={openAuthModal}
                        >
                            <i className="ti ti-user"></i> <span>Ingresar</span>
                        </button>
                    ) : (
                        <div className="nav-user-actions" id="nav-user-actions">
                            <div
                                ref={userDropdownRef}
                                className="user-profile"
                                id="user-profile-trigger"
                                onClick={() => setIsUserDropdownOpen(!isUserDropdownOpen)}
                            >
                                <div className="user-avatar">
                                    {currentUser?.avatar ? (
                                        <img src={currentUser.avatar} alt={currentUser.name} />
                                    ) : (
                                        <span>{currentUser?.name?.[0]?.toUpperCase() || 'U'}</span>
                                    )}
                                </div>
                                <span className="user-info">
                                    <i
                                        className={`fa-solid fa-chevron-down ${isUserDropdownOpen ? 'rotated' : ''}`}
                                        id="user-chevron"
                                    ></i>
                                </span>

                                {isUserDropdownOpen && (
                                    <div className="user-dropdown open" id="user-dropdown" onClick={(e) => e.stopPropagation()}>
                                        <div className="user-dropdown-header">
                                            <div className="user-avatar user-avatar-lg">
                                                {currentUser?.avatar ? (
                                                    <img src={currentUser.avatar} alt={currentUser.name} />
                                                ) : (
                                                    <span>{currentUser?.name?.[0]?.toUpperCase() || 'U'}</span>
                                                )}
                                            </div>
                                            <div>
                                                <p className="dropdown-name">{currentUser?.name || 'Usuario'}</p>
                                                <p className="dropdown-email">{currentUser?.email || ''}</p>
                                            </div>
                                        </div>

                                        <div className="dropdown-theme-block">
                                            <span className="dropdown-theme-label">
                                                <i className={isDarkMode ? 'ti ti-sun theme-icon' : 'ti ti-moon theme-icon'}></i>
                                                <span className="theme-label">{isDarkMode ? 'Modo claro' : 'Modo oscuro'}</span>
                                            </span>
                                            <label className="ui-switch" onClick={(e) => e.stopPropagation()}>
                                                <input
                                                    type="checkbox"
                                                    className="theme-toggle"
                                                    checked={isDarkMode}
                                                    onChange={() => toggleTheme()}
                                                />
                                                <span className="ui-slider-btn"></span>
                                            </label>
                                        </div>

                                        <div className="user-dropdown-divider"></div>
                                        <Link href="/mi-cuenta" className="user-dropdown-item">
                                            <i className="ti ti-user"></i> Mi cuenta
                                        </Link>
                                        <div className="user-dropdown-divider"></div>
                                        <button
                                            className="user-dropdown-item dropdown-item-danger"
                                            onClick={() => {
                                                setIsUserDropdownOpen(false);
                                                logout();
                                            }}
                                        >
                                            <i className="ti ti-logout"></i> Cerrar sesión
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </nav>

            {/* Modal de Autenticación */}
            {isAuthModalOpen && (
                <AuthModal onClose={closeAuthModal} />
            )}
        </>
    );
}