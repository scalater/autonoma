import { cn } from "@autonoma/blacklight";
import { CopyIcon } from "@phosphor-icons/react/Copy";
import "../intro-key-concepts.css";

export function ScenarioConceptVisual() {
  return (
    <div className="flex h-full items-center justify-center gap-1.5 px-1 sm:gap-2.5" aria-hidden>
      <MiniCatalogPanel className="key-concepts-twin-panel" />
      <div className="key-concepts-sync-badge flex shrink-0 flex-col items-center gap-0.5 rounded-md border border-border-dim bg-surface-base/90 px-1.5 py-1">
        <CopyIcon size={14} weight="bold" className="text-primary" />
        <span className="font-mono text-[8px] uppercase tracking-tight text-text-tertiary">repeat</span>
      </div>
      <MiniCatalogPanel className="key-concepts-twin-panel" />
    </div>
  );
}

function MiniCatalogPanel({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "flex w-[6.75rem] flex-col gap-1 rounded-md border bg-surface-base/40 p-1.5 sm:w-[7.25rem]",
        className,
      )}
    >
      <div className="flex items-center justify-between gap-1">
        <span className="font-mono text-[7px] uppercase tracking-wide text-text-tertiary">catalog</span>
        <div className="flex items-center gap-0.5">
          <div className="size-1.5 rounded-sm bg-border-mid/90" />
          <div className="size-1.5 rounded-full border border-border-mid bg-surface-base/80" />
        </div>
      </div>
      <div className="h-px w-full bg-border-mid/50" />
      <div className="grid grid-cols-2 gap-1">
        <ProductTile />
        <ProductTile accent />
        <ProductTile />
        <ProductTile />
      </div>
    </div>
  );
}

function ProductTile({ accent = false }: { accent?: boolean }) {
  return (
    <div
      className={cn(
        "flex flex-col gap-0.5 rounded border border-border-mid/35 bg-surface-void/50 p-0.5",
        accent && "ring-1 ring-primary/35",
      )}
    >
      <div
        className={cn(
          "aspect-square w-full rounded-sm bg-gradient-to-b from-border-mid/90 to-border-mid/40",
          accent && "from-primary/30 to-border-mid/50",
        )}
      />
      <div className="h-px w-full rounded-full bg-border-mid/70" />
      <div className="h-px w-2/3 rounded-full bg-border-mid/45" />
    </div>
  );
}

export function EnvironmentFactoryConceptVisual() {
  return (
    <div className="flex h-full flex-col justify-center gap-2.5 px-2 py-1 sm:px-3" aria-hidden>
      <div className="flex items-center justify-between gap-2">
        <span className="shrink-0 rounded border border-primary/35 bg-primary/10 px-1.5 py-0.5 font-mono text-[9px] text-primary">
          POST /factory
        </span>
        <span className="hidden font-mono text-[9px] text-text-tertiary sm:inline">request → provision</span>
      </div>

      <div className="relative min-h-[2.75rem]">
        <div className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-gradient-to-r from-primary/25 via-border-mid to-primary/20" />
        <span className="absolute left-0 top-1/2 -translate-y-1/2 font-mono text-[8px] text-text-tertiary">call</span>
        <div className="absolute left-[1.75rem] right-[1.75rem] top-1/2 h-px -translate-y-1/2 bg-border-mid/80" />
        <div className="key-concepts-factory-packet absolute top-1/2 size-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary shadow-[0_0_12px_var(--color-primary)] motion-reduce:animate-none" />
        <span className="absolute right-0 top-1/2 -translate-y-1/2 font-mono text-[8px] text-text-tertiary">app</span>
      </div>

      <div className="flex flex-col gap-1">
        <span className="font-mono text-[8px] uppercase tracking-wide text-text-tertiary">fresh stack</span>
        <div className="flex flex-col gap-1 border-l-2 border-primary/30 pl-2">
          <div className="key-concepts-db-1 h-2.5 w-full max-w-[6.5rem] rounded-sm motion-reduce:animate-none" />
          <div className="key-concepts-db-2 h-2.5 w-full max-w-[6.5rem] rounded-sm motion-reduce:animate-none" />
          <div className="key-concepts-db-3 h-2.5 w-full max-w-[6.5rem] rounded-sm motion-reduce:animate-none" />
        </div>
      </div>
    </div>
  );
}
