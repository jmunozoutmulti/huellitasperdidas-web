export interface TextValidationResult {
    valid: boolean;
    error?: string;
}

function isRepetitiveChar(text: string): boolean {
    const clean = text.replace(/\s/g, '');
    if (clean.length === 0) return false;
    const counts: Record<string, number> = {};
    for (const ch of clean) {
        counts[ch] = (counts[ch] || 0) + 1;
    }
    const maxCount = Math.max(...Object.values(counts));
    return maxCount / clean.length > 0.7;
}

function isRepetitiveWord(text: string): boolean {
    const words = text.trim().toLowerCase().split(/\s+/).filter(Boolean);
    if (words.length < 4) return false;
    const counts: Record<string, number> = {};
    for (const w of words) {
        counts[w] = (counts[w] || 0) + 1;
    }
    const maxCount = Math.max(...Object.values(counts));
    return maxCount / words.length > 0.6;
}

export function validateText(text: string, minLength: number, fieldLabel: string): TextValidationResult {
    const trimmed = text.trim();

    if (trimmed.length < minLength) {
        return { valid: false, error: `${fieldLabel} debe tener al menos ${minLength} caracteres.` };
    }
    if (isRepetitiveChar(trimmed)) {
        return { valid: false, error: `${fieldLabel} no puede repetir el mismo carácter tantas veces.` };
    }
    if (isRepetitiveWord(trimmed)) {
        return { valid: false, error: `${fieldLabel} no puede repetir la misma palabra tantas veces.` };
    }
    return { valid: true };
}