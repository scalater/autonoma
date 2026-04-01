import { Button, Skeleton } from "@autonoma/blacklight";
import { PencilSimpleIcon } from "@phosphor-icons/react/PencilSimple";
import { createFileRoute, Link, Outlet } from "@tanstack/react-router";
import { useAuth } from "lib/auth";
import { Suspense } from "react";
import { useCurrentBranch } from "../-use-current-branch";
import { TestsTreeProvider } from "./-tests-tree/tests-tree-context";
import { TestsTreePanel } from "./-tests-tree/tests-tree-panel";

export const Route = createFileRoute("/_blacklight/_app-shell/app/$appSlug/branch/$branchName/tests")({
  component: TestsPage,
});

function TreePanelSkeleton() {
  return (
    <div className="flex flex-col gap-2 p-3">
      <Skeleton className="h-4 w-32" />
      <Skeleton className="ml-4 h-4 w-24" />
      <Skeleton className="ml-4 h-4 w-28" />
      <Skeleton className="ml-4 h-4 w-20" />
    </div>
  );
}

function TestsPage() {
  const branch = useCurrentBranch();
  const { appSlug, branchName } = Route.useParams();
  const testCount = branch.activeSnapshot.testCaseAssignments.length;
  const hasPending = branch.pendingSnapshotId != null;
  const { isAdmin } = useAuth();

  return (
    <TestsTreeProvider>
      <div className="flex flex-col gap-6">
        <header className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-medium tracking-tight text-text-primary">Tests</h1>
            <p className="mt-1 font-mono text-xs text-text-secondary">
              {testCount} {testCount === 1 ? "test" : "tests"} on branch {branch.name}
            </p>
          </div>

          {isAdmin && (
            <Button
              size="sm"
              className="gap-1.5 font-mono text-2xs"
              render={<Link to="/app/$appSlug/branch/$branchName/edit" params={{ appSlug, branchName }} />}
            >
              <PencilSimpleIcon size={12} />
              {hasPending ? "Continue editing" : "Edit test suite"}
            </Button>
          )}
        </header>

        <div className="flex min-h-0 flex-1 gap-4">
          <div className="w-72 shrink-0 overflow-hidden">
            <div className="h-full border border-border-mid bg-surface-raised">
              <Suspense fallback={<TreePanelSkeleton />}>
                <TestsTreePanel />
              </Suspense>
            </div>
          </div>

          <div className="min-w-0 flex-1 overflow-hidden border border-border-mid bg-surface-raised">
            <Outlet />
          </div>
        </div>
      </div>
    </TestsTreeProvider>
  );
}
