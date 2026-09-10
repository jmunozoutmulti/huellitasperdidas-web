import { PetData } from './pets';
import { Report, FavoriteReportOut } from './api';
import { getCountryByAbbrSync } from './countries';

function hashSeed(id: string): number {
    let hash = 0;
    for (let i = 0; i < id.length; i++) {
        hash = (hash << 5) - hash + id.charCodeAt(i);
        hash |= 0;
    }
    return Math.abs(hash);
}

function genderLabel(sex: string | null, isNeutered: boolean | null): string {
    if (!sex) return '';
    const sexoLabel = sex === 'male' ? 'Macho' : sex === 'female' ? 'Hembra' : sex;
    return `${sexoLabel}${isNeutered ? ' (Esterilizado)' : ''}`;
}

function sizeLabel(size: string | null): string {
    if (size === 'small') return 'Pequeño';
    if (size === 'medium') return 'Mediano';
    if (size === 'large') return 'Grande';
    return '';
}

function isPremiumReport(report: Report): boolean {
    return (report.report_type === 'lost' || report.report_type === 'adoption') && report.package_slug === 'urgente';
}

function parseCoord(val: number | string | null): number | null {
    if (val === null) return null;
    const n = typeof val === 'string' ? parseFloat(val) : val;
    return Number.isFinite(n) ? n : null;
}

interface BadgeInfo {
    badge: string;
    badgeStyle: string;
}

function getBadgeInfo(reportType: string, isPremium: boolean): BadgeInfo {
    switch (reportType) {
        case 'lost':
            return isPremium
                ? { badge: 'Urgente', badgeStyle: 'badge-max-priority' }
                : { badge: 'Perdido', badgeStyle: 'badge-urgent' };
        case 'found':
            return { badge: 'Encontrado', badgeStyle: 'badge-found' };
        case 'adoption':
            return isPremium
                ? { badge: 'Urgente', badgeStyle: 'badge-adopt-premium' }
                : { badge: 'En adopción', badgeStyle: 'badge-adopt' };
        case 'sighting':
            return { badge: 'Avistamiento', badgeStyle: 'badge-sight' };
        case 'unknown':
        default:
            return { badge: 'Avistamiento', badgeStyle: 'badge-sight' };
    }
}

function formatDate(isoDate: string | null): string {
    if (!isoDate) return '';
    const date = new Date(isoDate);
    return date.toLocaleDateString('es-PE', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
}

function formatReward(report: Report): string {
    if (!report.meta.reward || Number(report.meta.reward) <= 0) return '';
    const symbol = getCountryByAbbrSync(report.country || 'PE')?.currencySymbol;
    // Si no sabemos el símbolo (país sin configurar, o caché aún no lista),
    // mostramos el monto sin inventar un símbolo — más honesto que adivinar.
    return symbol ? `${symbol} ${report.meta.reward}` : report.meta.reward;
}

function detectExternalType(sourceUrl: string | null): 'facebook' | 'instagram' | 'tiktok' | 'google' {
    if (!sourceUrl) return 'google';
    const url = sourceUrl.toLowerCase();
    if (url.includes('facebook.com') || url.includes('fb.com')) return 'facebook';
    if (url.includes('instagram.com')) return 'instagram';
    if (url.includes('tiktok.com')) return 'tiktok';
    return 'google';
}

export function reportToPetData(report: Report): PetData {
    const id = report.id;

    const isExternal = report.source_type === 'website';

    const isPremium = isPremiumReport(report);
    const externalType = isExternal ? detectExternalType(report.source_url) : undefined;

    let badge: string;
    let badgeStyle: string;

    if (isExternal && externalType) {
        const platformLabels: Record<string, string> = {
            facebook: 'Facebook',
            instagram: 'Instagram',
            tiktok: 'Tiktok',
            google: 'Google',
        };
        badge = platformLabels[externalType];
        badgeStyle = `badge-ext-${externalType}`;
    } else {
        const info = getBadgeInfo(report.report_type, isPremium);
        badge = info.badge;
        badgeStyle = info.badgeStyle;
    }

    return {
        id,
        title: report.title ?? '',
        badge,
        badgeStyle,
        district: report.district ?? '',
        province: report.province ?? '',
        region: report.region ?? '',
        features: report.meta.color ?? '',
        date: formatDate(
            report.event_date ??
            (report.report_type === 'adoption'
                ? (report.source_type === 'user' ? (report.published_at ?? report.created_at) : report.created_at)
                : report.report_type === 'sighting'
                    ? report.created_at
                    : (report.published_at ?? report.created_at))
        ),
        sourceType: report.source_type,
        createdAtDisplay: formatDate(report.created_at),
        publishedAtDisplay: report.published_at ? formatDate(report.published_at) : '',
        lat: parseCoord(report.lat),
        lng: parseCoord(report.lng),
        contactPhone: report.contact_phone ?? '',
        likesCount: report.likes_count ?? 0,
        hasLiked: report.has_liked ?? false,
        isFavorited: report.is_favorited ?? false,

        age: report.meta.age ?? '',
        race: report.meta.breed ?? '',
        size: sizeLabel(report.meta.size),
        petType: report.pet_type ?? '',
        gender: genderLabel(report.meta.sex, report.meta.is_neutered),
        reward: formatReward(report),
        rewardVisible: report.meta.reward_visible,
        lastSeenLocation: report.address_hint ?? '',
        adoptionExtras: report.meta.adoption_extras ?? '',
        adoptionExtrasVisible: report.meta.adoption_extras_visible,

        views: String(report.views_count ?? 0),
        shares: String(report.shares_count ?? 0),

        desc: report.description ?? '',

        imgSrc: report.images.find((img) => !img.is_flyer)?.image_url ?? 'https://placehold.co/600x400?text=Sin+foto',
        images: report.images.filter((img) => !img.is_flyer).map((img) => img.image_url),
        flyerUrl: report.images.find((img) => img.is_flyer)?.image_url ?? null,
        authorName: report.author_name,
        authorAvatar: report.author_avatar,
        rejectionReason: report.rejection_reason,
        status: report.status,

        isPremium,
        isExternal,
        externalType,
        externalUrl: report.source_url ?? undefined,
    };
}

export interface FavoriteCardData {
    id: string;
    title: string;
    badge: string;
    badgeStyle: string;
    district: string;
    date: string;
    imgSrc: string;
}

export function favoriteToCardData(fav: FavoriteReportOut): FavoriteCardData {
    const info = getBadgeInfo(fav.report_type, false);
    return {
        id: fav.id,
        title: fav.title ?? '',
        badge: info.badge,
        badgeStyle: info.badgeStyle,
        district: fav.district ?? '',
        date: formatDate(fav.published_at),
        imgSrc: fav.cover_image_url ?? 'https://placehold.co/600x400?text=Sin+foto',
    };
}