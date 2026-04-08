import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  Panel,
  PanelBody,
  PanelHeader,
  PanelTitle,
  Skeleton,
} from "@autonoma/blacklight";
import { BugIcon } from "@phosphor-icons/react/Bug";
import { useSuspenseQuery } from "@tanstack/react-query";
import { trpc } from "lib/trpc";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { useCurrentApplication } from "../../-use-current-application";
import { dailyChartData, monthOverMonthChange } from "./helpers";

const CHART_DAYS = 30;

export function BugsChart() {
  const app = useCurrentApplication();
  const { data: bugs } = useSuspenseQuery(trpc.bugs.list.queryOptions({ applicationId: app.id }));

  const chartData = dailyChartData(bugs, (b) => b.firstSeenAt, CHART_DAYS);
  const change = monthOverMonthChange(bugs, (b) => b.firstSeenAt);

  // Bugs decreasing is good (green), increasing is bad (red)
  const isTrendingDown = change != null && change <= 0;
  const areaColor = isTrendingDown ? "var(--status-success)" : "var(--status-critical)";

  const chartConfig = {
    count: { label: "Bugs", color: areaColor },
  } satisfies ChartConfig;

  return (
    <Panel>
      <PanelHeader>
        <div className="flex items-center gap-2">
          <BugIcon size={14} className="text-text-tertiary" />
          <PanelTitle>Bugs over the last 30 days</PanelTitle>
        </div>
        {change != null && (
          <span className={`font-mono text-2xs ${isTrendingDown ? "text-status-success" : "text-status-critical"}`}>
            {change > 0 ? "+" : ""}
            {change}% vs last month
          </span>
        )}
      </PanelHeader>
      <PanelBody className="px-2 pt-4 pb-2">
        <ChartContainer config={chartConfig} className="h-48 w-full">
          <AreaChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 10 }}
              interval="preserveStartEnd"
              minTickGap={40}
            />
            <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 10 }} allowDecimals={false} width={30} />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Area
              type="monotone"
              dataKey="count"
              stroke={areaColor}
              fill={areaColor}
              fillOpacity={0.15}
              strokeWidth={2}
            />
          </AreaChart>
        </ChartContainer>
      </PanelBody>
    </Panel>
  );
}

export function BugsChartSkeleton() {
  return (
    <Panel>
      <PanelHeader>
        <div className="flex items-center gap-2">
          <BugIcon size={14} className="text-text-tertiary" />
          <PanelTitle>Bugs over the last 30 days</PanelTitle>
        </div>
      </PanelHeader>
      <PanelBody className="p-4">
        <Skeleton className="h-72 w-full" />
      </PanelBody>
    </Panel>
  );
}
