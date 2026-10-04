const MAX_DIMENSION = 1600;
const QUALITY = 0.85;

// Product photos shot on a white/light backdrop often leave a lot of empty
// margin around the actual product (the phone frames the whole backdrop,
// not just the item), so the subject ends up small and off-center inside
// its own card. This scans a small working copy of the photo for the
// bounding box of "not background" content (comparing against the corner
// colors, which are assumed to be backdrop) and crops to that box — with a
// little padding — before the existing resize/encode step, so the subject
// actually fills the frame it's given.
const SCAN_SIZE = 300;
const BG_DISTANCE_THRESHOLD = 28; // 0-441 (max possible RGB Euclidean distance)
const MIN_CONTENT_FRACTION = 0.015; // a row/column needs at least this much of its length differing from bg to count as "content" — filters out single stray/noisy pixels
const CROP_PADDING_RATIO = 0.06;
const MIN_TRIM_RATIO = 0.03; // skip trimming if there's less than 3% margin to remove on a side

type RGB = { r: number; g: number; b: number };

function colorDistance(r1: number, g1: number, b1: number, r2: number, g2: number, b2: number) {
  return Math.sqrt((r1 - r2) ** 2 + (g1 - g2) ** 2 + (b1 - b2) ** 2);
}

/** Averages the 4 corner pixels — assumed to be backdrop, never product
 * (a product photo frames the item with margin on every side). Shared by
 * the crop-box detection below and the background-whitening pass. */
function sampleBackgroundColor(data: Uint8ClampedArray, width: number, height: number): RGB {
  const corner = (x: number, y: number) => {
    const i = (y * width + x) * 4;
    return [data[i]!, data[i + 1]!, data[i + 2]!] as const;
  };
  const corners = [
    corner(0, 0),
    corner(width - 1, 0),
    corner(0, height - 1),
    corner(width - 1, height - 1),
  ];
  return {
    r: corners.reduce((s, c) => s + c[0], 0) / corners.length,
    g: corners.reduce((s, c) => s + c[1], 0) / corners.length,
    b: corners.reduce((s, c) => s + c[2], 0) / corners.length,
  };
}

/** Bounding box of non-background content in the given ImageData, or null if
 * nothing confidently different from the backdrop was found. */
function findContentBox(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  bg: RGB,
): { x0: number; y0: number; x1: number; y1: number } | null {
  const isContent = (x: number, y: number) => {
    const i = (y * width + x) * 4;
    return (
      colorDistance(data[i]!, data[i + 1]!, data[i + 2]!, bg.r, bg.g, bg.b) > BG_DISTANCE_THRESHOLD
    );
  };

  const minRowContent = Math.ceil(width * MIN_CONTENT_FRACTION);
  const minColContent = Math.ceil(height * MIN_CONTENT_FRACTION);

  let y0 = -1;
  for (let y = 0; y < height && y0 === -1; y++) {
    let count = 0;
    for (let x = 0; x < width; x++) if (isContent(x, y)) count++;
    if (count >= minRowContent) y0 = y;
  }
  if (y0 === -1) return null;

  let y1 = -1;
  for (let y = height - 1; y >= 0 && y1 === -1; y--) {
    let count = 0;
    for (let x = 0; x < width; x++) if (isContent(x, y)) count++;
    if (count >= minRowContent) y1 = y;
  }

  let x0 = -1;
  for (let x = 0; x < width && x0 === -1; x++) {
    let count = 0;
    for (let y = 0; y < height; y++) if (isContent(x, y)) count++;
    if (count >= minColContent) x0 = x;
  }
  if (x0 === -1) return null;

  let x1 = -1;
  for (let x = width - 1; x >= 0 && x1 === -1; x--) {
    let count = 0;
    for (let y = 0; y < height; y++) if (isContent(x, y)) count++;
    if (count >= minColContent) x1 = x;
  }

  if (x1 <= x0 || y1 <= y0) return null;
  return { x0, y0, x1, y1 };
}

/** Maps the working-scan bounding box back to full-resolution pixel
 * coordinates, adds padding, and skips trimming a side that has too little
 * margin to bother with. */
function resolveCropRect(
  box: { x0: number; y0: number; x1: number; y1: number },
  scanW: number,
  scanH: number,
  fullW: number,
  fullH: number,
) {
  const scaleX = fullW / scanW;
  const scaleY = fullH / scanH;
  const boxW = box.x1 - box.x0 + 1;
  const boxH = box.y1 - box.y0 + 1;
  const padX = boxW * CROP_PADDING_RATIO;
  const padY = boxH * CROP_PADDING_RATIO;

  let left = Math.max(0, box.x0 - padX) * scaleX;
  let top = Math.max(0, box.y0 - padY) * scaleY;
  let right = Math.min(scanW, box.x1 + 1 + padX) * scaleX;
  let bottom = Math.min(scanH, box.y1 + 1 + padY) * scaleY;

  // Not enough margin on a given side to be worth cropping — snap it back to
  // the full edge rather than trimming a sliver.
  if (left < fullW * MIN_TRIM_RATIO) left = 0;
  if (top < fullH * MIN_TRIM_RATIO) top = 0;
  if (fullW - right < fullW * MIN_TRIM_RATIO) right = fullW;
  if (fullH - bottom < fullH * MIN_TRIM_RATIO) bottom = fullH;

  return { x: left, y: top, width: right - left, height: bottom - top };
}

/**
 * Finds the product's bounding box against its own backdrop. Returns the
 * crop rect to apply (in the source image's own pixel coordinates — null if
 * nothing worth trimming was found: already tightly framed, or detection
 * wasn't confident) alongside the sampled backdrop color, reused by the
 * background-whitening pass below. Returns null only if the canvas itself
 * couldn't be read (tainted, cross-origin without CORS) — not fatal, the
 * caller just skips both crop and whitening for that photo.
 */
function detectCropRect(
  img: HTMLImageElement,
): { rect: { x: number; y: number; width: number; height: number } | null; bg: RGB } | null {
  const { naturalWidth: fullW, naturalHeight: fullH } = img;
  if (!fullW || !fullH) return null;

  const scale = Math.min(1, SCAN_SIZE / Math.max(fullW, fullH));
  const scanW = Math.max(1, Math.round(fullW * scale));
  const scanH = Math.max(1, Math.round(fullH * scale));

  const scanCanvas = document.createElement("canvas");
  scanCanvas.width = scanW;
  scanCanvas.height = scanH;
  const scanCtx = scanCanvas.getContext("2d", { willReadFrequently: true });
  if (!scanCtx) return null;
  scanCtx.drawImage(img, 0, 0, scanW, scanH);

  let imageData: ImageData;
  try {
    imageData = scanCtx.getImageData(0, 0, scanW, scanH);
  } catch {
    return null; // tainted canvas (cross-origin without CORS) — skip trimming, not fatal
  }

  const bg = sampleBackgroundColor(imageData.data, scanW, scanH);
  const box = findContentBox(imageData.data, scanW, scanH, bg);
  if (!box) return { rect: null, bg };

  const rect = resolveCropRect(box, scanW, scanH, fullW, fullH);
  if (rect.width >= fullW && rect.height >= fullH) return { rect: null, bg }; // nothing to trim
  return { rect, bg };
}

const WHITEN_LUMINANCE_MIN = 200; // only whiten photos shot on a light/white backdrop — leaves a deliberately colored/dark backdrop untouched
const WHITEN_DISTANCE_THRESHOLD = 70; // 0-441 — pixels at this distance from the backdrop color or further keep their original color unchanged

/**
 * Pushes every pixel toward pure white, proportionally to how close it
 * already is to the sampled backdrop color — a pixel identical to the
 * backdrop becomes white, a pixel confidently part of the product (far from
 * that color, same test family as findContentBox above) is left alone, and
 * the soft shadow/halo in between is blended smoothly. No hard edge, so it
 * can't leave a visible seam, and a photo that's already clean (uniform
 * white, no shadow) is a no-op — every pixel is already at distance ~0.
 */
function whitenBackground(ctx: CanvasRenderingContext2D, width: number, height: number, bg: RGB) {
  if ((bg.r + bg.g + bg.b) / 3 < WHITEN_LUMINANCE_MIN) return; // not a white/light backdrop — leave it alone
  let imageData: ImageData;
  try {
    imageData = ctx.getImageData(0, 0, width, height);
  } catch {
    return; // shouldn't happen for a same-origin canvas we just drew to, but never worth failing the whole upload over
  }
  const data = imageData.data;
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i]!;
    const g = data[i + 1]!;
    const b = data[i + 2]!;
    const distance = colorDistance(r, g, b, bg.r, bg.g, bg.b);
    if (distance >= WHITEN_DISTANCE_THRESHOLD) continue;
    const t = 1 - distance / WHITEN_DISTANCE_THRESHOLD;
    data[i] = r + (255 - r) * t;
    data[i + 1] = g + (255 - g) * t;
    data[i + 2] = b + (255 - b) * t;
  }
  ctx.putImageData(imageData, 0, 0);
}

/**
 * Crops out excess backdrop margin around the product (see detectCropRect),
 * then resizes to at most 1600px on the longest side and re-encodes as JPEG
 * before upload — a photo straight off a phone (4000px+, several MB) would
 * otherwise ship to every visitor's browser untouched. Falls back to the
 * original file if the canvas pipeline fails or doesn't actually help.
 */
export function compressImage(file: File): Promise<File> {
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);

      const detected = detectCropRect(img);
      const crop = detected?.rect ?? null;
      const sourceX = crop?.x ?? 0;
      const sourceY = crop?.y ?? 0;
      const sourceWidth = crop?.width ?? img.naturalWidth;
      const sourceHeight = crop?.height ?? img.naturalHeight;

      let width = sourceWidth;
      let height = sourceHeight;
      if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
        if (width > height) {
          height = Math.round((height * MAX_DIMENSION) / width);
          width = MAX_DIMENSION;
        } else {
          width = Math.round((width * MAX_DIMENSION) / height);
          height = MAX_DIMENSION;
        }
      }

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        resolve(file);
        return;
      }
      // Product photos are meant to sit on a white background — flatten
      // transparency instead of leaving black where PNG alpha used to be.
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, width, height);
      ctx.drawImage(img, sourceX, sourceY, sourceWidth, sourceHeight, 0, 0, width, height);

      // Clean up a light/white backdrop (soft shadows, slight tint) without
      // touching the product itself — see whitenBackground. A no-op on a
      // photo that's already uniformly white.
      if (detected?.bg) whitenBackground(ctx, width, height, detected.bg);

      canvas.toBlob(
        (blob) => {
          if (!blob) {
            resolve(file);
            return;
          }
          resolve(new File([blob], file.name.replace(/\.\w+$/, ".jpg"), { type: "image/jpeg" }));
        },
        "image/jpeg",
        QUALITY,
      );
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(file);
    };
    img.src = url;
  });
}
