/**
 * Compress movie covers / posters / banners in the browser before upload.
 * Same visual quality, much less bytes → faster upload + less S3 storage.
 */

export type ImageCompressPreset = 'poster' | 'thumbnail' | 'banner' | 'seo' | 'default';

export type CompressImageResult = {
  file: File;
  originalSize: number;
  compressedSize: number;
  ratio: number;
  skipped: boolean;
  reason?: string;
};

const PRESETS: Record<
  ImageCompressPreset,
  { maxWidth: number; maxHeight: number; quality: number }
> = {
  // Portrait movie poster / cover
  poster: { maxWidth: 1200, maxHeight: 1800, quality: 0.82 },
  thumbnail: { maxWidth: 800, maxHeight: 1200, quality: 0.82 },
  // Landscape banner / backdrop
  banner: { maxWidth: 1920, maxHeight: 1080, quality: 0.82 },
  seo: { maxWidth: 1200, maxHeight: 1200, quality: 0.8 },
  default: { maxWidth: 1920, maxHeight: 1920, quality: 0.82 },
};

const SKIP_TYPES = new Set(['image/svg+xml', 'image/gif']);

function supportsWebp(): boolean {
  try {
    const c = document.createElement('canvas');
    return c.toDataURL('image/webp').startsWith('data:image/webp');
  } catch {
    return false;
  }
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Could not decode image'));
    };
    img.src = url;
  });
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  type: string,
  quality: number
): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, type, quality));
}

export function inferImagePreset(fileName: string, source?: string): ImageCompressPreset {
  const n = `${fileName} ${source || ''}`.toLowerCase();
  if (/banner|backdrop|hero|landscape/.test(n)) return 'banner';
  if (/thumb|thumbnail/.test(n)) return 'thumbnail';
  if (/seo|og[-_]?image/.test(n)) return 'seo';
  if (/poster|cover|movie/.test(n)) return 'poster';
  return 'default';
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

/**
 * Compress an image File. Non-images and GIFs/SVGs are returned unchanged.
 * Prefer WebP; fall back to JPEG. Keep original if compression doesn't shrink.
 */
export async function compressImageFile(
  file: File,
  preset: ImageCompressPreset = 'default'
): Promise<CompressImageResult> {
  const originalSize = file.size;

  if (!file.type.startsWith('image/') && !/\.(jpe?g|png|webp|bmp)$/i.test(file.name)) {
    return { file, originalSize, compressedSize: originalSize, ratio: 1, skipped: true, reason: 'not-image' };
  }
  if (SKIP_TYPES.has(file.type) || /\.(svg|gif)$/i.test(file.name)) {
    return { file, originalSize, compressedSize: originalSize, ratio: 1, skipped: true, reason: 'animated-or-vector' };
  }
  // Tiny files: not worth re-encoding
  if (originalSize < 80 * 1024) {
    return { file, originalSize, compressedSize: originalSize, ratio: 1, skipped: true, reason: 'already-small' };
  }

  const { maxWidth, maxHeight, quality } = PRESETS[preset] || PRESETS.default;

  try {
    const img = await loadImage(file);
    let { width, height } = img;

    const scale = Math.min(1, maxWidth / width, maxHeight / height);
    const targetW = Math.max(1, Math.round(width * scale));
    const targetH = Math.max(1, Math.round(height * scale));

    const canvas = document.createElement('canvas');
    canvas.width = targetW;
    canvas.height = targetH;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return { file, originalSize, compressedSize: originalSize, ratio: 1, skipped: true, reason: 'no-canvas' };
    }
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, 0, 0, targetW, targetH);

    const useWebp = supportsWebp();
    const outType = useWebp ? 'image/webp' : 'image/jpeg';
    const ext = useWebp ? '.webp' : '.jpg';

    let blob = await canvasToBlob(canvas, outType, quality);
    if (!blob) {
      return { file, originalSize, compressedSize: originalSize, ratio: 1, skipped: true, reason: 'encode-failed' };
    }

    // If still larger than original, try slightly lower quality once
    if (blob.size >= originalSize && quality > 0.7) {
      const retry = await canvasToBlob(canvas, outType, Math.max(0.7, quality - 0.08));
      if (retry && retry.size < blob.size) blob = retry;
    }

    if (blob.size >= originalSize * 0.98) {
      return { file, originalSize, compressedSize: originalSize, ratio: 1, skipped: true, reason: 'no-savings' };
    }

    const base = file.name.replace(/\.[^.]+$/, '') || 'image';
    const compressed = new File([blob], `${base}${ext}`, {
      type: outType,
      lastModified: Date.now(),
    });

    return {
      file: compressed,
      originalSize,
      compressedSize: compressed.size,
      ratio: compressed.size / originalSize,
      skipped: false,
    };
  } catch {
    return { file, originalSize, compressedSize: originalSize, ratio: 1, skipped: true, reason: 'error' };
  }
}

export async function compressImagesForUpload(
  files: File[],
  source?: string
): Promise<{ files: File[]; results: CompressImageResult[] }> {
  const results: CompressImageResult[] = [];
  const out: File[] = [];
  for (const f of files) {
    const preset = inferImagePreset(f.name, source);
    const result = await compressImageFile(f, preset);
    results.push(result);
    out.push(result.file);
  }
  return { files: out, results };
}
