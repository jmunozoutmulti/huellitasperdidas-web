// Redimensiona y comprime una imagen usando un <canvas> del navegador,
// antes de convertirla a base64 — para avatares no hace falta la resolución
// original de una foto de celular (2-5MB+), con esto queda típicamente en
// 10-50KB sin que se note la diferencia visual en un círculo de perfil chico.
export function resizeImageFile(
    file: File,
    maxDimension: number = 400,
    quality: number = 0.8
): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onerror = () => reject(new Error('No se pudo leer el archivo'));
        reader.onload = (event) => {
            const img = new Image();
            img.onerror = () => reject(new Error('No se pudo cargar la imagen'));
            img.onload = () => {
                let { width, height } = img;

                if (width > height && width > maxDimension) {
                    height = Math.round((height * maxDimension) / width);
                    width = maxDimension;
                } else if (height > maxDimension) {
                    width = Math.round((width * maxDimension) / height);
                    height = maxDimension;
                }

                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                if (!ctx) {
                    reject(new Error('No se pudo procesar la imagen'));
                    return;
                }
                ctx.drawImage(img, 0, 0, width, height);
                // JPEG siempre, sin importar el formato original — un avatar
                // no necesita transparencia (PNG), y JPEG comprime mucho mejor
                resolve(canvas.toDataURL('image/jpeg', quality));
            };
            img.src = event.target?.result as string;
        };
        reader.readAsDataURL(file);
    });
}