import { GitPullRequestIcon } from "@phosphor-icons/react/GitPullRequest";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_blacklight/_app-shell/app/$appSlug/pull-requests/")({
  component: PullRequestsPage,
});

function PullRequestsPage() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 text-text-tertiary">
      <GitPullRequestIcon size={32} />
      <p className="text-sm">Pull Requests coming soon</p>
    </div>
  );
}
