import { describe, expect, it } from 'vitest';
import { normalizeEvents, type CalendarEventInput } from './events.js';
import { createTimeGrid } from './timegrid.js';

const date = (value: string) => Temporal.PlainDate.from(value);
const chicago = (inputs: CalendarEventInput[]) =>
    normalizeEvents(inputs, { timeZone: 'America/Chicago' });

const week = (events: CalendarEventInput[], options = {}) =>
    createTimeGrid({
        start: date('2026-10-11'),
        end: date('2026-10-17'),
        events: chicago(events),
        today: date('2026-10-14'),
        ...options,
    });

const layout = (grid: ReturnType<typeof week>, column: number) =>
    Object.fromEntries(
        grid.days[column].events.map((piece) => [
            piece.event.id,
            [piece.startMinutes, piece.endMinutes, piece.column, piece.columnCount],
        ]),
    );

describe('createTimeGrid', () => {
    it('places timed events by wall-clock minutes', () => {
        const grid = week([{ id: 'a', start: '2026-10-12T09:30:00', end: '2026-10-12T11:00:00' }]);

        expect(layout(grid, 1)).toEqual({ a: [570, 660, 0, 1] });
        expect(grid.days[3].isToday).toBe(true);
        expect(grid.hours).toHaveLength(24);
    });

    it('splits overlapping events into shared columns, and only within their cluster', () => {
        const grid = week([
            { id: 'a', start: '2026-10-12T09:00:00', end: '2026-10-12T11:00:00' },
            { id: 'b', start: '2026-10-12T10:00:00', end: '2026-10-12T12:00:00' },
            { id: 'c', start: '2026-10-12T11:00:00', end: '2026-10-12T11:30:00' },
            { id: 'd', start: '2026-10-12T14:00:00', end: '2026-10-12T15:00:00' },
        ]);

        expect(layout(grid, 1)).toEqual({
            a: [540, 660, 0, 2],
            b: [600, 720, 1, 2],
            c: [660, 690, 0, 2],
            d: [840, 900, 0, 1],
        });
    });

    it('lets back-to-back events share a column', () => {
        const grid = week([
            { id: 'a', start: '2026-10-12T09:00:00', end: '2026-10-12T10:00:00' },
            { id: 'b', start: '2026-10-12T10:00:00', end: '2026-10-12T11:00:00' },
        ]);

        expect(layout(grid, 1)).toEqual({ a: [540, 600, 0, 1], b: [600, 660, 0, 1] });
    });

    it('splits an overnight event across both days', () => {
        const grid = week([{ id: 'a', start: '2026-10-12T22:00:00', end: '2026-10-13T02:00:00' }]);

        expect(grid.days[1].events[0]).toMatchObject({
            startMinutes: 1320,
            endMinutes: 1440,
            endsAfter: true,
        });
        expect(grid.days[2].events[0]).toMatchObject({
            startMinutes: 0,
            endMinutes: 120,
            startsBefore: true,
        });
    });

    it('does not mark an event ending at midnight as continuing', () => {
        const grid = week([{ id: 'a', start: '2026-10-12T22:00:00', end: '2026-10-13T00:00:00' }]);

        expect(grid.days[1].events[0]).toMatchObject({ endMinutes: 1440, endsAfter: false });
        expect(grid.days[2].events).toHaveLength(0);
    });

    it('draws a daylight-saving day as 24 wall-clock hours', () => {
        const grid = createTimeGrid({
            start: date('2026-11-01'),
            end: date('2026-11-01'),
            events: chicago([
                { id: 'a', start: '2026-11-01T03:00:00', end: '2026-11-01T05:00:00' },
            ]),
        });

        expect(grid.days[0].events[0]).toMatchObject({ startMinutes: 180, endMinutes: 300 });
    });

    it('clips to the visible window and drops events outside it', () => {
        const grid = week(
            [
                { id: 'early', start: '2026-10-12T06:00:00', end: '2026-10-12T09:00:00' },
                { id: 'night', start: '2026-10-12T20:00:00', end: '2026-10-12T21:00:00' },
            ],
            { slotMinMinutes: 7 * 60, slotMaxMinutes: 18 * 60 },
        );

        expect(grid.days[1].events).toHaveLength(1);
        expect(grid.days[1].events[0]).toMatchObject({
            startMinutes: 0,
            endMinutes: 120,
            startsBefore: true,
        });
        expect(grid.hours[0]).toBe(7 * 60);
        expect(grid.windowMinutes).toBe(11 * 60);
    });

    it('keeps all-day events out of the hours and packs them in the all-day row', () => {
        const grid = week([
            { id: 'trip', start: '2026-10-12', end: '2026-10-14' },
            { id: 'holiday', start: '2026-10-13' },
            { id: 'meeting', start: '2026-10-13T09:00:00', end: '2026-10-13T10:00:00' },
        ]);

        expect(
            grid.allDay.segments.map((segment) => [
                segment.event.id,
                segment.column,
                segment.span,
                segment.lane,
            ]),
        ).toEqual([
            ['trip', 1, 3, 0],
            ['holiday', 2, 1, 1],
        ]);
        expect(grid.days[2].events.map((piece) => piece.event.id)).toEqual(['meeting']);
    });
});
