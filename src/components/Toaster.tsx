import { useToasts } from "@/lib/toast";

export function Toaster() {
  const toasts = useToasts();
  if (toasts.length === 0) return null;
  return (
    <div
      className="pointer-events-none fixed inset-x-0 bottom-4 z-50 flex flex-col items-center gap-2 px-4"
      role="status"
      aria-live="polite"
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`pointer-events-auto max-w-sm border px-4 py-2.5 text-sm font-medium shadow-sm ${
            t.tone === "error"
              ? "border-destructive bg-destructive text-destructive-foreground"
              : "border-foreground bg-foreground text-background"
          }`}
        >
          {t.message}
        </div>
      ))}
    </div>
  );
}
