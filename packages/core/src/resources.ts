import { daysBetween, isWeekend } from './dates.js';
import { compareEventStarts, type CalendarEvent, type CalendarEventInput } from './events.js';
import { packLanes, sliceEvents, type EventSegment } from './month.js';

export type ResourceId = string | number;

export interface CalendarResource {
    id: ResourceId;
}

export interface ResourceGridOptions<
    T extends CalendarEventInput = CalendarEventInput,
    R extends CalendarResource = CalendarResource,
> {
    /** First and last day shown, inclusive. */
    start: Temporal.PlainDate;
    end: Temporal.PlainDate;
    resources: readonly R[];
    events?: readonly CalendarEvent<T>[];
    /** Which resources an event belongs to. An event with several shows in each of their rows. */
    getResourceIds: (event: T) => readonly ResourceId[] | null | undefined;
    /** Adds a trailing row, with a null resource, for events that match none of `resources`. */
    unassigned?: boolean;
    today?: Temporal.PlainDate;
}

export interface ResourceDay {
    date: Temporal.PlainDate;
    column: number;
    isToday: boolean;
    isWeekend: boolean;
}

export interface ResourceCell<T extends CalendarEventInput = CalendarEventInput> {
    date: Temporal.PlainDate;
    column: number;
    /** Segments whose bar starts in this cell. */
    segments: EventSegment<T>[];
    eventCount: number;
}

export interface ResourceRow<
    T extends CalendarEventInput = CalendarEventInput,
    R extends CalendarResource = CalendarResource,
> {
    resource: R | null;
    cells: ResourceCell<T>[];
    segments: EventSegment<T>[];
    laneCount: number;
    /** Days in the range with at least one event. */
    busyDays: number;
    /** Days in the range with overlapping events, such as a double-booked technician. */
    overlapDays: number;
}

export interface ResourceGrid<
    T extends CalendarEventInput = CalendarEventInput,
    R extends CalendarResource = CalendarResource,
> {
    start: Temporal.PlainDate;
    end: Temporal.PlainDate;
    days: ResourceDay[];
    rows: ResourceRow<T, R>[];
}

export function createResourceGrid<T extends CalendarEventInput, R extends CalendarResource>({
    start,
    end,
    resources,
    events = [],
    getResourceIds,
    unassigned = false,
    today = Temporal.Now.plainDateISO(),
}: ResourceGridOptions<T, R>): ResourceGrid<T, R> {
    const dayCount = daysBetween(start, end) + 1;
    const days = Array.from({ length: dayCount }, (_, column): ResourceDay => {
        const date = start.add({ days: column });

        return { date, column, isToday: date.equals(today), isWeekend: isWeekend(date) };
    });

    const known = new Set(resources.map((resource) => resource.id));
    const byResource = new Map<ResourceId | null, CalendarEvent<T>[]>();
    const sorted = [...events].sort(compareEventStarts);

    for (const event of sorted) {
        const ids = (getResourceIds(event.source) ?? []).filter((id) => known.has(id));
        const keys: (ResourceId | null)[] = ids.length ? [...new Set(ids)] : [null];

        for (const key of keys) {
            byResource.set(key, [...(byResource.get(key) ?? []), event]);
        }
    }

    const rowFor = (resource: R | null): ResourceRow<T, R> => {
        const rowEvents = byResource.get(resource?.id ?? null) ?? [];
        const { segments, laneCount } = packLanes(sliceEvents(rowEvents, start, end));

        const cells = days.map(({ date, column }): ResourceCell<T> => ({
            date,
            column,
            segments: segments.filter((segment) => segment.column === column),
            eventCount: segments.filter(
                (segment) => segment.column <= column && column < segment.column + segment.span,
            ).length,
        }));

        return {
            resource,
            cells,
            segments,
            laneCount,
            busyDays: cells.filter((cell) => cell.eventCount > 0).length,
            overlapDays: cells.filter((cell) => cell.eventCount > 1).length,
        };
    };

    const rows = resources.map(rowFor);

    if (unassigned && byResource.has(null)) {
        rows.push(rowFor(null));
    }

    return { start, end, days, rows };
}
