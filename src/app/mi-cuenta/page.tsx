'use client';
import { useState, useEffect, useRef, useCallback, ChangeEvent } from 'react';
import { showToast } from '@/components/global/Toast';
import PlanesModal from '@/components/global/PlanesModal';
import { getMyConversations, getConversationMessages, replyToConversation, uploadMessageImage, getMyFiledReports, getUnreadMessagesCount, markMessagesSeen, type ConversationSummary, type ConversationMessage } from '@/lib/messagesApi';
import { useApp } from '@/context/AppContext';
import AlertBanner from '@/components/global/AlertBanner';
import GuardadosSection from './components/sections/GuardadosSection';
import MensajesSection from './components/sections/MensajesSection';
import DatosSection from './components/sections/DatosSection';
import AjustesSection from './components/sections/AjustesSection';
import DashboardSection, { getTab } from './components/sections/AvisosSection';
import { fetchMyReports, type Report } from '@/lib/api';
import { getMySettings, updateMySettings, type UserSettings } from '@/lib/authApi';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { AuthApiError } from '@/lib/authApi';
import { resizeAvatarImage } from '@/lib/resizeImage';
import { deleteReport } from '@/lib/reportsApi';
import { getLocaleForCountry } from '@/lib/countries';
import {
    IconClockHour4,
    IconMenu3,
    IconChevronDown,
    IconStack2,
    IconBookmark,
    IconMessageCircle,
    IconUser,
    IconSettings,
    IconHelpCircle,
    IconLogout,
} from '@tabler/icons-react';
import dynamic from 'next/dynamic';
const ModalAgregarNumero = dynamic(() => import('@/components/global/ModalAgregarNumero'), { ssr: false });
const ModalBajaCuenta = dynamic(() => import('./components/modals/ModalBajaCuenta'), { ssr: false });
const ModalReportarUsuario = dynamic(() => import('./components/modals/ModalReportarUsuario'), { ssr: false });
const ModalBloquearUsuario = dynamic(() => import('./components/modals/ModalBloquearUsuario'), { ssr: false });
const ModalEliminarMensaje = dynamic(() => import('./components/modals/ModalEliminarMensaje'), { ssr: false });
const ModalEstadisticas = dynamic(() => import('./components/modals/ModalEstadisticas'), { ssr: false });
const ModalDetener = dynamic(() => import('./components/modals/ModalDetener'), { ssr: false });
const ModalEliminarAviso = dynamic(() => import('./components/modals/ModalEliminarAviso'), { ssr: false });
const ModalAlcance = dynamic(() => import('./components/modals/ModalAlcance'), { ssr: false });
const ModalTiempo = dynamic(() => import('./components/modals/ModalTiempo'), { ssr: false });
const ModalUpgrade = dynamic(() => import('./components/modals/ModalUpgrade'), { ssr: false });
const ModalReactivar = dynamic(() => import('./components/modals/ModalReactivar'), { ssr: false });
const ModalRetryPago = dynamic(() => import('./components/modals/ModalRetryPago'), { ssr: false });
const ModalRepublicarGratis = dynamic(() => import('./components/modals/ModalRepublicarGratis'), { ssr: false });
const ModalEditarAviso = dynamic(() => import('./components/modals/ModalEditarAviso'), { ssr: false });
const ModalCambiarClave = dynamic(() => import('./components/modals/ModalCambiarClave'), { ssr: false });

export default function MiCuentaPage() {

    useRequireAuth();

    const { isDarkMode, toggleTheme, currentUser, updateCurrentUser, updateProfile, updateAvatar, logout } = useApp();

    const [unreadMessagesCount, setUnreadMessagesCount] = useState(0);

    // ==========================================
    // NAVEGACIÓN DE SECCIONES (SIDEBAR)
    // ==========================================
    const [activeSection, setActiveSection] = useState<
        'dashboard' | 'guardados' | 'centinela' | 'mensajes' | 'datos' | 'ajustes'
    >('dashboard');
    const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
    const mobileNavRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!isMobileNavOpen) return;
        const handleClickOutside = (e: MouseEvent) => {
            if (mobileNavRef.current && !mobileNavRef.current.contains(e.target as Node)) {
                setIsMobileNavOpen(false);
            }
        };
        document.addEventListener('click', handleClickOutside);
        return () => document.removeEventListener('click', handleClickOutside);
    }, [isMobileNavOpen]);

    // Sub-tabs de avisos en Dashboard
    const [activePubTab, setActivePubTab] = useState<
        'activas' | 'revision' | 'pago_pendiente' | 'rechazadas' | 'finalizadas'
    >('activas');

    const handleCloseReactivar = useCallback(() => {
        setModalReactivar({ isOpen: false, id: '' });
    }, []);

    const handleReactivated = useCallback(() => {
        setAvisosRefreshKey((k) => k + 1);
    }, []);


    const handleCloseRetryPago = useCallback(() => {
        setModalRetryPago({ isOpen: false, id: '' });
    }, []);

    const handleRetryPaid = useCallback(() => {
        setAvisosRefreshKey((k) => k + 1);
    }, []);

    const handleCloseUpgrade = useCallback(() => {
        setModalUpgrade({ isOpen: false, id: '' });
    }, []);

    const handleUpgraded = useCallback(() => {
        setAvisosRefreshKey((k) => k + 1);
    }, []);


    const handleCloseAlcance = useCallback(() => {
        setModalAlcance({ isOpen: false, id: '' });
    }, []);

    const handlePurchased = useCallback(() => {
        setAvisosRefreshKey((k) => k + 1);
    }, []);

    const handleCloseTiempo = useCallback(() => {
        setModalTiempo({ isOpen: false, id: '' });
    }, []);

    const handleExtended = useCallback(() => {
        setAvisosRefreshKey((k) => k + 1);
    }, []);

    // Acordeones desplegados
    const [openAccordions, setOpenAccordions] = useState<Record<string, boolean>>({});

    const setAccordionOpen = (id: string, isOpen: boolean) => {
        setOpenAccordions((prev) => {
            if (!isOpen) {
                return { ...prev, [id]: false };
            }
            const next: Record<string, boolean> = {};
            Object.keys(prev).forEach((k) => {
                next[k] = false;
            });
            next[id] = true;
            return next;
        });
    };
    const [openMoreMenus, setOpenMoreMenus] = useState<Record<string, boolean>>({});

    const toggleAccordion = (key: string) => {
        setOpenAccordions((prev) => {
            const isCurrentlyOpen = !!prev[key];
            if (isCurrentlyOpen) {
                return { ...prev, [key]: false };
            }
            const next: Record<string, boolean> = {};
            Object.keys(prev).forEach((k) => {
                next[k] = false;
            });
            next[key] = true;
            return next;
        });
    };

    const toggleMoreMenu = (e: React.MouseEvent, key: string) => {
        e.stopPropagation();
        setOpenMoreMenus((prev) => {
            const isCurrentlyOpen = prev[key];
            return { [key]: !isCurrentlyOpen };
        });
    };

    // ==========================================
    // ESTADOS DE MIS MENSAJES
    // ==========================================
    interface Hilo {
        id: string;
        nombre: string;
        aviso: string;
        preview: string;
        tiempo: string;
        unread: boolean;
        thumb: string;
        otherUserId: string;
        isOpen: boolean;
        isBlocked: boolean;
        adminReply?: string | null;
        mensajes: { id: string; tipo: 'enviado' | 'recibido'; texto: string; hora: string }[];
        replyInput: string;
        loaded: boolean;
    }

    const [hilos, setHilos] = useState<Hilo[]>([]);
    const [isLoadingHilos, setIsLoadingHilos] = useState(true);

    useEffect(() => {
        if (!currentUser) return;
        Promise.all([getMyConversations(), getMyFiledReports()])
            .then(([convs, reports]) => {
                setHilos(
                    convs.map((c) => {
                        const misReportes = reports.filter(
                            (r) => r.target_user_id === c.other_user_id && r.admin_reply
                        );
                        const ultimoConRespuesta = misReportes[misReportes.length - 1];
                        return {
                            id: c.id,
                            nombre: c.other_user_name,
                            aviso: c.report_title || 'Aviso',
                            preview: c.last_message,
                            tiempo: new Date(c.last_message_at).toLocaleString(getLocaleForCountry(currentUser?.country), {
                                day: 'numeric',
                                month: 'short',
                                hour: 'numeric',
                                minute: '2-digit',
                            }),
                            unread: false,
                            thumb: c.report_cover_image_url || '/uploads/publicaciones/placeholder.jpg',
                            otherUserId: c.other_user_id,
                            isOpen: false,
                            isBlocked: c.is_blocked,
                            adminReply: ultimoConRespuesta?.admin_reply ?? null,
                            mensajes: [],
                            replyInput: '',
                            loaded: false,
                        };
                    })
                );
            })
            .finally(() => setIsLoadingHilos(false));
    }, [currentUser]);

    useEffect(() => {
        if (!currentUser) return;
        getUnreadMessagesCount().then(setUnreadMessagesCount);
    }, [currentUser]);

    useEffect(() => {
        if (activeSection === 'mensajes') {
            markMessagesSeen();
            setUnreadMessagesCount(0);
        }
    }, [activeSection]);

    const handleToggleHilo = (id: string) => {
        setHilos((prev) => prev.map((h) => (h.id === id ? { ...h, isOpen: !h.isOpen } : h)));

        const hilo = hilos.find((h) => h.id === id);
        if (hilo && !hilo.loaded) {
            getConversationMessages(id).then((msgs: ConversationMessage[]) => {
                setHilos((prev) =>
                    prev.map((h) =>
                        h.id === id
                            ? {
                                ...h,
                                loaded: true,
                                mensajes: msgs.map((m) => ({
                                    id: m.id,
                                    tipo: m.sender_id === currentUser?.id ? 'enviado' : 'recibido',
                                    texto: m.body,
                                    imagen: m.image_url,
                                    hora: new Date(m.created_at).toLocaleTimeString(getLocaleForCountry(currentUser?.country), {
                                        hour: 'numeric',
                                        minute: '2-digit',
                                    }),
                                })),
                            }
                            : h
                    )
                );
            });
        }
    };

    const sendingHilosRef = useRef<Set<string>>(new Set());

    const handleSendReply = async (hiloId: string, imagenFile?: File | null) => {
        if (sendingHilosRef.current.has(hiloId)) return;
        const hilo = hilos.find((h) => h.id === hiloId);
        if (!hilo || (!hilo.replyInput.trim() && !imagenFile)) return;
        const texto = hilo.replyInput.trim();

        sendingHilosRef.current.add(hiloId);
        try {
            let nuevo = await replyToConversation(hiloId, texto);
            if (imagenFile) {
                nuevo = await uploadMessageImage(nuevo.id, imagenFile);
            }
            setHilos((prev) =>
                prev.map((h) =>
                    h.id === hiloId
                        ? {
                            ...h,
                            mensajes: [
                                ...h.mensajes,
                                {
                                    id: nuevo.id,
                                    tipo: 'enviado',
                                    texto: nuevo.body,
                                    imagen: nuevo.image_url,
                                    hora: new Date(nuevo.created_at).toLocaleTimeString(getLocaleForCountry(currentUser?.country), {
                                        hour: 'numeric',
                                        minute: '2-digit',
                                    }),
                                },
                            ],
                            preview: texto || 'Foto',
                            tiempo: 'Ahora',
                            replyInput: '',
                        }
                        : h
                )
            );
            showToast('Mensaje enviado', 'success');
        } catch {
            showToast('No pudimos enviar tu mensaje. Intenta de nuevo.', 'error');
        } finally {
            sendingHilosRef.current.delete(hiloId);
        }
    };

    const [openMessageMenuId, setOpenMessageMenuId] = useState<string | null>(null);

    // ==========================================
    // ESTADOS DE MIS DATOS
    // ==========================================
    const [avatarSrc, setAvatarSrc] = useState<string | null>(null);
    const [dNombre, setDNombre] = useState('');
    const [dApellidoPaterno, setDApellidoPaterno] = useState('');
    const [dApellidoMaterno, setDApellidoMaterno] = useState('');
    const [dDepartamento, setDDepartamento] = useState('');
    const [dProvincia, setDProvincia] = useState('');
    const [dDistrito, setDDistrito] = useState('');

    const initialDatos = useRef({
        nombre: '',
        apellidoPaterno: '',
        apellidoMaterno: '',
        departamento: '',
        provincia: '',
        distrito: '',
        avatar: null as string | null,
    });

    // Carga los datos reales del usuario al entrar
    // Usamos una ref para saber si ya inicializamos los datos de este usuario
    const isInitializedForUser = useRef<string | null>(null);

    useEffect(() => {
        if (currentUser) {
            if (isInitializedForUser.current !== currentUser.id) {
                const loaded = {
                    nombre: currentUser.name || '',
                    apellidoPaterno: currentUser.last_name_paterno || '',
                    apellidoMaterno: currentUser.last_name_materno || '',
                    departamento: currentUser.region || '',
                    provincia: currentUser.province || '',
                    distrito: currentUser.district || '',
                    avatar: currentUser.avatar || null,
                };
                setDNombre(loaded.nombre);
                setDApellidoPaterno(loaded.apellidoPaterno);
                setDApellidoMaterno(loaded.apellidoMaterno);
                setDDepartamento(loaded.departamento);
                setDProvincia(loaded.provincia);
                setDDistrito(loaded.distrito);
                setAvatarSrc(loaded.avatar);
                initialDatos.current = loaded;

                isInitializedForUser.current = currentUser.id;
            } else {
                if (currentUser.avatar !== initialDatos.current.avatar && currentUser.avatar) {
                    setAvatarSrc(currentUser.avatar);
                    initialDatos.current.avatar = currentUser.avatar;
                }
            }
        }
    }, [currentUser]);

    const isDatosChanged =
        dNombre !== initialDatos.current.nombre ||
        dApellidoPaterno !== initialDatos.current.apellidoPaterno ||
        dApellidoMaterno !== initialDatos.current.apellidoMaterno ||
        dDepartamento !== initialDatos.current.departamento ||
        dProvincia !== initialDatos.current.provincia ||
        dDistrito !== initialDatos.current.distrito ||
        avatarSrc !== initialDatos.current.avatar;

    const handleSaveDatos = async () => {
        try {
            await updateProfile({
                name: dNombre,
                last_name_paterno: dApellidoPaterno,
                last_name_materno: dApellidoMaterno,
                country: currentUser?.country || 'PE',
                region: dDepartamento,
                province: dProvincia,
                district: dDistrito,
            });

            // El avatar va por su propio endpoint — solo se toca si de
            // verdad cambió, para no llamar innecesariamente cuando el
            // usuario solo editó texto.
            if (avatarSrc !== initialDatos.current.avatar) {
                await updateAvatar(avatarSrc);
            }

            initialDatos.current = {
                nombre: dNombre,
                apellidoPaterno: dApellidoPaterno,
                apellidoMaterno: dApellidoMaterno,
                departamento: dDepartamento,
                provincia: dProvincia,
                distrito: dDistrito,
                avatar: avatarSrc,
            };
            showToast('Tus datos se actualizaron correctamente', 'success');
        } catch (err) {
            const message = err instanceof AuthApiError ? err.message : 'No pudimos guardar tus datos. Intenta de nuevo.';
            showToast(message, 'error');
        }
    };

    const handleAvatarChange = async (e: ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (file.size > 5 * 1024 * 1024) {
            showToast('La imagen supera los 5MB permitidos', 'warning');
            return;
        }
        try {

            const resized = await resizeAvatarImage(file);
            setAvatarSrc(resized);
        } catch {
            showToast('No pudimos procesar la imagen. Intenta con otra.', 'error');
        }
    };

    // ==========================================
    // ESTADOS Y CONTROLES DE MODALES
    // ==========================================
    const [modalEditar, setModalEditar] = useState<{
        isOpen: boolean;
        id: string;
        tipo: 'lost' | 'adoption' | 'found';
        isUnlocked: boolean;
    }>({
        isOpen: false,
        id: '',
        tipo: 'lost',
        isUnlocked: false,
    });

    const [modalEstadisticas, setModalEstadisticas] = useState<{ isOpen: boolean; id: string }>({
        isOpen: false,
        id: '',
    });

    const [modalDetener, setModalDetener] = useState<{ isOpen: boolean; id: string }>({
        isOpen: false,
        id: '',
    });

    const [modalEliminarAviso, setModalEliminarAviso] = useState<{ isOpen: boolean; id: string }>({
        isOpen: false,
        id: '',
    });
    const [avisosRefreshKey, setAvisosRefreshKey] = useState(0);


    // Banners de Alerta — derivados de datos reales
    const [myPublications, setMyPublications] = useState<Report[]>([]);
    const [showInfoBanner, setShowInfoBanner] = useState(true);

    useEffect(() => {
        if (currentUser) {
            fetchMyReports().then(setMyPublications);
        }
    }, [currentUser, avisosRefreshKey]);

    const pendingCount = myPublications.filter((p) => getTab(p) === 'revision').length;

    const [modalCambiarNumero, setModalCambiarNumero] = useState(false);
    const [modalCambiarClave, setModalCambiarClave] = useState(false);

    const [modalBajaCuenta, setModalBajaCuenta] = useState(false);
    const [modalReportarUsuario, setModalReportarUsuario] = useState<{ isOpen: boolean; userId: string; conversationId?: string }>({
        isOpen: false,
        userId: '',
        conversationId: undefined,
    });
    const [modalBloquearUsuario, setModalBloquearUsuario] = useState<{
        isOpen: boolean;
        nombre: string;
        userId: string;
        isBlocked: boolean;
    }>({ isOpen: false, nombre: '', userId: '', isBlocked: false });

    const [modalEliminarMensaje, setModalEliminarMensaje] = useState<{
        isOpen: boolean;
        hiloId: string;
    }>({ isOpen: false, hiloId: '' });

    // Modales de Upsell / Ampliación / Reactivación
    const [modalAlcance, setModalAlcance] = useState<{ isOpen: boolean; id: string }>({ isOpen: false, id: '' });
    const [modalTiempo, setModalTiempo] = useState<{ isOpen: boolean; id: string }>({ isOpen: false, id: '' });
    const [modalUpgrade, setModalUpgrade] = useState<{ isOpen: boolean; id: string }>({ isOpen: false, id: '' });

    const [modalReactivar, setModalReactivar] = useState<{ isOpen: boolean; id: string }>({ isOpen: false, id: '' });
    const [modalRetryPago, setModalRetryPago] = useState<{ isOpen: boolean; id: string }>({ isOpen: false, id: '' });
    const [modalRepublicarGratis, setModalRepublicarGratis] = useState<{ isOpen: boolean; id: string }>({
        isOpen: false,
        id: '',
    });

    const [notifTipos, setNotifTipos] = useState<Record<string, boolean>>({
        lost: true,
        found: true,
        sighting: true,
        adoption: true,
    });

    const toggleNotifTipo = (tipo: string) => {
        const next = { ...notifTipos, [tipo]: !notifTipos[tipo] };
        setNotifTipos(next);

        const settings: UserSettings = {
            notification_types: {
                lost: !!next.lost,
                found: !!next.found,
                sighting: !!next.sighting,
                adoption: !!next.adoption,
            },
        };
        updateMySettings(settings)
            .then(() => showToast('Ajustes guardados', 'success'))
            .catch((err) => {
                const message = err instanceof AuthApiError ? err.message : 'No pudimos guardar tus ajustes.';
                showToast(message, 'error');
            });
    };

    useEffect(() => {
        if (currentUser) {
            getMySettings()
                .then((settings) => {
                    setNotifTipos(settings.notification_types);
                })
                .catch(() => {
                    // Si falla la carga, seguimos con los defaults (todos activos)
                });
        }
    }, [currentUser]);

    // Cierre de menús flotantes al hacer clic en pantalla
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            const target = e.target as Node;

            if (!(target as HTMLElement).closest('.pub-more-menu, .pub-more-trigger')) {
                setOpenMoreMenus({});
            }
            if (!(target as HTMLElement).closest('.mensaje-hilo-floating-menu, .mensaje-hilo-more-trigger')) {
                setOpenMessageMenuId(null);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleOpenEditarAviso = (id: string, tipo: 'lost' | 'adoption' | 'found') => {
        setModalEditar({
            isOpen: true,
            id,
            tipo,
            isUnlocked: false,
        });
    };

    return (
        <main className="main-content">
            <section id="view-mi-cuenta" className="animate-fade-in">


                {/* BANNER INFO (REVISIÓN) */}
                {showInfoBanner && pendingCount > 0 && (
                    <AlertBanner
                        type="info"
                        message={
                            <>
                                <IconClockHour4 /> Tienes <b>{pendingCount}</b> aviso{pendingCount === 1 ? '' : 's'} en revisión por nuestro equipo.
                            </>
                        }
                        onClose={() => setShowInfoBanner(false)}
                    />
                )}


                <div className="cuenta-layout">
                    {/* =============================================
                        SIDEBAR IZQUIERDO
                        ============================================= */}
                    <aside className="cuenta-sidebar">
                        <div className="cuenta-panel">
                            <div className="cuenta-panel-header">
                                <div className="cuenta-greeting-info">
                                    <h2>Hola, {currentUser?.name || 'Usuario'}</h2>
                                    <span>{currentUser?.email}</span>
                                </div>
                            </div>

                            {/* TRIGGER MOBILE NAV */}
                            <div ref={mobileNavRef}>
                                <button
                                    type="button"
                                    className={`cuenta-nav-mobile-trigger ${isMobileNavOpen ? 'open' : ''}`}
                                    id="btn-cuenta-nav-toggle"
                                    onClick={() => setIsMobileNavOpen(!isMobileNavOpen)}
                                >
                                    <span className="cuenta-nav-mobile-current">
                                        <IconMenu3 /> Menú
                                    </span>
                                    <IconChevronDown className="toggle-chevron" />
                                </button>

                                <nav className={`cuenta-nav ${isMobileNavOpen ? 'mobile-open' : ''}`}>
                                    <button
                                        type="button"
                                        className={`cuenta-nav-item ${activeSection === 'dashboard' ? 'active' : ''}`}
                                        data-section="dashboard"
                                        onClick={() => {
                                            setActiveSection('dashboard');
                                            setIsMobileNavOpen(false);
                                        }}
                                    >
                                        <span className="cuenta-nav-icon-box">
                                            <IconStack2 />
                                        </span>
                                        <span>Mis avisos</span>
                                    </button>

                                    <button
                                        type="button"
                                        className={`cuenta-nav-item ${activeSection === 'guardados' ? 'active' : ''}`}
                                        data-section="guardados"
                                        onClick={() => {
                                            setActiveSection('guardados');
                                            setIsMobileNavOpen(false);
                                        }}
                                    >
                                        <span className="cuenta-nav-icon-box">
                                            <IconBookmark />
                                        </span>
                                        <span>Favoritos</span>
                                    </button>

                                    <button
                                        type="button"
                                        className={`cuenta-nav-item ${activeSection === 'mensajes' ? 'active' : ''}`}
                                        data-section="mensajes"
                                        onClick={() => {
                                            setActiveSection('mensajes');
                                            setIsMobileNavOpen(false);
                                        }}
                                    >
                                        <span className="cuenta-nav-icon-box">
                                            <IconMessageCircle />
                                        </span>
                                        <span>Mis mensajes</span>
                                        {unreadMessagesCount > 0 && (
                                            <span className="cuenta-nav-badge">{unreadMessagesCount}</span>
                                        )}
                                    </button>

                                    <button
                                        type="button"
                                        className={`cuenta-nav-item ${activeSection === 'datos' ? 'active' : ''}`}
                                        data-section="datos"
                                        onClick={() => {
                                            setActiveSection('datos');
                                            setIsMobileNavOpen(false);
                                        }}
                                    >
                                        <span className="cuenta-nav-icon-box">
                                            <IconUser />
                                        </span>
                                        <span>Mis datos</span>
                                    </button>

                                    <button
                                        type="button"
                                        className={`cuenta-nav-item ${activeSection === 'ajustes' ? 'active' : ''}`}
                                        data-section="ajustes"
                                        onClick={() => {
                                            setActiveSection('ajustes');
                                            setIsMobileNavOpen(false);
                                        }}
                                    >
                                        <span className="cuenta-nav-icon-box">
                                            <IconSettings />
                                        </span>
                                        <span>Ajustes</span>
                                    </button>
                                </nav>
                            </div>

                            <nav className="cuenta-nav-secondary">
                                <a href="https://tawk.to/chat/6aba144ddff27f343f63f5c8/1k3jduk17?layout=modern" target="_blank">
                                    <span>
                                        <IconHelpCircle /> Ayuda y soporte
                                    </span>
                                </a>
                                <a
                                    href="#"
                                    onClick={(e) => {
                                        e.preventDefault();
                                        logout();
                                    }}
                                >
                                    <span>
                                        <IconLogout /> Cerrar sesión
                                    </span>
                                </a>
                            </nav>
                        </div>
                    </aside>

                    {/* =============================================
                        CONTENIDO PRINCIPAL POR SECCIÓN
                       ============================================= */}
                    <div className="cuenta-content">
                        {/* SECCIÓN 1: DASHBOARD / MIS AVISOS */}
                        {activeSection === 'dashboard' && (
                            <DashboardSection
                                activePubTab={activePubTab}
                                setActivePubTab={setActivePubTab}
                                openAccordions={openAccordions}
                                toggleAccordion={toggleAccordion}
                                onSetAccordionOpen={setAccordionOpen}
                                openMoreMenus={openMoreMenus}
                                toggleMoreMenu={toggleMoreMenu}
                                onOpenEditarAviso={handleOpenEditarAviso}
                                onOpenEstadisticas={(id) => setModalEstadisticas({ isOpen: true, id })}
                                onOpenDetener={(id) => setModalDetener({ isOpen: true, id })}
                                onOpenEliminarAviso={(id) => setModalEliminarAviso({ isOpen: true, id })}
                                onOpenAlcance={(id) => setModalAlcance({ isOpen: true, id })}
                                onOpenUpgrade={(id) => setModalUpgrade({ isOpen: true, id })}
                                onOpenReactivar={(id) => setModalReactivar({ isOpen: true, id })}
                                onOpenRepublicarGratis={(id) => setModalRepublicarGratis({ isOpen: true, id })}
                                onOpenTiempo={(id) => setModalTiempo({ isOpen: true, id })}
                                onOpenRetryPago={(id) => setModalRetryPago({ isOpen: true, id })}
                                refreshKey={avisosRefreshKey}
                            />
                        )}

                        {/* SECCIÓN 2: FAVORITOS */}
                        {activeSection === 'guardados' && <GuardadosSection />}

                        {/* SECCIÓN 4: MIS MENSAJES */}
                        {activeSection === 'mensajes' && (
                            <MensajesSection
                                hilos={hilos}
                                openMessageMenuId={openMessageMenuId}
                                onToggleHilo={handleToggleHilo}
                                onSetOpenMessageMenuId={setOpenMessageMenuId}
                                onReplyInputChange={(hiloId, value) => {
                                    setHilos((prev) =>
                                        prev.map((h) => (h.id === hiloId ? { ...h, replyInput: value } : h))
                                    );
                                }}
                                onSendReply={handleSendReply}
                                onReportarUsuario={(hiloId) => {
                                    const hilo = hilos.find((h) => h.id === hiloId);
                                    if (hilo) setModalReportarUsuario({ isOpen: true, userId: hilo.otherUserId, conversationId: hiloId });
                                }}
                                onBloquearUsuario={(nombre, hiloId) => {
                                    const hilo = hilos.find((h) => h.id === hiloId);
                                    if (hilo) setModalBloquearUsuario({ isOpen: true, nombre, userId: hilo.otherUserId, isBlocked: hilo.isBlocked });
                                }}
                                onEliminarMensaje={(hiloId) => setModalEliminarMensaje({ isOpen: true, hiloId })}
                            />
                        )}

                        {/* SECCIÓN 5: MIS DATOS */}
                        {activeSection === 'datos' && (
                            <DatosSection
                                avatarSrc={avatarSrc}
                                dNombre={dNombre}
                                dApellidoPaterno={dApellidoPaterno}
                                dApellidoMaterno={dApellidoMaterno}
                                dDepartamento={dDepartamento}
                                dProvincia={dProvincia}
                                dDistrito={dDistrito}
                                dTelefono={currentUser?.phone || ''}
                                dCorreo={currentUser?.email || ''}
                                isDatosChanged={isDatosChanged}
                                onSetNombre={setDNombre}
                                onSetApellidoPaterno={setDApellidoPaterno}
                                onSetApellidoMaterno={setDApellidoMaterno}
                                onSetDepartamento={setDDepartamento}
                                onSetProvincia={setDProvincia}
                                onSetDistrito={setDDistrito}
                                onAvatarChange={handleAvatarChange}
                                onAvatarRemove={() => setAvatarSrc(null)}
                                onSaveDatos={handleSaveDatos}
                                onOpenCambiarNumero={() => setModalCambiarNumero(true)}
                                onOpenCambiarClave={() => setModalCambiarClave(true)}
                            />
                        )}

                        {/* SECCIÓN 6: AJUSTES */}
                        {activeSection === 'ajustes' && (
                            <AjustesSection
                                isDarkMode={isDarkMode}
                                toggleTheme={() => {
                                    toggleTheme();
                                    showToast('Ajustes guardados', 'success');
                                }}
                                notifTipos={notifTipos}
                                onToggleNotifTipo={toggleNotifTipo}
                                onOpenBajaCuenta={() => setModalBajaCuenta(true)}
                            />
                        )}
                    </div>

                </div>
            </section >

            <ModalEditarAviso
                isOpen={modalEditar.isOpen}
                id={modalEditar.id}
                tipo={modalEditar.tipo}
                isUnlocked={modalEditar.isUnlocked}
                onSaved={() => setAvisosRefreshKey((k) => k + 1)}
                onClose={() => setModalEditar((prev) => ({ ...prev, isOpen: false }))}
                onToggleUnlock={(unlocked) =>
                    setModalEditar((prev) => ({ ...prev, isUnlocked: unlocked }))
                }
            />

            <ModalAgregarNumero
                isOpen={modalCambiarNumero}
                onClose={() => setModalCambiarNumero(false)}
                mode="change"
            />

            <ModalCambiarClave
                isOpen={modalCambiarClave}
                onClose={() => setModalCambiarClave(false)}
            />

            <ModalBajaCuenta
                isOpen={modalBajaCuenta}
                onClose={() => setModalBajaCuenta(false)}
            />

            <ModalReportarUsuario
                isOpen={modalReportarUsuario.isOpen}
                userId={modalReportarUsuario.userId}
                conversationId={modalReportarUsuario.conversationId}
                onClose={() => setModalReportarUsuario({ isOpen: false, userId: '', conversationId: undefined })}
            />

            <ModalBloquearUsuario
                isOpen={modalBloquearUsuario.isOpen}
                userId={modalBloquearUsuario.userId}
                nombre={modalBloquearUsuario.nombre}
                isBlocked={modalBloquearUsuario.isBlocked}
                onClose={() => setModalBloquearUsuario({ isOpen: false, nombre: '', userId: '', isBlocked: false })}
                onBlocked={() => {
                    setHilos((prev) =>
                        prev.map((h) =>
                            h.otherUserId === modalBloquearUsuario.userId ? { ...h, isBlocked: !h.isBlocked } : h
                        )
                    );
                }}
            />

            <ModalEliminarMensaje
                isOpen={modalEliminarMensaje.isOpen}
                conversationId={modalEliminarMensaje.hiloId}
                onClose={() => setModalEliminarMensaje({ isOpen: false, hiloId: '' })}
                onDeleted={() => {
                    setHilos((prev) => prev.filter((h) => h.id !== modalEliminarMensaje.hiloId));
                }}
            />

            <ModalEstadisticas
                isOpen={modalEstadisticas.isOpen}
                id={modalEstadisticas.id}
                onClose={() => setModalEstadisticas({ isOpen: false, id: '' })}
            />

            <ModalDetener
                isOpen={modalDetener.isOpen}
                id={modalDetener.id}
                onClose={() => setModalDetener({ isOpen: false, id: '' })}
                onStopped={() => setAvisosRefreshKey((k) => k + 1)}
            />

            <ModalEliminarAviso
                isOpen={modalEliminarAviso.isOpen}
                onClose={() => setModalEliminarAviso({ isOpen: false, id: '' })}
                onConfirm={async () => {
                    if (modalEliminarAviso.id) {
                        await deleteReport(modalEliminarAviso.id);
                        setAvisosRefreshKey((k) => k + 1);
                    }
                }}
            />

            <ModalAlcance
                isOpen={modalAlcance.isOpen}
                id={modalAlcance.id}
                onClose={handleCloseAlcance}
                onPurchased={handlePurchased}
            />

            <ModalTiempo
                isOpen={modalTiempo.isOpen}
                id={modalTiempo.id}
                onClose={handleCloseTiempo}
                onExtended={handleExtended}
            />

            <ModalUpgrade
                isOpen={modalUpgrade.isOpen}
                id={modalUpgrade.id}
                onClose={handleCloseUpgrade}
                onUpgraded={handleUpgraded}
            />

            <ModalReactivar
                isOpen={modalReactivar.isOpen}
                id={modalReactivar.id}
                onClose={handleCloseReactivar}
                onReactivated={handleReactivated}
            />

            <ModalRetryPago
                isOpen={modalRetryPago.isOpen}
                id={modalRetryPago.id}
                onClose={handleCloseRetryPago}
                onPaid={handleRetryPaid}
            />

            <ModalRepublicarGratis
                isOpen={modalRepublicarGratis.isOpen}
                id={modalRepublicarGratis.id}
                onClose={() => setModalRepublicarGratis({ isOpen: false, id: '' })}
                onRepublished={() => setAvisosRefreshKey((k) => k + 1)}
                onConPlanDePago={(id) => {
                    setModalRepublicarGratis({ isOpen: false, id: '' });
                    setModalUpgrade({ isOpen: true, id });
                }}
            />

            <PlanesModal />
        </main >
    );
}


