import { CheckCircle2, Clock, XCircle } from "lucide-react";
import {
  type ComponentPropsWithoutRef,
  createContext,
  type CSSProperties,
  type ReactNode,
  useContext,
} from "react";

export type ReceiptPrinterStage = "processing" | "printing" | "complete" | "cancelled";
export type ReceiptFeedMotion = "smooth" | "stepped";

export type ReceiptPrinterRootProps = Omit<ComponentPropsWithoutRef<"section">, "children"> & {
  /** Désactive les transitions quand false. */
  animate?: boolean;
  children: ReactNode;
  /** Défilement continu ou ligne par ligne (effet imprimante thermique). */
  feedMotion?: ReceiptFeedMotion;
  /** État courant de l'imprimante. */
  stage: ReceiptPrinterStage;
};

export type ReceiptPrinterMachineProps = ComponentPropsWithoutRef<"div">;
export type ReceiptPrinterHeaderProps = ComponentPropsWithoutRef<"div">;
export type ReceiptPrinterScreenProps = ComponentPropsWithoutRef<"div">;
export type ReceiptPrinterOutputProps = ComponentPropsWithoutRef<"div">;
export type ReceiptPrinterPaperProps = ComponentPropsWithoutRef<"article">;

export type ReceiptPrinterStatusProps = Omit<ComponentPropsWithoutRef<"div">, "children"> & {
  /** Contenu personnalisé. Par défaut, un libellé dérivé de `stage`. */
  children?: ReactNode;
};

type ReceiptPrinterContextValue = {
  animate: boolean;
  feedMotion: ReceiptFeedMotion;
  stage: ReceiptPrinterStage;
};

const ReceiptPrinterContext = createContext<ReceiptPrinterContextValue | null>(null);

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

const easeOut = "cubic-bezier(0.23, 1, 0.32, 1)";
const easeInOut = "cubic-bezier(0.77, 0, 0.175, 1)";

const receiptToothCount = 40;
const receiptToothDepth = 4;
const receiptToothPoints = Array.from({ length: receiptToothCount * 2 }, (_, index) => {
  const x = 100 - ((index + 1) * 100) / (receiptToothCount * 2);
  const y = index % 2 === 0 ? "100%" : `calc(100% - ${receiptToothDepth}px)`;
  return `${x}% ${y}`;
}).join(", ");
const receiptClipPath = `polygon(0 0, 100% 0, 100% calc(100% - ${receiptToothDepth}px), ${receiptToothPoints})`;

const statusLabels: Record<ReceiptPrinterStage, ReactNode> = {
  processing: "Traitement de la commande",
  printing: "Impression du reçu",
  complete: "Commande prête",
  cancelled: "Commande annulée",
};

const machineClassName =
  "relative isolate w-full overflow-hidden rounded-3xl border border-border-strong bg-[color-mix(in_oklab,var(--color-muted-foreground)_28%,var(--color-primary))] p-3 pb-8 shadow-[0_20px_36px_-20px_color-mix(in_oklab,var(--color-primary)_55%,transparent),0_6px_14px_-8px_color-mix(in_oklab,var(--color-primary)_24%,transparent),inset_0_1px_0_color-mix(in_oklab,var(--color-background)_14%,transparent),inset_0_-1px_0_color-mix(in_oklab,var(--color-primary)_55%,transparent)] before:pointer-events-none before:absolute before:inset-0 before:z-0 before:rounded-[inherit] before:bg-[radial-gradient(120%_120%_at_50%_-10%,color-mix(in_oklab,var(--color-background)_16%,transparent),transparent_60%)] before:content-['']";

function useReceiptPrinter(component: string) {
  const context = useContext(ReceiptPrinterContext);
  if (!context) {
    throw new Error(`${component} doit être utilisé à l'intérieur de ReceiptPrinter.Root.`);
  }
  return context;
}

function ReceiptPrinterRoot({
  "aria-label": ariaLabel = "Imprimante de reçu",
  animate = true,
  children,
  className,
  feedMotion = "stepped",
  stage,
  ...props
}: ReceiptPrinterRootProps) {
  return (
    <ReceiptPrinterContext.Provider value={{ animate, feedMotion, stage }}>
      <section
        aria-label={ariaLabel}
        className={cx("relative isolate flex w-full max-w-sm flex-col items-center", className)}
        data-stage={stage}
        {...props}
      >
        {children}
      </section>
    </ReceiptPrinterContext.Provider>
  );
}

function ReceiptPrinterMachine({ children, className, ...props }: ReceiptPrinterMachineProps) {
  return (
    <div className={cx(machineClassName, className)} {...props}>
      {children}
      <div
        aria-hidden="true"
        className="absolute inset-x-6 bottom-3 z-40 h-2 rounded-full border border-primary/60 bg-primary shadow-inner"
      />
    </div>
  );
}

function ReceiptPrinterHeader({ children, className, ...props }: ReceiptPrinterHeaderProps) {
  return (
    <div
      className={cx("relative z-10 flex h-11 items-start justify-between", className)}
      {...props}
    >
      {children}
    </div>
  );
}

function ReceiptPrinterScreen({ children, className, ...props }: ReceiptPrinterScreenProps) {
  return (
    <div
      className={cx(
        "relative z-10 isolate overflow-hidden rounded-2xl border border-primary bg-primary p-4 text-primary-foreground shadow-inner shadow-primary/80 after:pointer-events-none after:absolute after:inset-0 after:z-20 after:rounded-[inherit] after:shadow-[inset_0_0_24px_4px_color-mix(in_oklab,var(--color-primary)_52%,transparent)] after:content-['']",
        className,
      )}
      {...props}
    >
      <div className="relative z-10">{children}</div>
    </div>
  );
}

function StatusIndicator({ animate, stage }: { animate: boolean; stage: ReceiptPrinterStage }) {
  // Pas d'icône qui tourne en boucle : ce n'est pas une opération en cours, juste un
  // statut figé (ex. "Nouvelle") — une rotation infinie donnerait l'impression d'un
  // chargement qui ne se termine jamais.
  const Icon = stage === "complete" ? CheckCircle2 : stage === "cancelled" ? XCircle : Clock;
  const tone =
    stage === "complete"
      ? "text-success"
      : stage === "cancelled"
        ? "text-destructive"
        : "text-primary-foreground/60";

  return (
    <span aria-hidden="true" className="grid size-5 shrink-0 place-items-center">
      <Icon
        key={stage}
        size={18}
        strokeWidth={2}
        className={cx(
          tone,
          "animate-in fade-in zoom-in-95 motion-reduce:animate-none",
          animate ? "duration-150" : "duration-0",
        )}
      />
    </span>
  );
}

function ReceiptPrinterStatus({ children, className, ...props }: ReceiptPrinterStatusProps) {
  const { animate, stage } = useReceiptPrinter("ReceiptPrinter.Status");

  return (
    <div className={cx("flex min-w-0 items-center gap-2", className)} {...props}>
      <StatusIndicator animate={animate} stage={stage} />
      <div aria-live="polite" role="status" className="min-w-0 flex-1">
        <div
          key={stage}
          className={cx(
            "truncate text-xs leading-none font-medium text-primary-foreground/80",
            "animate-in fade-in slide-in-from-bottom-1 motion-reduce:animate-none",
            animate ? "duration-200" : "duration-0",
          )}
        >
          {children ?? statusLabels[stage]}
        </div>
      </div>
    </div>
  );
}

function ReceiptPrinterPaper({ children, className, style, ...props }: ReceiptPrinterPaperProps) {
  return (
    <article
      className={cx(
        "relative z-10 min-h-80 bg-background px-6 pt-7 pb-8 font-mono text-foreground",
        className,
      )}
      style={{ clipPath: receiptClipPath, ...style }}
      {...props}
    >
      {children}
    </article>
  );
}

function ReceiptPrinterOutput({ children, className, ...props }: ReceiptPrinterOutputProps) {
  const { animate, feedMotion, stage } = useReceiptPrinter("ReceiptPrinter.Output");
  const isReceiptVisible = stage !== "processing";
  const stepped = feedMotion === "stepped" && stage === "printing";

  const transformStyle: CSSProperties = {
    transform: isReceiptVisible ? "translateY(0%)" : "translateY(calc(-100% + 2px))",
    opacity: isReceiptVisible ? 1 : 0,
    transitionProperty: "transform, opacity",
    transitionDuration: animate ? `${stepped ? 1750 : 900}ms, 160ms` : "0ms, 0ms",
    transitionTimingFunction: `${stepped ? "steps(12, jump-end)" : easeInOut}, ${easeOut}`,
  };

  return (
    <div
      className={cx(
        "relative z-50 -mt-4 w-[calc(80%+3rem)] max-w-full overflow-hidden px-6",
        className,
      )}
      {...props}
    >
      {isReceiptVisible ? (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-6 -top-1 z-20 h-2 bg-primary/75 blur-[6px]"
        />
      ) : null}

      <div
        aria-hidden={stage === "processing"}
        className="relative isolate before:pointer-events-none before:absolute before:inset-x-3 before:top-3 before:bottom-4 before:z-0 before:rounded-sm before:shadow-[0_8px_24px_color-mix(in_oklab,var(--color-primary)_24%,transparent)] before:content-[''] after:pointer-events-none after:absolute after:right-[8%] after:bottom-0 after:left-[8%] after:z-0 after:h-3 after:translate-y-1.5 after:rounded-full after:bg-primary/10 after:blur-lg after:content-[''] motion-reduce:!transition-none"
        style={transformStyle}
      >
        {children}
      </div>
    </div>
  );
}

export const ReceiptPrinter = {
  Header: ReceiptPrinterHeader,
  Machine: ReceiptPrinterMachine,
  Output: ReceiptPrinterOutput,
  Paper: ReceiptPrinterPaper,
  Root: ReceiptPrinterRoot,
  Screen: ReceiptPrinterScreen,
  Status: ReceiptPrinterStatus,
};
