import { startOfWeek, type WeekDay } from './dates.js';

/** The period a view pages by; each layout (month grid, resources, time grid) picks one. */
export type CalendarView = 'month' | 'week' | 'day';

export function navigate(
    date: Temporal.PlainDate,
    view: CalendarView,
    step: number,
): Temporal.PlainDate {
    switch (view) {
        case 'month':
            return date.add({ months: step });
        case 'week':
            return date.add({ weeks: step });
        case 'day':
            return date.add({ days: step });
    }
}

/** The days of the period containing `date`, without padding out to whole weeks. */
export function periodRange(
    date: Temporal.PlainDate,
    view: CalendarView,
    weekStartsOn: WeekDay = 7,
): { start: Temporal.PlainDate; end: Temporal.PlainDate } {
    switch (view) {
        case 'month':
            return { start: date.with({ day: 1 }), end: date.with({ day: date.daysInMonth }) };
        case 'week': {
            const start = startOfWeek(date, weekStartsOn);

            return { start, end: start.add({ days: 6 }) };
        }
        case 'day':
            return { start: date, end: date };
    }
}

export function isSamePeriod(
    a: Temporal.PlainDate,
    b: Temporal.PlainDate,
    view: CalendarView,
    weekStartsOn: WeekDay = 7,
): boolean {
    return periodRange(a, view, weekStartsOn).start.equals(
        periodRange(b, view, weekStartsOn).start,
    );
}

/** "October 2026", "Oct 4 – 10, 2026", or "Sunday, October 4, 2026". */
export function periodTitle(
    date: Temporal.PlainDate,
    view: CalendarView,
    weekStartsOn: WeekDay = 7,
    locale?: string,
): string {
    if (view === 'month') {
        return date.with({ day: 1 }).toLocaleString(locale, { month: 'long', year: 'numeric' });
    }

    if (view === 'day') {
        return date.toLocaleString(locale, { dateStyle: 'full' });
    }

    const { start, end } = periodRange(date, view, weekStartsOn);
    const format = new Intl.DateTimeFormat(locale, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        timeZone: 'UTC',
    });

    return format.formatRange(toLegacyDate(start), toLegacyDate(end));
}

/** Intl's formatRange won't take Temporal dates, so both ends go through a UTC Date. */
function toLegacyDate(date: Temporal.PlainDate): Date {
    return new Date(Date.UTC(date.year, date.month - 1, date.day));
}
