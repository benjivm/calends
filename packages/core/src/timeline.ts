import { daysBetween, isWeekend } from './dates.js';
import { compareEventStarts, type CalendarEvent, type CalendarEventInput } from './events.js';
import type { CalendarResource, ResourceId } from './resources.js';
import { wallMinutes } from './timegrid.js';

const DAY_MINUTES = 24 * 60;

export interface TimelineOptions<
    T extends CalendarEventInput = CalendarEventInput,
    R extends CalendarResource = CalendarResource,
> {
    /** First and last day on the axis, inclusive. */
    start: Temporal.PlainDate;
    end: Temporal.PlainDate;
    events?: readonly CalendarEvent<T>[];
    /** One row per resource. Leave unset for a single row holding every event. */
    resources?: readonly R[];
    getResourceIds?: (event: T) => readonly ResourceId[] | null | undefined;
    /** Adds a trailing row, with a null resource, for events that match none of `resources`. */
    unassigned?: boolean;
    /** Wall-clock window shown each day, in minutes from midnight. */
    slotMinMinutes?: number;
    slotMaxMinutes?: number;
    /** Minutes per header slot. */
    slotMinutes?: number;
    today?: Temporal.PlainDate;
}

export interface TimelineItem<T extends CalendarEventInput = CalendarEventInput> {
    event: CalendarEvent<T>;
    /** Minutes along the axis, where each day contributes one window. */
    startOffset: number;
    endOffset: number;
    lane: number;
    startsBefore: boolean;
    endsAfter: boolean;
}

export interface TimelineRow<
    T extends CalendarEventInput = CalendarEventInput,
    R extends CalendarResource = CalendarResource,
> {
    resource: R | null;
    items: TimelineItem<T>[];
    laneCount: number;
}

export interface TimelineDay {
    date: Temporal.PlainDate;
    isToday: boolean;
    isWeekend: boolean;
    /** Where this day's window starts on the axis. */
    offset: number;
    /** Slot starts as minutes from midnight, for the header. */
    slots: number[];
}

export interface Timeline<
    T extends CalendarEventInput = CalendarEventInput,
    R extends CalendarResource = CalendarResource,
> {
    start: Temporal.PlainDate;
    end: Temporal.PlainDate;
    days: TimelineDay[];
    rows: TimelineRow<T, R>[];
    axisMinutes: number;
    windowMinutes: number;
    slotMinutes: number;
    slotMinMinutes: number;
}

export function createTimeline<T extends CalendarEventInput, R extends CalendarResource>({
    start,
    end,
    events = [],
    resources,
    getResourceIds = () => [],
    unassigned = false,
    slotMinMinutes = 0,
    slotMaxMinutes = DAY_MINUTES,
    slotMinutes = 60,
    today = Temporal.Now.plainDateISO(),
}: TimelineOptions<T, R>): Timeline<T, R> {
    const windowMinutes = slotMaxMinutes - slotMinMinutes;
    const dayCount = daysBetween(start, end) + 1;

    const days = Array.from({ length: dayCount }, (_, index): TimelineDay => {
        const date = start.add({ days: index });
        const slots: number[] = [];

        for (let minutes = slotMinMinutes; minutes < slotMaxMinutes; minutes += slotMinutes) {
            slots.push(minutes);
        }

        return {
            date,
            isToday: date.equals(today),
            isWeekend: isWeekend(date),
            offset: index * windowMinutes,
            slots,
        };
    });

    const placed = [...events]
        .sort(compareEventStarts)
        .map((event) => place(event, start, end, slotMinMinutes, slotMaxMinutes))
        .filter((item): item is Omit<TimelineItem<T>, 'lane'> => item !== null);

    const rowFor = (
        resource: R | null,
        items: Omit<TimelineItem<T>, 'lane'>[],
    ): TimelineRow<T, R> => {
        const laneEnds: number[] = [];
        const laidOut = items.map((item) => {
            let lane = laneEnds.findIndex((laneEnd) => laneEnd <= item.startOffset);

            if (lane === -1) {
                lane = laneEnds.length;
            }

            laneEnds[lane] = Math.max(item.endOffset, item.startOffset + 1);

            return { ...item, lane };
        });

        return { resource, items: laidOut, laneCount: laneEnds.length };
    };

    if (!resources) {
        return {
            start,
            end,
            days,
            rows: [rowFor(null, placed)],
            axisMinutes: dayCount * windowMinutes,
            windowMinutes,
            slotMinutes,
            slotMinMinutes,
        };
    }

    const known = new Set(resources.map((resource) => resource.id));
    const idsFor = (item: Omit<TimelineItem<T>, 'lane'>) =>
        (getResourceIds(item.event.source) ?? []).filter((id) => known.has(id));

    const rows = resources.map((resource) =>
        rowFor(
            resource,
            placed.filter((item) => idsFor(item).includes(resource.id)),
        ),
    );

    const orphans = placed.filter((item) => idsFor(item).length === 0);

    if (unassigned && orphans.length) {
        rows.push(rowFor(null, orphans));
    }

    return {
        start,
        end,
        days,
        rows,
        axisMinutes: dayCount * windowMinutes,
        windowMinutes,
        slotMinutes,
        slotMinMinutes,
    };
}

/**
 * Maps an event onto the axis. The axis skips the hours outside each day's window, so a
 * multi-day event is one bar from where it starts to where it ends; all-day events cover
 * their days' whole windows.
 */
function place<T extends CalendarEventInput>(
    event: CalendarEvent<T>,
    rangeStart: Temporal.PlainDate,
    rangeEnd: Temporal.PlainDate,
    slotMinMinutes: number,
    slotMaxMinutes: number,
): Omit<TimelineItem<T>, 'lane'> | null {
    const windowMinutes = slotMaxMinutes - slotMinMinutes;
    const lastDay = daysBetween(rangeStart, rangeEnd);
    const clamp = (minutes: number) => Math.min(Math.max(minutes, slotMinMinutes), slotMaxMinutes);

    const startDay = daysBetween(rangeStart, event.startDate);
    const endDay = daysBetween(rangeStart, event.endDate);

    if (endDay < 0 || startDay > lastDay) {
        return null;
    }

    let startOffset: number;
    let endOffset: number;
    let startsBefore = startDay < 0;
    let endsAfter = endDay > lastDay;

    if (event.allDay) {
        startOffset = Math.max(startDay, 0) * windowMinutes;
        endOffset = (Math.min(endDay, lastDay) + 1) * windowMinutes;
    } else {
        const start = event.start as Temporal.ZonedDateTime;
        const end = event.end as Temporal.ZonedDateTime;
        const startWall = wallMinutes(start);
        // An end at midnight belongs to the previous day's window, at its far edge.
        const endWall = end.toPlainDate().equals(event.endDate) ? wallMinutes(end) : DAY_MINUTES;

        startOffset =
            startDay < 0 ? 0 : startDay * windowMinutes + clamp(startWall) - slotMinMinutes;
        endOffset =
            endDay > lastDay
                ? (lastDay + 1) * windowMinutes
                : endDay * windowMinutes + clamp(endWall) - slotMinMinutes;

        startsBefore ||= startWall < slotMinMinutes;
        endsAfter ||= endWall > slotMaxMinutes;

        // Entirely outside the window on a single day, such as an evening job on a 7–18 axis.
        if (startDay === endDay && (endWall <= slotMinMinutes || startWall >= slotMaxMinutes)) {
            return null;
        }
    }

    return { event, startOffset, endOffset, startsBefore, endsAfter };
}
