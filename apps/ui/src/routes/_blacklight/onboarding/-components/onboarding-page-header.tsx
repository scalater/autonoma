import { cn } from "@autonoma/blacklight";
import type { ReactNode } from "react";

export interface OnboardingPageHeaderProps {
  title: string;
  description?: ReactNode;
  /** Shown above the title (stacked variant only). */
  leading?: ReactNode;
  /** Right side on large screens (split variant only), e.g. connection status on the install step. */
  trailing?: ReactNode;
  variant?: "stacked" | "split";
  className?: string;
  /** Extra classes for the description block (both variants). */
  descriptionClassName?: string;
}

export function OnboardingPageHeader({
  title,
  description,
  leading,
  trailing,
  variant = "stacked",
  className,
  descriptionClassName,
}: OnboardingPageHeaderProps) {
  if (variant === "split") {
    return (
      <header className={cn("mb-10 border-b border-border-dim pb-8", className)}>
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between lg:gap-10">
          <div className="flex min-w-0 flex-1 flex-col gap-3 lg:gap-4">
            <h1 className="shrink-0 text-4xl font-medium tracking-tight text-text-primary lg:text-5xl">{title}</h1>
            {description != null ? (
              <div
                className={cn(
                  "min-w-0 text-sm leading-relaxed text-text-secondary lg:text-base [&_p]:m-0",
                  descriptionClassName,
                )}
              >
                {description}
              </div>
            ) : undefined}
          </div>
          {trailing != null ? <div className="flex shrink-0 flex-col">{trailing}</div> : undefined}
        </div>
      </header>
    );
  }

  return (
    <header className={cn("mb-10 border-b border-border-dim pb-8", className)}>
      {leading}
      <h1 className="text-4xl font-medium tracking-tight text-text-primary lg:text-5xl">{title}</h1>
      {description != null ? (
        <div
          className={cn(
            "mt-3 text-base leading-relaxed text-text-secondary [&_p]:m-0 [&_p+p]:mt-3",
            descriptionClassName,
          )}
        >
          {description}
        </div>
      ) : undefined}
    </header>
  );
}
