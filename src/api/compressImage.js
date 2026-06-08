/**
 * Client-side compression presets — kept in sync with the backend's
 * COMPRESSION_PRESETS in ai-segmentation-backend/src/compression.js.
 * Images must be shrunk before upload on Vercel (4.5 MiB request body cap).
 */
const PRESETS = Object.freeze({
  singleImage: { maxDimension: 768, quality: 0.18, mimeType: 'image/jpeg' },
  multiObject: { maxDimension: 512, quality: 0.7, mimeType: 'image/webp' },
  foodWaste: { maxDimension: 768, quality: 0.18, mimeType: 'image/jpeg' },
  recyclables: { maxDimension: 1024, quality: 0.4, mimeType: 'image/jpeg' }
});

const loadImage = (file) => new Promise((resolve, reject) => {
  const url = URL.createObjectURL(file);
  const img = new Image();
  img.onload = () => {
    URL.revokeObjectURL(url);
    resolve(img);
  };
  img.onerror = () => {
    URL.revokeObjectURL(url);
    reject(new Error('Failed to load image.'));
  };
  img.src = url;
});

const canvasToBlob = (canvas, mimeType, quality) => new Promise((resolve, reject) => {
  canvas.toBlob(
    (blob) => {
      if (blob) {
        resolve(blob);
        return;
      }
      if (mimeType === 'image/webp') {
        canvas.toBlob(
          (jpegBlob) => (jpegBlob ? resolve(jpegBlob) : reject(new Error('Failed to compress image.'))),
          'image/jpeg',
          quality
        );
        return;
      }
      reject(new Error('Failed to compress image.'));
    },
    mimeType,
    quality
  );
});

const blobToDataUrl = (blob) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(reader.result);
  reader.onerror = reject;
  reader.readAsDataURL(blob);
});

export const compressImageFile = async (file, presetName) => {
  const preset = PRESETS[presetName];
  if (!file || !preset) {
    throw new Error('compressImageFile: invalid input');
  }

  const img = await loadImage(file);
  const scale = Math.min(1, preset.maxDimension / Math.max(img.width, img.height));
  const width = Math.max(1, Math.round(img.width * scale));
  const height = Math.max(1, Math.round(img.height * scale));

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  canvas.getContext('2d').drawImage(img, 0, 0, width, height);

  const blob = await canvasToBlob(canvas, preset.mimeType, preset.quality);
  return blobToDataUrl(blob);
};
