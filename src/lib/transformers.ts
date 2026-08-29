import { PetData } from './pets';
import { Report } from './api';

function hashSeed(id: string): number {
    let hash = 0;
    for (let i = 0; i < id.length; i++) {
        hash = (hash << 5) - hash + id.charCodeAt(i);
        hash |= 0;
    }
    return Math.abs(hash);
}

const RAZAS = ['Mestizo', 'Labrador', 'Poodle', 'Pastor Alemán', 'Criollo', 'Golden Retriever'];
const EDADES = ['Menos de 1 año', '1 a 3 años', '4 a 7 años', '8 años o más'];

function fillBreed(id: string): string {
    return RAZAS[hashSeed(id) % RAZAS.length];
}

function fillAge(id: string): string {
    return EDADES[hashSeed(id + 'age') % EDADES.length];
}

function fillGender(id: string): string {
    const sexo = hashSeed(id + 'sex') % 2 === 0 ? 'Macho' : 'Hembra';
    const castrado = hashSeed(id + 'neutered') % 2 === 0;
    return `${sexo}${castrado ? ' (Castrado)' : ''}`;
}


function fillReward(reportType: string, id: string): string {
    if (reportType !== 'lost') return '';
    const amounts = ['', '', 'S/. 200', 'S/. 500', 'S/. 1,000'];
    return amounts[hashSeed(id + 'reward') % amounts.length];
}

function fillIsPremium(reportType: string, id: string): boolean {
    if (reportType !== 'lost') return false;
    return hashSeed(id + 'premium') % 4 === 0;
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
            return { badge: 'En adopción', badgeStyle: 'badge-adopt' };
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

    const isPremium = fillIsPremium(report.report_type, id);
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
        title: report.title ?? 'Sin título',
        badge,
        badgeStyle,
        district: report.district ?? '',
        features: '',
        date: formatDate(report.event_date ?? report.published_at),

        age: fillAge(id),
        race: fillBreed(id),
        gender: fillGender(id),
        reward: fillReward(report.report_type, id),

        views: '0',
        shares: '0',

        desc: report.description ?? '',

        imgSrc: report.images[0]?.image_url ?? 'https://placehold.co/600x400?text=Sin+foto',
        images: report.images.map((img) => img.image_url),

        isPremium,
        isExternal,
        externalType,
        externalUrl: report.source_url ?? undefined,
    };
}

