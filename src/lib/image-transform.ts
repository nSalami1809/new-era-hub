// Requests an appropriately-sized version of a Supabase Storage image
// instead of always shipping the full ~1600px-capped original (see
// image-compression.ts) even to a 96px cart thumbnail. Supabase's storage
// render endpoint resizes/re-encodes on the fly and caches the result at the
// edge (confirmed live: a 91KB original came back at 14KB for width=300) —
// no re-upload of existing photos needed, this works retroactively.
const OBJECT_MARKER = "/storage/v1/object/public/";
const RENDER_MARKER = "/storage/v1/render/image/public/";
const DEFAULT_QUALITY = 75;

/**
 * @param width Target CSS display width in px. The actual request asks for
 * 2x that (retina-friendly) — pass the size the image is shown at, not the
 * size to fetch. Omit to get the original, untransformed URL (used for the
 * full-screen zoom view, where source quality matters most).
 */
export function transformImageUrl(url: string, width?: number): string {
  if (!width || !url.includes(OBJECT_MARKER)) return url;
  const base = url.replace(OBJECT_MARKER, RENDER_MARKER);
  const separator = base.includes("?") ? "&" : "?";
  // resize=contain -> resizing_type "fit" (scale to fit, full image kept).
  // Without it the endpoint defaults to "fill", which *crops* to the exact
  // box — confirmed live: that was silently chopping product photos in half.
  return `${base}${separator}width=${Math.round(width * 2)}&resize=contain&quality=${DEFAULT_QUALITY}`;
}
