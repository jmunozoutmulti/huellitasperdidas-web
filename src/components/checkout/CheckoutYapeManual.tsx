'use client';

import { useRef, useState } from 'react';
import { IconCheck, IconCopy } from '@tabler/icons-react';
import { showToast } from '@/components/global/Toast';
import { confirmYapeManual, PaymentInfo, PaymentsApiError } from '@/lib/paymentsApi';

// Cuenta de Yape a la que el usuario yapea el monto del pago.
const YAPE_NUMBER = '934741405';
const YAPE_NUMBER_DISPLAY = '934 741 405';
const YAPE_OWNER = 'Lessly Ron';

const YAPE_CODE_LENGTH = 3;   // código de seguridad (app de Yape)
const BCP_CODE_LENGTH = 8;    // número de operación (app BCP)

interface CheckoutYapeManualProps {
    payment: PaymentInfo;
    // Se llama cuando el backend guardó el código: el pago queda en revisión.
    onSubmitted: () => void;
}

function formatAmount(amount: number, currency: string): string {
    const symbol = currency === 'PEN' ? 'S/' : currency;
    return `${symbol} ${amount.toFixed(2)}`;
}

export default function CheckoutYapeManual({ payment, onSubmitted }: CheckoutYapeManualProps) {
    const [yapeCode, setYapeCode] = useState('');
    const [bcpCode, setBcpCode] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isCopied, setIsCopied] = useState(false);
    const copiedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Solo se completa uno de los dos campos: el otro queda deshabilitado.
    const isValid =
        (yapeCode.length === YAPE_CODE_LENGTH && bcpCode.length === 0) ||
        (bcpCode.length === BCP_CODE_LENGTH && yapeCode.length === 0);

    const handleCopy = () => {
        navigator.clipboard
            .writeText(YAPE_NUMBER)
            .then(() => {
                setIsCopied(true);
                if (copiedTimerRef.current) clearTimeout(copiedTimerRef.current);
                copiedTimerRef.current = setTimeout(() => setIsCopied(false), 2000);
            })
            .catch(() => {
                showToast(`No pudimos copiar el número. Anótalo: ${YAPE_NUMBER_DISPLAY}`, 'info');
            });
    };

    const handleSubmit = async () => {
        if (!isValid || isSubmitting) return;
        const app = yapeCode ? 'yape' : 'bcp';
        const code = yapeCode || bcpCode;

        setIsSubmitting(true);
        setError(null);
        try {
            await confirmYapeManual(payment.payment_id, app, code);
            onSubmitted();
        } catch (err) {
            setError(
                err instanceof PaymentsApiError
                    ? err.message
                    : 'No pudimos registrar tu pago. Revisa tu conexión e inténtalo de nuevo.'
            );
            setIsSubmitting(false);
        }
    };

    return (
        <div className="yape-manual">
            <div className="yape-manual-pay">
                <img className="yape-manual-qr" src="/images/qr.png" alt="Código QR de Yape" />
                <div className="yape-manual-info">
                    <span className="yape-manual-label">Monto a yapear</span>
                    <span className="yape-manual-amount">{formatAmount(payment.amount, payment.currency)}</span>
                    <div className="yape-manual-number">
                        <div>
                            <span className="yape-manual-number-value">{YAPE_NUMBER_DISPLAY}</span>
                            <span className="yape-manual-number-owner">{YAPE_OWNER}</span>
                        </div>
                        <button type="button" className="yape-manual-copy" onClick={handleCopy}>
                            {isCopied ? <IconCheck /> : <IconCopy />} {isCopied ? 'Copiado' : 'Copiar'}
                        </button>
                    </div>
                </div>
            </div>

            <p className="yape-manual-title">Ingresa la info del pago:</p>

            <div className="yape-manual-field">
                <label htmlFor="yape-manual-code" className="yape-manual-field-label">
                    <img src="/images/yape.svg" alt="" /> Yapeaste por la app de Yape (3 dígitos)
                </label>
                <input
                    id="yape-manual-code"
                    className="form-input"
                    type="text"
                    inputMode="numeric"
                    autoComplete="off"
                    placeholder="Código de seguridad"
                    maxLength={YAPE_CODE_LENGTH}
                    value={yapeCode}
                    disabled={bcpCode.length > 0 || isSubmitting}
                    onChange={(e) => setYapeCode(e.target.value.replace(/\D/g, '').slice(0, YAPE_CODE_LENGTH))}
                />
            </div>

            <div className="yape-manual-field">
                <label htmlFor="yape-manual-operation" className="yape-manual-field-label">
                    <img src="/images/bcp.svg" alt="" /> Yapeaste por la app BCP (8 dígitos)
                </label>
                <input
                    id="yape-manual-operation"
                    className="form-input"
                    type="text"
                    inputMode="numeric"
                    autoComplete="off"
                    placeholder="Número de operación"
                    maxLength={BCP_CODE_LENGTH}
                    value={bcpCode}
                    disabled={yapeCode.length > 0 || isSubmitting}
                    onChange={(e) => setBcpCode(e.target.value.replace(/\D/g, '').slice(0, BCP_CODE_LENGTH))}
                />
            </div>

            {error && <p className="yape-manual-error">{error}</p>}

            <button
                type="button"
                className="btn-publish yape-manual-submit"
                disabled={!isValid || isSubmitting}
                onClick={handleSubmit}
            >
                {isSubmitting ? 'Confirmando…' : <><IconCheck /> Confirmar pago</>}
            </button>
        </div>
    );
}