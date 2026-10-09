import html2canvas from 'html2canvas';

const BORDER_PX = 0;
const CAPTURE_SCALE = 4;
const TRIM_RIGHT_PX = 1;
const EXPORT_CLASS = 'flyer-exporting';

export async function generateFlyerImage(elementId: string): Promise<string | null> {
    const element = document.getElementById(elementId);
    if (!element) return null;

    element.classList.add(EXPORT_CLASS);
    const bgColor = window.getComputedStyle(element).backgroundColor || '#e70808';

    const rawCanvas = await html2canvas(element, {
        scale: CAPTURE_SCALE,
        useCORS: true,
        backgroundColor: bgColor,
    }).finally(() => {
        element.classList.remove(EXPORT_CLASS);
    });

    const borderScaled = BORDER_PX * CAPTURE_SCALE;
    const trimScaled = TRIM_RIGHT_PX * CAPTURE_SCALE;
    const sourceWidth = rawCanvas.width - trimScaled;

    const finalCanvas = document.createElement('canvas');
    finalCanvas.width = sourceWidth + borderScaled * 2;
    finalCanvas.height = rawCanvas.height;

    const ctx = finalCanvas.getContext('2d');
    if (!ctx) return rawCanvas.toDataURL('image/jpeg', 1);

    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, finalCanvas.width, finalCanvas.height);
    ctx.drawImage(
        rawCanvas,
        0, 0, sourceWidth, rawCanvas.height,
        borderScaled, 0, sourceWidth, rawCanvas.height
    );

    return finalCanvas.toDataURL('image/jpeg', 1);
}

export function downloadFlyerImage(base64Image: string, filename: string) {
    const link = document.createElement('a');
    link.download = `${filename}.jpg`;
    link.href = base64Image;
    link.click();
}