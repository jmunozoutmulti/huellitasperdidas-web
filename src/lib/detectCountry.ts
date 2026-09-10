// Servicio de detección de país — PLACEHOLDER.
//
// Reemplazar el contenido de esta función cuando se elija el servicio real
// (ipapi.co, el header gratis de Vercel/Cloudflare, etc. — ver la
// conversación sobre las opciones evaluadas). El resto de la app ya está
// listo para recibir el resultado — este es el único archivo que cambia.
//
// Por ahora siempre devuelve 'PE', para que el flujo completo (detectar →
// guardar en localStorage → usarlo en Explorar/registro) ya esté armado y
// probado de punta a punta.
export async function detectCountry(): Promise<string> {
    return 'PE';
}