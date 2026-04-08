import type { RouterOutputs } from "lib/trpc";

export type Generation = RouterOutputs["generations"]["list"][number];
export type Run = RouterOutputs["runs"]["list"][number];
// ─── Date helpers ────────────────────────────────────────────────────────────

/** Bucket items by day over the last N days. Returns an array of daily counts (oldest first). */
export function bucketByDay<T>(items: T[], getDate: (item: T) => Date | string, days: number): number[] {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const buckets = new Array<number>(days).fill(0);

    for (const item of items) {
        const date = new Date(getDate(item));
        const itemDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
        const diffDays = Math.round((todayStart.getTime() - itemDay.getTime()) / (1000 * 60 * 60 * 24));
        if (diffDays >= 0 && diffDays < days) {
            const index = days - 1 - diffDays;
            const current = buckets[index] ?? 0;
            buckets[index] = current + 1;
        }
    }

    return buckets;
}

/** Count items within a date range. */
export function countInRange<T>(
    items: T[],
    getDate: (item: T) => Date | string,
    startMs: number,
    endMs: number,
): number {
    let count = 0;
    for (const item of items) {
        const ts = new Date(getDate(item)).getTime();
        if (ts >= startMs && ts < endMs) count++;
    }
    return count;
}

/** Calculate month-over-month change. Returns percentage (e.g. -20 means 20% decrease). */
export function monthOverMonthChange<T>(items: T[], getDate: (item: T) => Date | string): number | undefined {
    const now = new Date();
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);

    // Compare equivalent elapsed time so Apr 1 compares against Mar 1, not all of March
    const elapsedMs = now.getTime() - thisMonthStart.getTime();
    const lastMonthEquivalentEnd = new Date(lastMonthStart.getTime() + elapsedMs);

    const thisMonth = countInRange(items, getDate, thisMonthStart.getTime(), now.getTime());
    const lastMonth = countInRange(items, getDate, lastMonthStart.getTime(), lastMonthEquivalentEnd.getTime());

    if (lastMonth === 0) return thisMonth > 0 ? 100 : undefined;
    return Math.round(((thisMonth - lastMonth) / lastMonth) * 100);
}

/** Generate daily chart data for the last N days. */
export function dailyChartData<T>(
    items: T[],
    getDate: (item: T) => Date | string,
    days: number,
): { date: string; count: number }[] {
    const now = new Date();
    const buckets = bucketByDay(items, getDate, days);

    return buckets.map((count, i) => {
        const d = new Date(now);
        d.setDate(d.getDate() - (days - 1 - i));
        return {
            date: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
            count,
        };
    });
}

export function toGenerationBadgeVariant(status: Generation["status"]) {
    switch (status) {
        case "success":
            return "success" as const;
        case "failed":
            return "critical" as const;
        case "running":
            return "status-running" as const;
        case "queued":
            return "status-pending" as const;
        case "pending":
            return "status-pending" as const;
    }
}

export function toGenerationStatusLabel(status: Generation["status"]) {
    switch (status) {
        case "success":
            return "Passed";
        case "failed":
            return "Failed";
        case "running":
            return "Running";
        case "queued":
            return "Queued";
        case "pending":
            return "Pending";
    }
}
