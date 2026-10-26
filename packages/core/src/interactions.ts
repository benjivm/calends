import type { CalendarEvent, CalendarEventInput } from './events.js';

/** How far a drag moved an event or one of its edges. */
export interface EventDelta {
    days?: number;
    /** Ignored for all-day events. */
    minutes?: number;
}

export interface EventTimes {
    start: Temporal.PlainDate | Temporal.ZonedDateTime;
    /** Inclusive last day for all-day events, exclusive end time for timed ones. */
    end: Temporal.PlainDate | Temporal.ZonedDateTime;
}

export function snapMinutes(minutes: number, step: number): number {
    return Math.round(minutes / step) * step;
}

/**
 * Wall-clock arithmetic: a 9:00 job moved a day across a daylight-saving change still
 * starts at 9:00, rather than an exact 24 hours later.
 */
function shiftZoned(
    time: Temporal.ZonedDateTime,
    days: number,
    minutes: number,
): Temporal.ZonedDateTime {
    return (
        time
            .toPlainDateTime()
            // Separate steps: a Duration can't mix signs, like a day later but 30 minutes earlier.
            .add({ days })
            .add({ minutes })
            .toZonedDateTime(time.timeZoneId, { disambiguation: 'compatible' })
    );
}

/** Moves the whole event, keeping its length. */
export function moveEvent(event: CalendarEvent, { days = 0, minutes = 0 }: EventDelta): EventTimes {
    if (event.allDay) {
        return {
            start: (event.start as Temporal.PlainDate).add({ days }),
            end: (event.end as Temporal.PlainDate).add({ days }),
        };
    }

    return {
        start: shiftZoned(event.start as Temporal.ZonedDateTime, days, minutes),
        end: shiftZoned(event.end as Temporal.ZonedDateTime, days, minutes),
    };
}

/**
 * Moves one edge. An all-day event keeps at least one day; a timed event keeps at least
 * `minDurationMinutes`, so dragging an edge past the other stops there.
 */
export function resizeEvent(
    event: CalendarEvent,
    edge: 'start' | 'end',
    { days = 0, minutes = 0 }: EventDelta,
    minDurationMinutes = 15,
): EventTimes {
    if (event.allDay) {
        const start = event.start as Temporal.PlainDate;
        const end = event.end as Temporal.PlainDate;

        if (edge === 'end') {
            const moved = end.add({ days });

            return { start, end: Temporal.PlainDate.compare(moved, start) < 0 ? start : moved };
        }

        const moved = start.add({ days });

        return { start: Temporal.PlainDate.compare(moved, end) > 0 ? end : moved, end };
    }

    const start = event.start as Temporal.ZonedDateTime;
    const end = event.end as Temporal.ZonedDateTime;

    if (edge === 'end') {
        const moved = shiftZoned(end, days, minutes);
        const earliest = start.add({ minutes: minDurationMinutes });

        return {
            start,
            end: Temporal.ZonedDateTime.compare(moved, earliest) < 0 ? earliest : moved,
        };
    }

    const moved = shiftZoned(start, days, minutes);
    const latest = end.subtract({ minutes: minDurationMinutes });

    return { start: Temporal.ZonedDateTime.compare(moved, latest) > 0 ? latest : moved, end };
}

/** The event with new times, its covered days recomputed, for previews while dragging. */
export function withTimes<T extends CalendarEventInput>(
    event: CalendarEvent<T>,
    { start, end }: EventTimes,
): CalendarEvent<T> {
    if (event.allDay) {
        return {
            ...event,
            start,
            end,
            startDate: start as Temporal.PlainDate,
            endDate: end as Temporal.PlainDate,
        };
    }

    const zonedStart = start as Temporal.ZonedDateTime;
    const zonedEnd = end as Temporal.ZonedDateTime;
    const endsAtMidnight =
        zonedEnd.equals(zonedEnd.startOfDay()) &&
        Temporal.ZonedDateTime.compare(zonedEnd, zonedStart) > 0;

    return {
        ...event,
        start,
        end,
        startDate: zonedStart.toPlainDate(),
        endDate: endsAtMidnight
            ? zonedEnd.toPlainDate().subtract({ days: 1 })
            : zonedEnd.toPlainDate(),
    };
}

/** Orders the two ends of a drag selection, whichever way the pointer went. */
export function orderedRange<V extends Temporal.PlainDate | number>(a: V, b: V): [V, V] {
    const before =
        typeof a === 'number'
            ? a <= (b as number)
            : Temporal.PlainDate.compare(a as Temporal.PlainDate, b as Temporal.PlainDate) <= 0;

    return before ? [a, b] : [b, a];
}
