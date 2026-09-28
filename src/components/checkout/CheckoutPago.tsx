'use client';

import React, { useEffect, useRef, useState } from 'react';
import { initMercadoPago, Payment } from '@mercadopago/sdk-react';
import { PayPalScriptProvider, PayPalButtons } from '@paypal/react-paypal-js';
import { getPaymentStatus, confirmPayment, capturePayment, confirmYapePayment, type PaymentInfo } from '@/lib/paymentsApi';
import { retryPayment, ReportsApiError } from '@/lib/reportsApi';
import { showToast } from '@/components/global/Toast';

interface CheckoutPagoProps {
    payment: PaymentInfo;
    reportId: string;              // necesario para pedir un reintento con payment_id nuevo
    country: string | null | undefined;  // para el locale de Bricks (es-PE, es-MX, etc.)
    onConfirmed: () => void;       // status: 'paid' — el beneficio ya se aplicó
    onTimeout: () => void;         // pagó, pero no confirmamos en ~15s
    onCancelled: () => void;       // usuario canceló, o la pasarela reportó error/failed
}

const POLL_INTERVAL_MS = 1500;
const POLL_TIMEOUT_MS = 15000;

function CheckoutPago({ payment: initialPayment, reportId, country, onConfirmed, onTimeout, onCancelled }: CheckoutPagoProps) {
    const [isPolling, setIsPolling] = useState(false);
    const pollStartRef = useRef<number | null>(null);
    const [isMpReady, setIsMpReady] = useState(false);
    const [isRetrying, setIsRetrying] = useState(false);
    // Un payment_id que ya falló no se puede reusar — MP cachea la
    // respuesta contra el mismo id. Guardamos el payment "activo" acá
    // (empieza siendo el que llega por props) y lo reemplazamos cuando
    // pedimos un reintento con uno nuevo.
    const [payment, setPayment] = useState(initialPayment);
    const retryIdempotencyKeyRef = useRef<string | null>(null);

    // Yape: formulario propio (teléfono + OTP + email), separado del Brick
    // de tarjeta — ambos coexisten como tabs dentro del mismo componente.
    const [activeMethod, setActiveMethod] = useState<'card' | 'yape'>('card');
    const [yapePhone, setYapePhone] = useState('');
    const [yapeOtp, setYapeOtp] = useState('');
    const [yapeEmail, setYapeEmail] = useState('');
    const [isYapeSubmitting, setIsYapeSubmitting] = useState(false);

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
        try {
            const yapeMp = new MP(payment.public_key, { locale: 'es-PE' });
            const yape = yapeMp.yape({ otp: yapeOtp, phoneNumber: yapePhone });
            const yapeToken = await yape.create();
            const result = await confirmYapePayment(payment.payment_id, yapeToken.id, yapeEmail);
            if (result.status === 'paid') {
                onConfirmed();
                return;
            }
            if (result.status === 'failed') {
                onCancelled();
                return;
            }
            startPolling();
        } catch (err) {
            console.error('Error procesando el pago con Yape:', err);
            onCancelled();
        } finally {
            setIsYapeSubmitting(false);
        }
    };

    useEffect(() => {
        // Mercado Pago solo se usa para Perú en este proyecto — el locale
        // de Bricks es siempre es-PE, no depende del país dinámicamente.
        // Se reinicializa también si cambia el preference_id (reintento
        // tras un pago fallido), aunque public_key/gateway sean los mismos.
        if (payment.gateway === 'mercadopago' && payment.public_key) {
            initMercadoPago(payment.public_key, { locale: 'es-PE' });
            setIsMpReady(true);
        }
    }, [payment.public_key, payment.gateway, payment.preference_id]);

    const startPolling = () => {
        pollStartRef.current = Date.now();
        setIsPolling(true);
    };

    useEffect(() => {
        if (!isPolling) return;
        let isCancelledEffect = false;

        const interval = setInterval(async () => {
            try {
                const result = await getPaymentStatus(payment.payment_id);
                if (isCancelledEffect) return;

                if (result.status === 'paid') {
                    clearInterval(interval);
                    setIsPolling(false);
                    onConfirmed();
                    return;
                }
                if (result.status === 'failed') {
                    clearInterval(interval);
                    setIsPolling(false);
                    onCancelled();
                    return;
                }
                // 'pending' o 'refunded' recién creado — sigue esperando
            } catch {
                // error de red puntual — no corta el polling, reintenta en el próximo tick
            }

            if (pollStartRef.current && Date.now() - pollStartRef.current >= POLL_TIMEOUT_MS) {
                clearInterval(interval);
                setIsPolling(false);
                onTimeout();
            }
        }, POLL_INTERVAL_MS);

        return () => {
            isCancelledEffect = true;
            clearInterval(interval);
        };
    }, [isPolling, payment.payment_id, onConfirmed, onCancelled, onTimeout]);

    if (isPolling) {
        return (
            <div className="admin-info-box info-box-revision">
                <i className="ti ti-loader"></i>
                <p>Confirmando tu pago...</p>
            </div>
        );
    }

    if (payment.gateway === 'mercadopago') {
        if (!isMpReady) {
            return (
                <div className="admin-info-box info-box-revision">
                    <i className="ti ti-loader"></i>
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
                        <i className="fa-solid fa-credit-card"></i> Tarjeta de Crédito/Débito
                    </button>
                    <button
                        type="button"
                        className={`pay-tab-btn ${activeMethod === 'yape' ? 'active' : ''}`}
                        onClick={() => setActiveMethod('yape')}
                    >
                        <i className="fa-solid fa-mobile-screen-button"></i> Yape
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
                            initialization={{ amount: payment.amount, preferenceId: payment.preference_id }}
                            customization={{
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
                            }}
                            onSubmit={async (formData) => {
                                try {
                                    const result = await confirmPayment(payment.payment_id, formData.formData);
                                    if (result.status === 'paid') {
                                        onConfirmed();
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
                                    onCancelled();
                                    await retryAttempt();
                                }
                            }}
                            onError={(err: any) => {
                                console.error('Error en Mercado Pago Bricks:', err);
                                if (err?.type === 'non_critical') {
                                    return;
                                }
                                onCancelled();
                            }}
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
                        await capturePayment(payment.payment_id, data.orderID);
                    } catch (err) {
                        console.error('Error capturando el pago de PayPal:', err);
                        // Seguimos al polling de todas formas — si la captura
                        // falló solo por red, el polling puede alcanzar a ver
                        // el estado real igual; si de verdad falló, el
                        // polling hará timeout y avisará al usuario.
                    }
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