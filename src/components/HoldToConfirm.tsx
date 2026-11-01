import { useEffect, useRef, useState, type ReactNode } from "react";

type Phase = "idle" | "holding" | "undo";

/** Bouton d'action destructive qui exige un appui maintenu plutôt qu'un simple clic, puis
 * offre une fenêtre d'annulation avant d'exécuter réellement l'action — `onConfirm` n'est
 * appelé qu'une fois cette fenêtre écoulée sans annulation, donc l'action est vraiment
 * annulable (pas juste un deuxième clic de confirmation qui supprime immédiatement). */
export function HoldToConfirm({
  onConfirm,
  holdMs = 700,
  undoMs = 4000,
  idleLabel,
  idleIcon,
  undoLabel = "Annuler",
  className = "",
  disabled = false,
}: {
  onConfirm: () => void | Promise<void>;
  holdMs?: number;
  undoMs?: number;
  idleLabel: ReactNode;
  idleIcon?: ReactNode;
  undoLabel?: ReactNode;
  className?: string;
  disabled?: boolean;
}) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [secondsLeft, setSecondsLeft] = useState(0);
  const holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const undoTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tickTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  function clearTimers() {
    if (holdTimer.current) clearTimeout(holdTimer.current);
    if (undoTimer.current) clearTimeout(undoTimer.current);
    if (tickTimer.current) clearInterval(tickTimer.current);
    holdTimer.current = null;
    undoTimer.current = null;
    tickTimer.current = null;
  }

  // Annule tout minuteur en attente si le bouton disparaît (ex: la modale qui le contient
  // se ferme) - sans ça, l'action finirait par s'exécuter malgré la fermeture.
  useEffect(() => clearTimers, []);

  function armUndo() {
    const deadline = Date.now() + undoMs;
    setPhase("undo");
    setSecondsLeft(Math.ceil(undoMs / 1000));
    tickTimer.current = setInterval(() => {
      setSecondsLeft(Math.max(Math.ceil((deadline - Date.now()) / 1000), 0));
    }, 250);
    undoTimer.current = setTimeout(() => {
      clearTimers();
      setPhase("idle");
      void onConfirm();
    }, undoMs);
  }

  function startHold() {
    if (disabled || phase !== "idle") return;
    setPhase("holding");
    holdTimer.current = setTimeout(armUndo, holdMs);
  }

  function cancelHold() {
    if (phase !== "holding") return;
    if (holdTimer.current) clearTimeout(holdTimer.current);
    setPhase("idle");
  }

  function cancelUndo() {
    clearTimers();
    setPhase("idle");
  }

  if (phase === "undo") {
    return (
      <button
        type="button"
        onClick={cancelUndo}
        className={`btn-base btn-outline relative overflow-hidden ${className}`}
      >
        <UndoFillBar ms={undoMs} />
        <span className="relative">
          {undoLabel} ({secondsLeft}s)
        </span>
      </button>
    );
  }

  return (
    <button
      type="button"
      disabled={disabled}
      onPointerDown={startHold}
      onPointerUp={cancelHold}
      onPointerLeave={cancelHold}
      onPointerCancel={cancelHold}
      onKeyDown={(e) => {
        if ((e.key === " " || e.key === "Enter") && !e.repeat) {
          e.preventDefault();
          startHold();
        }
      }}
      onKeyUp={(e) => {
        if (e.key === " " || e.key === "Enter") cancelHold();
      }}
      className={`btn-base btn-danger relative overflow-hidden select-none ${className}`}
    >
      <span
        aria-hidden="true"
        className="absolute inset-0 origin-left bg-white/25"
        style={{
          transform: phase === "holding" ? "scaleX(1)" : "scaleX(0)",
          transition:
            phase === "holding" ? `transform ${holdMs}ms linear` : "transform 150ms ease-out",
        }}
      />
      <span className="relative inline-flex items-center gap-2">
        {idleIcon}
        {idleLabel}
      </span>
    </button>
  );
}

/** Barre qui se vide de droite à gauche pendant la fenêtre d'annulation — montée fraîche à
 * chaque passage en phase "undo", donc l'animation CSS repart bien de scaleX(1). */
function UndoFillBar({ ms }: { ms: number }) {
  const [draining, setDraining] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setDraining(true));
    return () => cancelAnimationFrame(id);
  }, []);
  return (
    <span
      aria-hidden="true"
      className="absolute inset-0 origin-right bg-destructive/15"
      style={{
        transform: draining ? "scaleX(0)" : "scaleX(1)",
        transition: `transform ${ms}ms linear`,
      }}
    />
  );
}
