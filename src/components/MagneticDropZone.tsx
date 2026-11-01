import { useRef, useState, type ReactNode } from "react";

const MAX_PULL = 8; // px

/** Zone de dépôt qui se déplace légèrement vers le curseur pendant un survol de glisser-
 * déposer, comme attirée par le fichier — en plus du clic classique (via `onClick`). */
export function MagneticDropZone({
  onFiles,
  onClick,
  disabled,
  className = "",
  children,
}: {
  onFiles: (files: FileList) => void;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLButtonElement>(null);
  const [pull, setPull] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);

  function handleDragOver(e: React.DragEvent<HTMLButtonElement>) {
    e.preventDefault();
    if (disabled) return;
    setDragging(true);
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const dx = Math.max(
      -1,
      Math.min(1, (e.clientX - (rect.left + rect.width / 2)) / (rect.width / 2)),
    );
    const dy = Math.max(
      -1,
      Math.min(1, (e.clientY - (rect.top + rect.height / 2)) / (rect.height / 2)),
    );
    setPull({ x: dx * MAX_PULL, y: dy * MAX_PULL });
  }

  function handleDragLeave() {
    setDragging(false);
    setPull({ x: 0, y: 0 });
  }

  function handleDrop(e: React.DragEvent<HTMLButtonElement>) {
    e.preventDefault();
    setDragging(false);
    setPull({ x: 0, y: 0 });
    if (disabled) return;
    if (e.dataTransfer.files.length > 0) onFiles(e.dataTransfer.files);
  }

  return (
    <button
      ref={ref}
      type="button"
      disabled={disabled}
      onClick={onClick}
      onDragOver={handleDragOver}
      onDragEnter={(e) => e.preventDefault()}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      style={{
        transform: `translate(${pull.x}px, ${pull.y}px) scale(${dragging ? 1.04 : 1})`,
        transition: dragging ? "transform 80ms ease-out" : "transform 220ms ease-out",
      }}
      className={`${className} ${dragging ? "ring-2 ring-foreground ring-offset-2" : ""}`}
    >
      {children}
    </button>
  );
}
