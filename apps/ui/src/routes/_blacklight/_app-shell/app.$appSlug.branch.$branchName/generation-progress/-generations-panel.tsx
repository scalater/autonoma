import { Badge, Card, CardContent } from "@autonoma/blacklight";
import { Link, useParams } from "@tanstack/react-router";
import type { EnrichedGeneration } from "lib/query/snapshot-edit.queries";

const STATUS_BADGE_VARIANT = {
  pending: "status-pending",
  queued: "status-pending",
  running: "status-running",
  success: "status-passed",
  failed: "status-failed",
} as const;

export function GenerationsPanel({ generations }: { generations: EnrichedGeneration[] }) {
  return (
    <div className="flex flex-col overflow-hidden border border-border-mid bg-surface-raised">
      <div className="flex shrink-0 items-center gap-2 border-b border-border-dim px-4 py-3">
        <span className="text-sm font-medium text-text-primary">Generations</span>
        <Badge variant="secondary" className="px-1.5 py-0 text-3xs">
          {generations.length}
        </Badge>
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        {generations.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <p className="text-2xs text-text-tertiary">No generations yet</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {generations.map((g) => (
              <GenerationCard key={g.generationId} generation={g} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function GenerationCard({ generation }: { generation: EnrichedGeneration }) {
  const { appSlug, branchName } = useParams({ from: "/_blacklight/_app-shell/app/$appSlug/branch/$branchName" });

  return (
    <Link
      to="/app/$appSlug/branch/$branchName/generations/$generationId"
      params={{ appSlug, branchName, generationId: generation.generationId }}
    >
      <Card variant="raised" size="default" className="transition-colors hover:bg-surface-base">
        <CardContent className="flex items-center justify-between gap-2">
          <span className="truncate font-mono text-sm text-text-primary">{generation.testCaseName}</span>
          <Badge variant={STATUS_BADGE_VARIANT[generation.status]} className="shrink-0">
            {generation.status}
          </Badge>
        </CardContent>
      </Card>
    </Link>
  );
}
