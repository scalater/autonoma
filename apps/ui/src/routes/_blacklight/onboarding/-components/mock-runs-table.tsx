import { Badge, Panel, PanelBody, PanelHeader, PanelTitle } from "@autonoma/blacklight";
import { PlayIcon } from "@phosphor-icons/react/Play";

interface MockRun {
  name: string;
  status: "passed" | "failed" | "running";
  steps: number;
  duration: string;
  started: string;
}

const MOCK_RUNS: MockRun[] = [
  { name: "User login with valid credentials", status: "passed", steps: 8, duration: "1m 24s", started: "2 min ago" },
  { name: "Add item to cart and checkout", status: "failed", steps: 12, duration: "2m 05s", started: "5 min ago" },
  { name: "Search products by keyword", status: "passed", steps: 6, duration: "0m 52s", started: "8 min ago" },
  { name: "Reset password flow", status: "running", steps: 4, duration: "0m 31s", started: "1 min ago" },
];

const STATUS_BADGE_VARIANT = {
  passed: "status-passed",
  failed: "status-failed",
  running: "status-running",
} as const;

const STATUS_LABEL = {
  passed: "Passed",
  failed: "Failed",
  running: "Running",
} as const;

export function MockRunsPage() {
  return (
    <Panel>
      <PanelHeader>
        <PanelTitle>
          <PlayIcon size={16} weight="duotone" />
          Runs
          <Badge variant="secondary" className="ml-1 text-4xs">
            {MOCK_RUNS.length}
          </Badge>
        </PanelTitle>
      </PanelHeader>
      <PanelBody className="overflow-auto p-0">
        <table className="w-full table-fixed text-sm">
          <thead>
            <tr className="border-b border-border-dim">
              <th className="w-[45%] px-4 py-2.5 text-left font-mono text-2xs font-medium uppercase tracking-widest text-text-tertiary">
                Test
              </th>
              <th className="w-[20%] px-4 py-2.5 text-left font-mono text-2xs font-medium uppercase tracking-widest text-text-tertiary">
                Status
              </th>
              <th className="w-[15%] px-4 py-2.5 text-right font-mono text-2xs font-medium uppercase tracking-widest text-text-tertiary">
                Steps
              </th>
              <th className="w-[20%] px-4 py-2.5 text-right font-mono text-2xs font-medium uppercase tracking-widest text-text-tertiary">
                Duration
              </th>
            </tr>
          </thead>
          <tbody>
            {MOCK_RUNS.map((run) => (
              <tr key={run.name} className="border-b border-border-dim last:border-0">
                <td className="truncate px-4 py-2.5 text-2xs font-medium text-text-primary">{run.name}</td>
                <td className="px-4 py-2.5">
                  <Badge variant={STATUS_BADGE_VARIANT[run.status]} className="text-4xs">
                    {STATUS_LABEL[run.status]}
                  </Badge>
                </td>
                <td className="px-4 py-2.5 text-right font-mono text-3xs text-text-tertiary">{run.steps}</td>
                <td className="px-4 py-2.5 text-right font-mono text-3xs text-text-tertiary">{run.duration}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </PanelBody>
    </Panel>
  );
}
