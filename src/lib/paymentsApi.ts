import { authFetchJson, ApiError } from './authFetch';

export interface PaymentInfo {
    payment_id: string;
    gateway: 'mercadopago' | 'paypal';
    amount: number;
    currency: string;
    preference_id?: string;
    public_key?: string;
    order_id?: string;
}

export interface PaymentStatus {
    payment_id: string;
    status: 'pending' | 'paid' | 'failed' | 'refunded';
    flow_type: string;
}

export class PaymentsApiError extends Error {
    status: number;
    constructor(status: number, message: string) {
        super(message);
        this.status = status;
    }
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