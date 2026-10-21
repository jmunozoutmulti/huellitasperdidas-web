import { authFetchJson, ApiError } from './authFetch';

export interface PaymentInfo {
    payment_id: string;
    gateway: 'mercadopago' | 'paypal' | 'izipay';
    amount: number;
    currency: string;
    preference_id?: string;
    public_key?: string;
    order_id?: string;
    form_token?: string;          // Izipay
    izipay_public_key?: string;   // Izipay
}

export interface ThreeDSChallenge {
    mp_payment_id: string;
    external_resource_url: string;
    creq: string;
}

export interface PaymentStatus {
    payment_id: string;
    status: 'pending' | 'paid' | 'failed' | 'refunded';
    flow_type: string;
    failure_reason?: string | null;
    challenge?: ThreeDSChallenge | null;  // 3D Secure: the issuer must authenticate the buyer
}

export class PaymentsApiError extends Error {
    status: number;
    constructor(status: number, message: string) {
        super(message);
        this.status = status;
    }
}

const MP_SECURITY_SCRIPT_ID = 'mp-security-js';

// Mercado Pago's antifraud needs a device fingerprint. The SDK alone does NOT set
// window.MP_DEVICE_SESSION_ID — only this security script does (view="checkout").
export function loadMercadoPagoDeviceScript(): void {
    if (typeof document === 'undefined' || document.getElementById(MP_SECURITY_SCRIPT_ID)) return;
    const script = document.createElement('script');
    script.id = MP_SECURITY_SCRIPT_ID;
    script.src = 'https://www.mercadopago.com/v2/security.js';
    script.async = true;
    script.setAttribute('view', 'checkout');
    document.body.appendChild(script);
}

function getMercadoPagoDeviceId(): string | null {
    if (typeof window === 'undefined') return null;
    const deviceId = (window as unknown as { MP_DEVICE_SESSION_ID?: unknown }).MP_DEVICE_SESSION_ID;
    return typeof deviceId === 'string' && deviceId ? deviceId : null;
}

export async function getPaymentStatus(paymentId: string): Promise<PaymentStatus> {
    try {
        return await authFetchJson<PaymentStatus>(`/v1/payments/${paymentId}`, { method: 'GET' });
    } catch (err) {
        if (err instanceof ApiError) throw new PaymentsApiError(err.status, err.message);
        throw err;
    }
}

export async function confirmPayment(paymentId: string, formData: Record<string, any>): Promise<PaymentStatus> {
    try {
        return await authFetchJson<PaymentStatus>(`/v1/payments/${paymentId}/confirm`, {
            method: 'POST',
            body: JSON.stringify({ ...formData, device_id: getMercadoPagoDeviceId() }),
        });
    } catch (err) {
        if (err instanceof ApiError) throw new PaymentsApiError(err.status, err.message);
        throw err;
    }
}

export async function confirmYapePayment(paymentId: string, token: string, payerEmail: string): Promise<PaymentStatus> {
    try {
        return await authFetchJson<PaymentStatus>(`/v1/payments/${paymentId}/confirm-yape`, {
            method: 'POST',
            body: JSON.stringify({ token, payer_email: payerEmail, device_id: getMercadoPagoDeviceId() }),
        });
    } catch (err) {
        if (err instanceof ApiError) throw new PaymentsApiError(err.status, err.message);
        throw err;
    }
}


// PayPal separa aprobar (el usuario dice "sí" en el popup) de capturar
// (mover el dinero de verdad) — este paso hace la captura real,
// server-to-server contra la API de PayPal. Es idempotente: llamarlo 2
// veces con el mismo order_id no cobra 2 veces.
export async function capturePayment(paymentId: string, orderId: string): Promise<PaymentStatus> {
    try {
        return await authFetchJson<PaymentStatus>(`/v1/payments/${paymentId}/capture`, {
            method: 'POST',
            body: JSON.stringify({ order_id: orderId }),
        });
    } catch (err) {
        if (err instanceof ApiError) throw new PaymentsApiError(err.status, err.message);
        throw err;
    }
}

// Izipay: la respuesta del formulario (kr-answer) se envía tal cual, como
// texto, porque el backend valida la firma (kr-hash) sobre ese texto exacto.
export async function confirmIzipayPayment(paymentId: string, krAnswer: string, krHash: string): Promise<PaymentStatus> {
    try {
        return await authFetchJson<PaymentStatus>(`/v1/payments/${paymentId}/izipay-confirm`, {
            method: 'POST',
            body: JSON.stringify({ kr_answer: krAnswer, kr_hash: krHash }),
        });
    } catch (err) {
        if (err instanceof ApiError) throw new PaymentsApiError(err.status, err.message);
        throw err;
    }
}