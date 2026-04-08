import {
  Button,
  Drawer,
  DrawerBackdrop,
  DrawerClose,
  DrawerContent,
  ScrollArea,
  Separator,
  Skeleton,
} from "@autonoma/blacklight";
import { CopyIcon } from "@phosphor-icons/react/Copy";
import { XIcon } from "@phosphor-icons/react/X";
import { useSkillDetail } from "lib/query/skills.queries";
import { toastManager } from "lib/toast-manager";
import { Suspense } from "react";
import Markdown from "react-markdown";
import { useCurrentApplication } from "../../-use-current-application";

interface ViewSkillDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  skillSlug: string;
  skillName: string;
}

export function ViewSkillDrawer({ open, onOpenChange, skillSlug, skillName }: ViewSkillDrawerProps) {
  return (
    <Drawer side="right" open={open} onOpenChange={onOpenChange}>
      <DrawerBackdrop />
      <DrawerContent side="right" className="flex w-[560px] max-w-[90vw] flex-col gap-0 p-0">
        <div className="flex shrink-0 items-start justify-between gap-4 px-6 py-5">
          <div className="flex flex-col gap-1">
            <span className="font-mono text-3xs font-medium uppercase tracking-wider text-text-tertiary">Skill</span>
            <h2 className="font-sans text-base font-semibold text-text-primary">{skillName}</h2>
            <span className="font-mono text-2xs text-text-tertiary">{skillSlug}</span>
          </div>
          <DrawerClose render={<Button variant="ghost" size="icon-xs" className="shrink-0 mt-0.5" />}>
            <XIcon size={14} />
          </DrawerClose>
        </div>
        <Separator />
        {skillSlug !== "" && (
          <Suspense fallback={<SkillContentSkeleton />}>
            <SkillContent skillSlug={skillSlug} />
          </Suspense>
        )}
      </DrawerContent>
    </Drawer>
  );
}

async function copyToClipboard(text: string) {
  let copied = false;
  try {
    await navigator.clipboard.writeText(text);
    copied = true;
  } catch {
    // Fallback for HTTP contexts where clipboard API is unavailable
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.select();
    copied = document.execCommand("copy");
    document.body.removeChild(textarea);
  }
  if (copied) {
    toastManager.add({ title: "Copied to clipboard", type: "success" });
  } else {
    toastManager.add({ title: "Failed to copy", type: "critical" });
  }
}

function CopyButton({ content }: { content: string }) {
  return (
    <Button variant="ghost" size="icon-xs" className="shrink-0 mt-0.5" onClick={() => void copyToClipboard(content)}>
      <CopyIcon size={14} />
    </Button>
  );
}

function SkillContent({ skillSlug }: { skillSlug: string }) {
  const app = useCurrentApplication();
  const { data: skill } = useSkillDetail(app.id, skillSlug);

  return (
    <>
      <div className="flex items-center gap-2 border-b border-border-dim px-6 py-2">
        <span className="font-mono text-3xs text-text-tertiary">Copy skill content</span>
        <CopyButton content={skill.content ?? ""} />
      </div>
      <ScrollArea className="flex-1">
        <div className="px-6 py-5">
          <article className="font-sans">
            <Markdown
              components={{
                h1: ({ children }) => (
                  <h1 className="mb-3 mt-0 border-b border-border-dim pb-2 font-sans text-sm font-semibold text-text-primary">
                    {children}
                  </h1>
                ),
                h2: ({ children }) => (
                  <h2 className="mb-2 mt-6 font-sans text-xs font-semibold uppercase tracking-wider text-text-tertiary">
                    {children}
                  </h2>
                ),
                h3: ({ children }) => (
                  <h3 className="mb-2 mt-5 font-sans text-xs font-semibold text-text-primary">{children}</h3>
                ),
                p: ({ children }) => (
                  <p className="mb-3 font-sans text-sm leading-relaxed text-text-secondary">{children}</p>
                ),
                strong: ({ children }) => (
                  <strong className="font-sans font-semibold text-text-primary">{children}</strong>
                ),
                code: ({ children }) => (
                  <code className="rounded bg-surface-base px-1.5 py-0.5 font-mono text-xs text-text-primary">
                    {children}
                  </code>
                ),
                ul: ({ children }) => (
                  <ul className="mb-3 space-y-1.5 pl-4 font-sans text-sm text-text-secondary [&>li]:relative [&>li]:pl-3 [&>li]:before:absolute [&>li]:before:left-0 [&>li]:before:text-text-tertiary [&>li]:before:content-['-']">
                    {children}
                  </ul>
                ),
                ol: ({ children }) => (
                  <ol className="mb-3 list-inside list-decimal space-y-1.5 font-sans text-sm text-text-secondary">
                    {children}
                  </ol>
                ),
                li: ({ children }) => (
                  <li className="font-sans text-sm leading-relaxed text-text-secondary">{children}</li>
                ),
                a: ({ href, children }) => (
                  <a
                    href={href}
                    className="text-text-primary underline underline-offset-2 hover:text-text-secondary"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {children}
                  </a>
                ),
                hr: () => <hr className="my-5 border-border-dim" />,
              }}
            >
              {skill.content ?? ""}
            </Markdown>
          </article>
        </div>
      </ScrollArea>
    </>
  );
}

function SkillContentSkeleton() {
  return (
    <div className="flex flex-col gap-4 px-6 py-5">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-3.5 w-full" />
        <Skeleton className="h-3.5 w-5/6" />
        <Skeleton className="h-3.5 w-full" />
      </div>
      <div className="flex flex-col gap-2">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-3.5 w-full" />
        <Skeleton className="h-3.5 w-4/5" />
      </div>
      <div className="flex flex-col gap-2">
        <Skeleton className="h-3 w-28" />
        <Skeleton className="h-3.5 w-full" />
        <Skeleton className="h-3.5 w-3/4" />
        <Skeleton className="h-3.5 w-full" />
      </div>
    </div>
  );
}
