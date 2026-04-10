import { Badge, Panel, PanelBody, PanelHeader, PanelTitle } from "@autonoma/blacklight";
import { LightningIcon } from "@phosphor-icons/react/Lightning";
import { WarningIcon } from "@phosphor-icons/react/Warning";

/* ─── Generations Page ─── */

interface MockGeneration {
  name: string;
  status: "completed" | "failed" | "running";
  steps: number;
  created: string;
}

const MOCK_GENERATIONS: MockGeneration[] = [
  { name: "User login with valid credentials", status: "completed", steps: 8, created: "1 hour ago" },
  { name: "Add item to cart and checkout", status: "completed", steps: 12, created: "1 hour ago" },
  { name: "Search products by keyword", status: "failed", steps: 3, created: "2 hours ago" },
  { name: "Reset password flow", status: "running", steps: 6, created: "30 min ago" },
];

const GEN_STATUS_VARIANT = {
  completed: "success",
  failed: "critical",
  running: "status-running",
} as const;

export function MockGenerationsPage() {
  return (
    <Panel>
      <PanelHeader>
        <PanelTitle>
          <LightningIcon size={16} weight="duotone" />
          Generations
          <Badge variant="secondary" className="ml-1 text-4xs">
            {MOCK_GENERATIONS.length}
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
                Created
              </th>
            </tr>
          </thead>
          <tbody>
            {MOCK_GENERATIONS.map((gen) => (
              <tr key={gen.name} className="border-b border-border-dim last:border-0">
                <td className="truncate px-4 py-2.5 text-2xs font-medium text-text-primary">{gen.name}</td>
                <td className="px-4 py-2.5">
                  <Badge variant={GEN_STATUS_VARIANT[gen.status]} className="text-4xs capitalize">
                    {gen.status}
                  </Badge>
                </td>
                <td className="px-4 py-2.5 text-right font-mono text-3xs text-text-tertiary">{gen.steps}</td>
                <td className="px-4 py-2.5 text-right font-mono text-3xs text-text-tertiary">{gen.created}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </PanelBody>
    </Panel>
  );
}

/* ─── Issues Page ─── */

interface MockIssue {
  title: string;
  category: "application_bug" | "agent_error";
  severity: "critical" | "high" | "medium";
  testName: string;
  created: string;
}

const MOCK_ISSUES: MockIssue[] = [
  {
    title: "Login button unresponsive after invalid input",
    category: "application_bug",
    severity: "critical",
    testName: "User login with valid credentials",
    created: "2 hours ago",
  },
  {
    title: "Cart badge count not updated",
    category: "application_bug",
    severity: "high",
    testName: "Add item to cart and checkout",
    created: "3 hours ago",
  },
  {
    title: "Could not locate search input",
    category: "agent_error",
    severity: "medium",
    testName: "Search products by keyword",
    created: "4 hours ago",
  },
];

const CATEGORY_VARIANT = {
  application_bug: "critical",
  agent_error: "warn",
} as const;

const CATEGORY_LABEL = {
  application_bug: "App Bug",
  agent_error: "Agent Error",
} as const;

const SEVERITY_VARIANT = {
  critical: "critical",
  high: "warn",
  medium: "secondary",
} as const;

export function MockIssuesPage() {
  return (
    <Panel>
      <PanelHeader>
        <PanelTitle>
          <WarningIcon size={16} weight="duotone" />
          Issues
          <Badge variant="secondary" className="ml-1 text-4xs">
            {MOCK_ISSUES.length}
          </Badge>
        </PanelTitle>
      </PanelHeader>
      <PanelBody className="overflow-auto p-0">
        <table className="w-full table-fixed text-sm">
          <thead>
            <tr className="border-b border-border-dim">
              <th className="w-[35%] px-4 py-2.5 text-left font-mono text-2xs font-medium uppercase tracking-widest text-text-tertiary">
                Title
              </th>
              <th className="w-[18%] px-4 py-2.5 text-left font-mono text-2xs font-medium uppercase tracking-widest text-text-tertiary">
                Category
              </th>
              <th className="w-[15%] px-4 py-2.5 text-left font-mono text-2xs font-medium uppercase tracking-widest text-text-tertiary">
                Severity
              </th>
              <th className="w-[32%] px-4 py-2.5 text-right font-mono text-2xs font-medium uppercase tracking-widest text-text-tertiary">
                Test
              </th>
            </tr>
          </thead>
          <tbody>
            {MOCK_ISSUES.map((issue) => (
              <tr key={issue.title} className="border-b border-border-dim last:border-0">
                <td className="truncate px-4 py-2.5 text-2xs font-medium text-text-primary">{issue.title}</td>
                <td className="px-4 py-2.5">
                  <Badge variant={CATEGORY_VARIANT[issue.category]} className="text-4xs">
                    {CATEGORY_LABEL[issue.category]}
                  </Badge>
                </td>
                <td className="px-4 py-2.5">
                  <Badge variant={SEVERITY_VARIANT[issue.severity]} className="text-4xs capitalize">
                    {issue.severity}
                  </Badge>
                </td>
                <td className="truncate px-4 py-2.5 text-right text-3xs text-text-tertiary">{issue.testName}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </PanelBody>
    </Panel>
  );
}
