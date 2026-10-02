'use client';

import { ReactNode, useEffect, useRef } from 'react';
import { IconRefresh, IconX } from '@tabler/icons-react';

interface AlertBannerProps {
    type: 'danger' | 'info';
    message: ReactNode;
    actionLabel?: string;
    actionIcon?: React.ReactNode;
    onAction?: () => void;
    onClose?: () => void;
    autoDismiss?: boolean;
    dismissible?: boolean;
}

export default function AlertBanner({
    type,
    message,
    actionLabel,
    actionIcon = <IconRefresh />,
    onAction,
    onClose,
    autoDismiss = true,
    dismissible = true,
}: AlertBannerProps) {
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
                                {actionIcon && (
                                    <span className="alert-action-icon">
                                        {typeof actionIcon === 'string' ? <i className={actionIcon}></i> : actionIcon}
                                    </span>
                                )}
                                {' '}{actionLabel}
                            </button>
                        </>
                    )}
                </p>
            </div>
            {dismissible && onClose && (
                <button type="button" className="btn-banner btn-banner-danger" onClick={onClose}>
                    <IconX />
                </button>
            )}
        </div>
    );
}