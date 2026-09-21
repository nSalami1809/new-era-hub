import { useState } from "react";
import { ImageOff } from "lucide-react";

/**
 * Drop-in replacement for <img> on product photos: if the URL 404s or the
 * image fails to decode, shows a clean placeholder instead of the browser's
 * broken-image icon. `className` is applied identically to whichever one
 * renders, so callers size/border/background it exactly like a plain <img>.
 */
export function ProductImage({
  src,
  alt,
  className,
  iconSize = 22,
  priority = false,
}: {
  src: string | null | undefined;
  alt: string;
  className?: string;
  iconSize?: number;
  /** For the one image likely to be the page's LCP (a product's main photo,
   * the first card above the fold): loads eagerly and at high priority
   * instead of the lazy-loading default. */
  priority?: boolean;
}) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return (
      <div className={`grid place-items-center text-muted-foreground/50 ${className ?? ""}`}>
        <ImageOff size={iconSize} strokeWidth={1.5} />
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      loading={priority ? "eager" : "lazy"}
      fetchPriority={priority ? "high" : "auto"}
      onError={() => setFailed(true)}
      className={className}
    />
  );
}
