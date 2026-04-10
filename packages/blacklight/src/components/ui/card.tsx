import { type VariantProps, cva } from "class-variance-authority";
import type * as React from "react";
import { cn } from "../../lib/utils";

const cardVariants = cva(
  "group/card flex flex-col overflow-hidden rounded-none border border-border-dim text-card-foreground transition-colors",
  {
    variants: {
      variant: {
        default: "bg-surface-base",
        glass: "border-border-mid bg-surface-base/70 backdrop-blur-sm",
        stat: "bg-surface-base hover:border-border-highlight",
        raised: "bg-surface-raised",
      },
      size: {
        default: "gap-4",
        sm: "gap-2",
        compact: "gap-0 p-0",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

function Card({
  className,
  variant = "default",
  size = "default",
  ...props
}: React.ComponentProps<"div"> & VariantProps<typeof cardVariants>) {
  return (
    <div
      data-slot="card"
      data-variant={variant}
      data-size={size}
      className={cn(cardVariants({ variant, size }), className)}
      {...props}
    />
  );
}

function CardHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-header"
      className={cn(
        "grid auto-rows-min items-start gap-1 px-4 py-2 has-data-[slot=card-action]:grid-cols-[1fr_auto] has-data-[slot=card-description]:grid-rows-[auto_auto]",
        className,
      )}
      {...props}
    />
  );
}

function CardTitle({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="card-title" className={cn("text-sm font-medium text-foreground", className)} {...props} />;
}

function CardDescription({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="card-description" className={cn("text-xs text-muted-foreground", className)} {...props} />;
}

function CardAction({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-action"
      className={cn("col-start-2 row-span-2 row-start-1 self-start justify-self-end", className)}
      {...props}
    />
  );
}

function CardContent({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="card-content" className={cn("px-4 py-2", className)} {...props} />;
}

function CardFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-footer"
      className={cn("flex items-center border-t border-border-dim px-4 py-2", className)}
      {...props}
    />
  );
}

/* ── Stat-specific sub-components ── */

function CardLabel({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-label"
      className={cn("text-4xs font-semibold uppercase tracking-widest text-text-tertiary", className)}
      {...props}
    />
  );
}

function CardValue({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="card-value" className={cn("font-mono text-2xl text-text-primary", className)} {...props} />;
}

function CardMeta({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="card-meta" className={cn("text-3xs text-text-secondary", className)} {...props} />;
}

export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardAction,
  CardDescription,
  CardContent,
  CardLabel,
  CardValue,
  CardMeta,
  cardVariants,
};
