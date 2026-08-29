'use client';

import { ReactNode, useEffect, useRef } from 'react';

interface AlertBannerProps {
    type: 'danger' | 'info';
    message: ReactNode;
    actionLabel?: string;
    actionIcon?: string;
    onAction?: () => void;
    onClose?: () => void;
    autoDismiss?: boolean;
    dismissible?: boolean;
}

export default function AlertBanner({
    type,
    message,
    actionLabel,
    actionIcon = 'ti ti-refresh',
    onAction,
    onClose,
    autoDismiss = true,
    dismissible = true,
}: AlertBannerProps) {
    // Ref para siempre llamar el onClose más reciente, sin que el timer
    // se reinicie cada vez que el padre se re-renderiza (onClose suele
    // pasarse como función inline, que cambia de referencia en cada render).
    const onCloseRef = useRef(onClose);
    useEffect(() => {
        onCloseRef.current = onClose;
    }, [onClose]);

    useEffect(() => {
        if (!autoDismiss || !onClose) return;
        const timer = setTimeout(() => {
            onCloseRef.current?.();
        }, 10000);
        return () => clearTimeout(timer);
        // Se arma una sola vez al montar el banner — no se reinicia por re-renders del padre.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
        <div className={`alert-banner banner-${type}`}>
            <div className="banner-content">
                <p>
                    <span>{message}</span>
                    {actionLabel && onAction && (
                        <>
                            {' '}
                            <button type="button" className="btn-time-add" onClick={onAction}>
                                <i className={actionIcon}></i> {actionLabel}
                            </button>
                        </>
                    )}
                </p>
            </div>
            {dismissible && onClose && (
                <button type="button" className="btn-banner btn-banner-danger" onClick={onClose}>
                    <i className="ti ti-x"></i>
                </button>
            )}
        </div>
    );
}