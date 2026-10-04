import { useEffect, useRef, useState } from "react";
import { ImageOff } from "lucide-react";
import { transformImageUrl } from "@/lib/image-transform";

/**
 * Drop-in replacement for <img> on product photos: if the URL 404s or the
 * image fails to decode, shows a clean placeholder instead of the browser's
 * broken-image icon. `className` is applied identically to whichever one
 * renders, so callers size/border/background it exactly like a plain <img>.
 * Fades in once decoded instead of popping in abruptly — a plain <img> left
 * to its own devices either shows nothing then suddenly the full photo, or
 * (worse, on a slow connection) a half-rendered one.
 */
export function ProductImage({
  src,
  alt,
  className,
  iconSize = 22,
  priority = false,
  width,
}: {
  src: string | null | undefined;
  alt: string;
  className?: string;
  iconSize?: number;
  /** For the one image likely to be the page's LCP (a product's main photo,
   * the first card above the fold): loads eagerly and at high priority
   * instead of the lazy-loading default. */
  priority?: boolean;
  /** Display width in px this image is actually shown at — requests a
   * resized/re-encoded version instead of the full ~1600px-capped original,
   * so a 96px cart thumbnail doesn't ship the same bytes as a full detail
   * view. Omit for the rare case the original resolution is wanted (the
   * full-screen zoom view). */
  width?: number;
}) {
  const [failed, setFailed] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);
  const url = src ? transformImageUrl(src, width) : null;

  // A color swap on the product page (or any caller passing a new `src`)
  // swaps the url prop on the same mounted component — reset for the new
  // photo instead of keeping the previous one's state.
  useEffect(() => {
    setFailed(false);
    setLoaded(false);
    // SSR renders this at `loaded: false`; by the time React hydrates and
    // attaches onLoad below, a fast (e.g. already browser-cached — exactly
    // what the hover/touch preload on product cards sets up) image may well
    // have already finished loading, firing its native load event before
    // any listener existed to catch it. `.complete` is the browser's own
    // record of that, independent of whether our handler was attached in
    // time, so this catches the race instead of leaving the image stuck
    // invisible.
    if (imgRef.current?.complete) setLoaded(true);
  }, [url]);

  if (!src || failed) {
    return (
      <div className={`grid place-items-center text-muted-foreground/50 ${className ?? ""}`}>
        <ImageOff size={iconSize} strokeWidth={1.5} />
      </div>
    );
  }

  return (
    <img
      ref={imgRef}
      src={url ?? undefined}
      alt={alt}
      loading={priority ? "eager" : "lazy"}
      fetchPriority={priority ? "high" : "auto"}
      onError={() => setFailed(true)}
      onLoad={() => setLoaded(true)}
      className={`${className ?? ""} transition-opacity duration-300 ${loaded ? "opacity-100" : "opacity-0"}`}
    />
  );
}
