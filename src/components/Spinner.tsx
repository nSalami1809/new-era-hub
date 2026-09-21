import { Loader2 } from "lucide-react";

/** Inline SVG loading spinner (lucide's Loader2, already used in ImageUploader) — for auth/connection gates and pending buttons. */
export function Spinner({ size = 18, className = "" }: { size?: number; className?: string }) {
  return <Loader2 size={size} className={`animate-spin ${className}`} aria-hidden="true" />;
}

/** Full-screen centered spinner, for page-level loading/auth gates (e.g. admin session check). */
export function FullscreenSpinner({ label }: { label?: string }) {
  return (
    <div className="grid min-h-screen place-items-center gap-3 text-sm text-muted-foreground">
      <div className="flex flex-col items-center gap-3">
        <Spinner size={28} />
        {label && <p>{label}</p>}
      </div>
    </div>
  );
}
