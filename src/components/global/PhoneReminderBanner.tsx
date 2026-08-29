'use client';

import { useState } from 'react';
import { useApp } from '@/context/AppContext';
import AlertBanner from './AlertBanner';
import ModalAgregarNumero from './ModalAgregarNumero';

export default function PhoneReminderBanner() {
    const { isLoggedIn, currentUser } = useApp();
    const [isModalOpen, setIsModalOpen] = useState(false);

    if (!isLoggedIn || !currentUser || currentUser.phone) return null;

    return (
        <>
            <AlertBanner
                type="danger"
                message={
                    <>
                        <i className="ti ti-phone-x"></i> Necesitas agregar un <b>número de contacto</b> para
                        poder publicar avisos.
                    </>
                }
                actionLabel="Agregar teléfono"
                actionIcon=""
                onAction={() => setIsModalOpen(true)}
                dismissible={false}
            />
            <ModalAgregarNumero isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
        </>
    );
}