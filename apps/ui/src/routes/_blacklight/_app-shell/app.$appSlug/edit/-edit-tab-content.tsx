import { cn } from "@autonoma/blacklight";

export function EditTab({ children, className }: { children: React.ReactNode; className?: string }) {
  // TODO: Find a less hacky way to fix the height
  return <div className={cn("flex flex-1 h-[calc(100dvh-340px)] gap-4", className)}>{children}</div>;
}
