import type { CalendarResource, ResourceId } from './resources.js';

/**
 * Helpers shared between core modules. `index.ts` doesn't re-export this file, so none of it is
 * public API; `wallMinutes` is, through `timegrid.ts`.
 */

export const DAY_MINUTES = 24 * 60;

/** Minutes past midnight on the wall clock, so a daylight-saving day still draws 24 hours. */
export function wallMinutes(time: Temporal.ZonedDateTime | Temporal.PlainTime): number {
    return time.hour * 60 + time.minute;
}

/**
 * The end's wall-clock minutes. An event that starts and ends on the same day but across the
 * fall-back hour (01:45 EDT to 01:15 EST) would end at or before its start, so it runs for its real
 * duration from its start instead, up to midnight.
 */
export function wallEndMinutes(start: Temporal.ZonedDateTime, end: Temporal.ZonedDateTime): number {
    const endWall = wallMinutes(end);
    const startWall = wallMinutes(start);

    if (endWall > startWall || !start.toPlainDate().equals(end.toPlainDate())) {
        return endWall;
    }

    const duration = Math.round((end.epochMilliseconds - start.epochMilliseconds) / 60_000);

    return Math.min(startWall + duration, DAY_MINUTES);
}

/** An event that ends exactly at midnight doesn't occupy the day that midnight starts. */
export function lastCoveredDay(
    start: Temporal.ZonedDateTime,
    end: Temporal.ZonedDateTime,
): Temporal.PlainDate {
    const endsAtMidnight = end.equals(end.startOfDay());

    if (endsAtMidnight && Temporal.ZonedDateTime.compare(end, start) > 0) {
        return end.toPlainDate().subtract({ days: 1 });
    }

    return end.toPlainDate();
}

/**
 * Buckets items by the resources they belong to, keeping their order. Items matching none of
 * `resources` go under `null`; ids that aren't in `resources` are ignored.
 */
export function groupByResource<I>(
    items: readonly I[],
    resources: readonly CalendarResource[],
    getResourceIds: (item: I) => readonly ResourceId[] | null | undefined,
): Map<ResourceId | null, I[]> {
    const known = new Set(resources.map((resource) => resource.id));
    const groups = new Map<ResourceId | null, I[]>();

    for (const item of items) {
        const ids = (getResourceIds(item) ?? []).filter((id) => known.has(id));
        const keys: (ResourceId | null)[] = ids.length ? [...new Set(ids)] : [null];

        for (const key of keys) {
            const group = groups.get(key);

            if (group) {
                group.push(item);
            } else {
                groups.set(key, [item]);
            }
        }
    }

    return groups;
}
