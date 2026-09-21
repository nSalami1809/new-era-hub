// Background removal for product photos, so a photo shot in a real room
// ends up as a clean cutout centered on white with a soft shadow — the
// "studio product shot" look used by Nike/Adidas/Dior.
//
// This calls Leonardo.AI's "remove-bg" model (via the "remove-background"
// Supabase Edge Function, which holds the API key server-side) rather than
// running a model in the browser: an earlier client-side attempt with
// U-2-Net produced visible artifacts on non-trivial photos (e.g. a cap on
// its display stand — the stand got kept as "foreground" and left ghosting
// around the edges).
//
// The edge function only ever hands back a plain transparent-background
// cutout — no crop/shadow/bg_color from the provider — so this file's own
// canvas compositing (bounding box, white square, drop shadow) stays the
// single source of truth for the final look regardless of which provider
// is behind the edge function.
import { supabase } from "@/integrations/supabase/client";

const OUTPUT_SIZE = 1200;
const PADDING_RATIO = 0.1; // margin kept empty around the subject, each side
const ALPHA_THRESHOLD = 10; // 0-255, used only to find the subject's bounding box
const JPEG_QUALITY = 0.9;

async function callBackgroundRemovalApi(file: File): Promise<Blob> {
  const form = new FormData();
  form.append("image_file", file, file.name);
  const { data, error } = await supabase.functions.invoke("remove-background", {
    body: form,
  });
  if (error) {
    const context = (error as { context?: Response }).context;
    if (context) {
      try {
        const body = (await context.json()) as { error?: string };
        if (body.error) throw new Error(body.error);
      } catch {
        /* fall through to the generic message below */
      }
    }
    throw new Error("Le détourage a échoué.");
  }
  if (!(data instanceof Blob)) throw new Error("Réponse invalide du service de détourage.");
  return data;
}

function loadImage(source: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(source);
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

function drawToCanvas(img: HTMLImageElement): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("Canvas 2D non disponible.");
  ctx.drawImage(img, 0, 0);
  return canvas;
}

function boundingBoxFromAlpha(
  canvas: HTMLCanvasElement,
): { x0: number; y0: number; x1: number; y1: number } | null {
  const ctx = canvas.getContext("2d")!;
  const { data, width, height } = ctx.getImageData(0, 0, canvas.width, canvas.height);
  let x0 = width;
  let y0 = height;
  let x1 = -1;
  let y1 = -1;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const a = data[(y * width + x) * 4 + 3]!;
      if (a >= ALPHA_THRESHOLD) {
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
 * Cuts the subject out of `file` (via the remove-background edge function),
 * centers it on a white square with a soft drop shadow, and returns the
 * result as a new JPEG File ready to upload. Throws if the provider can't
 * find a subject, if the edge function rejects the request (quota, auth,
 * missing key), or on a network error — callers should fall back to the
 * plain compression pipeline.
 */
export async function removeBackgroundAndCompose(file: File): Promise<File> {
  const cutoutBlob = await callBackgroundRemovalApi(file);
  const img = await loadImage(cutoutBlob);
  const canvas = drawToCanvas(img);
  const box = boundingBoxFromAlpha(canvas);
  if (!box) throw new Error("EMPTY_MASK");
  const composed = composeOnWhite(canvas, box);
  return canvasToFile(composed, file.name);
}
