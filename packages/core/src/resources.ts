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
    /**
     * Two of its events are booked at the same time, such as a double-booked technician. Timed
     * events overlap only when their times do; an all-day event overlaps anything on its days.
     */
    hasOverlap: boolean;
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
    /** Days in the range where a cell `hasOverlap`. */
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

        const cells = days.map(({ date, column }): ResourceCell<T> => {
            const covering = segments.filter(
                (segment) => segment.column <= column && column < segment.column + segment.span,
            );

            return {
                date,
                column,
                segments: segments.filter((segment) => segment.column === column),
                eventCount: covering.length,
                hasOverlap: covering.some((segment, index) =>
                    covering
                        .slice(index + 1)
                        .some((other) => bookedTogether(segment.event, other.event)),
                ),
            };
        });

        return {
            resource,
            cells,
            segments,
            laneCount,
            busyDays: cells.filter((cell) => cell.eventCount > 0).length,
            overlapDays: cells.filter((cell) => cell.hasOverlap).length,
        };
    };

    const rows = resources.map(rowFor);

    if (unassigned && byResource.has(null)) {
        rows.push(rowFor(null));
    }

    return { start, end, days, rows };
}

/**
 * For two events that both cover a day: any overlap between them falls on that day too, so their
 * full times can be compared without clipping to it. Ends are exclusive, so back-to-back is free.
 */
function bookedTogether(a: CalendarEvent, b: CalendarEvent): boolean {
    if (a.allDay || b.allDay) return true;

    return (
        Temporal.ZonedDateTime.compare(
            a.start as Temporal.ZonedDateTime,
            b.end as Temporal.ZonedDateTime,
        ) < 0 &&
        Temporal.ZonedDateTime.compare(
            b.start as Temporal.ZonedDateTime,
            a.end as Temporal.ZonedDateTime,
        ) < 0
    );
}
