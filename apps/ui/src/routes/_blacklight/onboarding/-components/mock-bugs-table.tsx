import { Badge, Panel, PanelBody, PanelHeader, PanelTitle } from "@autonoma/blacklight";
import { BugBeetleIcon } from "@phosphor-icons/react/BugBeetle";

interface MockBug {
  title: string;
  status: "open" | "resolved" | "resurfaced";
  severity: "critical" | "high" | "medium";
  firstSeen: string;
  occurrences: number;
}

const MOCK_BUGS: MockBug[] = [
  {
    title: "Login form rejects valid credentials",
    status: "open",
    severity: "critical",
    firstSeen: "2 days ago",
    occurrences: 12,
  },
  {
    title: "Cart total miscalculation on discount",
    status: "resurfaced",
    severity: "high",
    firstSeen: "1 week ago",
    occurrences: 8,
  },
  {
    title: "Search returns empty for existing products",
    status: "resolved",
    severity: "medium",
    firstSeen: "3 days ago",
    occurrences: 3,
  },
  {
    title: "Checkout hangs on payment step",
    status: "open",
    severity: "high",
    firstSeen: "1 day ago",
    occurrences: 5,
  },
];

const STATUS_BADGE_VARIANT = {
  open: "critical",
  resolved: "success",
  resurfaced: "warn",
} as const;

const STATUS_LABEL = {
  open: "Open",
  resolved: "Resolved",
  resurfaced: "Resurfaced",
} as const;

const SEVERITY_BADGE_VARIANT = {
  critical: "critical",
  high: "warn",
  medium: "secondary",
} as const;

export function MockBugsPage() {
  return (
    <Panel>
      <PanelHeader>
        <PanelTitle>
          <BugBeetleIcon size={16} weight="duotone" />
          Tracked Bugs
          <Badge variant="secondary" className="ml-1 text-4xs">
            {MOCK_BUGS.length}
          </Badge>
        </PanelTitle>
      </PanelHeader>
      <PanelBody className="overflow-auto p-0">
        <table className="w-full table-fixed text-sm">
          <thead>
            <tr className="border-b border-border-dim">
              <th className="w-[35%] px-4 py-2.5 text-left font-mono text-2xs font-medium uppercase tracking-widest text-text-tertiary">
                Bug
              </th>
              <th className="w-[18%] px-4 py-2.5 text-left font-mono text-2xs font-medium uppercase tracking-widest text-text-tertiary">
                Status
              </th>
              <th className="w-[17%] px-4 py-2.5 text-left font-mono text-2xs font-medium uppercase tracking-widest text-text-tertiary">
                Severity
              </th>
              <th className="w-[15%] px-4 py-2.5 text-right font-mono text-2xs font-medium uppercase tracking-widest text-text-tertiary">
                Issues
              </th>
              <th className="w-[15%] px-4 py-2.5 text-right font-mono text-2xs font-medium uppercase tracking-widest text-text-tertiary">
                First Seen
              </th>
            </tr>
          </thead>
          <tbody>
            {MOCK_BUGS.map((bug) => (
              <tr key={bug.title} className="border-b border-border-dim last:border-0">
                <td className="truncate px-4 py-2.5 text-2xs font-medium text-text-primary">{bug.title}</td>
                <td className="px-4 py-2.5">
                  <Badge variant={STATUS_BADGE_VARIANT[bug.status]} className="text-4xs">
                    {STATUS_LABEL[bug.status]}
                  </Badge>
                </td>
                <td className="px-4 py-2.5">
                  <Badge variant={SEVERITY_BADGE_VARIANT[bug.severity]} className="text-4xs capitalize">
                    {bug.severity}
                  </Badge>
                </td>
                <td className="px-4 py-2.5 text-right font-mono text-3xs text-text-tertiary">{bug.occurrences}</td>
                <td className="px-4 py-2.5 text-right font-mono text-3xs text-text-tertiary">{bug.firstSeen}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </PanelBody>
    </Panel>
  );
}
