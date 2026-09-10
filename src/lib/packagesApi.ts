const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000';

export interface ReachOption {
    radiusKm: number;
    price: number;
    currency: string;
    estimatedReach: number | null;
}

export interface ExtensionOption {
    extraDays: number;
    price: number;
    currency: string;
}

export interface PackageOption {
    id: string;
    name: string;
    slug: string;
    description: string; // HTML — usar dangerouslySetInnerHTML, no texto plano
    days: number;
    price: number; // ya en la moneda correcta del país pedido
    currency: string;
    centinela: boolean; // si incluye acceso a la herramienta Centinela IA
    biometricSearch: boolean;
    featuredListing: boolean;
    adsMetaAudience: number;
    adsMetaRadiusKm: number;
    mapZoom: number;
    channels: string[]; // 'facebook' | 'instagram' | 'tiktok' | 'messenger'
    includesRefund: boolean;
    reachOptions: ReachOption[];
    extensionOptions: ExtensionOption[];
}

function mapPackage(raw: any): PackageOption {
    return {
        id: raw.id,
        name: raw.name,
        slug: raw.slug,
        description: raw.description ?? '',
        days: raw.days,
        price: raw.price,
        currency: raw.currency,
        centinela: !!raw.centinela,
        biometricSearch: !!raw.biometric_search,
        featuredListing: !!raw.featured_listing,
        adsMetaAudience: raw.ads_meta_audience ?? 0,
        adsMetaRadiusKm: raw.ads_meta_radius_km ?? 0,
        mapZoom: raw.map_zoom ?? 12,
        channels: raw.channels ?? [],
        includesRefund: !!raw.includes_refund,
        reachOptions: (raw.reach_options ?? []).map((r: any) => ({
            radiusKm: r.radius_km,
            price: r.price,
            currency: r.currency,
            estimatedReach: r.estimated_reach ?? null,
        })),
        extensionOptions: (raw.extension_options ?? []).map((e: any) => ({
            extraDays: e.extra_days,
            price: e.price,
            currency: e.currency,
        })),
    };
}

// Caché por país — mismo patrón que countries.ts/locations.ts.
const cache = new Map<string, PackageOption[]>();
const pendingFetches = new Map<string, Promise<PackageOption[]>>();

export async function getPackages(countryCode: string): Promise<PackageOption[]> {
    if (cache.has(countryCode)) return cache.get(countryCode)!;
    if (pendingFetches.has(countryCode)) return pendingFetches.get(countryCode)!;

    const promise = fetch(`${API_BASE}/v1/packages?country_code=${countryCode}`)
        .then((res) => {
            if (!res.ok) throw new Error(`API error: ${res.status}`);
            return res.json();
        })
        .then((data: any[]) => {
            const mapped = data.map(mapPackage);
            cache.set(countryCode, mapped);
            return mapped;
        })
        .finally(() => {
            pendingFetches.delete(countryCode);
        });

    pendingFetches.set(countryCode, promise);
    return promise;
}

export async function getPackageBySlug(countryCode: string, slug: string): Promise<PackageOption | null> {
    const packages = await getPackages(countryCode);
    return packages.find((p) => p.slug === slug) ?? null;
}