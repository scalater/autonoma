import { Button, Skeleton } from "@autonoma/blacklight";
import { ArrowLeftIcon } from "@phosphor-icons/react/ArrowLeft";
import { Link, createFileRoute } from "@tanstack/react-router";
import { ensureBranchData } from "lib/query/branches.queries";
import { useEditSession } from "lib/query/snapshot-edit.queries";
import { useCurrentBranch } from "../-use-current-branch";
import { ChangesPanel } from "./-changes-panel";
import { GenerationsPanel } from "./-generations-panel";

export const Route = createFileRoute("/_blacklight/_app-shell/app/$appSlug/branch/$branchName/generation-progress/")({
  loader: async ({ context, params: { appSlug, branchName } }) => {
    const app = context.applications.find((a) => a.slug === appSlug);
    if (app == null) return;
    await ensureBranchData(context.queryClient, app.id, branchName);
  },
  component: GenerationProgressPage,
  pendingComponent: GenerationProgressSkeleton,
});

// ─── Page ────────────────────────────────────────────────────────────────────

function GenerationProgressPage() {
  const branch = useCurrentBranch();
  const { appSlug, branchName } = Route.useParams();

  if (branch.pendingSnapshotId == null) {
    return (
      <div className="flex flex-col gap-6">
        <BackHeader appSlug={appSlug} branchName={branchName} />
        <div className="flex flex-col items-center justify-center gap-2 py-16 text-text-tertiary">
          <p className="text-sm">No generation in progress</p>
          <Button
            size="sm"
            variant="outline"
            render={<Link to="/app/$appSlug/branch/$branchName" params={{ appSlug, branchName }} />}
          >
            Back to overview
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <BackHeader appSlug={appSlug} branchName={branchName} />
      <GenerationProgressContent branchId={branch.id} />
    </div>
  );
}

function BackHeader({ appSlug, branchName }: { appSlug: string; branchName: string }) {
  return (
    <header>
      <div className="mb-2">
        <Button
          variant="ghost"
          size="xs"
          className="gap-1.5 text-text-tertiary"
          render={<Link to="/app/$appSlug/branch/$branchName" params={{ appSlug, branchName }} />}
        >
          <ArrowLeftIcon size={12} />
          Back to overview
        </Button>
      </div>
      <h1 className="text-2xl font-medium tracking-tight text-text-primary">Generation Progress</h1>
      <p className="mt-1 font-mono text-xs text-text-secondary">Track the progress of tests being generated</p>
    </header>
  );
}

// ─── Content ─────────────────────────────────────────────────────────────────

function GenerationProgressContent({ branchId }: { branchId: string }) {
  const { data: session } = useEditSession(branchId);
  const allGenerations = [...session.pendingGenerations, ...session.activeGenerations, ...session.completedGenerations];

  return (
    <div className="grid h-[calc(100dvh-340px)] grid-cols-2 gap-4">
      <ChangesPanel changes={session.changes} />
      <GenerationsPanel generations={allGenerations} />
    </div>
  );
}

// ─── Skeleton ────────────────────────────────────────────────────────────────

function GenerationProgressSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <Skeleton className="mb-2 h-4 w-32" />
        <Skeleton className="h-8 w-64" />
        <Skeleton className="mt-2 h-4 w-80" />
      </div>
      <div className="grid grid-cols-2 gap-4">
        {["sk-1", "sk-2"].map((id) => (
          <Skeleton key={id} className="h-96" />
        ))}
      </div>
    </div>
  );
}
