import { authFetch, authFetchJson, ApiError } from './authFetch';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000';

export class CommentsApiError extends Error {
    status: number;
    constructor(status: number, message: string) {
        super(message);
        this.status = status;
    }
}

export interface ApiComment {
    id: string;
    author_id: string;
    author_name: string;
    author_avatar: string | null;
    text: string;
    created_at: string;
    updated_at: string;
    replies: ApiComment[];
}

// Público — no requiere sesión.
export async function getComments(reportId: string): Promise<ApiComment[]> {
    const res = await fetch(`${API_BASE}/v1/reports/${reportId}/comments`, { cache: 'no-store' });
    if (!res.ok) throw new CommentsApiError(res.status, 'No pudimos cargar los comentarios.');
    return res.json();
}

export async function createComment(reportId: string, text: string, parentId?: string): Promise<ApiComment> {
    try {
        return await authFetchJson<ApiComment>(`/v1/reports/${reportId}/comments`, {
            method: 'POST',
            body: JSON.stringify(parentId ? { text, parent_id: parentId } : { text }),
        });
    } catch (err) {
        if (err instanceof ApiError) throw new CommentsApiError(err.status, err.message);
        throw err;
    }
}

export async function updateComment(commentId: string, text: string): Promise<ApiComment> {
    try {
        return await authFetchJson<ApiComment>(`/v1/comments/${commentId}`, {
            method: 'PUT',
            body: JSON.stringify({ text }),
        });
    } catch (err) {
        if (err instanceof ApiError) throw new CommentsApiError(err.status, err.message);
        throw err;
    }
}

export async function deleteComment(commentId: string): Promise<void> {
    const res = await authFetch(`/v1/comments/${commentId}`, { method: 'DELETE' });
    if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new CommentsApiError(res.status, data.detail || 'No pudimos eliminar el comentario.');
    }
}