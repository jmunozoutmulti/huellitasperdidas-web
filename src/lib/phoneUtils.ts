import { isValidPhoneNumber as isValidPhoneNumberLib } from 'libphonenumber-js';

// México eliminó oficialmente el "1" de enrutamiento internacional en
// agosto 2019, pero muchos números quedaron guardados/copiados con ese "1"
export function normalizePhoneInput(numero: string, countryCode: string | null | undefined): string {
    const soloDigitos = numero.replace(/\D/g, '');
    if (countryCode === 'MX' && soloDigitos.length === 11 && soloDigitos.startsWith('1')) {
        return soloDigitos.slice(1);
    }
    return numero;
}

export function isValidPhone(numero: string, countryCode: string | null | undefined): boolean {
    if (!numero.trim() || !countryCode) return false;
    return isValidPhoneNumberLib(normalizePhoneInput(numero, countryCode), countryCode as any);
}