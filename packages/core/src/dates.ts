export type DateInput =
    | string
    | Date
    | Temporal.PlainDate
    | Temporal.PlainDateTime
    | Temporal.ZonedDateTime
    | Temporal.Instant;

/** ISO day of the week: 1 is Monday, 7 is Sunday. */
export type WeekDay = 1 | 2 | 3 | 4 | 5 | 6 | 7;

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;
const HAS_OFFSET = /T.*(Z|[+-]\d{2}(:?\d{2})?)$/i;

export function isDateOnly(input: DateInput): boolean {
    return typeof input === 'string' ? DATE_ONLY.test(input) : input instanceof Temporal.PlainDate;
}

/**
 * Strings with an offset or `Z` are exact instants and get moved into `timeZone`;
 * strings without one are wall-clock times already in `timeZone`.
 */
export function toZonedDateTime(input: DateInput, timeZone: string): Temporal.ZonedDateTime {
    if (typeof input === 'string') {
        if (DATE_ONLY.test(input)) {
            return Temporal.PlainDate.from(input).toZonedDateTime({ timeZone });
        }

        if (input.includes('[')) {
            return Temporal.ZonedDateTime.from(input).withTimeZone(timeZone);
        }

        if (HAS_OFFSET.test(input)) {
            return Temporal.Instant.from(input).toZonedDateTimeISO(timeZone);
        }

        return Temporal.PlainDateTime.from(input).toZonedDateTime(timeZone);
    }

    if (input instanceof Date) {
        return Temporal.Instant.fromEpochMilliseconds(input.getTime()).toZonedDateTimeISO(timeZone);
    }

    if (input instanceof Temporal.ZonedDateTime) {
        return input.withTimeZone(timeZone);
    }

    if (input instanceof Temporal.Instant) {
        return input.toZonedDateTimeISO(timeZone);
    }

    if (input instanceof Temporal.PlainDate) {
        return input.toZonedDateTime({ timeZone });
    }

    return input.toZonedDateTime(timeZone);
}

export function toPlainDate(input: DateInput, timeZone: string): Temporal.PlainDate {
    if (typeof input === 'string' && DATE_ONLY.test(input)) {
        return Temporal.PlainDate.from(input);
    }

    if (input instanceof Temporal.PlainDate) {
        return input;
    }

    return toZonedDateTime(input, timeZone).toPlainDate();
}

export function startOfWeek(date: Temporal.PlainDate, weekStartsOn: WeekDay): Temporal.PlainDate {
    return date.subtract({ days: (date.dayOfWeek - weekStartsOn + 7) % 7 });
}

export function daysBetween(start: Temporal.PlainDate, end: Temporal.PlainDate): number {
    return start.until(end, { largestUnit: 'days' }).days;
}

export function minDate(a: Temporal.PlainDate, b: Temporal.PlainDate): Temporal.PlainDate {
    return Temporal.PlainDate.compare(a, b) <= 0 ? a : b;
}

export function maxDate(a: Temporal.PlainDate, b: Temporal.PlainDate): Temporal.PlainDate {
    return Temporal.PlainDate.compare(a, b) >= 0 ? a : b;
}

export function isWeekend(date: Temporal.PlainDate): boolean {
    return date.dayOfWeek >= 6;
}

export function localTimeZone(): string {
    return Temporal.Now.timeZoneId();
}

/** Throws a readable error where `Temporal` is missing, instead of a bare `ReferenceError` deep inside a layout. */
export function assertTemporal(): void {
    if (typeof Temporal === 'undefined') {
        throw new Error(
            'Calends needs Temporal. Load a polyfill before the calendar runs: https://benjivm.github.io/calends/guide/getting-started#requirements',
        );
    }
}
