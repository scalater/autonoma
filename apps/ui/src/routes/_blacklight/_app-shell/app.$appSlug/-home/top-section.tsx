import { MetricCard, MetricLabel, MetricUnit, MetricValue, Panel, PanelBody, Sparkline } from "@autonoma/blacklight";
import { ArrowDownIcon } from "@phosphor-icons/react/ArrowDown";
import { ArrowUpIcon } from "@phosphor-icons/react/ArrowUp";
import { useSuspenseQuery } from "@tanstack/react-query";
import { trpc } from "lib/trpc";
import { useCurrentApplication } from "../../-use-current-application";
import { bucketByDay, countInRange, monthOverMonthChange } from "./helpers";

function TrendBadge({ change, invertColor }: { change: number | undefined; invertColor?: boolean }) {
  if (change == null) return null;

  if (change === 0) {
    return (
      <span className="inline-flex items-center gap-0.5 font-mono text-3xs font-medium text-text-tertiary">
        0% vs last month
      </span>
    );
  }

  const isPositive = change > 0;
  const isGood = invertColor === true ? !isPositive : isPositive;

  return (
    <span
      className={`inline-flex items-center gap-0.5 font-mono text-3xs font-medium ${isGood ? "text-status-success" : "text-status-critical"}`}
    >
      {isPositive ? <ArrowUpIcon size={10} weight="bold" /> : <ArrowDownIcon size={10} weight="bold" />}
      {Math.abs(change)}% vs last month
    </span>
  );
}

export function TopSection() {
  const app = useCurrentApplication();
  const { data: testCases } = useSuspenseQuery(trpc.tests.list.queryOptions({ applicationId: app.id }));
  const { data: generations } = useSuspenseQuery(trpc.generations.list.queryOptions({ applicationId: app.id }));
  const { data: runs } = useSuspenseQuery(trpc.runs.list.queryOptions({ applicationId: app.id }));
  const { data: bugs } = useSuspenseQuery(trpc.bugs.list.queryOptions({ applicationId: app.id }));

  const now = Date.now();
  const thisMonthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).getTime();

  // Bugs
  const bugsThisMonth = countInRange(bugs, (b) => b.firstSeenAt, thisMonthStart, now);
  const bugSparkline = bucketByDay(bugs, (b) => b.firstSeenAt, 30);
  const bugChange = monthOverMonthChange(bugs, (b) => b.firstSeenAt);

  // Runs - use startedAt, defaulting to epoch for pending runs
  const getRunDate = (r: (typeof runs)[number]) => r.startedAt ?? new Date(0);
  const runsThisMonth = countInRange(runs, getRunDate, thisMonthStart, now);
  const runSparkline = bucketByDay(runs, getRunDate, 30);
  const passedRuns = runs.filter((r) => r.status === "success");
  const passRate = runs.length > 0 ? Math.round((passedRuns.length / runs.length) * 100) : 0;

  // Generations
  const gensThisMonth = countInRange(generations, (g) => g.createdAt, thisMonthStart, now);
  const genSparkline = bucketByDay(generations, (g) => g.createdAt, 30);
  const successGens = generations.filter((g) => g.status === "success");
  const successRate = generations.length > 0 ? Math.round((successGens.length / generations.length) * 100) : 0;

  // Tests
  const testCount = testCases.length;

  return (
    <Panel>
      <PanelBody className="px-6 py-5">
        <div className="grid grid-cols-2 gap-6 md:grid-cols-5">
          <MetricCard className="col-span-2">
            <MetricLabel>Bugs</MetricLabel>
            <div className="flex items-end justify-between gap-2">
              <MetricValue className="text-5xl">
                {bugsThisMonth}
                <MetricUnit>THIS MONTH</MetricUnit>
              </MetricValue>
              <Sparkline data={bugSparkline} color="var(--status-critical)" filled className="mb-1" />
            </div>
            <TrendBadge change={bugChange} invertColor />
          </MetricCard>

          <MetricCard>
            <MetricLabel>Runs</MetricLabel>
            <div className="flex items-end justify-between gap-2">
              <MetricValue>
                {runsThisMonth}
                <MetricUnit>THIS MONTH</MetricUnit>
              </MetricValue>
              <Sparkline data={runSparkline} color="var(--chart-1)" filled className="mb-1" />
            </div>
            <span className="font-mono text-3xs text-text-tertiary">{passRate}% pass rate</span>
          </MetricCard>

          <MetricCard>
            <MetricLabel>Generations</MetricLabel>
            <div className="flex items-end justify-between gap-2">
              <MetricValue>
                {gensThisMonth}
                <MetricUnit>THIS MONTH</MetricUnit>
              </MetricValue>
              <Sparkline data={genSparkline} color="var(--chart-2)" filled className="mb-1" />
            </div>
            <span className="font-mono text-3xs text-text-tertiary">{successRate}% success rate</span>
          </MetricCard>

          <MetricCard>
            <MetricLabel>Tests</MetricLabel>
            <MetricValue>
              {testCount}
              <MetricUnit>TOTAL</MetricUnit>
            </MetricValue>
          </MetricCard>
        </div>
      </PanelBody>
    </Panel>
  );
}

export function TopSectionSkeleton() {
  return (
    <Panel>
      <PanelBody className="px-6 py-5">
        <div className="grid grid-cols-2 gap-6 md:grid-cols-5">
          {["bugs", "runs", "generations", "tests"].map((id) => (
            <MetricCard key={id} className={id === "bugs" ? "col-span-2" : undefined}>
              <MetricLabel>
                <span className="inline-block h-3 w-16 animate-pulse bg-surface-raised" />
              </MetricLabel>
              <MetricValue>
                <span className="inline-block h-8 w-12 animate-pulse bg-surface-raised" />
              </MetricValue>
            </MetricCard>
          ))}
        </div>
      </PanelBody>
    </Panel>
  );
}
