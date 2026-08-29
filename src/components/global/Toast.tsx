'use client';

import { useState, useEffect } from 'react';
import '@/styles/global/toast.css';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

interface ToastState {
    visible: boolean;
    message: string;
    type: ToastType;
}

const ICONS: Record<ToastType, string> = {
    success: 'ti ti-circle-check',
    error: 'ti ti-circle-x',
    info: 'ti ti-info-circle',
    warning: 'ti ti-alert-triangle',
};

export default function Toast() {
    const [toast, setToast] = useState<ToastState>({
        visible: false,
        message: '',
        type: 'success',
    });

    useEffect(() => {
        let toastTimer: NodeJS.Timeout | null = null;

        const handleShowToast = (
            event: CustomEvent<{ message: string; type: ToastType }>
        ) => {
            const { message, type = 'success' } = event.detail;

            setToast({
                visible: true,
                message,
                type,
            });

            if (toastTimer) clearTimeout(toastTimer);

            toastTimer = setTimeout(() => {
                setToast((prev) => ({ ...prev, visible: false }));
            }, 5000);
        };

        window.addEventListener('show-toast' as any, handleShowToast);

        return () => {
            if (toastTimer) clearTimeout(toastTimer);
            window.removeEventListener('show-toast' as any, handleShowToast);
        };
    }, []);

    const handleClose = () => {
        setToast((prev) => ({ ...prev, visible: false }));
    };

    return (
        <div
            id="global-toast"
            className={`global-toast toast-${toast.type} ${toast.visible ? 'toast-visible' : ''
                }`}
        >
            <span className="toast-icon-wrap">
                <i id="toast-icon" className={`fa-solid ${ICONS[toast.type]}`}></i>
            </span>
            <span id="toast-message">{toast.message}</span>
            <button
                type="button"
                className="toast-close-btn"
                id="toast-close"
                onClick={handleClose}
                aria-label="Cerrar notificación"
            >
                <i className="ti ti-x"></i>
            </button>
        </div>
    );
}

/**
 * Función global para disparar la alerta Toast desde cualquier componente de React
 */
export function showToast(mensaje: string, tipo: ToastType = 'success') {
    if (typeof window !== 'undefined') {
        const event = new CustomEvent('show-toast', {
            detail: { message: mensaje, type: tipo },
        });
        window.dispatchEvent(event);
    }
}