import { useEffect, useRef, useState, type ReactNode } from "react";

export type DynamicButtonVariant = "success" | "dark" | "outline" | "danger";

const VARIANT_CLASS: Record<DynamicButtonVariant, string> = {
  success: "btn-success",
  dark: "btn-dark",
  outline: "btn-outline",
  danger: "btn-danger",
};

/** Bouton qui se redimensionne en douceur quand son contenu change (ex: "Appliquer" →
 * "Vérification..." → "Appliqué ✓"), au lieu de sauter brutalement à la nouvelle largeur.
 * Mesure la largeur via un clone invisible (mêmes classes, donc même padding/police) plutôt
 * qu'une valeur codée en dur, pour rester correct si btn-base change un jour. */
export function DynamicButton({
  label,
  icon,
  onClick,
  disabled,
  variant = "success",
  className = "",
  type = "button",
}: {
  label: ReactNode;
  icon?: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  variant?: DynamicButtonVariant;
  className?: string;
  type?: "button" | "submit";
}) {
  const mirrorRef = useRef<HTMLButtonElement>(null);
  const [width, setWidth] = useState<number | null>(null);
  const stateKey = typeof label === "string" ? label : undefined;

  useEffect(() => {
    const el = mirrorRef.current;
    if (!el) return;
    const update = () => setWidth(el.offsetWidth);
    update();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, [stateKey, icon]);

  const variantClass = VARIANT_CLASS[variant];

  return (
    <span className="relative inline-block align-top">
      <button
        type={type}
        disabled={disabled}
        onClick={onClick}
        style={width ? { width } : undefined}
        className={`btn-base ${variantClass} overflow-hidden transition-[width] duration-300 ease-out motion-reduce:transition-none ${className}`}
      >
        <span
          key={stateKey}
          className="inline-flex items-center gap-2 animate-in fade-in slide-in-from-bottom-1 whitespace-nowrap duration-200 motion-reduce:animate-none"
        >
          {icon}
          {label}
        </span>
      </button>
      {/* Clone invisible utilisé uniquement pour mesurer la largeur naturelle du contenu. */}
      <button
        ref={mirrorRef}
        aria-hidden="true"
        tabIndex={-1}
        type="button"
        className={`btn-base ${variantClass} invisible absolute inset-y-0 left-0 -z-10 ${className}`}
      >
        <span className="inline-flex items-center gap-2 whitespace-nowrap">
          {icon}
          {label}
        </span>
      </button>
    </span>
  );
}
