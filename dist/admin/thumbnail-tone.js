const SAMPLE_SIZE = 24;
const OPAQUE_ALPHA = 40;
/** Mean luminance above which the image counts as light (white logos, pale artwork). */
const LIGHT_THRESHOLD = 0.62;
const LIGHT_BACKDROP = '#ffffff';
const DARK_BACKDROP = '#27272a';
const toneCache = new Map();
function measureTone(image) {
    const canvas = document.createElement('canvas');
    canvas.width = SAMPLE_SIZE;
    canvas.height = SAMPLE_SIZE;
    const context = canvas.getContext('2d', { willReadFrequently: true });
    if (!context)
        return null;
    try {
        context.drawImage(image, 0, 0, SAMPLE_SIZE, SAMPLE_SIZE);
        const { data } = context.getImageData(0, 0, SAMPLE_SIZE, SAMPLE_SIZE);
        let luminanceSum = 0;
        let opaquePixels = 0;
        for (let offset = 0; offset < data.length; offset += 4) {
            if (data[offset + 3] < OPAQUE_ALPHA)
                continue;
            luminanceSum +=
                (0.2126 * data[offset] + 0.7152 * data[offset + 1] + 0.0722 * data[offset + 2]) / 255;
            opaquePixels++;
        }
        // Fully transparent or mostly empty images get the light backdrop.
        if (opaquePixels < data.length / 4 / 50)
            return 'light';
        return luminanceSum / opaquePixels > LIGHT_THRESHOLD ? 'light' : 'dark';
    }
    catch {
        // Cross-origin images taint the canvas; keep the default backdrop.
        return null;
    }
}
function applyBackdrop(image) {
    const key = image.currentSrc || image.src;
    let tone = toneCache.get(key) ?? null;
    if (!tone) {
        tone = measureTone(image);
        if (tone)
            toneCache.set(key, tone);
    }
    image.style.backgroundColor = tone === 'light' ? DARK_BACKDROP : LIGHT_BACKDROP;
}
/**
 * Picks a backdrop with contrast to the image itself: light images (e.g. white logos on
 * transparency) sit on a dark backdrop, everything else on white. Re-evaluated on every load.
 */
export const contrastBackdrop = (image) => {
    const onLoad = () => applyBackdrop(image);
    image.addEventListener('load', onLoad);
    if (image.complete && image.naturalWidth > 0)
        applyBackdrop(image);
    return {
        destroy() {
            image.removeEventListener('load', onLoad);
        }
    };
};
