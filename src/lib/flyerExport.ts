import html2canvas from 'html2canvas';

const BORDER_PX = 30;
const CAPTURE_SCALE = 4;

export async function generateFlyerImage(elementId: string): Promise<string | null> {
    const element = document.getElementById(elementId);
    if (!element) return null;

    const originalRadius = element.style.borderRadius;
    element.style.borderRadius = '0';
    const bgColor = window.getComputedStyle(element).backgroundColor || '#e70808';

    const rawCanvas = await html2canvas(element, {
        scale: CAPTURE_SCALE,
        useCORS: true,
        backgroundColor: bgColor,
    });

    element.style.borderRadius = originalRadius;

    const borderScaled = BORDER_PX * CAPTURE_SCALE;
    const finalCanvas = document.createElement('canvas');
    finalCanvas.width = rawCanvas.width + borderScaled * 2;
    finalCanvas.height = rawCanvas.height;

    const ctx = finalCanvas.getContext('2d');
    if (!ctx) return rawCanvas.toDataURL('image/jpeg', 1);

    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, finalCanvas.width, finalCanvas.height);
    ctx.drawImage(rawCanvas, borderScaled, 0);

    return finalCanvas.toDataURL('image/jpeg', 1);
}

export function downloadFlyerImage(base64Image: string, filename: string) {
    const link = document.createElement('a');
    link.download = `${filename}.jpg`;
    link.href = base64Image;
    link.click();
}