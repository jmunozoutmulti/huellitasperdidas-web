'use client';

import { useEffect, useRef, useState } from 'react';
import KRGlue from '@lyracom/embedded-form-glue';
import { confirmIzipayPayment, PaymentInfo, PaymentsApiError, PaymentStatus } from '@/lib/paymentsApi';

// Dominio de Izipay para la librería y los temas del formulario.
const IZIPAY_ENDPOINT = 'https://static.micuentaweb.pe';
const IZIPAY_THEME_BASE_URL = `${IZIPAY_ENDPOINT}/static/js/krypton-client/V4.0/ext`;
const IZIPAY_FORM_CONTAINER_ID = 'izipay-payment-form';

type IzipayTheme = 'neon' | 'classic';
const IZIPAY_THEME: IzipayTheme = 'neon';

// Carga el CSS y el JS del tema antes que la librería, como indica Izipay.
// Si ya se cargaron en esta visita, no se vuelven a agregar.
function loadIzipayTheme(theme: IzipayTheme): Promise<void> {
    const cssId = `izipay-theme-css-${theme}`;
    const jsId = `izipay-theme-js-${theme}`;

    if (!document.getElementById(cssId)) {
        const link = document.createElement('link');
        link.id = cssId;
        link.rel = 'stylesheet';
        link.href = `${IZIPAY_THEME_BASE_URL}/${theme}-reset.css`;
        document.head.appendChild(link);
    }

    const existingScript = document.getElementById(jsId) as HTMLScriptElement | null;
    if (existingScript) {
        return existingScript.dataset.loaded === 'true'
            ? Promise.resolve()
            : new Promise((resolve, reject) => {
                existingScript.addEventListener('load', () => resolve());
                existingScript.addEventListener('error', () => reject(new Error('No se pudo cargar el tema de Izipay')));
            });
    }

    return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.id = jsId;
        script.src = `${IZIPAY_THEME_BASE_URL}/${theme}.js`;
        script.onload = () => {
            script.dataset.loaded = 'true';
            resolve();
        };
        script.onerror = () => reject(new Error('No se pudo cargar el tema de Izipay'));
        document.head.appendChild(script);
    });
}

interface CheckoutIzipayProps {
    payment: PaymentInfo;
    // Resultado de izipay-confirm: CheckoutPago decide qué hacer con cada estado.
    onResult: (result: PaymentStatus) => void;
}

export default function CheckoutIzipay({ payment, onResult }: CheckoutIzipayProps) {
    const [isFormReady, setIsFormReady] = useState(false);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [isConfirming, setIsConfirming] = useState(false);
    const [confirmError, setConfirmError] = useState<string | null>(null);

    // La última respuesta del formulario, para reintentar la confirmación si
    // falla la llamada al backend (el cobro en Izipay ya se hizo).
    const lastAnswerRef = useRef<{ krAnswer: string; krHash: string } | null>(null);
    const isConfirmingRef = useRef(false);
    const onResultRef = useRef(onResult);
    onResultRef.current = onResult;

    const confirmWithBackend = (krAnswer: string, krHash: string) => {
        if (isConfirmingRef.current) return;
        isConfirmingRef.current = true;
        setIsConfirming(true);
        setConfirmError(null);

        confirmIzipayPayment(payment.payment_id, krAnswer, krHash)
            .then((result) => {
                onResultRef.current(result);
            })
            .catch((err) => {
                isConfirmingRef.current = false;
                setIsConfirming(false);
                setConfirmError(
                    err instanceof PaymentsApiError
                        ? err.message
                        : 'No pudimos confirmar tu pago. Revisa tu conexión e inténtalo de nuevo.'
                );
            });
    };

    const confirmWithBackendRef = useRef(confirmWithBackend);
    confirmWithBackendRef.current = confirmWithBackend;

    useEffect(() => {
        if (!payment.form_token || !payment.izipay_public_key) {
            setLoadError('No pudimos cargar el formulario de pago. Intenta de nuevo en unos minutos.');
            return;
        }

        let isCancelled = false;
        let krInstance: KR | null = null;

        const setupForm = async () => {
            try {
                await loadIzipayTheme(IZIPAY_THEME);
                if (isCancelled) return;

                const { KR } = await KRGlue.loadLibrary(IZIPAY_ENDPOINT, payment.izipay_public_key!);
                if (isCancelled) return;
                krInstance = KR;

                await KR.setFormConfig({
                    formToken: payment.form_token,
                    'kr-language': 'es-ES',
                });
                if (isCancelled) return;

                // Se devuelve false de inmediato para que el formulario no redirija:
                // el resultado lo maneja nuestra llamada al backend.
                await KR.onSubmit((response: KRPaymentResponse) => {
                    lastAnswerRef.current = { krAnswer: response.rawClientAnswer, krHash: response.hash };
                    confirmWithBackendRef.current(response.rawClientAnswer, response.hash);
                    return false;
                });
                if (isCancelled) return;

                await KR.renderElements(`#${IZIPAY_FORM_CONTAINER_ID}`);
                if (isCancelled) {
                    KR.removeForms();
                    return;
                }
                await KR.button.setLabel('Pagar %amount-and-currency%');
                setIsFormReady(true);
            } catch (err) {
                console.error('Error cargando el formulario de Izipay:', err);
                if (!isCancelled) {
                    setLoadError('No pudimos cargar el formulario de pago. Intenta de nuevo en unos minutos.');
                }
            }
        };

        setupForm();

        return () => {
            isCancelled = true;
            krInstance?.removeForms();
        };
    }, [payment.form_token, payment.izipay_public_key]);

    const handleRetryConfirm = () => {
        const lastAnswer = lastAnswerRef.current;
        if (!lastAnswer) return;
        confirmWithBackend(lastAnswer.krAnswer, lastAnswer.krHash);
    };

    return (
        <div className="checkout-izipay">
            <div id={IZIPAY_FORM_CONTAINER_ID}>
                <div className="kr-smart-form" kr-card-form-expanded=""></div>
            </div>

            {!isFormReady && !loadError && (
                <p style={{ display: 'flex', justifyContent: 'center', fontSize: '0.9em' }}> <i className="icon-loading"></i> Cargando formulario de pago…</p>
            )}

            {loadError && (
                <p style={{ textAlign: 'center', margin: '1em 0', color: 'var(--text-red)' }}>{loadError}</p>
            )}

            {isConfirming && (
                <p style={{ textAlign: 'center', margin: '1em 0' }}> <i className="icon-loading"></i> Confirmando tu pago…</p>
            )}

            {confirmError && (
                <div style={{ textAlign: 'center', margin: '1em 0' }}>
                    <p style={{ color: 'var(--text-red)', marginBottom: '0.75em' }}>{confirmError}</p>
                    <button
                        type="button"
                        onClick={handleRetryConfirm}
                        style={{ padding: '0.6em 1.4em', borderRadius: '3em', border: 'none', background: 'var(--brand-red)', color: '#fff', cursor: 'pointer' }}
                    >
                        Reintentar confirmación
                    </button>
                </div>
            )}
        </div>
    );
}