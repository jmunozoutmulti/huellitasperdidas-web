import { authFetch, authFetchJson, ApiError } from './authFetch';

export class MessagesApiError extends Error {
    status: number;
    constructor(status: number, message: string) {
        super(message);
        this.status = status;
    }
}

export interface ConversationSummary {
    id: string;
    report_id: string;
    report_title: string | null;
    report_cover_image_url: string | null;
    other_user_id: string;
    other_user_name: string;
    other_user_avatar: string | null;
    last_message: string;
    last_message_at: string;
    is_blocked: boolean;
}

export interface ConversationMessage {
    id: string;
    sender_id: string;
    body: string;
    created_at: string;
}

// Inicia (o reutiliza) una conversación sobre un aviso específico.
export async function startConversation(reportId: string, message: string): Promise<ConversationSummary> {
    try {
        return await authFetchJson<ConversationSummary>(`/v1/reports/${reportId}/messages`, {
            method: 'POST',
            body: JSON.stringify({ message }),
        });
    } catch (err) {
        if (err instanceof ApiError) throw new MessagesApiError(err.status, err.message);
        throw err;
    }
}

export async function getMyConversations(): Promise<ConversationSummary[]> {
    try {
        return await authFetchJson<ConversationSummary[]>('/v1/users/me/conversations', { method: 'GET' });
    } catch (err) {
        if (err instanceof ApiError) throw new MessagesApiError(err.status, err.message);
        throw err;
    }
}

export async function getConversationMessages(conversationId: string): Promise<ConversationMessage[]> {
    try {
        return await authFetchJson<ConversationMessage[]>(`/v1/conversations/${conversationId}/messages`, {
            method: 'GET',
        });
    } catch (err) {
        if (err instanceof ApiError) throw new MessagesApiError(err.status, err.message);
        throw err;
    }
}

export async function replyToConversation(conversationId: string, message: string): Promise<ConversationMessage> {
    try {
        return await authFetchJson<ConversationMessage>(`/v1/conversations/${conversationId}/messages`, {
            method: 'POST',
            body: JSON.stringify({ message }),
        });
    } catch (err) {
        if (err instanceof ApiError) throw new MessagesApiError(err.status, err.message);
        throw err;
    }
}

// Solo oculta de MI bandeja — el otro participante la sigue viendo.
export async function deleteConversation(conversationId: string): Promise<void> {
    const res = await authFetch(`/v1/conversations/${conversationId}`, { method: 'DELETE' });
    if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new MessagesApiError(res.status, data.detail || 'No pudimos eliminar la conversación.');
    }
}

export async function blockUser(userId: string): Promise<void> {
    const res = await authFetch(`/v1/users/${userId}/block`, { method: 'POST' });
    if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new MessagesApiError(res.status, data.detail || 'No pudimos bloquear al usuario.');
    }
}

export async function unblockUser(userId: string): Promise<void> {
    const res = await authFetch(`/v1/users/${userId}/block`, { method: 'DELETE' });
    if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new MessagesApiError(res.status, data.detail || 'No pudimos desbloquear al usuario.');
    }
}

export interface FiledReport {
    id: string;
    target_user_id: string;
    reason: string;
    status: 'pending' | 'reviewed';
    admin_reply: string | null;
    reviewed_at: string | null;
    created_at: string;
}

export async function reportUser(userId: string, reason: string, conversationId?: string): Promise<void> {
    const res = await authFetch(`/v1/users/${userId}/report`, {
        method: 'POST',
        body: JSON.stringify(conversationId ? { reason, conversation_id: conversationId } : { reason }),
    });
    if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new MessagesApiError(res.status, data.detail || 'No pudimos enviar el reporte.');
    }
}

export async function getMyFiledReports(): Promise<FiledReport[]> {
    try {
        return await authFetchJson<FiledReport[]>('/v1/users/me/reports-filed', { method: 'GET' });
    } catch (err) {
        if (err instanceof ApiError) throw new MessagesApiError(err.status, err.message);
        throw err;
    }
}

export async function getUnreadMessagesCount(): Promise<number> {
    try {
        const res = await authFetchJson<{ count: number }>('/v1/users/me/unread-messages-count', { method: 'GET' });
        return res.count;
    } catch (err) {
        if (err instanceof ApiError) throw new MessagesApiError(err.status, err.message);
        throw err;
    }
}

export async function flagReport(reportId: string, reason: string): Promise<void> {
    const res = await authFetch(`/v1/reports/${reportId}/flag`, {
        method: 'POST',
        body: JSON.stringify({ reason }),
    });
    if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new MessagesApiError(res.status, data.detail || 'No pudimos enviar el reporte.');
    }
}

export async function markMessagesSeen(): Promise<void> {
    await authFetch('/v1/users/me/messages-seen', { method: 'POST' });
}