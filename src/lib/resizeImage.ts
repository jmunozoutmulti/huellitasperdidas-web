// 1. Función base general para procesar imágenes en Canvas
export function resizeImageFile(
    file: File,
    maxDimension: number = 1500,
    quality: number = 0.8,
    maxWeightBytes: number = 500 * 1024 // 500 KB
): Promise<string> {
    return new Promise((resolve, reject) => {
        // Si el archivo ya pesa menos del umbral máximo, lo leemos intacto
        if (file.size <= maxWeightBytes) {
            const reader = new FileReader();
            reader.onerror = () => reject(new Error('No se pudo leer el archivo'));
            reader.onload = (event) => resolve(event.target?.result as string);
            reader.readAsDataURL(file);
            return;
        }

        // Si supera el umbral, lo redimensionamos en Canvas
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
                resolve(canvas.toDataURL('image/jpeg', quality));
            };
            img.src = event.target?.result as string;
        };
        reader.readAsDataURL(file);
    });
}

// 2. FOTOS DE MASCOTAS (Perdidos / Adopción / Encontrados)
// Máximo 1500px, 80% calidad y evalúa si supera los 500 KB
export function resizePetImage(file: File): Promise<string> {
    return resizeImageFile(file, 1500, 0.8, 500 * 1024);
}

// 3. AVATARES DE PERFIL
// Máximo 400px, 80% calidad y evalúa si supera los 80 KB
export function resizeAvatarImage(file: File): Promise<string> {
    return resizeImageFile(file, 400, 0.8, 80 * 1024);
}