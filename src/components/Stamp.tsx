import type { ReactNode } from "react";

export type StampTone = "neutral" | "accent" | "danger";

const TONE_CLASSES: Record<StampTone, string> = {
  neutral: "border-foreground/70 bg-background text-foreground",
  accent: "border-success bg-background text-success",
  danger: "border-destructive bg-background text-destructive",
};

/** Badge façon timbre postal (bordure pointillée, léger pivot) — pour les étiquettes
 * courtes posées sur une photo produit : Rupture, -X%, Nouveau... */
export function Stamp({
  children,
  tone = "neutral",
  className = "",
}: {
  children: ReactNode;
  tone?: StampTone;
  className?: string;
}) {
  return (
    <span
      className={`-rotate-3 inline-flex items-center gap-1 rounded-sm border-2 border-dashed px-2 py-0.5 text-[10px] font-bold tracking-wider uppercase shadow-sm ${TONE_CLASSES[tone]} ${className}`}
    >
      {children}
    </span>
  );
}
