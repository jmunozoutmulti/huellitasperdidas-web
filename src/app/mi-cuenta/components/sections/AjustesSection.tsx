'use client';

interface AjustesSectionProps {
    isDarkMode: boolean;
    toggleTheme: () => void;
    notifTipos: Record<string, boolean>;
    onToggleNotifTipo: (tipo: string) => void;
    onOpenBajaCuenta: () => void;
}

export default function AjustesSection({
    isDarkMode,
    toggleTheme,
    notifTipos,
    onToggleNotifTipo,
    onOpenBajaCuenta,
}: AjustesSectionProps) {
    return (
        <div className="cuenta-section active" id="section-ajustes">
            <div className="dashboard-recent-header">
                <h2 className="dashboard-subsection-title">Ajustes</h2>
                <p>
                    <i className="ti ti-info-circle"></i> Personaliza tu experiencia
                </p>
            </div>

            <div className="ajustes-card">
                <div className="ajuste-row">
                    <div className="ajuste-info">
                        <div className="dropdown-theme-block">
                            <span className="dropdown-theme-label">
                                <i className={isDarkMode ? 'ti ti-sun theme-icon' : 'ti ti-moon theme-icon'}></i>
                                <span className="theme-label">
                                    {isDarkMode ? 'Modo claro' : 'Modo oscuro'}
                                </span>
                            </span>
                            <label className="ui-switch">
                                <input
                                    type="checkbox"
                                    className="theme-toggle"
                                    checked={isDarkMode}
                                    onChange={() => toggleTheme()}
                                />
                                <span className="ui-slider-btn"></span>
                            </label>
                        </div>
                        <span className="ajuste-desc">Cambia la apariencia de la plataforma</span>
                    </div>
                </div>

                <div className="ajuste-divider"></div>

                <div className="ajuste-row ajuste-col">
                    <div className="ajuste-info">
                        <span className="ajuste-title">Notificarme solo de</span>
                        <span className="ajuste-desc">
                            Filtra los tipos de alertas que recibes por correo — si desactivas todas, no se te enviará ningún aviso
                        </span>
                    </div>
                    <div className="ajuste-options-row">
                        <label className={`ajuste-check-btn ${notifTipos.lost ? 'active' : ''}`}>
                            <input
                                type="checkbox"
                                checked={notifTipos.lost}
                                onChange={() => onToggleNotifTipo('lost')}
                            />
                            <i className="ti ti-heart-broken"></i> Perdidos
                        </label>
                        <label className={`ajuste-check-btn ${notifTipos.found ? 'active' : ''}`}>
                            <input
                                type="checkbox"
                                checked={notifTipos.found}
                                onChange={() => onToggleNotifTipo('found')}
                            />
                            <i className="ti ti-paw"></i> Encontrados
                        </label>
                        <label className={`ajuste-check-btn ${notifTipos.sighting ? 'active' : ''}`}>
                            <input
                                type="checkbox"
                                checked={notifTipos.sighting}
                                onChange={() => onToggleNotifTipo('sighting')}
                            />
                            <i className="ti ti-binoculars"></i> Avistamientos
                        </label>
                        <label className={`ajuste-check-btn ${notifTipos.adoption ? 'active' : ''}`}>
                            <input
                                type="checkbox"
                                checked={notifTipos.adoption}
                                onChange={() => onToggleNotifTipo('adoption')}
                            />
                            <i className="ti ti-home-heart"></i> Adopciones
                        </label>
                    </div>
                </div>
            </div>

            <div className="datos-danger-zone">
                <h5 className="danger-zone-title">
                    <i className="ti ti-alert-triangle"></i> Zona de peligro
                </h5>
                <p className="danger-zone-desc">
                    Eliminar tu cuenta es permanente.{' '}
                    <button
                        type="button"
                        className="btn-danger-account"
                        id="btn-baja-cuenta"
                        onClick={onOpenBajaCuenta}
                    >
                        <i className="ti ti-trash"></i> <span>Eliminar</span>
                    </button>
                </p>
            </div>
        </div>
    );
}