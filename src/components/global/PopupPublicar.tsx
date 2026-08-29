'use client';
import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';

const INTERVALO_APARICION = 15000;

const RUTAS_SIN_POPUP = ['/publicar', '/adoptar', '/encontrado', '/avistamiento', '/mi-cuenta'];

export default function PopupPublicar() {
    const pathname = usePathname();
    const [isVisible, setIsVisible] = useState(false);

    const isRutaExcluida = RUTAS_SIN_POPUP.some((ruta) => pathname.startsWith(ruta));

    useEffect(() => {
        if (isRutaExcluida) {
            setIsVisible(false);
        }
    }, [isRutaExcluida]);

    useEffect(() => {
        const intervalId = setInterval(() => {
            setIsVisible((current) => {
                if (isRutaExcluida) return false;
                if (current) return current;
                return true;
            });
        }, INTERVALO_APARICION);

        return () => clearInterval(intervalId);
    }, [isRutaExcluida]);

    const handleClose = () => {
        setIsVisible(false);
    };

    return (
        <div
            id="popup-publicar-mascota"
            className={`popup-publicar-flotante ${!isVisible ? 'hidden-view' : ''}`}
        >
            <button
                type="button"
                className="popup-publicar-close"
                id="btn-close-popup-publicar"
                onClick={handleClose}
                aria-label="Cerrar aviso"
            >
                <i className="ti ti-x"></i>
            </button>

            <div className="popup-publicar-body">
                <h5>¿Perdiste a tu mascota?</h5>
                <p>Publica tu aviso y hazlo más fácil de encontrar.</p>
                <Link href="/publicar" className="popup-publicar-btn">
                    Publicar ahora
                </Link>
            </div>
        </div>
    );
}