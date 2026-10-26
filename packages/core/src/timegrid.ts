import { daysBetween, isWeekend } from './dates.js';
import { compareEventStarts, type CalendarEvent, type CalendarEventInput } from './events.js';
import { packLanes, sliceEvents, type EventSegment } from './month.js';

const DAY_MINUTES = 24 * 60;

export interface TimeGridOptions<T extends CalendarEventInput = CalendarEventInput> {
    /** First and last day shown, inclusive: one day for a day view, seven for a week. */
    start: Temporal.PlainDate;
    end: Temporal.PlainDate;
    events?: readonly CalendarEvent<T>[];
    /** Wall-clock window shown each day, in minutes from midnight. Defaults to the whole day. */
    slotMinMinutes?: number;
    slotMaxMinutes?: number;
    today?: Temporal.PlainDate;
}

export interface TimedEventLayout<T extends CalendarEventInput = CalendarEventInput> {
    event: CalendarEvent<T>;
    date: Temporal.PlainDate;
    /** Minutes from the top of the window, already clipped to it. */
    startMinutes: number;
    endMinutes: number;
    /** Overlapping events share the column width: this one is `column` of `columnCount`. */
    column: number;
    columnCount: number;
    /** The event began before this day's window (an earlier day, or before `slotMinMinutes`). */
    startsBefore: boolean;
    endsAfter: boolean;
}

export interface TimeGridDay<T extends CalendarEventInput = CalendarEventInput> {
    date: Temporal.PlainDate;
    column: number;
    isToday: boolean;
    isWeekend: boolean;
    events: TimedEventLayout<T>[];
}

export interface TimeGrid<T extends CalendarEventInput = CalendarEventInput> {
    start: Temporal.PlainDate;
    end: Temporal.PlainDate;
    days: TimeGridDay<T>[];
    allDay: { segments: EventSegment<T>[]; laneCount: number };
    /** Whole hours in the window, as minutes from midnight, for the gutter labels. */
    hours: number[];
    windowMinutes: number;
    slotMinMinutes: number;
}

export function createTimeGrid<T extends CalendarEventInput>({
    start,
    end,
    events = [],
    slotMinMinutes = 0,
    slotMaxMinutes = DAY_MINUTES,
    today = Temporal.Now.plainDateISO(),
}: TimeGridOptions<T>): TimeGrid<T> {
    const sorted = [...events].sort(compareEventStarts);
    const allDayEvents = sorted.filter((event) => event.allDay);
    const timedEvents = sorted.filter((event) => !event.allDay);

    const days = Array.from(
        { length: daysBetween(start, end) + 1 },
        (_, column): TimeGridDay<T> => {
            const date = start.add({ days: column });
            const pieces = timedEvents.flatMap((event) =>
                pieceOnDay(event, date, slotMinMinutes, slotMaxMinutes),
            );

            return {
                date,
                column,
                isToday: date.equals(today),
                isWeekend: isWeekend(date),
                events: layoutColumns(pieces),
            };
        },
    );

    const hours: number[] = [];

    for (
        let minutes = Math.ceil(slotMinMinutes / 60) * 60;
        minutes < slotMaxMinutes;
        minutes += 60
    ) {
        hours.push(minutes);
    }

    return {
        start,
        end,
        days,
        allDay: packLanes(sliceEvents(allDayEvents, start, end)),
        hours,
        windowMinutes: slotMaxMinutes - slotMinMinutes,
        slotMinMinutes,
    };
}

/** Minutes past midnight on the wall clock, so a daylight-saving day still draws 24 hours. */
export function wallMinutes(time: Temporal.ZonedDateTime | Temporal.PlainTime): number {
    return time.hour * 60 + time.minute;
}

function pieceOnDay<T extends CalendarEventInput>(
    event: CalendarEvent<T>,
    date: Temporal.PlainDate,
    slotMinMinutes: number,
    slotMaxMinutes: number,
): Omit<TimedEventLayout<T>, 'column' | 'columnCount'>[] {
    const covers =
        Temporal.PlainDate.compare(event.startDate, date) <= 0 &&
        Temporal.PlainDate.compare(event.endDate, date) >= 0;

    if (!covers) {
        return [];
    }

    const start = event.start as Temporal.ZonedDateTime;
    const end = event.end as Temporal.ZonedDateTime;
    const startsToday = start.toPlainDate().equals(date);
    const endsToday = end.toPlainDate().equals(date);

    const from = startsToday ? wallMinutes(start) : 0;
    const to = endsToday ? wallMinutes(end) : DAY_MINUTES;
    const clippedFrom = Math.max(from, slotMinMinutes);
    const clippedTo = Math.min(to, slotMaxMinutes);

    // Zero-length events still get placed, but nothing outside the window does.
    if (clippedFrom > clippedTo || clippedFrom >= slotMaxMinutes || clippedTo < slotMinMinutes) {
        return [];
    }

    return [
        {
            event,
            date,
            startMinutes: clippedFrom - slotMinMinutes,
            endMinutes: clippedTo - slotMinMinutes,
            startsBefore: !startsToday || from < slotMinMinutes,
            // Compared by covered day, not `endsToday`: an event ending at midnight ends tomorrow.
            endsAfter: Temporal.PlainDate.compare(event.endDate, date) > 0 || to > slotMaxMinutes,
        },
    ];
}

/**
 * Splits a day's events into clusters of transitive overlaps; within a cluster each event
 * takes the first column free at its start, and the cluster's events share its column count.
 */
function layoutColumns<T extends CalendarEventInput>(
    pieces: Omit<TimedEventLayout<T>, 'column' | 'columnCount'>[],
): TimedEventLayout<T>[] {
    const ordered = [...pieces].sort(
        (a, b) => a.startMinutes - b.startMinutes || b.endMinutes - a.endMinutes,
    );
    const laidOut: TimedEventLayout<T>[] = [];
    let cluster: TimedEventLayout<T>[] = [];
    let columnEnds: number[] = [];
    let clusterEnd = -1;

    const closeCluster = () => {
        for (const piece of cluster) {
            piece.columnCount = columnEnds.length;
        }

        laidOut.push(...cluster);
        cluster = [];
        columnEnds = [];
    };

    for (const piece of ordered) {
        const end = Math.max(piece.endMinutes, piece.startMinutes + 1);

        if (cluster.length && piece.startMinutes >= clusterEnd) {
            closeCluster();
        }

        let column = columnEnds.findIndex((columnEnd) => columnEnd <= piece.startMinutes);

        if (column === -1) {
            column = columnEnds.length;
        }

        columnEnds[column] = end;
        clusterEnd = cluster.length ? Math.max(clusterEnd, end) : end;
        cluster.push({ ...piece, column, columnCount: 1 });
    }

    closeCluster();

    return laidOut;
}
