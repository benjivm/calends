import { describe, expect, it } from 'vitest';
import { normalizeEvents, type CalendarEventInput } from './events.js';
import { createMonthGrid, visibleMonthRange } from './month.js';

const date = (value: string) => Temporal.PlainDate.from(value);
const events = (inputs: CalendarEventInput[]) =>
    normalizeEvents(inputs, { timeZone: 'America/Chicago' });

describe('visibleMonthRange', () => {
    it('starts on Sunday by default', () => {
        const range = visibleMonthRange(date('2026-10-15'));

        expect(range.start).toEqual(date('2026-09-27'));
        expect(range.end).toEqual(date('2026-10-31'));
    });

    it('honours weekStartsOn', () => {
        const range = visibleMonthRange(date('2026-10-15'), 1);

        expect(range.start).toEqual(date('2026-09-28'));
        expect(range.end).toEqual(date('2026-11-01'));
    });

    it('fits a month that fills exactly four weeks', () => {
        const range = visibleMonthRange(date('2026-02-10'));

        expect(range.start).toEqual(date('2026-02-01'));
        expect(range.end).toEqual(date('2026-02-28'));
    });

    it('pads to six weeks when fixed', () => {
        const range = visibleMonthRange(date('2026-02-10'), 7, true);

        expect(range.end).toEqual(date('2026-03-14'));
    });
});

describe('createMonthGrid', () => {
    it('flags today, outside, and weekend days', () => {
        const grid = createMonthGrid({ date: date('2026-10-15'), today: date('2026-10-25') });
        const days = grid.weeks.flatMap((week) => week.days);
        const find = (value: string) => days.find((day) => day.date.equals(date(value)))!;

        expect(grid.weeks).toHaveLength(5);
        expect(find('2026-10-25').isToday).toBe(true);
        expect(find('2026-09-30').isOutside).toBe(true);
        expect(find('2026-10-01').isOutside).toBe(false);
        expect(find('2026-10-03').isWeekend).toBe(true);
        expect(find('2026-10-05').isWeekend).toBe(false);
    });

    it('keeps seven consecutive days per week across daylight saving changes', () => {
        for (const month of ['2026-03-01', '2026-11-01']) {
            const grid = createMonthGrid({ date: date(month), weekStartsOn: 1 });

            for (const week of grid.weeks) {
                expect(week.days.map((day) => day.date.dayOfWeek)).toEqual([1, 2, 3, 4, 5, 6, 7]);
            }
        }
    });

    it('lists weekday headers from weekStartsOn', () => {
        const grid = createMonthGrid({ date: date('2026-10-15'), weekStartsOn: 1 });

        expect(grid.weekdays.map((day) => day.dayOfWeek)).toEqual([1, 2, 3, 4, 5, 6, 7]);
    });

    it('splits multi-week events into one segment per week', () => {
        const grid = createMonthGrid({
            date: date('2026-10-15'),
            events: events([{ id: 'a', start: '2026-10-02', end: '2026-10-13' }]),
        });

        const segments = grid.weeks.map((week) =>
            week.segments.map(({ column, span, continuesBefore, continuesAfter }) => ({
                column,
                span,
                continuesBefore,
                continuesAfter,
            })),
        );

        expect(segments.slice(0, 3)).toEqual([
            [{ column: 5, span: 2, continuesBefore: false, continuesAfter: true }],
            [{ column: 0, span: 7, continuesBefore: true, continuesAfter: true }],
            [{ column: 0, span: 3, continuesBefore: true, continuesAfter: false }],
        ]);
        expect(grid.weeks[3].segments).toHaveLength(0);
    });

    it('clips events that start before or end after the grid', () => {
        const grid = createMonthGrid({
            date: date('2026-10-15'),
            events: events([
                { id: 'a', start: '2026-09-01', end: '2026-09-28' },
                { id: 'b', start: '2026-08-01', end: '2026-08-02' },
            ]),
        });

        expect(grid.weeks[0].segments).toMatchObject([
            { event: { id: 'a' }, column: 0, span: 2, continuesBefore: true },
        ]);
    });

    it('packs non-overlapping bars into the same lane', () => {
        const grid = createMonthGrid({
            date: date('2026-10-15'),
            events: events([
                { id: 'a', start: '2026-10-05', end: '2026-10-07' },
                { id: 'b', start: '2026-10-06' },
                { id: 'c', start: '2026-10-08' },
            ]),
        });

        const lanes = Object.fromEntries(
            grid.weeks[1].segments.map((segment) => [segment.event.id, segment.lane]),
        );

        expect(lanes).toEqual({ a: 0, b: 1, c: 0 });
        expect(grid.weeks[1].laneCount).toBe(2);
    });

    it('puts the longer bar on top when two start the same day', () => {
        const grid = createMonthGrid({
            date: date('2026-10-15'),
            events: events([
                { id: 'short', start: '2026-10-05' },
                { id: 'long', start: '2026-10-05', end: '2026-10-09' },
            ]),
        });

        const lanes = Object.fromEntries(
            grid.weeks[1].segments.map((segment) => [segment.event.id, segment.lane]),
        );

        expect(lanes).toEqual({ long: 0, short: 1 });
    });

    it('orders same-day single bars by start time', () => {
        const grid = createMonthGrid({
            date: date('2026-10-15'),
            events: events([
                { id: 'late', start: '2026-10-05T15:00:00' },
                { id: 'early', start: '2026-10-05T08:00:00' },
                { id: 'all-day', start: '2026-10-05' },
            ]),
        });

        const day = grid.weeks[1].days[1];

        expect(day.segments.map((segment) => segment.event.id)).toEqual([
            'all-day',
            'early',
            'late',
        ]);
    });

    it('counts every event covering a day, not only those starting there', () => {
        const grid = createMonthGrid({
            date: date('2026-10-15'),
            events: events([
                { id: 'a', start: '2026-10-05', end: '2026-10-07' },
                { id: 'b', start: '2026-10-06' },
            ]),
        });

        const tuesday = grid.weeks[1].days[2];

        expect(tuesday.segments).toHaveLength(1);
        expect(tuesday.eventCount).toBe(2);
    });

    describe('maxLanes', () => {
        const busyWeek = events([
            { id: 'long', start: '2026-10-05', end: '2026-10-09' },
            { id: 'a', start: '2026-10-06' },
            { id: 'b', start: '2026-10-06' },
            { id: 'c', start: '2026-10-06' },
            { id: 'd', start: '2026-10-08' },
        ]);

        it('keeps every lane when the week fits', () => {
            const grid = createMonthGrid({
                date: date('2026-10-15'),
                events: busyWeek,
                maxLanes: 4,
            });
            const week = grid.weeks[1];

            expect(week.hasOverflow).toBe(false);
            expect(week.visibleLaneCount).toBe(4);
            expect(week.days[2].hiddenCount).toBe(0);
        });

        it('reserves the last lane for "+N more" and hides the rest', () => {
            const grid = createMonthGrid({
                date: date('2026-10-15'),
                events: busyWeek,
                maxLanes: 3,
            });
            const week = grid.weeks[1];
            const tuesday = week.days[2];

            expect(week.hasOverflow).toBe(true);
            expect(week.visibleLaneCount).toBe(2);
            expect(tuesday.segments.map((segment) => segment.event.id)).toEqual(['a']);
            expect(tuesday.hiddenCount).toBe(2);
            expect(tuesday.eventCount).toBe(4);
        });

        it('counts hidden events only on the days they cover', () => {
            const grid = createMonthGrid({
                date: date('2026-10-15'),
                events: busyWeek,
                maxLanes: 3,
            });
            const week = grid.weeks[1];

            expect(week.days.map((day) => day.hiddenCount)).toEqual([0, 0, 2, 0, 0, 0, 0]);
        });

        it('lists every covering event in lane order for the overflow list', () => {
            const grid = createMonthGrid({
                date: date('2026-10-15'),
                events: busyWeek,
                maxLanes: 3,
            });
            const tuesday = grid.weeks[1].days[2];

            expect(tuesday.coveringSegments.map((segment) => segment.event.id)).toEqual([
                'long',
                'a',
                'b',
                'c',
            ]);
        });

        it('draws a lone hidden bar in the "+N more" lane instead of "+1 more"', () => {
            const grid = createMonthGrid({
                date: date('2026-10-15'),
                events: events([
                    { id: 'long', start: '2026-10-05', end: '2026-10-09' },
                    { id: 'a', start: '2026-10-06' },
                    { id: 'b', start: '2026-10-06' },
                    { id: 'c', start: '2026-10-06' },
                    { id: 'd', start: '2026-10-08' },
                    { id: 'e', start: '2026-10-08' },
                ]),
                maxLanes: 3,
            });
            const week = grid.weeks[1];

            expect(week.days[4].segments.map((segment) => segment.event.id)).toEqual(['d', 'e']);
            expect(week.days[4].hiddenCount).toBe(0);
            expect(week.days[2].hiddenCount).toBe(2);
        });

        it('shows every lane when maxLanes is left unset', () => {
            const grid = createMonthGrid({ date: date('2026-10-15'), events: busyWeek });
            const week = grid.weeks[1];

            expect(week.hasOverflow).toBe(false);
            expect(week.visibleLaneCount).toBe(4);
            expect(week.days.every((day) => day.hiddenCount === 0)).toBe(true);
        });
    });
});
