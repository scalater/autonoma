import { useState } from "react";
import { MockBugsPage } from "./mock-bugs-table";
import { MockGenerationsPage, MockIssuesPage } from "./mock-pages";
import { MockRunsPage } from "./mock-runs-table";
import { type MockPage, MockSidebar } from "./mock-sidebar";

const MOCK_CONTENT_HEIGHT = 480;

interface PageDescription {
  title: string;
  description: string;
}

const PAGE_DESCRIPTIONS: Record<MockPage, PageDescription> = {
  generations: {
    title: "Generations",
    description:
      "AI-generated test cases. The agent analyzes your codebase and produces test cases described in natural language. Review what the agent created, inspect each step, and manage your test suite.",
  },
  issues: {
    title: "Issues",
    description:
      "When a generation or run fails, an Issue is created. It's a specific diagnosis of what went wrong - it could be an app bug or an agent error. Each Issue is tied to one particular generation or run.",
  },
  bugs: {
    title: "Bugs",
    description:
      "Confirmed application bugs that need fixing. Bugs group related Issues together - for example, if the login breaks across 100 tests, you see 1 Bug with 100 Issues. Tracked per branch with full history: first seen, resolved, resurfaced.",
  },
  runs: {
    title: "Runs",
    description:
      "Each run is a test execution on a real browser. See results, screenshots, and video recordings of every step the agent performed.",
  },
};

function MockPageContent({ page }: { page: MockPage }) {
  switch (page) {
    case "generations":
      return <MockGenerationsPage />;
    case "issues":
      return <MockIssuesPage />;
    case "bugs":
      return <MockBugsPage />;
    case "runs":
      return <MockRunsPage />;
  }
}

export function MockDashboard() {
  const [activePage, setActivePage] = useState<MockPage>("bugs");
  const activeDescription = PAGE_DESCRIPTIONS[activePage];

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-[1fr_260px] gap-6">
        {/* Left: Mock window */}
        <div className="overflow-hidden rounded-lg border border-border-dim shadow-lg">
          {/* Title bar */}
          <div className="flex items-center gap-2 border-b border-border-dim bg-surface-raised px-4 py-2.5">
            <div className="flex gap-1.5">
              <div className="size-2.5 rounded-full bg-status-critical/60" />
              <div className="size-2.5 rounded-full bg-status-warn/60" />
              <div className="size-2.5 rounded-full bg-status-success/60" />
            </div>
            <span className="flex-1 text-center font-mono text-4xs text-text-tertiary">app.autonoma.ai</span>
          </div>

          {/* Dashboard content */}
          <div className="grid grid-cols-[140px_1fr]" style={{ height: MOCK_CONTENT_HEIGHT }}>
            <MockSidebar activePage={activePage} onPageChange={setActivePage} />
            <div className="overflow-y-auto bg-surface-void p-3">
              <MockPageContent page={activePage} />
            </div>
          </div>
        </div>

        {/* Right: Description sidebar */}
        <div className="flex flex-col gap-4">
          {/* Active page description */}
          <div className="border border-border-dim bg-surface-base p-4">
            <span className="mb-2 block font-mono text-3xs font-medium uppercase tracking-widest text-primary-ink">
              {activeDescription.title}
            </span>
            <p className="text-sm leading-relaxed text-text-secondary">{activeDescription.description}</p>
          </div>

          {/* Issues vs Bugs callout */}
          <div className="border border-primary-ink/20 bg-primary-ink/5 p-4">
            <h3 className="mb-3 font-mono text-3xs font-medium uppercase tracking-widest text-primary-ink">
              Issues vs Bugs
            </h3>
            <div className="space-y-2 text-2xs leading-relaxed text-text-secondary">
              <p>
                <span className="font-medium text-text-primary">Issue</span> - A single failure diagnosis from a
                generation or run. One specific instance where something went wrong.
              </p>
              <p>
                <span className="font-medium text-text-primary">Bug</span> - A confirmed, grouped application problem.
                When the same failure appears across multiple tests, Issues are grouped into one Bug.
              </p>
            </div>
          </div>

          {/* Hint */}
          <p className="text-3xs leading-relaxed text-text-tertiary">
            Click items in the sidebar to explore each section of the dashboard.
          </p>
        </div>
      </div>
    </div>
  );
}
