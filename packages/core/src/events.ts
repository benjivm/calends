import { isDateOnly, toPlainDate, toZonedDateTime, type DateInput } from './dates.js';

export interface CalendarEventInput {
    id: string | number;
    start: DateInput;
    /** Inclusive last day for all-day events, exclusive end time for timed ones. */
    end?: DateInput | null;
    /** Defaults to true when `start` is a date with no time. */
    allDay?: boolean;
}

export interface CalendarEvent<T extends CalendarEventInput = CalendarEventInput> {
    id: string | number;
    source: T;
    allDay: boolean;
    start: Temporal.PlainDate | Temporal.ZonedDateTime;
    end: Temporal.PlainDate | Temporal.ZonedDateTime;
    startDate: Temporal.PlainDate;
    /** Last day the event covers, inclusive. */
    endDate: Temporal.PlainDate;
}

export interface NormalizeOptions {
    timeZone: string;
}

export function normalizeEvent<T extends CalendarEventInput>(
    input: T,
    { timeZone }: NormalizeOptions,
): CalendarEvent<T> {
    const allDay = input.allDay ?? isDateOnly(input.start);

    if (allDay) {
        const start = toPlainDate(input.start, timeZone);
        const end = input.end ? toPlainDate(input.end, timeZone) : start;
        const endDate = Temporal.PlainDate.compare(end, start) < 0 ? start : end;

        return {
            id: input.id,
            source: input,
            allDay,
            start,
            end: endDate,
            startDate: start,
            endDate,
        };
    }

    const start = toZonedDateTime(input.start, timeZone);
    const rawEnd = input.end ? toZonedDateTime(input.end, timeZone) : start;
    const end = Temporal.ZonedDateTime.compare(rawEnd, start) < 0 ? start : rawEnd;

    return {
        id: input.id,
        source: input,
        allDay,
        start,
        end,
        startDate: start.toPlainDate(),
        endDate: lastCoveredDay(start, end),
    };
}

export function normalizeEvents<T extends CalendarEventInput>(
    inputs: readonly T[],
    options: NormalizeOptions,
): CalendarEvent<T>[] {
    return inputs.map((input) => normalizeEvent(input, options));
}

/** An event that ends exactly at midnight doesn't occupy the day that midnight starts. */
function lastCoveredDay(
    start: Temporal.ZonedDateTime,
    end: Temporal.ZonedDateTime,
): Temporal.PlainDate {
    const endsAtMidnight = end.equals(end.startOfDay());

    if (endsAtMidnight && Temporal.ZonedDateTime.compare(end, start) > 0) {
        return end.toPlainDate().subtract({ days: 1 });
    }

    return end.toPlainDate();
}

/** All-day events sort before timed ones that start the same day. */
export function compareEventStarts(a: CalendarEvent, b: CalendarEvent): number {
    const byDate = Temporal.PlainDate.compare(a.startDate, b.startDate);

    if (byDate !== 0) {
        return byDate;
    }

    if (a.allDay !== b.allDay) {
        return a.allDay ? -1 : 1;
    }

    if (!a.allDay && !b.allDay) {
        return Temporal.ZonedDateTime.compare(
            a.start as Temporal.ZonedDateTime,
            b.start as Temporal.ZonedDateTime,
        );
    }

    return 0;
}
