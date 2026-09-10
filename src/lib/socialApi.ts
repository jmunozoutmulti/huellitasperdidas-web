import { authFetch, authFetchJson } from './authFetch';
import type { FavoriteReportOut } from './api';

// ==========================================
// LIKES
// ==========================================

export async function getMyLikedIds(): Promise<string[]> {
    return authFetchJson<string[]>('/v1/users/me/likes', { method: 'GET' });
}

export async function likeReport(reportId: string): Promise<void> {
    await authFetch('/v1/users/me/likes', {
        method: 'POST',
        body: JSON.stringify({ report_id: reportId }),
    });
}

export async function unlikeReport(reportId: string): Promise<void> {
    await authFetch(`/v1/users/me/likes/${reportId}`, { method: 'DELETE' });
}

// ==========================================
// FAVORITOS
// ==========================================
export async function getMyFavorites(): Promise<FavoriteReportOut[]> {
    return authFetchJson<FavoriteReportOut[]>('/v1/users/me/favorites', { method: 'GET' });
}

export async function favoriteReport(reportId: string): Promise<void> {
    await authFetch('/v1/users/me/favorites', {
        method: 'POST',
        body: JSON.stringify({ report_id: reportId }),
    });
}

export async function unfavoriteReport(reportId: string): Promise<void> {
    await authFetch(`/v1/users/me/favorites/${reportId}`, { method: 'DELETE' });
}