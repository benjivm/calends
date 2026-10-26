import { daysBetween, isWeekend, maxDate, minDate, startOfWeek, type WeekDay } from './dates.js';
import { compareEventStarts, type CalendarEvent, type CalendarEventInput } from './events.js';

export interface MonthGridOptions<T extends CalendarEventInput = CalendarEventInput> {
    /** Any day in the month to show. */
    date: Temporal.PlainDate;
    events?: readonly CalendarEvent<T>[];
    weekStartsOn?: WeekDay;
    today?: Temporal.PlainDate;
    /** Always render six weeks so the grid height doesn't change between months. */
    fixedWeeks?: boolean;
    /**
     * Most lanes a week may draw, counting the "+N more" lane. A week that needs more
     * keeps `maxLanes - 1` lanes of bars and hides the rest behind each day's `hiddenCount`.
     * A bar that would be the only hidden one on every day it covers is drawn in the
     * "+N more" lane instead, since "+1 more" would take the same room. Leave it unset
     * to show every event, letting busy weeks grow as tall as they need.
     */
    maxLanes?: number;
}

export interface EventSegment<T extends CalendarEventInput = CalendarEventInput> {
    event: CalendarEvent<T>;
    start: Temporal.PlainDate;
    end: Temporal.PlainDate;
    /** Zero-based day column within the week. */
    column: number;
    span: number;
    lane: number;
    continuesBefore: boolean;
    continuesAfter: boolean;
}

export interface MonthDay<T extends CalendarEventInput = CalendarEventInput> {
    date: Temporal.PlainDate;
    column: number;
    isToday: boolean;
    isOutside: boolean;
    isWeekend: boolean;
    /** Visible segments whose bar starts in this day's cell. */
    segments: EventSegment<T>[];
    /** Every segment covering this day, hidden or not, in lane order. */
    coveringSegments: EventSegment<T>[];
    eventCount: number;
    /** Covering segments that didn't fit in the week's visible lanes. */
    hiddenCount: number;
}

export interface MonthWeek<T extends CalendarEventInput = CalendarEventInput> {
    start: Temporal.PlainDate;
    end: Temporal.PlainDate;
    days: MonthDay<T>[];
    segments: EventSegment<T>[];
    laneCount: number;
    /** Lanes of bars drawn, excluding the "+N more" lane. */
    visibleLaneCount: number;
    hasOverflow: boolean;
}

export interface MonthGrid<T extends CalendarEventInput = CalendarEventInput> {
    month: Temporal.PlainYearMonth;
    start: Temporal.PlainDate;
    end: Temporal.PlainDate;
    weekdays: Temporal.PlainDate[];
    weeks: MonthWeek<T>[];
}

export function visibleMonthRange(
    date: Temporal.PlainDate,
    weekStartsOn: WeekDay = 7,
    fixedWeeks = false,
): { start: Temporal.PlainDate; end: Temporal.PlainDate } {
    const first = date.with({ day: 1 });
    const last = date.with({ day: date.daysInMonth });
    const start = startOfWeek(first, weekStartsOn);
    const weekCount = fixedWeeks ? 6 : Math.ceil((daysBetween(start, last) + 1) / 7);

    return { start, end: start.add({ days: weekCount * 7 - 1 }) };
}

export function createMonthGrid<T extends CalendarEventInput>({
    date,
    events = [],
    weekStartsOn = 7,
    today = Temporal.Now.plainDateISO(),
    fixedWeeks = false,
    maxLanes = Infinity,
}: MonthGridOptions<T>): MonthGrid<T> {
    const month = date.toPlainYearMonth();
    const { start, end } = visibleMonthRange(date, weekStartsOn, fixedWeeks);
    const sorted = [...events].sort(compareEventStarts);
    const weeks: MonthWeek<T>[] = [];

    for (let weekStart = start; Temporal.PlainDate.compare(weekStart, end) <= 0;) {
        const weekEnd = weekStart.add({ days: 6 });
        const { segments, laneCount } = packLanes(sliceEvents(sorted, weekStart, weekEnd));
        const hasOverflow = laneCount > maxLanes;
        const visibleLaneCount = hasOverflow ? Math.max(maxLanes - 1, 0) : laneCount;
        const byLane = [...segments].sort((a, b) => a.lane - b.lane);
        const covers = (segment: EventSegment<T>, column: number) =>
            segment.column <= column && column < segment.column + segment.span;

        const overflowing = segments.filter((segment) => segment.lane >= visibleLaneCount);
        const hiddenPerColumn = Array.from(
            { length: 7 },
            (_, column) => overflowing.filter((segment) => covers(segment, column)).length,
        );
        const promoted = new Set(
            overflowing.filter(
                (segment) =>
                    segment.lane === visibleLaneCount &&
                    hiddenPerColumn
                        .slice(segment.column, segment.column + segment.span)
                        .every((count) => count === 1),
            ),
        );
        const isShown = (segment: EventSegment<T>) =>
            segment.lane < visibleLaneCount || promoted.has(segment);

        const days = Array.from({ length: 7 }, (_, column): MonthDay<T> => {
            const day = weekStart.add({ days: column });
            const coveringSegments = byLane.filter((segment) => covers(segment, column));

            return {
                date: day,
                column,
                isToday: day.equals(today),
                isOutside: !day.toPlainYearMonth().equals(month),
                isWeekend: isWeekend(day),
                segments: segments.filter(
                    (segment) => segment.column === column && isShown(segment),
                ),
                coveringSegments,
                eventCount: coveringSegments.length,
                hiddenCount: coveringSegments.filter((segment) => !isShown(segment)).length,
            };
        });

        weeks.push({
            start: weekStart,
            end: weekEnd,
            days,
            segments,
            laneCount,
            visibleLaneCount,
            hasOverflow,
        });
        weekStart = weekEnd.add({ days: 1 });
    }

    return { month, start, end, weekdays: weeks[0].days.map((day) => day.date), weeks };
}

export function sliceEvents<T extends CalendarEventInput>(
    events: readonly CalendarEvent<T>[],
    rangeStart: Temporal.PlainDate,
    rangeEnd: Temporal.PlainDate,
): Omit<EventSegment<T>, 'lane'>[] {
    return events.flatMap((event) => {
        const outside =
            Temporal.PlainDate.compare(event.endDate, rangeStart) < 0 ||
            Temporal.PlainDate.compare(event.startDate, rangeEnd) > 0;

        if (outside) {
            return [];
        }

        const start = maxDate(event.startDate, rangeStart);
        const end = minDate(event.endDate, rangeEnd);

        return [
            {
                event,
                start,
                end,
                column: daysBetween(rangeStart, start),
                span: daysBetween(start, end) + 1,
                continuesBefore: Temporal.PlainDate.compare(event.startDate, rangeStart) < 0,
                continuesAfter: Temporal.PlainDate.compare(event.endDate, rangeEnd) > 0,
            },
        ];
    });
}

/**
 * Greedy first-fit: earlier columns first, and longer bars first within a column so
 * they settle in the top lanes. Ties keep their incoming (start-time) order.
 */
export function packLanes<T extends CalendarEventInput>(
    segments: readonly Omit<EventSegment<T>, 'lane'>[],
): { segments: EventSegment<T>[]; laneCount: number } {
    const ordered = [...segments].sort((a, b) => a.column - b.column || b.span - a.span);
    const laneEnds: number[] = [];

    const packed = ordered.map((segment) => {
        let lane = laneEnds.findIndex((laneEnd) => laneEnd < segment.column);

        if (lane === -1) {
            lane = laneEnds.length;
        }

        laneEnds[lane] = segment.column + segment.span - 1;

        return { ...segment, lane };
    });

    return { segments: packed, laneCount: laneEnds.length };
}
