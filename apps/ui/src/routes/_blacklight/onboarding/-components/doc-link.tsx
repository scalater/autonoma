import { ArrowSquareOutIcon } from "@phosphor-icons/react/ArrowSquareOut";
import type { ReactNode } from "react";

interface DocLinkProps {
  href: string;
  children: ReactNode;
}

export function DocLink({ href, children }: DocLinkProps) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1 text-primary-ink underline decoration-primary-ink/30 underline-offset-2 transition-colors hover:decoration-primary-ink"
    >
      {children}
      <ArrowSquareOutIcon size={12} weight="bold" className="shrink-0" />
    </a>
  );
}
