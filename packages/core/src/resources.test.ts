import { describe, expect, it } from 'vitest';
import { normalizeEvents } from './events.js';
import { createResourceGrid } from './resources.js';

const date = (value: string) => Temporal.PlainDate.from(value);

type Booking = { id: string; start: string; end?: string; techs: string[] };

const resources = [{ id: 'ann' }, { id: 'bob' }, { id: 'cy' }];

const grid = (bookings: Booking[], options: { unassigned?: boolean } = {}) =>
    createResourceGrid({
        start: date('2026-10-01'),
        end: date('2026-10-31'),
        resources,
        events: normalizeEvents(bookings, { timeZone: 'America/Chicago' }),
        getResourceIds: (booking) => booking.techs,
        today: date('2026-10-25'),
        ...options,
    });

describe('createResourceGrid', () => {
    it('lays out one column per day of the range', () => {
        const { days } = grid([]);

        expect(days).toHaveLength(31);
        expect(days[0].date).toEqual(date('2026-10-01'));
        expect(days[24].isToday).toBe(true);
        expect(days[2].isWeekend).toBe(true);
    });

    it('keeps a row for every resource, including idle ones', () => {
        const { rows } = grid([{ id: 'a', start: '2026-10-05', techs: ['ann'] }]);

        expect(rows.map((row) => [row.resource?.id, row.segments.length])).toEqual([
            ['ann', 1],
            ['bob', 0],
            ['cy', 0],
        ]);
    });

    it('shows an event in the row of each of its resources', () => {
        const { rows } = grid([
            { id: 'a', start: '2026-10-05', end: '2026-10-07', techs: ['ann', 'cy'] },
        ]);

        expect(rows[0].segments).toMatchObject([{ column: 4, span: 3 }]);
        expect(rows[1].segments).toHaveLength(0);
        expect(rows[2].segments).toMatchObject([{ column: 4, span: 3 }]);
    });

    it('clips events at the edges of the range', () => {
        const { rows } = grid([
            { id: 'a', start: '2026-09-28', end: '2026-10-02', techs: ['ann'] },
            { id: 'b', start: '2026-10-30', end: '2026-11-03', techs: ['ann'] },
        ]);

        expect(rows[0].segments).toMatchObject([
            { event: { id: 'a' }, column: 0, span: 2, continuesBefore: true },
            { event: { id: 'b' }, column: 29, span: 2, continuesAfter: true },
        ]);
    });

    it('stacks a double-booked resource and counts the overlapping days', () => {
        const { rows } = grid([
            { id: 'a', start: '2026-10-05', end: '2026-10-08', techs: ['bob'] },
            { id: 'b', start: '2026-10-07', end: '2026-10-09', techs: ['bob'] },
        ]);
        const bob = rows[1];

        expect(bob.laneCount).toBe(2);
        expect(bob.busyDays).toBe(5);
        expect(bob.overlapDays).toBe(2);
        expect(bob.cells[6].eventCount).toBe(2);
    });

    it('collects events with no known resource in an unassigned row when asked', () => {
        const bookings = [
            { id: 'a', start: '2026-10-05', techs: [] },
            { id: 'b', start: '2026-10-06', techs: ['someone-inactive'] },
        ];

        expect(grid(bookings).rows).toHaveLength(3);

        const unassigned = grid(bookings, { unassigned: true }).rows[3];

        expect(unassigned.resource).toBeNull();
        expect(unassigned.segments.map((segment) => segment.event.id)).toEqual(['a', 'b']);
    });

    it('leaves out the unassigned row when every event has a resource', () => {
        const { rows } = grid([{ id: 'a', start: '2026-10-05', techs: ['ann'] }], {
            unassigned: true,
        });

        expect(rows).toHaveLength(3);
    });
});
