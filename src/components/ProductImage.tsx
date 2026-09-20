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
}: {
  src: string | null | undefined;
  alt: string;
  className?: string;
  iconSize?: number;
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
    <img src={src} alt={alt} loading="lazy" onError={() => setFailed(true)} className={className} />
  );
}
