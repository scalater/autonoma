import { Card, CardContent, CardDescription, CardHeader, CardTitle, cn } from "@autonoma/blacklight";
import type { CSSProperties, ReactNode } from "react";
import "../intro-welcome.css";

export interface StageCardProps {
  number: number;
  icon: ReactNode;
  title: string;
  description: string;
  visual: ReactNode;
  className?: string;
  /** When set, the card fades in at low opacity then activates on its turn. */
  stageIndex?: number;
}

/** Delay in seconds between each stage activation. */
const STAGE_GAP = 1.8;

export function StageCard({ number, icon, title, description, visual, className, stageIndex }: StageCardProps) {
  const staggerStyle =
    stageIndex != null ? ({ "--stage-delay": `${stageIndex * STAGE_GAP}s` } as CSSProperties) : undefined;

  return (
    <Card
      className={cn(
        "group overflow-hidden border-border-dim bg-surface-base/60 py-0 transition-colors hover:border-border-highlight",
        stageIndex != null && "stage-card-stagger",
        className,
      )}
      style={staggerStyle}
    >
      <CardHeader className="relative border-b border-border-dim bg-surface-void/50 px-5 py-4">
        <span className="pointer-events-none absolute right-4 top-3 font-mono text-2xl font-semibold text-text-tertiary/30">
          0{number}
        </span>
        <div className="flex items-center gap-3">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-full border border-primary/30 bg-surface-void">
            {icon}
          </div>
          <CardTitle className="text-base">{title}</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 p-4">
        <div className="h-40 overflow-hidden rounded-lg border border-border-dim bg-surface-void">{visual}</div>
        <CardDescription className="text-sm leading-relaxed text-text-secondary">{description}</CardDescription>
      </CardContent>
    </Card>
  );
}

export function AnimatedProcessRow({
  widthClassName,
  accent = false,
  rowIndex,
}: {
  widthClassName: string;
  accent?: boolean;
  rowIndex: number;
}) {
  const rowDelay = { "--row-delay": `${rowIndex * 160}ms` } as CSSProperties;

  return (
    <div className="flex items-center gap-2">
      <span
        className={cn(
          "size-1.5 shrink-0 rounded-full",
          accent ? "bg-primary" : "bg-text-tertiary",
          "intro-welcome-dot-appear motion-reduce:animate-none",
        )}
        style={rowDelay}
      />
      <div className={cn("h-1 min-h-1 overflow-hidden rounded-full", widthClassName)}>
        <div
          className={cn(
            "h-full rounded-full intro-welcome-bar-fill motion-reduce:animate-none",
            accent ? "bg-primary/85" : "bg-border-mid",
          )}
          style={rowDelay}
        />
      </div>
    </div>
  );
}
