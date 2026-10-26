import { daysBetween, isWeekend, maxDate, minDate, startOfWeek, type WeekDay } from './dates.js';
import type { CalendarEvent, CalendarEventInput } from './events.js';

/** The width of one header column: a day, a week, or a month. */
export type GanttScale = 'day' | 'week' | 'month';

export interface GanttOptions<T extends CalendarEventInput = CalendarEventInput> {
    /** One row each, kept in the order given. */
    events?: readonly CalendarEvent<T>[];
    scale?: GanttScale;
    /** First and last day on the axis. Leave unset to fit the events, padded and snapped to the scale. */
    start?: Temporal.PlainDate;
    end?: Temporal.PlainDate;
    /**
     * Events the automatic range is fitted to. Pass the undragged events here while a drag
     * previews, so the axis doesn't shift under the pointer.
     */
    rangeEvents?: readonly CalendarEvent<T>[];
    weekStartsOn?: WeekDay;
    today?: Temporal.PlainDate;
    /** Lines between rows; any whose ends aren't both rows are dropped. */
    links?: readonly GanttLinkInput[];
}

/**
 * A dependency runs from the predecessor's end to the successor's start. A related link has
 * no direction, so it's drawn from whichever row starts first.
 */
export type GanttLinkKind = 'dependency' | 'related';

export interface GanttLinkInput {
    id: string | number;
    /** Event ids: the predecessor and successor of a dependency. */
    from: string | number;
    to: string | number;
    kind?: GanttLinkKind;
}

export interface GanttLink<T extends CalendarEventInput = CalendarEventInput> {
    id: string | number;
    source: GanttLinkInput;
    kind: GanttLinkKind;
    from: GanttRow<T>;
    to: GanttRow<T>;
    /** A dependency whose successor starts before its predecessor ends. */
    conflict: boolean;
}

export interface GanttRow<T extends CalendarEventInput = CalendarEventInput> {
    event: CalendarEvent<T>;
    /** Days from the start of the axis; the end is exclusive. */
    startOffset: number;
    endOffset: number;
    continuesBefore: boolean;
    continuesAfter: boolean;
}

export interface GanttColumn {
    start: Temporal.PlainDate;
    /** Days from the start of the axis, and how many days it covers (clipped to the axis). */
    offset: number;
    days: number;
    isToday: boolean;
    isWeekend: boolean;
}

export interface Gantt<T extends CalendarEventInput = CalendarEventInput> {
    start: Temporal.PlainDate;
    end: Temporal.PlainDate;
    axisDays: number;
    scale: GanttScale;
    /** The scale's own columns: days, weeks, or months. */
    columns: GanttColumn[];
    /** The tier above: months over days and weeks, years over months. */
    groups: GanttColumn[];
    rows: GanttRow<T>[];
    links: GanttLink<T>[];
    /** Days from the start of the axis to today, or null when today is off the axis. */
    todayOffset: number | null;
}

const PADDING: Record<GanttScale, Temporal.DurationLike> = {
    day: { days: 7 },
    week: { weeks: 2 },
    month: { months: 1 },
};

function unitStart(date: Temporal.PlainDate, unit: GanttScale | 'year', weekStartsOn: WeekDay) {
    switch (unit) {
        case 'day':
            return date;
        case 'week':
            return startOfWeek(date, weekStartsOn);
        case 'month':
            return date.with({ day: 1 });
        case 'year':
            return date.with({ month: 1, day: 1 });
    }
}

function nextUnit(date: Temporal.PlainDate, unit: GanttScale | 'year') {
    switch (unit) {
        case 'day':
            return date.add({ days: 1 });
        case 'week':
            return date.add({ weeks: 1 });
        case 'month':
            return date.add({ months: 1 });
        case 'year':
            return date.add({ years: 1 });
    }
}

export function createGantt<T extends CalendarEventInput>({
    events = [],
    scale = 'week',
    start,
    end,
    rangeEvents = events,
    weekStartsOn = 7,
    today = Temporal.Now.plainDateISO(),
    links = [],
}: GanttOptions<T>): Gantt<T> {
    let axisStart = start;
    let axisEnd = end;

    if (!axisStart || !axisEnd) {
        const fitted = rangeEvents.length ? rangeEvents : [{ startDate: today, endDate: today }];
        const earliest = fitted.map((event) => event.startDate).reduce(minDate);
        const latest = fitted.map((event) => event.endDate).reduce(maxDate);

        axisStart ??= unitStart(earliest.subtract(PADDING[scale]), scale, weekStartsOn);
        axisEnd ??= nextUnit(
            unitStart(latest.add(PADDING[scale]), scale, weekStartsOn),
            scale,
        ).subtract({
            days: 1,
        });
    }

    const axisDays = daysBetween(axisStart, axisEnd) + 1;

    const tier = (unit: GanttScale | 'year'): GanttColumn[] => {
        const columns: GanttColumn[] = [];

        for (
            let cursor = unitStart(axisStart, unit, weekStartsOn);
            Temporal.PlainDate.compare(cursor, axisEnd) <= 0;
            cursor = nextUnit(cursor, unit)
        ) {
            const from = maxDate(cursor, axisStart);
            const to = minDate(nextUnit(cursor, unit).subtract({ days: 1 }), axisEnd);

            columns.push({
                start: cursor,
                offset: daysBetween(axisStart, from),
                days: daysBetween(from, to) + 1,
                isToday: unit === 'day' && cursor.equals(today),
                isWeekend: unit === 'day' && isWeekend(cursor),
            });
        }

        return columns;
    };

    const rows = events.map((event): GanttRow<T> => {
        const from = Math.min(Math.max(daysBetween(axisStart, event.startDate), 0), axisDays);
        const to = Math.min(Math.max(daysBetween(axisStart, event.endDate) + 1, 0), axisDays);

        return {
            event,
            startOffset: from,
            endOffset: to,
            continuesBefore: Temporal.PlainDate.compare(event.startDate, axisStart) < 0,
            continuesAfter: Temporal.PlainDate.compare(event.endDate, axisEnd) > 0,
        };
    });

    const todayOffset = daysBetween(axisStart, today);

    return {
        links: resolveLinks(rows, links),
        start: axisStart,
        end: axisEnd,
        axisDays,
        scale,
        columns: tier(scale),
        groups: tier(scale === 'month' ? 'year' : 'month'),
        rows,
        todayOffset: todayOffset >= 0 && todayOffset < axisDays ? todayOffset : null,
    };
}

function resolveLinks<T extends CalendarEventInput>(
    rows: GanttRow<T>[],
    links: readonly GanttLinkInput[],
): GanttLink<T>[] {
    const rowsById = new Map(rows.map((row) => [String(row.event.id), row]));

    return links.flatMap((source): GanttLink<T>[] => {
        const kind = source.kind ?? 'dependency';
        let from = rowsById.get(String(source.from));
        let to = rowsById.get(String(source.to));

        if (!from || !to || from === to) {
            return [];
        }

        if (kind === 'related' && startsAfter(from, to)) {
            [from, to] = [to, from];
        }

        return [
            {
                id: source.id,
                source,
                kind,
                from,
                to,
                conflict:
                    kind === 'dependency' &&
                    Temporal.PlainDate.compare(to.event.startDate, from.event.endDate) < 0,
            },
        ];
    });
}

function startsAfter(row: GanttRow<any>, other: GanttRow<any>) {
    const byStart = Temporal.PlainDate.compare(row.event.startDate, other.event.startDate);

    return byStart > 0 || (byStart === 0 && row.endOffset > other.endOffset);
}

export interface GanttPoint {
    x: number;
    y: number;
}

export interface GanttLinkRouteOptions {
    /** How far the line runs straight out of a bar and into the next, in pixels. */
    gap?: number;
    /**
     * Where to run across when the successor starts left of where the line leaves: the edge
     * of the predecessor's row facing the successor, so the detour stays between rows.
     */
    gutterY: number;
}

/**
 * The corners of a line from a bar's end to another bar's start: out, across, and in when
 * there's room, or out, down to the gutter, back left, and in when the successor starts earlier.
 */
export function routeGanttLink(
    from: GanttPoint,
    to: GanttPoint,
    { gap = 12, gutterY }: GanttLinkRouteOptions,
): GanttPoint[] {
    if (to.x - from.x >= gap * 2) {
        const turn = from.x + gap;

        return [from, { x: turn, y: from.y }, { x: turn, y: to.y }, to];
    }

    return [
        from,
        { x: from.x + gap, y: from.y },
        { x: from.x + gap, y: gutterY },
        { x: to.x - gap, y: gutterY },
        { x: to.x - gap, y: to.y },
        to,
    ];
}

/** An SVG path through orthogonal points with each corner rounded, shrunk on short legs. */
export function roundedPath(points: readonly GanttPoint[], radius = 6): string {
    if (points.length < 2) {
        return '';
    }

    const parts = [`M ${points[0].x} ${points[0].y}`];

    for (let index = 1; index < points.length - 1; index++) {
        const [previous, corner, next] = [points[index - 1], points[index], points[index + 1]];
        const into = Math.hypot(corner.x - previous.x, corner.y - previous.y);
        const out = Math.hypot(next.x - corner.x, next.y - corner.y);
        const r = Math.min(radius, into / 2, out / 2);

        if (r === 0) {
            parts.push(`L ${corner.x} ${corner.y}`);
            continue;
        }

        const toward = (point: GanttPoint, length: number) => ({
            x: corner.x + ((point.x - corner.x) / length) * r,
            y: corner.y + ((point.y - corner.y) / length) * r,
        });
        const before = toward(previous, into);
        const after = toward(next, out);

        parts.push(`L ${before.x} ${before.y}`, `Q ${corner.x} ${corner.y} ${after.x} ${after.y}`);
    }

    const last = points[points.length - 1];

    parts.push(`L ${last.x} ${last.y}`);

    return parts.join(' ');
}

/** A filled arrowhead pointing right with its tip on `tip`. */
export function ganttLinkArrow(tip: GanttPoint, size = 5): string {
    return `M ${tip.x} ${tip.y} L ${tip.x - size} ${tip.y - size * 0.8} L ${tip.x - size} ${tip.y + size * 0.8} Z`;
}
