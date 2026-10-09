const UUID_AT_END = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_SLUG_LENGTH = 60;

function slugify(text: string): string {
    return text
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, MAX_SLUG_LENGTH)
        .replace(/-+$/g, '');
}

export function buildReportPath(id: string, title?: string | null): string {
    const slug = title ? slugify(title) : '';
    return slug ? `/aviso/${slug}-${id}/` : `/aviso/${id}/`;
}

export function extractReportId(slug: string): string | null {
    const match = slug.replace(/\/+$/, '').match(UUID_AT_END);
    return match ? match[0].toLowerCase() : null;
}