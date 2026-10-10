'use client';
import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import AuthModal from './AuthModal';
import ConfirmLogoutModal from '@/components/global/ConfirmLogoutModal';
import { useApp } from '@/context/AppContext';
import { fetchMyReports } from '@/lib/api';
import { useLayoutEffect } from 'react';
import {
    IconPlus,
    IconHeartBroken,
    IconPaw,
    IconBinoculars,
    IconHomeHeart,
    IconBrandSafari,
    IconCameraSearch,
    IconUser,
    IconSun,
    IconMoon,
    IconLogout,
    IconHome,
    IconChevronDown
} from '@tabler/icons-react';

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
    const [isLogoutConfirmOpen, setIsLogoutConfirmOpen] = useState(false);

    // Referencias para detectar clics fuera de los menús
    const addDropdownRef = useRef<HTMLDivElement>(null);
    const userDropdownRef = useRef<HTMLDivElement>(null);

    // Extraemos estados y funciones de AppContext
    const {
        isAuthModalOpen,
        authModalInitialMode,
        authModalResetToken,
        openAuthModal,
        closeAuthModal,
        isLoggedIn,
        currentUser,
        isAuthChecked,
        logout,
        isDarkMode,
        toggleTheme,
        centinelaEstaActivo
    } = useApp();

    const [broadcastCount, setBroadcastCount] = useState(0);

    // Avisos activos, sin vencer y con plan de pago (con difusión), de cualquier tipo.
    // Se vuelve a consultar al cambiar de página, porque el Header no se vuelve a montar.
    useEffect(() => {
        if (!isLoggedIn) {
            setBroadcastCount(0);
            return;
        }
        let isCancelled = false;
        fetchMyReports()
            .then((reports) => {
                if (isCancelled) return;
                const now = Date.now();
                const count = reports.filter((r) =>
                    r.status === 'active' &&
                    (!r.expires_at || new Date(r.expires_at).getTime() > now) &&
                    !!r.package_slug &&
                    r.package_slug !== 'gratis' &&
                    !((r.payment_status === 'pending' || r.payment_status === 'failed') && r.payment_flow_type === 'create')
                ).length;
                setBroadcastCount(count);
            })
            .catch(() => {
                // silencioso: si falla, se muestra el botón de siempre
            });
        return () => {
            isCancelled = true;
        };
    }, [isLoggedIn, pathname]);

    const getFavicon = () => {
        if (pathname.startsWith('/encontrado')) return '/images/isotipo-emerald.png';
        if (pathname.startsWith('/adoptar')) return '/images/isotipo-purple.png';
        if (pathname.startsWith('/avistamiento')) return '/images/isotipo-yellow.png';
        return '/images/isotipo.png';
    };


    useEffect(() => {
        setIsUserDropdownOpen(false);
        setIsAddDropdownOpen(false);
    }, [pathname]);

    useEffect(() => {
        const faviconHref = `${getFavicon()}?v=${pathname}`;
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
        pathname.startsWith('/avistamiento')


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
                            <IconPlus className="btn-add-icon" />
                            <span>Publicar</span>
                        </button>

                        {isAddDropdownOpen && (
                            <div className="btn-add-dropdown open" id="btn-add-dropdown">
                                <div className="dropdown-header">
                                    <span>¿Qué necesitas publicar?</span>
                                </div>
                                <div className="flex-dropdown">
                                    <Link
                                        href="/publicar"
                                        className="btn-add-option btn-add-perdido"
                                        onClick={() => setIsAddDropdownOpen(false)}
                                    >
                                        <div className="btn-add-option-icon">
                                            <IconHeartBroken />
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
                                            <IconPaw />
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
                                            <IconBinoculars />
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
                                            <IconHomeHeart />
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
                        <IconHome /> <span>Explorar</span>
                    </Link>
                    <Link
                        href="/buscar"
                        className={`tab-btn ${pathname.startsWith('/buscar') ? 'active' : ''}`}
                    >
                        <IconCameraSearch /> <span>Centinela IA</span>
                        {centinelaEstaActivo && (
                            <span
                                className="centinela-active-dot"
                                title="Centinela activo — buscando 24/7"
                            ></span>
                        )}
                    </Link>
                </div>

                {/* Acciones del lado derecho */}
                <div className="right-navbar">
                    {!isWizardRoute && broadcastCount > 0 && (
                        <Link href="/mi-cuenta" className="header-broadcast" id="header-broadcast">
                            <span className="header-broadcast-live">
                                <span className="header-broadcast-dot"></span>
                                EN DIFUSIÓN
                            </span>
                            <span className="header-broadcast-text">
                                {broadcastCount === 1 ? '1 aviso' : `${broadcastCount} avisos`}
                            </span>
                        </Link>
                    )}

                    {!isWizardRoute && broadcastCount === 0 && (
                        <Link href="/publicar" className="btn-ads" id="btn-ads-publish">
                            <svg viewBox="0 0 640 640"><path d="M197.1 96C214.4 96 231.3 99.4 247 105.7L301.8 190.9L226.4 266.3C224.9 267.8 224 269.9 224.1 272.1C224.2 274.3 225.1 276.3 226.7 277.8L338.7 381.8C341.6 384.5 346.1 384.7 349.2 382.1C352.3 379.5 353 375.1 350.9 371.7L290.5 273.6L381.2 198C383.8 195.9 384.7 192.3 383.6 189.2L360.4 124.6C383.6 106.3 412.6 96 442.9 96C516.4 96 576 155.6 576 229.1L576 231.7C576 343.9 436.1 474.2 363.1 529.9C350.7 539.3 335.5 544 320 544C304.5 544 289.2 539.4 276.9 529.9C203.9 474.2 64 343.9 64 231.7L64 229.1C64 155.6 123.6 96 197.1 96z" /></svg>
                            <span>Perdí mi mascota</span>
                        </Link>
                    )}

                    {!isAuthChecked ? (
                        <div className="header-auth-placeholder" style={{ width: 40, height: 40 }}></div>
                    ) : !isLoggedIn ? (
                        <button
                            className="btn-login"
                            id="btn-open-login"
                            onClick={() => openAuthModal()}
                        >
                            <IconUser /> <span>Ingresar</span>
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
                                    <IconChevronDown className={`${isUserDropdownOpen ? 'rotated' : ''}`} id="user-chevron" />
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
                                                {isDarkMode ? <IconSun className="theme-icon" size="1.2em" /> : <IconMoon className="theme-icon" size="1.2em" />}
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
                                        <Link
                                            href="/mi-cuenta"
                                            className="user-dropdown-item"
                                            onClick={() => setIsUserDropdownOpen(false)}
                                        >
                                            <IconUser /> Mi cuenta
                                        </Link>
                                        <div className="user-dropdown-divider"></div>
                                        <button
                                            className="user-dropdown-item dropdown-item-danger"
                                            onClick={() => {
                                                setIsUserDropdownOpen(false);
                                                setIsLogoutConfirmOpen(true);
                                            }}
                                        >
                                            <IconLogout /> Cerrar sesión
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
                <AuthModal onClose={closeAuthModal} initialMode={authModalInitialMode} resetToken={authModalResetToken} />
            )}

            <ConfirmLogoutModal
                isOpen={isLogoutConfirmOpen}
                onClose={() => setIsLogoutConfirmOpen(false)}
                onConfirm={() => {
                    setIsLogoutConfirmOpen(false);
                    logout();
                }}
            />
        </>
    );
}