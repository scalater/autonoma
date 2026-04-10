import {
  Badge,
  Button,
  Panel,
  PanelBody,
  PanelHeader,
  PanelTitle,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Separator,
  Skeleton,
} from "@autonoma/blacklight";
import { ArrowSquareOutIcon } from "@phosphor-icons/react/ArrowSquareOut";
import { CheckCircleIcon } from "@phosphor-icons/react/CheckCircle";
import { GithubLogoIcon } from "@phosphor-icons/react/GithubLogo";
import { LinkBreakIcon } from "@phosphor-icons/react/LinkBreak";
import { WarningCircleIcon } from "@phosphor-icons/react/WarningCircle";
import { createFileRoute, useRouteContext } from "@tanstack/react-router";
import {
  useDisconnectGithub,
  useGithubConfig,
  useGithubInstallation,
  useGithubRepositories,
  useUpdateRepoConfig,
} from "lib/query/github.queries";
import { Suspense, useState } from "react";
import { useCurrentApplication } from "../../-use-current-application";
import { SettingsTabNav } from "../settings/-settings-tab-nav";

export const Route = createFileRoute("/_blacklight/_app-shell/app/$appSlug/github/")({
  component: GitHubSettingsPage,
});

function GitHubSettingsPage() {
  const { appSlug } = Route.useParams();
  const returnPath = `/app/${appSlug}/github`;

  return (
    <div className="flex flex-col gap-6">
      <SettingsTabNav activeTab="github" appSlug={appSlug} />
      <div className="max-w-3xl space-y-4">
        <Suspense fallback={<GitHubSettingsSkeleton />}>
          <GitHubSettingsContent returnPath={returnPath} />
        </Suspense>
      </div>
    </div>
  );
}

function GitHubSettingsSkeleton() {
  return (
    <Panel>
      <PanelHeader>
        <Skeleton className="h-5 w-40" />
      </PanelHeader>
      <PanelBody className="space-y-4">
        <Skeleton className="h-4 w-64" />
        <Skeleton className="h-10 w-48" />
      </PanelBody>
    </Panel>
  );
}

function GitHubSettingsContent({ returnPath }: { returnPath: string }) {
  const { data: installation } = useGithubInstallation();

  if (installation == null) {
    return <NotConnectedPanel returnPath={returnPath} />;
  }

  return (
    <>
      <InstallationPanel
        accountLogin={installation.accountLogin}
        status={installation.status}
        settingsUrl={installation.settingsUrl}
      />
      <Suspense fallback={<GitHubSettingsSkeleton />}>
        <LinkedRepositoryPanel settingsUrl={installation.settingsUrl} />
      </Suspense>
    </>
  );
}

function NotConnectedPanel({ returnPath }: { returnPath: string }) {
  const { data } = useGithubConfig(returnPath);

  return (
    <Panel>
      <PanelHeader>
        <PanelTitle>GitHub Integration</PanelTitle>
      </PanelHeader>
      <PanelBody className="space-y-4">
        <p className="text-xs text-text-secondary">
          Connect a GitHub App to enable automatic test updates when code changes are pushed.
        </p>
        <Button
          variant="accent"
          className="gap-2"
          onClick={() => {
            if (data.installUrl != null) {
              window.location.href = data.installUrl;
            }
          }}
          disabled={data.installUrl == null}
        >
          <GithubLogoIcon size={16} weight="bold" />
          Install GitHub App
        </Button>
      </PanelBody>
    </Panel>
  );
}

function InstallationPanel({
  accountLogin,
  status,
  settingsUrl,
}: {
  accountLogin: string;
  status: string;
  settingsUrl: string;
}) {
  const disconnect = useDisconnectGithub();
  const [confirming, setConfirming] = useState(false);

  return (
    <Panel>
      <PanelHeader>
        <PanelTitle>GitHub App</PanelTitle>
      </PanelHeader>
      <PanelBody className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <GithubLogoIcon size={20} weight="duotone" className="text-text-secondary" />
            <div>
              <p className="text-sm font-medium text-text-primary">{accountLogin}</p>
              <p className="font-mono text-2xs text-text-tertiary">GitHub App installation</p>
            </div>
          </div>
          <Badge variant={status === "active" ? "success" : "destructive"}>{status}</Badge>
        </div>

        <Separator />

        {confirming ? (
          <div className="flex items-center gap-3">
            <p className="text-xs text-status-critical">This will remove all linked repositories. Are you sure?</p>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => disconnect.mutate(undefined, { onSuccess: () => setConfirming(false) })}
              disabled={disconnect.isPending}
            >
              {disconnect.isPending ? "Disconnecting..." : "Confirm"}
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setConfirming(false)}>
              Cancel
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <a
              href={settingsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded px-3 py-1.5 text-xs text-text-tertiary transition-colors hover:bg-surface-raised hover:text-text-secondary"
            >
              <ArrowSquareOutIcon size={14} />
              Manage on GitHub
            </a>
            <Button variant="ghost" size="sm" className="gap-2 text-text-tertiary" onClick={() => setConfirming(true)}>
              <LinkBreakIcon size={14} />
              Disconnect
            </Button>
          </div>
        )}
      </PanelBody>
    </Panel>
  );
}

function LinkedRepositoryPanel({ settingsUrl }: { settingsUrl: string }) {
  const app = useCurrentApplication();
  const applications = useRouteContext({ from: "/_blacklight/_app-shell", select: (ctx) => ctx.applications });
  const { data: repos } = useGithubRepositories();
  const updateRepoConfig = useUpdateRepoConfig();

  const linkedRepo = repos.find((r) => r.applicationId === app.id);
  const appNameById = new Map(applications.map((a) => [a.id, a.name]));
  const [selectedRepoId, setSelectedRepoId] = useState<string | undefined>();
  const [watchBranch, setWatchBranch] = useState("main");

  function handleSave() {
    if (selectedRepoId == null) return;

    const repo = repos.find((r) => r.id === selectedRepoId);
    updateRepoConfig.mutate({
      repoId: selectedRepoId,
      watchBranch,
      deploymentTrigger: (repo?.deploymentTrigger as "push" | "github_action") ?? "push",
      applicationId: app.id,
    });
  }

  function handleRepoChange(value: string | null) {
    if (value == null) return;
    setSelectedRepoId(value);
    const repo = repos.find((r) => r.id === value);
    if (repo?.defaultBranch != null) {
      setWatchBranch(repo.defaultBranch);
    }
  }

  if (linkedRepo != null) {
    return (
      <Panel>
        <PanelHeader>
          <PanelTitle>Linked Repository</PanelTitle>
        </PanelHeader>
        <PanelBody>
          <div className="flex items-center gap-3">
            <CheckCircleIcon size={18} weight="fill" className="text-status-success" />
            <div>
              <p className="text-sm font-medium text-text-primary">{linkedRepo.fullName}</p>
              <p className="font-mono text-2xs text-text-tertiary">
                watching <span className="text-text-secondary">{linkedRepo.watchBranch ?? "main"}</span>
              </p>
            </div>
          </div>
        </PanelBody>
      </Panel>
    );
  }

  return (
    <Panel>
      <PanelHeader>
        <PanelTitle>Linked Repository</PanelTitle>
      </PanelHeader>
      <PanelBody className="space-y-5">
        <div className="flex items-start gap-3 rounded border border-status-warn/20 bg-status-warn/5 px-4 py-3">
          <WarningCircleIcon size={16} weight="fill" className="mt-0.5 shrink-0 text-status-warn" />
          <p className="text-xs text-text-secondary">
            No repository is linked to this application. Link a repository to enable automatic test updates when code
            changes are pushed.
          </p>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="font-mono text-2xs uppercase tracking-widest text-text-tertiary">Repository</label>
          <Select value={selectedRepoId ?? ""} onValueChange={handleRepoChange}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select a repository">
                {repos.find((r) => r.id === selectedRepoId)?.fullName}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {repos.map((repo) => {
                const { applicationId: repoAppId } = repo;
                const isLinkedToOtherApp = repoAppId != null && repoAppId !== app.id;
                const otherAppName = isLinkedToOtherApp ? appNameById.get(repoAppId) : undefined;
                return (
                  <SelectItem key={repo.id} value={repo.id} disabled={isLinkedToOtherApp}>
                    {isLinkedToOtherApp
                      ? `${repo.fullName} (linked to ${otherAppName ?? "another app"})`
                      : repo.fullName}
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
          <p className="font-mono text-2xs text-text-tertiary">
            Can't find your repository?{" "}
            <a
              href={settingsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary-ink underline underline-offset-2 transition-colors hover:text-primary-ink/80"
            >
              Configure repository access on GitHub
            </a>
          </p>
        </div>

        {selectedRepoId != null && (
          <div className="flex flex-col gap-1.5">
            <label className="font-mono text-2xs uppercase tracking-widest text-text-tertiary">Branch to watch</label>
            <input
              type="text"
              value={watchBranch}
              onChange={(e) => setWatchBranch(e.target.value)}
              className="w-full border border-border-dim bg-surface-base px-4 py-2.5 font-mono text-xs text-text-primary placeholder-text-tertiary/50 outline-none focus:border-primary-ink/50"
            />
            <p className="font-mono text-2xs text-text-tertiary">
              Autonoma will analyze changes pushed to this branch.
            </p>
          </div>
        )}

        <Button
          variant="accent"
          size="sm"
          onClick={handleSave}
          disabled={selectedRepoId == null || watchBranch.length === 0 || updateRepoConfig.isPending}
        >
          {updateRepoConfig.isPending ? "Saving..." : "Link Repository"}
        </Button>
      </PanelBody>
    </Panel>
  );
}
