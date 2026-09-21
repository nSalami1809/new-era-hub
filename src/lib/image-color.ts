import { useEffect, useState } from "react";

// Product photos aren't always shot on pure white — a card that hardcodes a
// white image container then looks like the photo was stuck on top of it.
// This samples a photo's own edge pixels (where the backdrop shows, assuming
// a roughly centered subject) and hands back that color so the card's image
// container can match it, making any backdrop look intentional instead of a
// mismatched sticker.
const SAMPLE_SIZE = 24;
const EDGE_THICKNESS = 2;
const MIN_ALPHA = 200; // skip near-transparent pixels (PNG cutouts)

const cache = new Map<string, string>();
const inflight = new Map<string, Promise<string>>();

function extractEdgeColor(img: HTMLImageElement): string {
  const canvas = document.createElement("canvas");
  canvas.width = SAMPLE_SIZE;
  canvas.height = SAMPLE_SIZE;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return "#ffffff";
  ctx.drawImage(img, 0, 0, SAMPLE_SIZE, SAMPLE_SIZE);
  const { data } = ctx.getImageData(0, 0, SAMPLE_SIZE, SAMPLE_SIZE);

  let r = 0;
  let g = 0;
  let b = 0;
  let n = 0;
  for (let y = 0; y < SAMPLE_SIZE; y++) {
    const onEdgeRow = y < EDGE_THICKNESS || y >= SAMPLE_SIZE - EDGE_THICKNESS;
    for (let x = 0; x < SAMPLE_SIZE; x++) {
      const onEdge = onEdgeRow || x < EDGE_THICKNESS || x >= SAMPLE_SIZE - EDGE_THICKNESS;
      if (!onEdge) continue;
      const i = (y * SAMPLE_SIZE + x) * 4;
      if (data[i + 3]! < MIN_ALPHA) continue;
      r += data[i]!;
      g += data[i + 1]!;
      b += data[i + 2]!;
      n++;
    }
  }
  if (n === 0) return "#ffffff";
  return `rgb(${Math.round(r / n)}, ${Math.round(g / n)}, ${Math.round(b / n)})`;
}

function loadAndExtract(src: string): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      try {
        resolve(extractEdgeColor(img));
      } catch {
        // Cross-origin images without CORS headers taint the canvas and
        // throw on read — fall back to white rather than breaking the card.
        resolve("#ffffff");
      }
    };
    img.onerror = () => resolve("#ffffff");
    img.src = src;
  });
}

/** The dominant edge color of a product photo, for matching its card's
 * background to it. Returns undefined until known (first render, or while a
 * new src is loading) — callers should fall back to white in the meantime. */
export function useImageBackgroundColor(src: string | null | undefined): string | undefined {
  const [color, setColor] = useState<string | undefined>(() => (src ? cache.get(src) : undefined));

  useEffect(() => {
    if (!src) {
      setColor(undefined);
      return;
    }
    const cached = cache.get(src);
    if (cached) {
      setColor(cached);
      return;
    }
    let cancelled = false;
    let promise = inflight.get(src);
    if (!promise) {
      promise = loadAndExtract(src);
      inflight.set(src, promise);
    }
    void promise.then((result) => {
      cache.set(src, result);
      inflight.delete(src);
      if (!cancelled) setColor(result);
    });
    return () => {
      cancelled = true;
    };
  }, [src]);

  return color;
}
