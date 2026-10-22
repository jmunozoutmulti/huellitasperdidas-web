'use client';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { initMercadoPago, Payment, StatusScreen } from '@mercadopago/sdk-react';
import { PayPalScriptProvider, PayPalButtons } from '@paypal/react-paypal-js';
import { getPaymentStatus, confirmPayment, capturePayment, confirmYapePayment, loadMercadoPagoDeviceScript, type PaymentInfo, type PaymentStatus, type ThreeDSChallenge } from '@/lib/paymentsApi';
import { useApp } from '@/context/AppContext';
import { retryPayment, ReportsApiError } from '@/lib/reportsApi';
import { showToast } from '@/components/global/Toast';
import { IconLoader } from '@tabler/icons-react';
import CheckoutIzipay from './CheckoutIzipay';
import CheckoutYapeManual from './CheckoutYapeManual';
import {
    IconCreditCard,
    IconDeviceMobile
} from '@tabler/icons-react';

interface CheckoutPagoProps {
    payment: PaymentInfo;
    reportId: string;              // necesario para pedir un reintento con payment_id nuevo
    country: string | null | undefined;  // para el locale de Bricks (es-PE, es-MX, etc.)
    onConfirmed: () => void;       // status: 'paid' — el beneficio ya se aplicó
    onTimeout: () => void;         // pagó, pero no confirmamos en ~15s
    onCancelled: () => void;       // usuario canceló, o la pasarela reportó error/failed
    onManualPaymentSubmitted?: () => void; // Yape manual: el pago quedó en revisión (si falta, se usa onTimeout)
}

const POLL_INTERVAL_MS = 1500;
const POLL_TIMEOUT_MS = 15000;
// While the buyer completes a 3D Secure challenge with their bank.
const CHALLENGE_POLL_INTERVAL_MS = 3000;
const CHALLENGE_POLL_TIMEOUT_MS = 10 * 60 * 1000;

type PaymentBrickProps = React.ComponentProps<typeof Payment>;

const PAYMENT_BRICK_CUSTOMIZATION: PaymentBrickProps['customization'] = {
    paymentMethods: { creditCard: 'all', debitCard: 'all' },
    visual: {
        style: {
            customVariables: {
                formBackgroundColor: '#ffffff',
                baseColor: '#e70808',
                borderRadiusSmall: '100px',
                borderRadiusMedium: '7px',
                fontSizeSmall: '13px',
                fontSizeMedium: '13px',
                inputBackgroundColor: '#f4f5f7',
            },
        },
    },
};

function CheckoutPago({ payment: initialPayment, reportId, country, onConfirmed, onTimeout, onCancelled, onManualPaymentSubmitted }: CheckoutPagoProps) {
    const { currentUser } = useApp();
    const payerEmail = currentUser?.email ?? '';
    const [isPolling, setIsPolling] = useState(false);
    const pollStartRef = useRef<number | null>(null);
    const [isMpReady, setIsMpReady] = useState(false);
    const [isRetrying, setIsRetrying] = useState(false);
    // Un payment_id que ya falló no se puede reusar — MP cachea la
    // respuesta contra el mismo id. Guardamos el payment "activo" acá
    // (empieza siendo el que llega por props) y lo reemplazamos cuando
    // pedimos un reintento con uno nuevo.
    const [payment, setPayment] = useState(initialPayment);
    const [challenge, setChallenge] = useState<ThreeDSChallenge | null>(null);
    const challengeRef = useRef<ThreeDSChallenge | null>(null);
    const retryIdempotencyKeyRef = useRef<string | null>(null);

    // Yape: formulario propio (teléfono + OTP + email), separado del Brick
    // de tarjeta — ambos coexisten como tabs dentro del mismo componente.
    const [activeMethod, setActiveMethod] = useState<'card' | 'yape'>('card');

    // Checkout de Perú con Izipay: tarjeta (primera pestaña, abierta) y Yape
    // manual. El formulario de Izipay se monta al inicio y después solo se
    // oculta o se muestra al cambiar de pestaña.
    const [izipayMethod, setIzipayMethod] = useState<'yape' | 'card'>('card');
    const [hasOpenedIzipayCard, setHasOpenedIzipayCard] = useState(true);
    const [yapePhone, setYapePhone] = useState('');
    const [yapeOtp, setYapeOtp] = useState('');
    const [yapeEmail, setYapeEmail] = useState(payerEmail);
    const [isYapeSubmitting, setIsYapeSubmitting] = useState(false);
    useEffect(() => {
        if (payerEmail) setYapeEmail((current) => current || payerEmail);
    }, [payerEmail]);

    const retryAttempt = async () => {
        setIsRetrying(true);
        try {
            // Clave nueva en CADA reintento — a diferencia de la clave de
            // creación (que se reusa si falla la RED, no el pago en sí),
            // acá cada fallo de pago es un intento distinto y necesita su
            // propio payment_id nuevo, nunca el mismo de una vez anterior.
            retryIdempotencyKeyRef.current = crypto.randomUUID();
            const { payment: newPayment } = await retryPayment(reportId, retryIdempotencyKeyRef.current);
            if (newPayment) {
                setPayment(newPayment);
                setIsMpReady(false); // fuerza reinicializar Bricks con el nuevo public_key/preference_id
            }
        } catch (err) {
            const message = err instanceof ReportsApiError ? err.message : 'No pudimos generar un nuevo intento de pago.';
            showToast(message, 'error');
        } finally {
            setIsRetrying(false);
        }
    };

    const handleYapePay = async () => {
        // El SDK de MP se carga globalmente vía el Payment Brick; acá
        // instanciamos nuestra propia referencia solo para llamar a .yape(),
        // que la versión de React de sdk-react no expone directamente.
        const MP = (window as any).MercadoPago;
        if (!MP) {
            showToast('No pudimos cargar el pago seguro. Intenta de nuevo.', 'error');
            return;
        }
        setIsYapeSubmitting(true);
        let yapeTokenId: string;
        try {
            const yapeMp = new MP(payment.public_key, { locale: 'es-PE' });
            const yape = yapeMp.yape({ otp: yapeOtp, phoneNumber: yapePhone });
            const yapeToken = await yape.create();
            yapeTokenId = yapeToken.id;
        } catch (err) {
            console.error('Error generando el token de Yape:', err);
            setIsYapeSubmitting(false);
            onCancelled();
            return;
        }
        try {
            const result = await confirmYapePayment(payment.payment_id, yapeTokenId, yapeEmail);
            if (result.status === 'paid') {
                onConfirmed();
                return;
            }
            if (result.status === 'failed') {
                onCancelled();
                await retryAttempt();
                return;
            }
            startPolling();
        } catch (err) {
            console.error('Error confirmando el pago con Yape:', err);
            try {
                const current = await getPaymentStatus(payment.payment_id);
                if (current.status === 'paid') {
                    onConfirmed();
                    return;
                }
                if (current.status === 'failed') {
                    onCancelled();
                    await retryAttempt();
                    return;
                }
            } catch {
                // Sin poder verificar el estado no reintentamos: decide el polling
            }
            startPolling();
        } finally {
            setIsYapeSubmitting(false);
        }
    };

    useEffect(() => {
        if (payment.gateway === 'mercadopago' && payment.public_key) {
            loadMercadoPagoDeviceScript();
            initMercadoPago(payment.public_key, { locale: 'es-PE' });
            setIsMpReady(true);
        }
    }, [payment.public_key, payment.gateway, payment.preference_id, payment.payment_id]);

    const startPolling = () => {
        pollStartRef.current = Date.now();
        setIsPolling(true);
    };

    // Resultado de izipay-confirm: mismo manejo que la tarjeta de Mercado Pago.
    const handleIzipayResult = (result: PaymentStatus) => {
        if (result.status === 'paid') {
            onConfirmed();
            return;
        }
        if (result.status === 'failed') {
            onCancelled();
            retryAttempt();
            return;
        }
        // 'pending': se consulta el estado hasta que el backend lo confirme.
        startPolling();
    };

    // Props del formulario de tarjeta que tienen que mantener la misma
    // referencia entre renders (ver PAYMENT_BRICK_CUSTOMIZATION).
    const paymentInitialization = useMemo<PaymentBrickProps['initialization']>(
        () => ({
            amount: payment.amount,
            preferenceId: payment.preference_id,
            ...(payerEmail ? { payer: { email: payerEmail } } : {}),
        }),
        [payment.amount, payment.preference_id, payerEmail]
    );

    // Los callbacks del Brick también deben ser estables. Se guarda la versión
    // más reciente en un ref y se le pasa al Brick una función fija que la llama.
    const cardSubmitRef = useRef<PaymentBrickProps['onSubmit']>(undefined);
    cardSubmitRef.current = async (formData) => {
        try {
            const result = await confirmPayment(payment.payment_id, formData.formData);
            if (result.status === 'paid') {
                onConfirmed();
                return;
            }
            if (result.status === 'pending' && result.challenge) {
                // The bank asks the buyer to confirm (3DS): show its challenge
                // and keep polling until Mercado Pago resolves the payment.
                challengeRef.current = result.challenge;
                setChallenge(result.challenge);
                startPolling();
                return;
            }
            if (result.status === 'failed') {
                onCancelled();
                await retryAttempt();
                return;
            }
            // 'pending' — el webhook lo termina de confirmar; el
            // polling ya montado sigue funcionando como respaldo.
            startPolling();
        } catch (err) {
            console.error('Error confirmando el pago con Mercado Pago:', err);
            try {
                const current = await getPaymentStatus(payment.payment_id);
                if (current.status === 'paid') {
                    onConfirmed();
                    return;
                }
                if (current.status === 'failed') {
                    onCancelled();
                    await retryAttempt();
                    return;
                }
            } catch {
                // Sin poder verificar el estado no reintentamos: decide el polling
            }
            startPolling();
        }
    };

    // Stable reference for the Status Screen Brick (same reason as the Payment Brick).
    const challengeInitialization = useMemo(
        () => challenge && {
            paymentId: challenge.mp_payment_id,
            additionalInfo: { externalResourceURL: challenge.external_resource_url, creq: challenge.creq },
        },
        [challenge]
    );

    const handleCardSubmit = useCallback(
        (...args: Parameters<NonNullable<PaymentBrickProps['onSubmit']>>) => cardSubmitRef.current!(...args),
        []
    );

    const onCancelledRef = useRef(onCancelled);
    onCancelledRef.current = onCancelled;

    const handleCardError = useCallback((err: any) => {
        console.error('Error en Mercado Pago Bricks:', err);
        if (err?.type === 'non_critical') {
            return;
        }
        onCancelledRef.current();
    }, []);

    useEffect(() => {
        if (!isPolling) return;
        let isCancelledEffect = false;
        const inChallenge = challengeRef.current !== null;
        const timeoutMs = inChallenge ? CHALLENGE_POLL_TIMEOUT_MS : POLL_TIMEOUT_MS;

        const interval = setInterval(async () => {
            try {
                const result = await getPaymentStatus(payment.payment_id);
                if (isCancelledEffect) return;

                if (result.status === 'paid') {
                    clearInterval(interval);
                    setIsPolling(false);
                    challengeRef.current = null;
                    setChallenge(null);
                    onConfirmed();
                    return;
                }
                if (result.status === 'failed') {
                    clearInterval(interval);
                    setIsPolling(false);
                    challengeRef.current = null;
                    setChallenge(null);
                    onCancelled();
                    await retryAttempt();
                    return;
                }
                // 'pending' o 'refunded' recién creado — sigue esperando
            } catch {
                // error de red puntual — no corta el polling, reintenta en el próximo tick
            }

            if (pollStartRef.current && Date.now() - pollStartRef.current >= timeoutMs) {
                clearInterval(interval);
                setIsPolling(false);
                challengeRef.current = null;
                setChallenge(null);
                onTimeout();
            }
        }, inChallenge ? CHALLENGE_POLL_INTERVAL_MS : POLL_INTERVAL_MS);

        return () => {
            isCancelledEffect = true;
            clearInterval(interval);
        };
    }, [isPolling, payment.payment_id, onConfirmed, onCancelled, onTimeout]);

    if (challenge) {
        return (
            <div className="payment-3ds-challenge">
                <p>Tu banco necesita confirmar que eres tú. Sigue los pasos que aparecen abajo.</p>
                <StatusScreen key={challenge.mp_payment_id} initialization={challengeInitialization!} />
            </div>
        );
    }

    if (isPolling) {
        return (
            <div className="admin-info-box info-box-revision">
                <IconLoader />
                <p>Confirmando tu pago...</p>
            </div>
        );
    }

    if (payment.gateway === 'izipay') {
        const openIzipayCard = () => {
            setIzipayMethod('card');
            setHasOpenedIzipayCard(true);
        };

        return (
            <>
                <div className="payment-methods-tabs">
                    <button
                        type="button"
                        className={`pay-tab-btn ${izipayMethod === 'card' ? 'active' : ''}`}
                        onClick={openIzipayCard}
                    >
                        <IconCreditCard /> Tarjeta débito / crédito
                    </button>
                    <button
                        type="button"
                        className={`pay-tab-btn ${izipayMethod === 'yape' ? 'active' : ''}`}
                        onClick={() => setIzipayMethod('yape')}
                    >
                        <IconDeviceMobile /> Yape
                    </button>
                </div>

                <div className="payment-methods-content">
                    <div
                        className={`pay-method-panel ${izipayMethod === 'yape' ? 'active' : ''}`}
                        style={{ display: izipayMethod === 'yape' ? 'block' : 'none' }}
                    >
                        <CheckoutYapeManual
                            key={payment.payment_id}
                            payment={payment}
                            onSubmitted={onManualPaymentSubmitted ?? onTimeout}
                        />
                    </div>

                    <div
                        className={`pay-method-panel ${izipayMethod === 'card' ? 'active' : ''}`}
                        style={{ display: izipayMethod === 'card' ? 'block' : 'none' }}
                    >
                        {hasOpenedIzipayCard && (
                            <CheckoutIzipay
                                key={payment.payment_id}
                                payment={payment}
                                onResult={handleIzipayResult}
                            />
                        )}
                    </div>
                </div>
            </>
        );
    }

    if (payment.gateway === 'mercadopago') {
        if (!isMpReady) {
            return (
                <div className="admin-info-box info-box-revision">
                    <IconLoader />
                    <p>Cargando pago seguro...</p>
                </div>
            );
        }
        return (
            <>
                <div className="payment-methods-tabs">
                    <button
                        type="button"
                        className={`pay-tab-btn ${activeMethod === 'card' ? 'active' : ''}`}
                        onClick={() => setActiveMethod('card')}
                    >
                        <IconCreditCard /> Tarjeta de Crédito/Débito
                    </button>
                    <button
                        type="button"
                        className={`pay-tab-btn ${activeMethod === 'yape' ? 'active' : ''}`}
                        onClick={() => setActiveMethod('yape')}
                    >
                        <IconDeviceMobile /> Yape
                    </button>
                </div>

                <div className="payment-methods-content">
                    <div
                        id="pay-method-card"
                        className={`pay-method-panel ${activeMethod === 'card' ? 'active' : ''}`}
                        style={{ display: activeMethod === 'card' ? 'block' : 'none' }}
                    >
                        <Payment
                            key={payment.payment_id}
                            initialization={paymentInitialization}
                            customization={PAYMENT_BRICK_CUSTOMIZATION}
                            onSubmit={handleCardSubmit}
                            onError={handleCardError}
                        />
                    </div>

                    <div
                        id="pay-method-yape"
                        className={`pay-method-panel ${activeMethod === 'yape' ? 'active' : ''}`}
                        style={{ display: activeMethod === 'yape' ? 'block' : 'none' }}
                    >
                        <div className="yape-mock-wrapper">
                            <div className="info-yape"> <img src="/images/yape.svg" /> Ingresa tu número y código de aprobación de Yape.</div>
                            <div className="groups-payment grid-2col">
                                <div className="form-group">
                                    <label className="form-label">Número de celular</label>
                                    <input
                                        type="tel"
                                        className="form-input"
                                        placeholder="000000000"
                                        value={yapePhone}
                                        onChange={(e) => setYapePhone(e.target.value)}
                                        maxLength={9}
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Código de aprobación <b>Yape</b></label>
                                    <input
                                        type="text"
                                        className="form-input"
                                        placeholder="000000"
                                        value={yapeOtp}
                                        onChange={(e) => setYapeOtp(e.target.value)}
                                        maxLength={6}
                                    />
                                </div>
                            </div>
                            <div className="groups-payment form-group">
                                <label className="form-label">Correo electrónico</label>
                                <input
                                    type="email"
                                    className="form-input"
                                    placeholder="tucorreo@email.com"
                                    value={yapeEmail}
                                    onChange={(e) => setYapeEmail(e.target.value)}
                                />
                            </div>
                            <button
                                type="button"
                                className="btn-publish"
                                disabled={isYapeSubmitting || !yapePhone || !yapeOtp || !yapeEmail}
                                onClick={handleYapePay}
                            >
                                {isYapeSubmitting ? 'Procesando...' : 'Pagar con Yape'}
                            </button>
                        </div>
                    </div>
                </div>
            </>
        );
    }
    return (
        <PayPalScriptProvider options={{ clientId: process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID!, currency: payment.currency }}>
            <PayPalButtons
                key={payment.payment_id}
                fundingSource="card"
                style={{
                    //color: 'gold',
                    color: 'black',
                    shape: 'pill',
                    label: 'pay',
                    tagline: false
                }}
                createOrder={() => Promise.resolve(payment.order_id!)}
                onApprove={async (data) => {
                    try {
                        const result = await capturePayment(payment.payment_id, data.orderID);
                        if (result.status === 'paid') {
                            onConfirmed();
                            return;
                        }
                        if (result.status === 'failed') {
                            onCancelled();
                            await retryAttempt();
                            return;
                        }
                    } catch (err) {
                        console.error('Error capturando el pago de PayPal:', err);
                    }
                    // 'pending' o error de red: el polling resuelve el estado real
                    startPolling();
                }}
                onCancel={() => onCancelled()}
                onError={(err) => {
                    console.error('Error en PayPal:', err);
                    onCancelled();
                }}
            />
        </PayPalScriptProvider>
    );
}

export default React.memo(CheckoutPago);