import { CircleNotchIcon } from "@phosphor-icons/react/CircleNotch";
import { Link } from "@tanstack/react-router";
import { useCurrentApplication } from "../-use-current-application";
import { useCurrentBranch } from "./-use-current-branch";

export function GenerationBanner() {
  const app = useCurrentApplication();
  const branch = useCurrentBranch();

  const hasPendingSnapshot = branch.pendingSnapshotId != null;

  if (!hasPendingSnapshot) return null;

  return (
    <Link
      to="/app/$appSlug/branch/$branchName/generation-progress"
      params={{ appSlug: app.slug, branchName: branch.name }}
      className="flex items-center gap-1.5 border-l-2 border-primary bg-accent-dim px-2.5 py-1 font-mono text-3xs font-medium text-primary-ink transition-opacity hover:opacity-80"
    >
      <CircleNotchIcon size={10} className="animate-spin" />
      Generation in progress
    </Link>
  );
}
