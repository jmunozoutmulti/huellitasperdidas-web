'use client';

import { useState, useEffect } from 'react';
import { showToast } from '@/components/global/Toast';
import { fetchReport, type ReportDetail } from '@/lib/api';
import { stopReport, ReportsApiError } from '@/lib/reportsApi';
import { getPackages, type PackageOption } from '@/lib/packagesApi';
import { getCountryByAbbr } from '@/lib/countries';

interface ModalDetenerProps {
    isOpen: boolean;
    id: string;
    onClose: () => void;
    onStopped: () => void;
}

export default function ModalDetener({ isOpen, id, onClose, onStopped }: ModalDetenerProps) {
    const [pub, setPub] = useState<ReportDetail | null>(null);
    const [pkg, setPkg] = useState<PackageOption | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);

    useEffect(() => {
        if (!isOpen || !id) return;
        setPub(null);
        setPkg(null);
        fetchReport(id).then(async (report) => {
            setPub(report);
            if (report.package_slug && report.country) {
                const pkgs = await getPackages(report.country);
                setPkg(pkgs.find((p) => p.slug === report.package_slug) ?? null);
            }
        });
    }, [isOpen, id]);

    if (!isOpen) return null;

    const paid = pub ? !!pub.package_slug && pub.package_slug !== 'gratis' : false;
    const hasRefund = paid && !!pkg?.includesRefund;

    const handleConfirm = async () => {
        setIsProcessing(true);
        try {
            const result = await stopReport(id);
            onClose();
            onStopped();
            // El backend ya calcula el monto real — mostramos lo que devuelve,
            // sin volver a calcularlo nosotros.
            if (result.refund_status === 'pending' && result.refund_amount) {
                const country = pub?.country ? await getCountryByAbbr(pub.country) : null;
                const symbol = country?.currencySymbol ?? '';
                showToast(
                    `El anuncio fue detenido. Se te reembolsará ${symbol} ${result.refund_amount} en los próximos días.`,
                    'success'
                );
            } else {
                showToast('El anuncio fue detenido correctamente.', 'success');
            }
        } catch (err) {
            const message = err instanceof ReportsApiError ? err.message : 'No pudimos detener el anuncio. Intenta de nuevo.';
            showToast(message, 'error');
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className="app-modal open" id="modal-detener">
            <div className="app-modal-backdrop" onClick={onClose}></div>
            <div className="app-modal-card">
                <div className="app-modal-body">
                    <div className="app-modal-confirm-icon warning">
                        <i className="ti ti-ban"></i>
                    </div>
                    <div className="app-modal-confirm-text">
                        <h4>¿Detener este anuncio?</h4>
                        <p>Se dejará de mostrar de inmediato en el buscador y las redes conectadas.</p>
                    </div>

                    {!pub ? (
                        <div className="admin-info-box">
                            <i className="ti ti-loader"></i>
                            <p>Cargando datos del aviso...</p>
                        </div>
                    ) : hasRefund ? (
                        <div className="admin-info-box" id="detener-reembolso-box">
                            <i className="fa-regular fa-credit-card"></i>
                            <p>
                                <b>Tu plan incluye un reembolso.</b> <br />
                                Te mostraremos el monto aproximado que recibirás al confirmar esta
                                acción. La devolución será procesada manualmente por nuestro equipo.
                            </p>
                        </div>
                    ) : (
                        <div className="admin-info-box" id="detener-sin-reembolso-box">
                            <i className="ti ti-info-circle"></i>
                            <p>Esta acción no se puede deshacer.</p>
                        </div>
                    )}
                </div>
                <div className="app-modal-footer">
                    <button type="button" className="btn-secondary" onClick={onClose}>
                        Cancelar
                    </button>
                    <button
                        type="button"
                        className="btn-danger-account"
                        id="btn-confirmar-detener"
                        disabled={!pub || isProcessing}
                        onClick={handleConfirm}
                    >
                        <i className="ti ti-ban"></i> {isProcessing ? 'Deteniendo...' : 'Sí, detener anuncio'}
                    </button>
                </div>
            </div>
        </div>
    );
}