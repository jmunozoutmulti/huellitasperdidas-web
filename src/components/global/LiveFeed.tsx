'use client';

import { useState, useEffect, useRef } from 'react';
import '@/styles/global/live-feed.css';
import { fetchReports, type Report } from '@/lib/api';

type FeedType = 'avistamiento' | 'perdido' | 'encontrado' | 'adopcion';

interface FeedEvent {
    texto: string;
    tipo: FeedType;
}

const TYPE_TO_FEED: Record<string, FeedType> = {
    lost: 'perdido',
    found: 'encontrado',
    adoption: 'adopcion',
    sighting: 'avistamiento',
};

const TYPE_LABELS: Record<string, string> = {
    lost: 'una mascota perdida',
    found: 'una mascota encontrada',
    adoption: 'una mascota en adopción',
    sighting: 'un avistamiento',
};

// Si report_type no está en el mapa (ej. 'unknown'), descartamos el aviso
// del feed en vez de inventarle un tipo — no queremos mostrar datos falsos.
function reportToFeedEvent(report: Report): FeedEvent | null {
    const tipo = TYPE_TO_FEED[report.report_type];
    const label = TYPE_LABELS[report.report_type];
    if (!tipo || !label) return null;

    const district = report.district ? ` en ${report.district}` : '';
    return {
        texto: `Nuevo aviso: ${label}${district}`,
        tipo,
    };
}

export default function LiveFeed() {
    const [events, setEvents] = useState<FeedEvent[]>([]);
    const [currentEvent, setCurrentEvent] = useState<FeedEvent | null>(null);
    const [isVisible, setIsVisible] = useState(false);

    // Referencias para controlar el índice y temporizadores sin re-renderizar
    const feedIndexRef = useRef(0);
    const timerRef = useRef<NodeJS.Timeout | null>(null);
    const isPausedRef = useRef(false);
    const eventsRef = useRef<FeedEvent[]>([]);

    // Carga los avisos reales más recientes al montar
    useEffect(() => {
        let isCancelled = false;

        async function loadEvents() {
            try {
                const response = await fetchReports({ page: 1, limit: 10 });
                const mapped = response.items
                    .map(reportToFeedEvent)
                    .filter((e): e is FeedEvent => e !== null);
                if (!isCancelled) {
                    setEvents(mapped);
                    eventsRef.current = mapped;
                }
            } catch {
                // Sin datos reales disponibles — no mostramos nada inventado.
            }
        }

        loadEvents();
        return () => {
            isCancelled = true;
        };
    }, []);

    // Cicla entre los eventos reales cargados
    useEffect(() => {
        if (events.length === 0) return;

        const mostrarLiveFeed = () => {
            if (isPausedRef.current) return;
            const lista = eventsRef.current;
            if (lista.length === 0) return;

            const evento = lista[feedIndexRef.current % lista.length];
            feedIndexRef.current += 1;

            setCurrentEvent(evento);
            setIsVisible(true);

            // Ocultar el popup tras 3 segundos
            timerRef.current = setTimeout(() => {
                setIsVisible(false);

                // Esperar 15 segundos para mostrar el siguiente evento
                timerRef.current = setTimeout(() => {
                    mostrarLiveFeed();
                }, 15000);
            }, 5000);
        };

        // Primer inicio tras 5 segundos
        const initialTimer = setTimeout(() => {
            mostrarLiveFeed();
        }, 5000);

        return () => {
            clearTimeout(initialTimer);
            if (timerRef.current) clearTimeout(timerRef.current);
        };
    }, [events]);

    const handleClose = () => {
        isPausedRef.current = true;
        setIsVisible(false);

        if (timerRef.current) clearTimeout(timerRef.current);

        // Reanudar la animación después de 30 segundos
        setTimeout(() => {
            isPausedRef.current = false;
        }, 30000);
    };

    // Nada que mostrar todavía (cargando, sin avisos reales, o esperando el primer ciclo)
    if (!currentEvent) return null;

    return (
        <div
            id="live-feed-popup"
            className={`live-feed-popup feed-${currentEvent.tipo} ${isVisible ? 'live-feed-visible' : ''
                }`}
        >
            <span id="live-feed-dot" className="live-feed-dot"></span>
            <span id="live-feed-desc">{currentEvent.texto}</span>
            <button
                type="button"
                className="live-feed-close"
                id="live-feed-close"
                onClick={handleClose}
                aria-label="Cerrar notificación"
            >
                <i className="ti ti-x"></i>
            </button>
        </div>
    );
}