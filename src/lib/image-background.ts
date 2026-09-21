// Client-side background removal for product photos, so a photo shot in a
// real room (see admin uploads) ends up as a clean cutout centered on white
// with a soft shadow — the "studio product shot" look used by Nike/Adidas/
// Dior — with no server, no API key and no per-image cost.
//
// Uses U-2-Net (portable variant, "u2netp"), a salient-object-segmentation
// model licensed Apache-2.0 (https://github.com/xuebinqin/U-2-Net), run
// in-browser via onnxruntime-web (MIT, Microsoft). Deliberately NOT using
// @imgly/background-removal — that package is AGPL-3.0, which for a
// commercial site would require either a paid IMG.LY license or publishing
// this entire codebase under AGPL.
//
// onnxruntime-web is imported dynamically so it never loads during SSR (it
// touches browser-only globals) and never ships in the storefront bundle —
// only the admin's product-photo uploader pulls this in.

const MODEL_URL = "/models/u2netp.onnx";
const MODEL_SIZE = 320;
const MEAN = [0.485, 0.456, 0.406] as const;
const STD = [0.229, 0.224, 0.225] as const;

// Matches the working resolution used elsewhere (src/lib/image-compression.ts)
// so bg-removed and untouched photos end up comparably sized.
const WORKING_SIZE = 1600;
const OUTPUT_SIZE = 1200;
const PADDING_RATIO = 0.1; // margin kept empty around the subject, each side
const ALPHA_THRESHOLD = 0.06; // mask values below this are treated as fully transparent
const JPEG_QUALITY = 0.9;

// Pinned to the onnxruntime-web version in package.json — bump this string
// whenever that dependency is upgraded. CDN-hosted so we don't have to
// vendor several MB of wasm binaries per platform into the repo.
const ORT_VERSION = "1.30.0";

let sessionPromise: Promise<import("onnxruntime-web").InferenceSession> | null = null;

async function getSession() {
  if (!sessionPromise) {
    sessionPromise = (async () => {
      // The "/wasm" entry only pulls in the plain CPU wasm backend (no
      // webgl/webgpu variants) — see the resolve.conditions comment in
      // vite.config.ts for why this stays out of our build output entirely.
      const ort = await import("onnxruntime-web/wasm");
      ort.env.wasm.wasmPaths = `https://cdn.jsdelivr.net/npm/onnxruntime-web@${ORT_VERSION}/dist/`;
      // No Cross-Origin-Isolation headers are configured on this site, so
      // multi-threaded wasm (which needs SharedArrayBuffer) isn't available.
      ort.env.wasm.numThreads = 1;
      return ort.InferenceSession.create(MODEL_URL, { executionProviders: ["wasm"] });
    })();
  }
  return sessionPromise;
}

/** Starts loading the model/runtime ahead of time so the first upload isn't slower than the rest. */
export function preloadBackgroundRemoval(): void {
  void getSession().catch(() => {
    // Preloading is best-effort; a real attempt later will surface the error.
  });
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
      reject(new Error("Image illisible."));
    };
    img.src = url;
  });
}

function drawToCanvas(
  img: CanvasImageSource,
  w: number,
  h: number,
): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } {
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("Canvas 2D non disponible.");
  ctx.drawImage(img, 0, 0, w, h);
  return { canvas, ctx };
}

async function segment(source: CanvasImageSource): Promise<Float32Array> {
  const ort = await import("onnxruntime-web/wasm");
  const session = await getSession();
  const { ctx } = drawToCanvas(source, MODEL_SIZE, MODEL_SIZE);
  const { data } = ctx.getImageData(0, 0, MODEL_SIZE, MODEL_SIZE);

  const plane = MODEL_SIZE * MODEL_SIZE;
  const chw = new Float32Array(3 * plane);
  for (let i = 0; i < plane; i++) {
    chw[i] = (data[i * 4]! / 255 - MEAN[0]) / STD[0];
    chw[plane + i] = (data[i * 4 + 1]! / 255 - MEAN[1]) / STD[1];
    chw[plane * 2 + i] = (data[i * 4 + 2]! / 255 - MEAN[2]) / STD[2];
  }
  const input = new ort.Tensor("float32", chw, [1, 3, MODEL_SIZE, MODEL_SIZE]);

  const inputName = session.inputNames[0];
  const outputName = session.outputNames[0];
  if (!inputName || !outputName) throw new Error("Modèle de segmentation invalide.");
  const results = await session.run({ [inputName]: input });
  const output = results[outputName];
  if (!output) throw new Error("Modèle de segmentation invalide.");
  const values = output.data as Float32Array;

  // Contrast-stretch to the full 0-1 range (mirrors the reference
  // implementation's normPRED) — the raw sigmoid output is often compressed
  // into a narrow band.
  let min = Infinity;
  let max = -Infinity;
  for (const v of values) {
    if (v < min) min = v;
    if (v > max) max = v;
  }
  const range = max - min || 1;
  const mask = new Float32Array(values.length);
  for (let i = 0; i < values.length; i++) mask[i] = (values[i]! - min) / range;
  return mask;
}

/** Bilinear-upscales the 320×320 mask to the working image's resolution. */
function resizeMask(mask: Float32Array, dstW: number, dstH: number): Float32Array {
  const out = new Float32Array(dstW * dstH);
  const srcMax = MODEL_SIZE - 1;
  for (let y = 0; y < dstH; y++) {
    const sy = (y / (dstH - 1 || 1)) * srcMax;
    const y0 = Math.floor(sy);
    const y1 = Math.min(srcMax, y0 + 1);
    const fy = sy - y0;
    for (let x = 0; x < dstW; x++) {
      const sx = (x / (dstW - 1 || 1)) * srcMax;
      const x0 = Math.floor(sx);
      const x1 = Math.min(srcMax, x0 + 1);
      const fx = sx - x0;
      const v00 = mask[y0 * MODEL_SIZE + x0]!;
      const v10 = mask[y0 * MODEL_SIZE + x1]!;
      const v01 = mask[y1 * MODEL_SIZE + x0]!;
      const v11 = mask[y1 * MODEL_SIZE + x1]!;
      const top = v00 + (v10 - v00) * fx;
      const bottom = v01 + (v11 - v01) * fx;
      out[y * dstW + x] = top + (bottom - top) * fy;
    }
  }
  return out;
}

function boundingBox(
  mask: Float32Array,
  w: number,
  h: number,
): { x0: number; y0: number; x1: number; y1: number } | null {
  let x0 = w;
  let y0 = h;
  let x1 = -1;
  let y1 = -1;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (mask[y * w + x]! >= ALPHA_THRESHOLD) {
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
      }
    }
  }
  if (x1 < x0 || y1 < y0) return null;
  return { x0, y0, x1, y1 };
}

function composeOnWhite(
  source: HTMLCanvasElement,
  box: { x0: number; y0: number; x1: number; y1: number },
): HTMLCanvasElement {
  const subjW = box.x1 - box.x0 + 1;
  const subjH = box.y1 - box.y0 + 1;
  const out = document.createElement("canvas");
  out.width = OUTPUT_SIZE;
  out.height = OUTPUT_SIZE;
  const ctx = out.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D non disponible.");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, OUTPUT_SIZE, OUTPUT_SIZE);

  const maxDim = OUTPUT_SIZE * (1 - PADDING_RATIO * 2);
  const scale = Math.min(maxDim / subjW, maxDim / subjH, 1);
  const drawW = subjW * scale;
  const drawH = subjH * scale;
  const dx = (OUTPUT_SIZE - drawW) / 2;
  const dy = (OUTPUT_SIZE - drawH) / 2;

  // A soft shadow following the cutout's own silhouette, the way product
  // shots on Nike/Adidas-style listings are finished.
  ctx.shadowColor = "rgba(15, 15, 15, 0.25)";
  ctx.shadowBlur = OUTPUT_SIZE * 0.025;
  ctx.shadowOffsetY = OUTPUT_SIZE * 0.012;
  ctx.drawImage(source, box.x0, box.y0, subjW, subjH, dx, dy, drawW, drawH);

  return out;
}

function canvasToFile(canvas: HTMLCanvasElement, originalName: string): Promise<File> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("Échec de l'encodage de l'image."));
          return;
        }
        resolve(new File([blob], originalName.replace(/\.\w+$/, ".jpg"), { type: "image/jpeg" }));
      },
      "image/jpeg",
      JPEG_QUALITY,
    );
  });
}

/**
 * Cuts the subject out of `file`, centers it on a white square with a soft
 * drop shadow, and returns the result as a new JPEG File ready to upload.
 * Throws if the model can't find a confident foreground (e.g. an
 * already-plain background) or if the runtime fails to load — callers
 * should fall back to the plain compression pipeline in that case.
 */
export async function removeBackgroundAndCompose(file: File): Promise<File> {
  const img = await loadImage(file);
  let { naturalWidth: width, naturalHeight: height } = img;
  if (width > WORKING_SIZE || height > WORKING_SIZE) {
    if (width > height) {
      height = Math.round((height * WORKING_SIZE) / width);
      width = WORKING_SIZE;
    } else {
      width = Math.round((width * WORKING_SIZE) / height);
      height = WORKING_SIZE;
    }
  }

  const { canvas: fullCanvas, ctx: fullCtx } = drawToCanvas(img, width, height);
  const fullImageData = fullCtx.getImageData(0, 0, width, height);

  const rawMask = await segment(fullCanvas);
  const mask = resizeMask(rawMask, width, height);

  const box = boundingBox(mask, width, height);
  if (!box) throw new Error("EMPTY_MASK");

  const { data } = fullImageData;
  for (let i = 0; i < mask.length; i++) {
    const a = mask[i]!;
    data[i * 4 + 3] = a < ALPHA_THRESHOLD ? 0 : Math.round(Math.min(1, a) * 255);
  }
  fullCtx.putImageData(fullImageData, 0, 0);

  const composed = composeOnWhite(fullCanvas, box);
  return canvasToFile(composed, file.name);
}
