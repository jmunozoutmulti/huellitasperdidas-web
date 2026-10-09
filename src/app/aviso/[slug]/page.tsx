import type { Metadata } from 'next';
import type { ReportDetail } from '@/lib/api';
import { extractReportId } from '@/lib/slug';
import HomePage from '../../page';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000';

interface AvisoPageProps {
    params: Promise<{ slug: string }>;
}

async function fetchReportForMetadata(id: string): Promise<ReportDetail | null> {
    try {
        const res = await fetch(`${API_BASE}/v1/reports/${id}`, { next: { revalidate: 300 } });
        if (!res.ok) return null;
        return res.json();
    } catch {
        return null;
    }
}

export async function generateMetadata({ params }: AvisoPageProps): Promise<Metadata> {
    const { slug } = await params;
    const id = extractReportId(slug);
    const report = id ? await fetchReportForMetadata(id) : null;
    if (!report || report.status !== 'active') return {};

    const title = report.title || 'Aviso de mascota';
    const description = report.description?.slice(0, 160) || 'Ayuda a compartir este aviso en Huellas Perdidas.';
    const image = report.images.find((img) => !img.is_flyer)?.image_url;

    return {
        title: `${title} | Huellas Perdidas`,
        description,
        openGraph: {
            title,
            description,
            type: 'article',
            images: image ? [image] : undefined,
        },
        twitter: {
            card: image ? 'summary_large_image' : 'summary',
            title,
            description,
            images: image ? [image] : undefined,
        },
    };
}

export default function AvisoPage() {
    return <HomePage />;
}